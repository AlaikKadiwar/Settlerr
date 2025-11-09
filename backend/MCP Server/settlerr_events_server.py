
import httpx
from fastmcp import FastMCP

# Configuration
API_BASE_URL = "http://localhost:8000"

# Initialize FastMCP server
mcp = FastMCP("settlerr-events")


@mcp.tool()
async def get_recommended_events(username: str, min_score: float = 50.0, top_n: int = 10) -> str:
    """
    Get AI-powered personalized event recommendations based on user profile.
    Events are scored 0-100 for match quality considering interests, status, occupation, age, and location.
    
    Args:
        username: Username to get recommendations for
        min_score: Minimum match score (0-100, default: 50)
        top_n: Maximum number of events to return (default: 10)
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/getRecommendedEvents",
                params={
                    "username": username,
                    "min_score": min_score,
                    "top_n": top_n
                },
                timeout=60.0  # Longer timeout for AI matching
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    events = data.get("events", [])
                    total = data.get("total_events", 0)
                    
                    if events:
                        # Format events nicely
                        event_descriptions = []
                        for i, event in enumerate(events, 1):
                            match_score = event.get("match_score", 0)
                            name = event.get("name", "Unknown")
                            date = event.get("date", "TBD")
                            time = event.get("time", "TBD")
                            venue = event.get("venue", "TBD")
                            about = event.get("about", "No description")[:150]
                            reasoning = event.get("match_reasoning", "")
                            factors = event.get("relevance_factors", [])
                            
                            event_desc = f"""
{i}. 🎯 {name} (Match: {match_score:.1f}/100)
   📅 {date} at {time}
   📍 {venue}
   
   About: {about}...
   
   Why it matches you:
   {reasoning}
   
   Key factors: {', '.join(factors)}
"""
                            event_descriptions.append(event_desc)
                        
                        return f"""🎉 Top {total} Event Recommendations for {username}
(Minimum score: {min_score}/100)

{''.join(event_descriptions)}

💡 These events are personalized based on your interests, status, occupation, and location.
Use 'rsvp_to_event' to attend an event and get its tasks added to your list!"""
                    else:
                        return f"""No events found matching your criteria (min score: {min_score}/100).

Try:
- Lowering the min_score parameter
- Using 'get_all_suggested_events' to see all available events
- Waiting for new events to be added to the system"""
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ User '{username}' not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def get_all_suggested_events(username: str) -> str:
    """
    Get all available events that user hasn't RSVP'd to (unscored, just filtered list).
    
    Args:
        username: Username to get events for
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/getSuggestedEvents",
                params={"username": username},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    events = data.get("events", [])
                    total = data.get("total_events", 0)
                    
                    if events:
                        event_list = []
                        for i, event in enumerate(events, 1):
                            name = event.get("name", "Unknown")
                            date = event.get("date", "TBD")
                            venue = event.get("venue", "TBD")
                            
                            event_list.append(f"{i}. {name}\n   📅 {date} | 📍 {venue}")
                        
                        return f"""📋 {total} Available Events for {username}:

{'\n'.join(event_list)}

💡 Tip: Use 'get_recommended_events' for AI-powered personalized recommendations!"""
                    else:
                        return f"No events available. All events have been RSVP'd or no events in system."
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ User '{username}' not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def get_event_details(event_name: str) -> str:
    """
    Get detailed information about a specific event by name.
    
    Args:
        event_name: Name of the event to get details for
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/getEventByName",
                params={"event_name": event_name},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    event = data.get("event", {})
                    
                    name = event.get("name", "Unknown")
                    organizer = event.get("organizer", "Unknown")
                    about = event.get("about", "No description")
                    venue = event.get("venue", "TBD")
                    date = event.get("date", "TBD")
                    time = event.get("time", "TBD")
                    rsvp_limit = event.get("rsvp_limit", "N/A")
                    rsvp_users = event.get("rsvp_users", [])
                    tasks = event.get("tasks", [])
                    
                    task_list = "\n".join([
                        f"  • {task.get('task_description', 'No description')}"
                        for task in tasks
                    ]) if tasks else "  No tasks"
                    
                    return f"""🎉 {name}

👤 Organizer: {organizer}
📅 Date: {date}
🕐 Time: {time}
📍 Venue: {venue}

📝 About:
{about}

📊 RSVP Status: {len(rsvp_users)}/{rsvp_limit} attendees

✅ Event Tasks (added when you RSVP):
{task_list}

💡 Use 'rsvp_to_event' to attend this event!"""
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ Event '{event_name}' not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def rsvp_to_event(username: str, event_name: str) -> str:
    """
    RSVP user to an event. This will add the event to their attending list and add event tasks to their task list.
    
    Args:
        username: Username
        event_name: Name of the event to RSVP to
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/rsvpEvent",
                data={
                    "username": username,
                    "event_name": event_name
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("success"):
                    message = data.get("message", "RSVP successful")
                    tasks_added = data.get("tasks_added", 0)
                    event_tasks = data.get("event_tasks", [])
                    
                    task_list = "\n".join([
                        f"  • {task.get('task_description', 'No description')}"
                        for task in event_tasks
                    ]) if event_tasks else "  No tasks"
                    
                    return f"""✅ {message}

Event: {event_name}
User: {username}

📝 {tasks_added} tasks added to your list:
{task_list}

🎉 You're all set! Check your tasks with 'get_user_tasks'."""
                else:
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
            
            elif response.status_code == 404:
                return f"❌ User or event not found"
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


if __name__ == "__main__":
    mcp.run()
