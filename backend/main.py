import http
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gemini import Jsonify, gemini, geminiImage
from event import EventbriteClient
from Databases.event_service import bulk_add_scraped_events, get_event_by_name, add_user_to_event_rsvp, get_all_events
from Databases.user_service import (
    remove_task_from_user,
    check_username_availability,
    get_user_by_username_scan,
    add_tasks_to_user,
    add_event_to_user,
    create_user,
    get_user_by_id,
    update_user_profile,
    list_all_users,
    list_users_by_interest,
)
from matchmaking import get_recommended_events_for_user
import os
import jwt
import bcrypt
from datetime import datetime, timedelta

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def generate_event_tasks(event_name: str, event_description: str, event_venue: str) -> list:
    """Generate 3 tasks for an event using Gemini AI"""
    prompt = f"""Generate exactly 3 specific tasks for someone attending this event:
    Event Name: {event_name}
    Description: {event_description[:200] if event_description else 'N/A'}
    Venue: {event_venue if event_venue else 'N/A'}
    
    Tasks should help the attendee get the most value from the event, such as:
    - Write a reflection or review about the event
    - Network with a specific number of people
    - Take photos or document key moments
    - Share learnings on social media
    - Collect business cards or contacts
    
    Return exactly 3 tasks, each starting with a '-' on a new line. Be specific to this event type. Keep tasks concise and actionable."""
    
    response = gemini(prompt)
    tasks = Jsonify(response)
    return tasks if tasks and len(tasks) > 0 else [
        "- Write a brief reflection about what you learned at this event",
        "- Connect with at least 2 new people and exchange contact information",
        "- Share one key takeaway from the event on social media"
    ]

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation
class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    email: str
    name: str
    phone: str = ""
    dob: str = ""
    location: str = ""
    interests: list = []
    status: str = "S"

# Helper functions for JWT
def create_jwt_token(user_data: dict) -> str:
    """Create JWT token with user data"""
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_data.get("user_id"),
        "username": user_data.get("username"),
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@app.get("/")
def home():
    return {"message": "Settlerr API - JWT Authentication Enabled"}


@app.get("/api/health")
def health_check():
    return {"status": "OK"}


@app.post("/api/login")
async def login(request: LoginRequest):
    """
    Login endpoint - validates username/password and returns JWT token
    
    Request Body:
        {
            "username": "alvishprasla",
            "password": "your_password"
        }
    
    Returns:
        {
            "success": true,
            "token": "jwt_token_here",
            "user": { user_data }
        }
    """
    try:
        # Get user from database
        user = get_user_by_username_scan(request.username)
        
        if not user:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Invalid username or password"}
            )
        
        # Check if user has password_hash
        if "password_hash" not in user:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "User account not properly configured"}
            )
        
        # Verify password
        if not verify_password(request.password, user["password_hash"]):
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Invalid username or password"}
            )
        
        # Create JWT token
        token = create_jwt_token(user)
        
        # Remove sensitive data before sending
        user_data = {
            "user_id": user.get("user_id"),
            "username": user.get("username"),
            "name": user.get("name"),
            "email": user.get("email"),
            "location": user.get("location"),
            "interests": user.get("interests", []),
            "status": user.get("status"),
        }
        
        return {
            "success": True,
            "token": token,
            "user": user_data
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.post("/api/signup")
async def signup(request: SignupRequest):
    """
    Signup endpoint - creates new user account
    
    Request Body:
        {
            "username": "newuser",
            "password": "password123",
            "email": "user@example.com",
            "name": "User Name",
            "phone": "+1234567890",
            "dob": "1990-01-01",
            "location": "Calgary",
            "interests": ["tech", "music"],
            "status": "S"
        }
    
    Returns:
        {
            "success": true,
            "user": { user_data }
        }
    """
    try:
        # Check if username already exists
        existing_user = get_user_by_username_scan(request.username)
        if existing_user:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Username already exists"}
            )
        
        # Create user
        user_data = {
            "username": request.username,
            "password": request.password,
            "email": request.email,
            "name": request.name,
            "phone": request.phone,
            "dob": request.dob,
            "location": request.location,
            "interests": request.interests,
            "status": request.status,
            "events_attending": [],
            "tasks": []
        }
        
        new_user = create_user(user_data)

        # Remove sensitive data
        user_response = {
            "user_id": new_user.get("user_id"),
            "username": new_user.get("username"),
            "name": new_user.get("name"),
            "email": new_user.get("email"),
            "location": new_user.get("location"),
        }

        # Create JWT token for new user so frontend can sign in immediately
        token = create_jwt_token(new_user)

        return {
            "success": True,
            "user": user_response,
            "token": token
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.get("/api/checkUsername")
async def check_username(username: str):
    """
    Check if username is available or already taken
    
    Query Parameters:
        - username (str): Username to check
    
    Example: GET /api/checkUsername?username=alaik
    
    Returns:
        {
            "success": bool,
            "available": bool,
            "message": str
        }
    """
    try:
        result = check_username_availability(username)
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to check username",
                "details": str(e)
            }
        )


