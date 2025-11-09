import http
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from gemini import Jsonify, gemini, geminiImage
import os

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello FastAPI!"}


@app.get("/api/health")
def health_check():
    return {"status": "OK"}

@app.get("/api/getNewEvents")
async def get_events():
    # TODO: Implement event retrieval logic
    location= "Calgary"#data.location,

    return {"events": []}

@app.get("/api/GenerateAdminTasks")
async def GenerateAdminTasks():
    # TODO: get the details from the database
    dob= "1990-01-01"#data.dob,
    status= "International Study Permit Holder"#data.status || 'S','W','R'
    interests= ["coding", "music"]#data.interests || [],
    location= "Calgary"#data.location,
    language= ["English"]#data.language || [],
    occupation= "Student"#data.occupation,


    prompt = f"""Generate 10 settling-in tasks for a new {status} moving to {location}. Tasks may include but not limited to opening a bank account, 
        finding housing, obtaining a SIN/provincial ID/health coverage, and exploring important locations in the city.
        Personalize the tasks based on:
        interests: {', '.join(interests)}
        languages: {', '.join(language)}
        age: {dob}
        occupation: {occupation}
        Return a list of 10 tasks, each starting with a '-' on a new line, with no extra text. use UTF-8 encoding."""
    response = gemini(prompt)
    # Parse the string as JSON
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
    Test endpoint for image analysis with custom prompt
    """
    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Call Gemini with image and prompt
        prompt = f"Analyze the following image and tell me yes if the image completes the task: {prompt} or else no."
        response = geminiImage(prompt, image_bytes)

        if "yes" in response:
            # TODO: UPDATE IN THE DATABASE THAT TASK IS COMPLETE
            return {
                "success": True,
                "response": response,
                "image_filename": image.filename,
                "prompt": prompt
            }
        elif "no" in response:
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