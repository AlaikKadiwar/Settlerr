import http
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from gemini import Jsonify, gemini, geminiImage
from event import EventbriteClient
from Databases.event_service import bulk_add_scraped_events, get_event_by_name, add_user_to_event_rsvp, get_all_events
from Databases.user_service import remove_task_from_user, check_username_availability, get_user_by_username_scan, add_tasks_to_user, add_event_to_user, create_user
from matchmaking import get_recommended_events_for_user, batch_score_events
import os
import jwt
import bcrypt
from datetime import datetime, timedelta

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

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "settlerr-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Hello FastAPI!"}


@app.get("/api/health")
def health_check():
    return {"status": "OK"}


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


@app.post("/api/signup")
async def signup(
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(...),
    name: str = Form(...),
    dob: str = Form(...),
    phone: str = Form(...),
    country: str = Form(""),
    occupation: str = Form(""),
    languages: str = Form("[]"),  # JSON string array
    interests: str = Form("[]"),  # JSON string array
):
    """
    Create a new user account with password hashing and JWT token
    
    Form Data:
        - username (str): Unique username
        - password (str): Plain text password (will be hashed)
        - email (str): User email
        - name (str): Full name
        - dob (str): Date of birth (YYYY-MM-DD)
        - phone (str): Phone number with country code
        - country (str): Country of origin (optional)
        - occupation (str): User occupation (optional)
        - languages (str): JSON array of languages ["English", "Spanish"]
        - interests (str): JSON array of interests ["Sports", "Music"]
    
    Example: POST /api/signup
    
    Returns:
        {
            "success": bool,
            "user_id": str,
            "username": str,
            "token": str (JWT),
            "message": str
        }
    """
    try:
        # Check if username already exists
        existing_user = get_user_by_username_scan(username)
        if existing_user:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Username already taken"
                }
            )
        
        # Parse JSON strings for arrays
        try:
            languages_list = json.loads(languages) if languages else []
            interests_list = json.loads(interests) if interests else []
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Invalid format for languages or interests"
                }
            )
        
        # Create user data dictionary
        user_data = {
            "username": username,
            "password": password,  # Will be hashed by create_user
            "email": email,
            "name": name,
            "dob": dob,
            "phone": phone,
            "status": "S",  # Default to Student
            "location": "Calgary",  # Default location
            "language": languages_list,
            "interests": interests_list,
            "social": {},
            "events_attending": [],
            "tasks": []
        }
        
        # Add optional fields
        if country:
            user_data["country"] = country
        if occupation:
            user_data["occupation"] = occupation
        
        # Create user in database (password will be hashed)
        created_user = create_user(user_data)
        
        # Generate initial settling-in tasks using Gemini AI
        try:
            status = "S"  # Default status
            if status == "S":
                status_full = "International Student with a study permit coming to study"
            elif status == "R":
                status_full = "International refugee person who would need job"
            elif status == "W":
                status_full = "International Person with work permit"
            else:
                status_full = "new settler"
            
            prompt = f"""Generate 10 settling-in tasks for a new {status_full} moving into Calgary. Tasks may include but not limited to opening a bank account, 
                finding housing, obtaining a SIN/provincial ID/health coverage, and exploring important locations in the city.
                Personalize the tasks based on:
                interests: {', '.join(interests_list) if interests_list else 'general'}
                languages: {', '.join(languages_list) if languages_list else 'English'}
                age: {dob}
                occupation: {occupation if occupation else 'Professional'}
                Return a list of 10 tasks, each starting with a '-' on a new line, with no extra text. use UTF-8 encoding."""
            
            response = gemini(prompt)
            tasks_list = Jsonify(response)
            
            if tasks_list and len(tasks_list) > 0:
                # Add tasks to the newly created user
                task_add_result = add_tasks_to_user(username, tasks_list)
                print(f"✅ Generated {task_add_result.get('tasks_added', 0)} initial tasks for {username}")
            else:
                print(f"⚠️ Failed to generate tasks for {username}, using defaults")
        except Exception as task_error:
            print(f"⚠️ Task generation failed for {username}: {str(task_error)}")
            # Don't fail signup if task generation fails
        
        # Generate JWT token
        token_payload = {
            "user_id": created_user["user_id"],
            "username": username,
            "email": email,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "user_id": created_user["user_id"],
                "username": username,
                "email": email,
                "name": name,
                "token": token,
                "message": "Account created successfully! Your personalized settling-in tasks have been generated."
            }
        )
    
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to create account",
                "details": str(e)
            }
        )


@app.post("/api/login")
async def login(
    username: str = Form(...),
    password: str = Form(...)
):
    """
    Login user with username and password, returns JWT token
    
    Form Data:
        - username (str): Username
        - password (str): Password
    
    Example: POST /api/login
    
    Returns:
        {
            "success": bool,
            "user_id": str,
            "username": str,
            "email": str,
            "name": str,
            "token": str (JWT),
            "message": str
        }
    """
    try:
        # Get user from database
        user = get_user_by_username_scan(username)
        
        if not user:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": "Invalid username or password"
                }
            )
        
        # Verify password
        password_hash = user.get("password_hash", "")
        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": "Invalid username or password"
                }
            )
        
        # Generate JWT token
        token_payload = {
            "user_id": user["user_id"],
            "username": username,
            "email": user.get("email", ""),
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "user_id": user["user_id"],
                "username": username,
                "email": user.get("email", ""),
                "name": user.get("name", ""),
                "token": token,
                "profile": {
                    "interests": user.get("interests", []),
                    "languages": user.get("language", []),
                    "location": user.get("location", ""),
                    "occupation": user.get("occupation", ""),
                    "dob": user.get("dob", ""),
                    "phone": user.get("phone", ""),
                },
                "message": "Login successful!"
            }
        )
    
    except Exception as e:
        print(f"Login error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Login failed",
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
        prompt = f"Analyze the following image and tell me yes if the image completes the task: {task_description} or else no. dont go to deep into logistics if it feels like they have completed the task that means they have"
        response = geminiImage(prompt, image_bytes)
        
        print(f"[API] Gemini response: {response}")

        if "yes" in response.lower():
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
        elif "no" in response.lower():
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


@app.post("/api/findEventsByPrompt")
async def find_events_by_prompt(search_prompt: str = Form(...), max_events: int = Form(10)):
    """
    AI-powered event search using natural language prompt with Gemini
    
    Form Data:
        - search_prompt (str): Natural language description of what user is looking for
        - max_events (int): Maximum number of events to return (default: 10)
    
    Example: POST /api/findEventsByPrompt
    Body: search_prompt="tech events for students"&max_events=5
    
    Returns:
        {
            "success": bool,
            "matches": [
                {
                    "event": {...},
                    "score": float (0-100),
                    "reason": str
                }
            ],
            "total_events": int
        }
    """
    try:
        # Get all events
        all_events = get_all_events(location="Calgary", max_results=100)
        
        if not all_events:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "matches": [],
                    "total_events": 0,
                    "message": "No events available in the system yet"
                }
            )
        
        # Format events for Gemini analysis
        events_summary = "\n\n".join([
            f"Event {i+1}:\n"
            f"Name: {event.get('name', 'Unknown')}\n"
            f"Description: {event.get('about', 'No description')[:200]}\n"
            f"Venue: {event.get('venue', 'TBD')}\n"
            f"Date: {event.get('date', 'TBD')}\n"
            f"Time: {event.get('time', 'TBD')}"
            for i, event in enumerate(all_events[:50])  # Limit to 50 for token limits
        ])
        
        # Create Gemini prompt
        ai_prompt = f"""Analyze these events and find the top {max_events} most relevant matches for this request: "{search_prompt}"

Available Events:
{events_summary}

Return ONLY a JSON array (no markdown, no extra text) with event numbers (1-based) and match scores (0-100) in this exact format:
[{{"event_number": 1, "score": 95, "reason": "Perfect match because..."}}, {{"event_number": 2, "score": 85, "reason": "Good fit because..."}}]

Only include events with score >= 60. Sort by score (highest first). Be specific in your reasoning."""
        
        try:
            # Use Gemini to match events
            response = gemini(ai_prompt)
            
            # Parse JSON from response
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()
            
            matches = json.loads(response)
            
            # Format matched events
            result_matches = []
            for match in matches[:max_events]:
                event_idx = match["event_number"] - 1
                if event_idx < len(all_events):
                    result_matches.append({
                        "event": all_events[event_idx],
                        "score": match["score"],
                        "reason": match["reason"]
                    })
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "matches": result_matches,
                    "total_events": len(result_matches),
                    "search_prompt": search_prompt
                }
            )
        
        except Exception as e:
            # Fallback: simple keyword matching
            search_lower = search_prompt.lower()
            matched_events = []
            
            for event in all_events:
                name = event.get('name', '').lower()
                about = event.get('about', '').lower()
                venue = event.get('venue', '').lower()
                
                # Simple keyword matching
                if any(word in name or word in about or word in venue 
                       for word in search_lower.split()):
                    matched_events.append({
                        "event": event,
                        "score": 70,
                        "reason": "Keyword match"
                    })
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "matches": matched_events[:max_events],
                    "total_events": len(matched_events[:max_events]),
                    "search_prompt": search_prompt,
                    "fallback": True
                }
            )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to find events",
                "details": str(e)
            }
        )