@app.get("/api/getUserTasks")
async def get_user_tasks(username: str):
    """
    Get all tasks for a user
    
    Query Parameters:
        - username (str): Username
    
    Example: GET /api/getUserTasks?username=alaik
    
    Returns:
        {
            "success": bool,
            "username": str,
            "tasks": [...],
            "total_tasks": int
        }
    """
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "User not found"}
            )
        
        tasks = user.get("tasks", [])
        
        return {
            "success": True,
            "username": username,
            "tasks": tasks,
            "total_tasks": len(tasks)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to get user tasks",
                "details": str(e)
            }
        )


@app.get("/api/getUserProfile")
async def get_user_profile(username: str):
    """
    Get user profile by username (public-safe fields)
    """
    try:
        user = get_user_by_username_scan(username)
        if not user:
            return JSONResponse(status_code=404, content={"success": False, "error": "User not found"})

        user_data = {
            "user_id": user.get("user_id"),
            "username": user.get("username"),
            "name": user.get("name"),
            "email": user.get("email"),
            "location": user.get("location"),
            "interests": user.get("interests", []),
            "xp": user.get("xp", 0),
            "profile_picture_url": user.get("profile_picture_url")
        }

        return {"success": True, "user": user_data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/updateUserProfile")
async def api_update_user_profile(payload: dict):
    """
    Update user profile fields. Expects JSON body with 'username' and fields to update.
    """
    try:
        username = payload.get("username") if isinstance(payload, dict) else None
        if not username:
            return JSONResponse(status_code=400, content={"success": False, "error": "username is required"})

        # Remove username from updates
        updates = {k: v for k, v in payload.items() if k != "username"}

        result = update_user_profile(username, updates)
        if not result.get("success"):
            return JSONResponse(status_code=400, content=result)

        return {"success": True, "user": result.get("user")}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/listUsers")
async def api_list_users(interest: str = None, limit: int = 50):
    """
    List users. If `interest` query param is provided, filter by interest; otherwise return up to `limit` users.
    """
    try:
        if interest:
            users = list_users_by_interest(interest, limit=limit)
        else:
            users = list_all_users(limit=limit)

        # Return only safe/public fields
        public = [
            {
                "user_id": u.get("user_id"),
                "username": u.get("username"),
                "name": u.get("name"),
                "location": u.get("location"),
                "interests": u.get("interests", []),
                "xp": u.get("xp", 0),
                "profile_picture_url": u.get("profile_picture_url"),
            }
            for u in users
        ]

        return {"success": True, "users": public, "total": len(public)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/getSuggestedEvents")
async def get_suggested_events(username: str):
    """
    Get suggested events for a user (events they haven't RSVP'd to) - UNSCORED
    
    Query Parameters:
        - username (str): Username
    
    Example: GET /api/getSuggestedEvents?username=alaik
    
    Returns:
        {
            "success": bool,
            "username": str,
            "events": [...],
            "total_events": int
        }
    """
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "User not found"}
            )
        
        # Get user's events they're attending
        events_attending = user.get("events_attending", [])
        
        # Get all events from database
        all_events = get_all_events()
        
        # Filter out events user has already RSVP'd to
        suggested_events = [
            event for event in all_events 
            if event.get("name") not in events_attending
        ]
        
        return {
            "success": True,
            "username": username,
            "events": suggested_events,
            "total_events": len(suggested_events)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to get suggested events",
                "details": str(e)
            }
        )


