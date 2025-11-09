import boto3
import uuid
import os
from datetime import datetime
from boto3.dynamodb.conditions import Attr
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
else:
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

EVENTS_TABLE = os.getenv("DYNAMODB_TABLE", "Events")

def create_event(data: dict):
    table = dynamodb.Table(EVENTS_TABLE)
    event_id = "e-" + str(uuid.uuid4())

    item = {
        "event_id": event_id,
        "name": data["name"],
        "organizer": data["organizer"],
        "about": data.get("about", ""),
        "venue": data.get("venue", ""),
        "date": data["date"],
        "time": data["time"],
        "rsvp_limit": data.get("rsvp_limit", 50),
        "rsvp_users": [],
        "tasks": data.get("tasks", []),
        "created_at": datetime.utcnow().isoformat()
    }

    table.put_item(Item=item)
    return item


def get_event_by_name(event_name: str):
    """Get event by name"""
    table = dynamodb.Table(EVENTS_TABLE)
    try:
        response = table.scan(
            FilterExpression=Attr("name").eq(event_name),
            Limit=1
        )
        items = response.get("Items", [])
        return items[0] if items else None
    except:
        return None


def get_all_events():
    """Get all events from the database"""
    table = dynamodb.Table(EVENTS_TABLE)
    try:
        response = table.scan()
        events = response.get("Items", [])
        
        # Handle pagination if there are more items
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            events.extend(response.get("Items", []))
        
        return events
    except Exception as e:
        print(f"Error fetching events: {str(e)}")
        return []


def add_user_to_event_rsvp(event_name: str, username: str):
    """Add user to event's RSVP list"""
    table = dynamodb.Table(EVENTS_TABLE)
    try:
        event = get_event_by_name(event_name)
        if not event:
            return {"success": False, "error": "Event not found"}
        
        rsvp_users = event.get("rsvp_users", [])
        
        if username in rsvp_users:
            return {"success": False, "error": "User already RSVPed to this event"}
        
        rsvp_users.append(username)
        
        table.update_item(
            Key={"event_id": event["event_id"]},
            UpdateExpression="SET rsvp_users = :rsvp_users",
            ExpressionAttributeValues={":rsvp_users": rsvp_users}
        )
        
        return {
            "success": True,
            "message": "RSVP successful",
            "event_tasks": event.get("tasks", [])
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def check_event_exists(event_name: str, event_date: str, event_url: str = None):
    """Check if event already exists in database by name and date"""
    table = dynamodb.Table(EVENTS_TABLE)
    
    try:
        if event_url:
            response = table.scan(
                FilterExpression=Attr("event_url").eq(event_url)
            )
            if response.get("Items"):
                return True
        
        response = table.scan(
            FilterExpression=Attr("name").eq(event_name) & Attr("date").eq(event_date)
        )
        return len(response.get("Items", [])) > 0
    except:
        return False


def add_scraped_event(event_data: dict, event_tasks: list = None):
    """Add a scraped event to database with generated tasks, avoiding duplicates"""
    table = dynamodb.Table(EVENTS_TABLE)
    
    event_name = event_data.get("name", "")
    event_url = event_data.get("url", "")
    start_time = event_data.get("start_time", "")
    
    event_date = ""
    if start_time:
        try:
            if 'T' in start_time:
                dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                event_date = dt.strftime("%Y-%m-%d")
            else:
                event_date = start_time.split()[0] if start_time else ""
        except:
            event_date = start_time.split()[0] if start_time else ""
    
    if check_event_exists(event_name, event_date, event_url):
        return None
    
    event_id = event_url.split('/')[-1].split('?')[0] if event_url else "e-" + str(uuid.uuid4())
    if not event_id.startswith('e-'):
        event_id = f"e-{event_id}"
    
    venue_info = event_data.get("venue", {}) or {}
    venue_name = venue_info.get("name", "") if isinstance(venue_info, dict) else ""
    
    organizer_info = event_data.get("organizer", {}) or {}
    organizer_name = organizer_info.get("name", "Unknown") if isinstance(organizer_info, dict) else "Unknown"
    
    item = {
        "event_id": event_id,
        "name": event_name,
        "organizer": organizer_name,
        "about": event_data.get("description", ""),
        "venue": venue_name,
        "date": event_date,
        "time": start_time,
        "date_display": event_data.get("date_display", ""),
        "end_time": event_data.get("end_time", ""),
        "event_url": event_url,
        "logo_url": event_data.get("logo_url", ""),
        "is_free": event_data.get("is_free", False),
        "rsvp_limit": 50,
        "rsvp_users": [],
        "tasks": event_tasks if event_tasks else [],
        "created_at": datetime.utcnow().isoformat(),
        "source": "eventbrite_scraper"
    }
    
    try:
        table.put_item(Item=item)
        return item
    except Exception as e:
        raise Exception(f"Failed to add event: {e}")


def bulk_add_scraped_events(events: list, generate_tasks_func=None):
    """Add multiple scraped events with generated tasks, avoiding duplicates"""
    added = []
    skipped = []
    errors = []
    
    for event in events:
        try:
            event_tasks = []
            if generate_tasks_func:
                event_tasks = generate_tasks_func(
                    event.get("name", ""),
                    event.get("description", ""),
                    event.get("venue", {}).get("name", "") if isinstance(event.get("venue"), dict) else ""
                )
            
            result = add_scraped_event(event, event_tasks)
            if result:
                added.append(result)
            else:
                skipped.append(event.get("name", "Unknown"))
        except Exception as e:
            errors.append({"event": event.get("name", "Unknown"), "error": str(e)})
    
    return {
        "added": len(added),
        "skipped": len(skipped),
        "errors": len(errors),
        "details": {
            "added_events": [e["name"] for e in added],
            "skipped_events": skipped,
            "error_details": errors
        }
    }


if __name__ == "__main__":
    event = create_event({
        "name": "Tech Networking Night",
        "organizer": "Settlerr Team",
        "about": "An evening to connect with tech professionals and enthusiasts.",
        "venue": "Calgary Downtown",
        "date": "2025-12-10",
        "time": "18:00",
        "rsvp_limit": 50,
        "tasks": ["Welcome newcomers", "Group by interests", "Exchange contacts"]
    })
    print(event)
