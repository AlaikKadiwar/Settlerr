"""
Event Matchmaking Engine
Matches users with events based on their profile (interests, status, occupation, age, location)
"""

from gemini import gemini
import json
from datetime import datetime


def calculate_event_match_score(user_profile: dict, event: dict) -> dict:
    """
    Use Gemini AI to intelligently match user profile with event details
    
    Args:
        user_profile: User's profile data (interests, status, occupation, age, location, language)
        event: Event data (name, about, venue, date, time)
    
    Returns:
        {
            "score": float (0-100),
            "reasoning": str,
            "relevance_factors": [str]
        }
    """
    
    # Extract user data
    dob = user_profile.get("dob", "Unknown")
    status = user_profile.get("status", "settler")
    
    # Decode status
    if status == "S":
        status_full = "International Student with a study permit"
    elif status == "R":
        status_full = "International refugee person seeking employment"
    elif status == "W":
        status_full = "International worker with work permit"
    else:
        status_full = "New settler"
    
    interests = user_profile.get("interests", [])
    location = user_profile.get("location", "Calgary")
    language = user_profile.get("language", ["English"])
    occupation = user_profile.get("occupation", "Professional")
    
    # Extract event data
    event_name = event.get("name", "")
    event_about = event.get("about", "")
    event_venue = event.get("venue", "")
    event_date = event.get("date", "")
    
    # Create AI prompt for intelligent matching
    prompt = f"""You are an event recommendation expert. Analyze how well this event matches the user's profile and provide a match score.

USER PROFILE:
- Status: {status_full}
- Age/DOB: {dob}
- Interests: {', '.join(interests) if interests else 'Not specified'}
- Location: {location}
- Languages: {', '.join(language) if isinstance(language, list) else language}
- Occupation: {occupation}

EVENT DETAILS:
- Name: {event_name}
- Description: {event_about[:300] if event_about else 'No description'}
- Venue: {event_venue}
- Date: {event_date}

SCORING CRITERIA:
- Interest alignment (40%): Does the event match user's interests?
- Status relevance (25%): Is this event suitable for their immigrant/student/refugee/worker status?
- Professional relevance (20%): Does it align with their occupation or career goals?
- Location convenience (10%): Is it in their city?
- Language accessibility (5%): Does it match their language preferences?

Return ONLY a JSON object (no markdown, no extra text) with this exact structure:
{{
    "score": 85.5,
    "reasoning": "Brief explanation of why this event matches",
    "relevance_factors": ["Factor 1", "Factor 2", "Factor 3"]
}}

Score range: 0-100 (0 = no match, 100 = perfect match)"""

    try:
        response = gemini(prompt)
        
        # Try to parse JSON from response
        # Remove markdown code blocks if present
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        match_data = json.loads(response)
        
        # Validate score
        score = float(match_data.get("score", 0))
        score = max(0, min(100, score))  # Clamp between 0-100
        
        return {
            "score": score,
            "reasoning": match_data.get("reasoning", "No reasoning provided"),
            "relevance_factors": match_data.get("relevance_factors", [])
        }
    
    except Exception as e:
        print(f"Error in matchmaking: {str(e)}")
        print(f"Raw response: {response if 'response' in locals() else 'No response'}")
        
        # Fallback: Basic keyword matching
        return fallback_matching(user_profile, event)


def fallback_matching(user_profile: dict, event: dict) -> dict:
    """
    Simple keyword-based matching as fallback when AI fails
    """
    score = 0
    factors = []
    
    interests = user_profile.get("interests", [])
    location = user_profile.get("location", "Calgary")
    
    event_name = event.get("name", "").lower()
    event_about = event.get("about", "").lower()
    event_venue = event.get("venue", "").lower()
    event_text = f"{event_name} {event_about} {event_venue}"
    
    # Interest matching (40 points)
    if interests:
        matched_interests = [interest for interest in interests if interest.lower() in event_text]
        if matched_interests:
            score += 40
            factors.append(f"Matches interests: {', '.join(matched_interests)}")
    
    # Location matching (20 points)
    if location.lower() in event_text:
        score += 20
        factors.append(f"Located in {location}")
    
    # General relevance keywords (20 points)
    relevance_keywords = ["networking", "community", "meetup", "workshop", "career", "social"]
    if any(keyword in event_text for keyword in relevance_keywords):
        score += 20
        factors.append("Relevant for networking/community building")
    
    # Newcomer-friendly keywords (20 points)
    newcomer_keywords = ["newcomer", "immigrant", "international", "welcome", "newcomers"]
    if any(keyword in event_text for keyword in newcomer_keywords):
        score += 20
        factors.append("Newcomer-friendly event")
    
    return {
        "score": min(score, 100),
        "reasoning": "Basic keyword matching",
        "relevance_factors": factors if factors else ["General event"]
    }


def get_recommended_events_for_user(user_profile: dict, all_events: list, min_score: float = 50.0, top_n: int = 10) -> list:
    """
    Get top recommended events for a user based on their profile
    
    Args:
        user_profile: User's profile dictionary
        all_events: List of all available events
        min_score: Minimum match score to include (0-100)
        top_n: Maximum number of events to return
    
    Returns:
        List of events with match scores, sorted by score (highest first)
    """
    
    scored_events = []
    
    for event in all_events:
        match_result = calculate_event_match_score(user_profile, event)
        
        if match_result["score"] >= min_score:
            event_with_score = event.copy()
            event_with_score["match_score"] = match_result["score"]
            event_with_score["match_reasoning"] = match_result["reasoning"]
            event_with_score["relevance_factors"] = match_result["relevance_factors"]
            
            scored_events.append(event_with_score)
    
    # Sort by score (descending)
    scored_events.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Return top N
    return scored_events[:top_n]


def batch_score_events(user_profile: dict, events: list) -> list:
    """
    Score multiple events for a user at once
    
    Args:
        user_profile: User's profile dictionary
        events: List of events to score
    
    Returns:
        List of events with match scores added
    """
    scored_events = []
    
    for event in events:
        match_result = calculate_event_match_score(user_profile, event)
        
        event_with_score = event.copy()
        event_with_score["match_score"] = match_result["score"]
        event_with_score["match_reasoning"] = match_result["reasoning"]
        event_with_score["relevance_factors"] = match_result["relevance_factors"]
        
        scored_events.append(event_with_score)
    
    # Sort by score
    scored_events.sort(key=lambda x: x["match_score"], reverse=True)
    
    return scored_events