@app.get("/api/getEventByName")
async def get_event_by_name_endpoint(event_name: str):
    """
    Get a specific event by its name
    
    Query Parameters:
        - event_name (str): Event name
    
    Example: GET /api/getEventByName?event_name=Calgary Tech Meetup
    
    Returns:
        {
            "success": bool,
            "event": {...}
        }
    """
    try:
        event = get_event_by_name(event_name)
        
        if not event:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "Event not found"}
            )
        
        return {
            "success": True,
            "event": event
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to get event",
                "details": str(e)
            }
        )


@app.get("/api/getRecommendedEvents")
async def get_recommended_events(username: str, min_score: float = 50.0, top_n: int = 10):
    """
    Get AI-powered recommended events for a user based on their profile
    Uses intelligent matchmaking to score events by interests, status, occupation, age, location
    
    Query Parameters:
        - username (str): Username
        - min_score (float): Minimum match score (0-100, default: 50.0)
        - top_n (int): Maximum number of events to return (default: 10)
    
    Example: GET /api/getRecommendedEvents?username=alaik&min_score=60&top_n=5
    
    Returns:
        {
            "success": bool,
            "username": str,
            "events": [
                {
                    "event_id": str,
                    "name": str,
                    "about": str,
                    "venue": str,
                    "date": str,
                    "time": str,
                    "match_score": float (0-100),
                    "match_reasoning": str,
                    "relevance_factors": [str]
                }
            ],
            "total_events": int
        }
    """
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "User not found"}
            )
        
        # Get user's events they're attending
        events_attending = user.get("events_attending", [])
        
        # Get all events from database
        all_events = get_all_events()
        
        # Filter out events user has already RSVP'd to
        available_events = [
            event for event in all_events 
            if event.get("name") not in events_attending
        ]
        
        # Get recommended events with AI matching
        recommended_events = get_recommended_events_for_user(
            user_profile=user,
            all_events=available_events,
            min_score=min_score,
            top_n=top_n
        )
        
        return {
            "success": True,
            "username": username,
            "events": recommended_events,
            "total_events": len(recommended_events)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to get recommended events",
                "details": str(e)
            }
        )


@app.get("/api/getNewEvents")
async def get_events(location: str = "Calgary", radius: str = "25km", max_results: int = 50):
    """
    Scrape events from Eventbrite and save to DynamoDB (prevents duplicates)
    
    Query Parameters:
        - location (str): City name (default: "Calgary")
        - radius (str): Search radius (default: "25km")
        - max_results (int): Maximum events to scrape (default: 50)
    
    Example: GET /api/getNewEvents?location=Toronto&max_results=100
    
    Returns:
        {
            "success": bool,
            "location": str,
            "count": int,
            "scraped": int,
            "added": int,
            "skipped": int,
            "errors": int,
            "events": [...]
        }
    """
    try:
        client = EventbriteClient()
        events = client.get_events_next_month(
            location=location,
            radius=radius,
            max_results=max_results
        )
        
        if not events:
            return {
                "success": True,
                "message": "No events found",
                "scraped": 0,
                "added": 0,
                "skipped": 0,
                "events": []
            }
        
        result = bulk_add_scraped_events(events, generate_event_tasks)
        
        return {
            "success": True,
            "location": location,
            "count": len(events),
            "scraped": len(events),
            "added": result["added"],
            "skipped": result["skipped"],
            "errors": result["errors"],
            "events": events
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to fetch events",
                "details": str(e)
            }
        )

