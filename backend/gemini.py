import base64
import json
import os
import re
from datetime import datetime, timedelta

import google.generativeai as genai
from dotenv import load_dotenv
from google import genai as genai_client
from google.genai import types

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

_TEXT_BACKOFF_UNTIL: datetime | None = None
_IMAGE_BACKOFF_UNTIL: datetime | None = None


def _should_backoff(backoff_until: datetime | None) -> bool:
    if backoff_until is None:
        return False
    return datetime.utcnow() < backoff_until


def _schedule_backoff(kind: str, error: Exception) -> None:
    global _TEXT_BACKOFF_UNTIL, _IMAGE_BACKOFF_UNTIL

    message = str(error)
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", message, re.IGNORECASE)
    seconds = float(match.group(1)) if match else 60.0
    backoff_until = datetime.utcnow() + timedelta(seconds=seconds)

    if kind == "text":
        _TEXT_BACKOFF_UNTIL = backoff_until
    else:
        _IMAGE_BACKOFF_UNTIL = backoff_until

    print(
        f"[Gemini] Quota exhausted for {kind} model. Cooling down for {seconds:.0f}s"
    )

def gemini(prompt):
    try:
        if _should_backoff(_TEXT_BACKOFF_UNTIL):
            print("[Gemini] Text model on cooldown due to quota limits")
            return None

        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(f"prompt starts =  {prompt} ")

        # Remove any "Assistant:" prefix from the response
        answer = response.text.strip()

        return answer

    except Exception as e:
        print(f"Error using Gemini API: {e}")
        if "RESOURCE_EXHAUSTED" in str(e):
            _schedule_backoff("text", e)
        return None

def geminiImage(prompt, image):
    """
    Send an image and prompt to Gemini and return the response.
    
    Args:
        prompt: Text prompt/question about the image
        image: Raw image bytes
    
    Returns:
        Response text from Gemini
    """
    try:
        if _should_backoff(_IMAGE_BACKOFF_UNTIL):
            print("[Gemini] Image model on cooldown due to quota limits")
            return None

        client = genai_client.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Encode image to base64
        image_data = base64.b64encode(image).decode("utf-8")
        
        # Create content with both text and image
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(
                        data=image,
                        mime_type="image/jpeg"  # adjust if needed: image/png, etc.
                    ),
                ],
            ),
        ]
        
        # Generate response
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=contents,
        )
        
        return response.text.strip()

    except Exception as e:
        print(f"Error generating image response with Gemini API: {e}")
        if "RESOURCE_EXHAUSTED" in str(e):
            _schedule_backoff("image", e)
        return None
    
def Jsonify(response):
    """
    Convert Gemini response text into a JSON array format.
    Assumes response is a list of tasks separated by new lines starting with '- '.
    """
    try:
        # Split response into lines and filter for lines starting with '- '
        tasks = [line[2:].strip() for line in response.split('\n') if line.startswith('- ')]
        
        # Convert list of tasks to JSON string
        json_response = json.dumps(tasks)
        
        return json_response

    except Exception as e:
        print(f"Error converting response to JSON: {e}")
        return None