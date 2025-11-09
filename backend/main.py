import http
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from gemini import Jsonify, gemini, geminiImage
from event import EventbriteClient
from Databases.event_service import bulk_add_scraped_events
import os

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello FastAPI!"}


@app.get("/api/health")
def health_check():
    return {"status": "OK"}


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
        
        result = bulk_add_scraped_events(events)
        
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

@app.get("/api/GenerateAdminTasks")
async def GenerateAdminTasks():
    """
    Generate personalized settling-in tasks for new settlers
    
    Returns:
        {
            "success": bool,
            "response": [...]
        }
    """
    dob = "1990-01-01"
    status = "International Study Permit Holder"
    interests = ["coding", "music"]
    location = "Calgary"
    language = ["English"]
    occupation = "Student"

    prompt = f"""Generate 10 settling-in tasks for a new {status} moving to {location}. Tasks may include but not limited to opening a bank account, 
        finding housing, obtaining a SIN/provincial ID/health coverage, and exploring important locations in the city.
        Personalize the tasks based on:
        interests: {', '.join(interests)}
        languages: {', '.join(language)}
        age: {dob}
        occupation: {occupation}
        Return a list of 10 tasks, each starting with a '-' on a new line, with no extra text. use UTF-8 encoding."""
    response = gemini(prompt)
    response = Jsonify(response)

    if response:    
        return {"success": True, "response": response}
    else:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(http.HTTPStatus.INTERNAL_SERVER_ERROR)}
        )


@app.post("/api/checkTaskCompletion")
async def check_task_completion(
    prompt: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Verify task completion using image analysis
    
    Form Data:
        - prompt (str): Task description to verify
        - image (file): Image file to analyze
    
    Returns:
        {
            "success": bool,
            "response": str,
            "image_filename": str,
            "prompt": str
        }
    """
    try:
        image_bytes = await image.read()
        prompt = f"Analyze the following image and tell me yes if the image completes the task: {prompt} or else no."
        response = geminiImage(prompt, image_bytes)

        if "yes" in response or "no" in response:
            return {
                "success": True,
                "response": response,
                "image_filename": image.filename,
                "prompt": prompt
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