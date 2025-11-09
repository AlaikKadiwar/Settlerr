import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os

class EventbriteClient:
    """Client for interacting with the Eventbrite API"""
    
    BASE_URL = "https://www.eventbriteapi.com/v3"
    
    def __init__(self, token: Optional[str] = None):
        """Initialize with Eventbrite API token"""
        self.token = token or os.getenv("EVENTBRITE_TOKEN")
        if not self.token:
            raise ValueError("Eventbrite API token is required")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}"
        }
    
    def get_events_next_month(
        self, 
        location: str = "Calgary",
        radius: str = "10km",
        max_results: int = 100
    ) -> List[Dict]:
        """
        Fetch all events in the next month for a given location.
        
        Args:
            location: City or address to search
            radius: Search radius (e.g., "10km", "25mi")
            max_results: Maximum number of events to return
            
        Returns:
            List of event dictionaries with relevant details
        """
        # Calculate date range (today to 30 days from now)
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=30)
        
        params = {
            "location.address": location,
            "location.within": radius,
            "start_date.range_start": start_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "start_date.range_end": end_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "expand": "venue,organizer",  # Include venue and organizer details
            "page_size": min(max_results, 50)  # Max 50 per page
        }
        
        all_events = []
        page = 1
        
        while len(all_events) < max_results:
            params["page"] = page
            
            try:
                response = requests.get(
                    f"{self.BASE_URL}/events/search/",
                    headers=self.headers,
                    params=params,
                    timeout=10
                )
                response.raise_for_status()
                
                data = response.json()
                events = data.get("events", [])
                
                if not events:
                    break  # No more events
                
                # Extract and format event details
                for event in events:
                    formatted_event = self._format_event(event)
                    all_events.append(formatted_event)
                
                # Check if there are more pages
                pagination = data.get("pagination", {})
                if not pagination.get("has_more_items", False):
                    break
                
                page += 1
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching events: {e}")
                break
        
        return all_events[:max_results]
    
    def _format_event(self, event: Dict) -> Dict:
        """Extract and format relevant event details"""
        return {
            "id": event.get("id"),
            "name": event.get("name", {}).get("text", ""),
            "description": event.get("description", {}).get("text", ""),
            "url": event.get("url", ""),
            "start_time": event.get("start", {}).get("utc", ""),
            "end_time": event.get("end", {}).get("utc", ""),
            "is_free": event.get("is_free", False),
            "logo_url": event.get("logo", {}).get("url", ""),
            "venue": {
                "name": event.get("venue", {}).get("name", ""),
                "address": event.get("venue", {}).get("address", {}).get("localized_address_display", ""),
                "latitude": event.get("venue", {}).get("latitude"),
                "longitude": event.get("venue", {}).get("longitude")
            } if event.get("venue") else None,
            "organizer": {
                "name": event.get("organizer", {}).get("name", ""),
                "description": event.get("organizer", {}).get("description", {}).get("text", "")
            } if event.get("organizer") else None,
            "category": event.get("category", {}).get("name", ""),
            "capacity": event.get("capacity")
        }


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = EventbriteClient()
    
    # Get events for next month in Calgary
    events = client.get_events_next_month(
        location="Calgary",
        radius="25km",
        max_results=50
    )
    
    print(f"Found {len(events)} events in the next month:")
    for event in events[:5]:  # Print first 5
        print(f"\n- {event['name']}")
        print(f"  Date: {event['start_time']}")
        print(f"  Venue: {event['venue']['name'] if event['venue'] else 'TBA'}")
        print(f"  Free: {event['is_free']}")