import google.generativeai as genai
import base64
import os
from dotenv import load_dotenv
from google.genai import types
from google import genai as genai_client

load_dotenv()

genai.configure(api_key = os.getenv("GEMINI_API_KEY"))

def gemini(prompt):
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        response = model.generate_content(f"prompt starts =  {prompt} ")

        # Remove any "Assistant:" prefix from the response
        answer = response.text.strip()

        return answer

    except Exception as e:
        print(f"Error using Gemini API: {e}")
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
        return None