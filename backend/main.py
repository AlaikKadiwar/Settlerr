from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from gemini import gemini, geminiImage
import os

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello FastAPI!"}

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
                "success": False,
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