@app.post("/api/GenerateAdminTasks")
async def GenerateAdminTasks(username: str = Form(...)):
    """
    Generate personalized settling-in tasks for a user based on their profile
    
    Form Data:
        - username (str): Username to generate tasks for
    
    Returns:
        {
            "success": bool,
            "response": [...]
        }
    """
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "User not found"}
            )
        
        dob = user.get("dob", "Unknown")
        status = user.get("status", "settler")
        if status == "S":
            status = "International Stududent with a study permit coming to study"
        elif status == "R":
            status = "International refugee person who would need job"
        elif status == "W":
            status = "International Person with work permit"
        interests = user.get("interests", [])
        location = user.get("location", "Calgary")
        language = user.get("language", ["English"])
        occupation = user.get("occupation", "Professional")

        prompt = f"""Generate 10 settling-in tasks for a new {status} moving into {location}. Tasks may include but not limited to opening a bank account, 
            finding housing, obtaining a SIN/provincial ID/health coverage, and exploring important locations in the city.
            Personalize the tasks based on:
            interests: {', '.join(interests) if interests else 'general'}
            languages: {', '.join(language) if language else 'English'}
            age: {dob}
            occupation: {occupation}
            Return a list of 10 tasks, each starting with a '-' on a new line, with no extra text. use UTF-8 encoding."""
        response = gemini(prompt)
        tasks_list = Jsonify(response)

        if tasks_list:
            task_add_result = add_tasks_to_user(username, tasks_list)
            
            return {
                "success": True,
                "response": tasks_list,
                "tasks_added": task_add_result.get("tasks_added", 0),
                "total_tasks": task_add_result.get("total_tasks", 0),
                "message": task_add_result.get("message", "")
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": str(http.HTTPStatus.INTERNAL_SERVER_ERROR)}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.post("/api/rsvpEvent")
async def rsvp_event(username: str = Form(...), event_name: str = Form(...)):
    """
    RSVP user to an event and add event tasks to user's task list
    
    Form Data:
        - username (str): Username
        - event_name (str): Event name to RSVP
    
    Returns:
        {
            "success": bool,
            "message": str,
            "event_tasks": [...],
            "tasks_added": int
        }
    """
    try:
        user = get_user_by_username_scan(username)
        if not user:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "User not found"}
            )
        
        rsvp_result = add_user_to_event_rsvp(event_name, username)
        
        if not rsvp_result.get("success"):
            return JSONResponse(
                status_code=400,
                content=rsvp_result
            )
        
        event_add_result = add_event_to_user(username, event_name)
        
        event_tasks = rsvp_result.get("event_tasks", [])
        
        if event_tasks:
            task_result = add_tasks_to_user(username, event_tasks)
            
            return {
                "success": True,
                "message": "RSVP successful, event added to your list, and tasks added",
                "event_tasks": event_tasks,
                "tasks_added": task_result.get("tasks_added", 0),
                "total_tasks": task_result.get("total_tasks", 0),
                "event_added": event_add_result.get("success", False)
            }
        else:
            return {
                "success": True,
                "message": "RSVP successful and event added to your list",
                "event_tasks": [],
                "tasks_added": 0,
                "event_added": event_add_result.get("success", False)
            }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.post("/api/checkTaskCompletion")
async def check_task_completion(
    username: str = Form(...),
    task_description: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Verify task completion using image analysis and remove from user's tasks if completed
    
    Form Data:
        - username (str): Username (e.g., "alaik")
        - task_description (str): Exact task description to verify and remove
        - image (file): Image file to analyze
    
    Returns:
        {
            "success": bool,
            "task_completed": bool,
            "task_removed": bool,
            "response": str,
            "image_filename": str
        }
    """
    try:
        print(f"\n[API] Received task completion check")
        print(f"[API] Username: {username}")
        print(f"[API] Task: {task_description}")
        print(f"[API] Image: {image.filename}")
        
        image_bytes = await image.read()
        if not image_bytes:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Uploaded image is empty"}
            )

        prompt = (
            "Analyze the following image and tell me yes if the image completes the task: "
            f"{task_description} or else no. dont go to deep into logistics if it feels "
            "like they have completed the task that means they have"
        )

        response = geminiImage(prompt, image_bytes)

        print(f"[API] Gemini response: {response}")

        if response is None:
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Image verification service is temporarily unavailable. Please try again in a moment.",
                },
            )

        if not isinstance(response, str):
            return JSONResponse(
                status_code=502,
                content={
                    "success": False,
                    "error": "Image analysis service returned an unexpected response",
                    "response": response,
                },
            )

        response_normalized = response.lower()

        if "yes" in response_normalized:
            print(f"[API] Task completed! Removing from user's tasks...")
            removal_result = remove_task_from_user(username, task_description)
            print(f"[API] Removal result: {removal_result}")
            
            return {
                "success": True,
                "task_completed": True,
                "task_removed": removal_result.get("success", False),
                "response": response,
                "image_filename": image.filename,
                "removal_details": removal_result
            }
        elif "no" in response_normalized:
            return {
                "success": True,
                "task_completed": False,
                "task_removed": False,
                "response": response,
                "image_filename": image.filename
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "Failed to generate response"}
            )
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )