
import httpx
from fastmcp import FastMCP

# Configuration
API_BASE_URL = "http://localhost:8000"

# Initialize FastMCP server
mcp = FastMCP("settlerr-events")


@mcp.tool()
async def find_events(search_prompt: str, max_events: int = 10) -> str:
    """
    Find events based on your interests and preferences described in natural language.
    Uses Gemini AI via backend API to match events to your description.
    
    Args:
        search_prompt: Describe what you're looking for (e.g., "tech networking events for students", "cultural events for newcomers", "sports and fitness activities")
        max_events: Maximum number of events to return (default: 10)
    """
    async with httpx.AsyncClient() as client:
        try:
            # Call backend API that uses Gemini for AI matching
            response = await client.post(
                f"{API_BASE_URL}/api/findEventsByPrompt",
                data={
                    "search_prompt": search_prompt,
                    "max_events": max_events
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get("success"):
                    return f"❌ Error: {data.get('error', 'Unknown error')}"
                
                matches = data.get("matches", [])
                
                if not matches:
                    message = data.get("message", "No events match your criteria")
                    return f"No events found matching: '{search_prompt}'\n\n{message}"
                
                # Format matched events
                result_events = []
                for match in matches:
                    event = match.get("event", {})
                    score = match.get("score", 0)
                    reason = match.get("reason", "No reason provided")
                    
                    result_events.append(f"""
🎯 {event.get('name', 'Unknown')} (Match: {score}/100)
   📅 {event.get('date', 'TBD')} at {event.get('time', 'TBD')}
   📍 {event.get('venue', 'TBD')}
   
   About: {event.get('about', 'No description')[:200]}...
   
   Why it matches: {reason}
""")
                
                fallback_note = " (using keyword matching)" if data.get("fallback") else " (powered by Gemini AI)"
                
                return f"""🎉 Found {len(result_events)} events matching: "{search_prompt}"{fallback_note}

{''.join(result_events)}

💡 Want more details? Ask about a specific event by name!"""
            
            else:
                return f"❌ Error: HTTP {response.status_code}"
        
        except Exception as e:
            return f"❌ Error: {str(e)}"


@mcp.tool()
async def list_all_events() -> str:
    """
    List all available events in the system without filtering.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/getNewEvents",
                params={"location": "Calgary", "max_results": 100},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                events = data.get("events", [])
                
                if events:
                    event_list = []
                    for i, event in enumerate(events[:20], 1):  # Show first 20
                        name = event.get("name", "Unknown")
                        date = event.get("date", "TBD")
                        venue = event.get("venue", "TBD")
                        
                        event_list.append(f"{i}. {event.get('name')}\n   📅 {date} | 📍 {venue}")
                    
                    return f"""📋 {len(events)} Events Available (showing first 20):

{chr(10).join(event_list)}

💡 Use 'find_events' with a description to get personalized matches!"""
                else:
                    return "No events available yet. Events need to be scraped first."
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





if __name__ == "__main__":
    mcp.run()
