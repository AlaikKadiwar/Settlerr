import http
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from gemini import Jsonify, gemini, geminiImage
from event import EventbriteClient
from Databases.event_service import bulk_add_scraped_events, get_event_by_name, add_user_to_event_rsvp, get_all_events
from Databases.user_service import remove_task_from_user, check_username_availability, get_user_by_username_scan, add_tasks_to_user, add_event_to_user
import os

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
    Get suggested events for a user (events they haven't RSVP'd to)
    
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
        interests = user.get("interests", [])
        location = user.get("location", "Calgary")
        language = user.get("language", ["English"])
        occupation = user.get("occupation", "Professional")

        prompt = f"""Generate 10 settling-in tasks for a new {status} moving to {location}. Tasks may include but not limited to opening a bank account, 
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