import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
EVENTS_TABLE = "Events"

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
        "tasks": data.get("tasks", []),  # 👈 grouped tasks
        "created_at": datetime.utcnow().isoformat()
    }

    table.put_item(Item=item)
    print(f"✅ Event created: {event_id}")
    return item


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
