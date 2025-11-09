import boto3
import uuid
import os
import bcrypt
from boto3.dynamodb.conditions import Attr, Key

# AWS setup - MUST BE BEFORE FUNCTIONS
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
s3 = boto3.client("s3", region_name="us-east-1")

USERS_TABLE = "Users"
S3_BUCKET = "settlerr-user-photos"

# --- QUERY HELPERS ---

def get_user_by_id(user_id: str):
    """Fast lookup by primary key (user_id)."""
    table = dynamodb.Table(USERS_TABLE)
    resp = table.get_item(Key={"user_id": user_id})
    return resp.get("Item")


def get_user_by_username_scan(username: str):
    """Inefficient: scans whole table. Use only for low-volume or testing."""
    table = dynamodb.Table(USERS_TABLE)
    resp = table.scan(FilterExpression=Attr("username").eq(username), Limit=1)
    items = resp.get("Items", [])
    return items[0] if items else None


def get_user_by_username_query(username: str):
    """
    Efficient lookup if you create a GSI on 'username' (index name: 'username-index').
    Requires the GSI to exist (see aws_setup.py change below).
    """
    table = dynamodb.Table(USERS_TABLE)
    resp = table.query(
        IndexName="username-index",
        KeyConditionExpression=Key("username").eq(username),
        Limit=1
    )
    items = resp.get("Items", [])
    return items[0] if items else None


def list_users_by_interest(interest: str, limit: int = 50):
    """Scan with filter to find users containing an interest."""
    table = dynamodb.Table(USERS_TABLE)
    resp = table.scan(
        FilterExpression=Attr("interests").contains(interest),
        Limit=limit
    )
    return resp.get("Items", [])


def check_username_availability(username: str):
    """Check if username is available (not in use)"""
    try:
        user = get_user_by_username_scan(username)
        if user:
            return {
                "success": True,
                "available": False,
                "message": "Username is already taken"
            }
        else:
            return {
                "success": True,
                "available": True,
                "message": "Username is available"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


def add_event_to_user(username: str, event_name: str):
    """Add event to user's events_attending list"""
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return {"success": False, "error": "User not found"}
        
        events_attending = user.get("events_attending", [])
        
        if event_name in events_attending:
            return {
                "success": True,
                "message": "User already registered for this event",
                "already_attending": True
            }
        
        events_attending.append(event_name)
        
        table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression="SET events_attending = :events",
            ExpressionAttributeValues={":events": events_attending}
        )
        
        return {
            "success": True,
            "message": "Event added to user's attending list",
            "already_attending": False
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}


def add_tasks_to_user(username: str, tasks_list: list):
    """Add multiple tasks to user's tasks list"""
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        user = get_user_by_username_scan(username)
        
        if not user:
            return {"success": False, "error": "User not found"}
        
        current_tasks = user.get("tasks", [])
        new_tasks = [task for task in tasks_list if task not in current_tasks]
        
        if not new_tasks:
            return {
                "success": True,
                "message": "All tasks already exist",
                "tasks_added": 0,
                "total_tasks": len(current_tasks)
            }
        
        updated_tasks = current_tasks + new_tasks
        
        table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression="SET tasks = :tasks",
            ExpressionAttributeValues={":tasks": updated_tasks}
        )
        
        return {
            "success": True,
            "message": "Tasks added successfully",
            "tasks_added": len(new_tasks),
            "total_tasks": len(updated_tasks)
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}


def remove_task_from_user(username: str, task_description: str):
    """Remove a task from user's tasks list by username"""
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        print(f"[DEBUG] Looking for user: {username}")
        user = get_user_by_username_scan(username)
        
        if not user:
            print(f"[DEBUG] User not found: {username}")
            return {"success": False, "error": "User not found"}
        
        print(f"[DEBUG] Found user: {user['user_id']}")
        tasks = user.get("tasks", [])
        print(f"[DEBUG] User has {len(tasks)} tasks")
        print(f"[DEBUG] Looking for task: {task_description}")
        
        if task_description in tasks:
            print(f"[DEBUG] Task found! Removing...")
            tasks.remove(task_description)
            
            table.update_item(
                Key={"user_id": user["user_id"]},
                UpdateExpression="SET tasks = :tasks",
                ExpressionAttributeValues={":tasks": tasks}
            )
            
            print(f"[DEBUG] Task removed successfully. Remaining tasks: {len(tasks)}")
            return {"success": True, "message": "Task removed successfully", "remaining_tasks": len(tasks)}
        else:
            print(f"[DEBUG] Task NOT found in user's task list")
            print(f"[DEBUG] User's tasks: {tasks[:3]}...")  # Show first 3 tasks
            return {"success": False, "error": "Task not found in user's task list", "user_tasks_count": len(tasks)}
    
    except Exception as e:
        print(f"[DEBUG] Exception: {str(e)}")
        return {"success": False, "error": str(e)}

# Helper: hash password
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# Helper: upload photo
def upload_user_photo(user_id: str, file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    file_name = os.path.basename(file_path)
    s3_key = f"user_photos/{user_id}/{file_name}"

    # Upload to S3
    s3.upload_file(file_path, S3_BUCKET, s3_key)
    print(f"✅ Uploaded {file_name} to S3")

    # Return public URL
    return f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"

# Create user and store their photo
def create_user(data: dict):
    table = dynamodb.Table(USERS_TABLE)
    user_id = "u-" + str(uuid.uuid4())

    password_hash = hash_password(data["password"])
    item = {
        "user_id": user_id,   # ✅ fixed key name
        "name": data["name"],
        "username": data["username"],
        "email": data["email"],
        "dob": data["dob"],
        "phone": data["phone"],
        "status": data.get("status", "s"),
        "interests": data.get("interests", []),
        "location": data.get("location", ""),
        "language": data.get("language", []),
        "password_hash": password_hash,
        "social": data.get("social", {}),
        "events_attending": data.get("events_attending",[],),
        "tasks":data.get("tasks",[])
    }

    # Upload photo to S3
    if data.get("profile_picture_path"):
        try:
            photo_url = upload_user_photo(user_id, data["profile_picture_path"])
            item["profile_picture_url"] = photo_url
        except FileNotFoundError as e:
            print("❌", e)

    # Save to DynamoDB
    table.put_item(Item=item)
    print(f"✅ User created: {user_id}")
    return item

# Example usage
if __name__ == "__main__":
    user = create_user({
        "username": "alaik",
        "name": "Alaik Kadiwar",
        "email": "alaik@example.com",
        "password": "SuperSecret123!",
        "dob": "1998-05-13",
        "phone": "+1-555-111-2222",
        "status": "s",
        "interests": ["AI", "music"],
        "location": "Calgary",
        "language": ["English"],
        "social": {
            "instagram": "alaik_insta",
            "x": "@alaikX",
            "whatsapp": "+15551112222"
        },
        "events_attending": [],
        "tasks": [
            "Secure temporary accommodation (hostel, Airbnb) for the first few weeks while searching for permanent housing.",
            "Open a Canadian bank account at a student-friendly branch (e.g., TD, RBC) and obtain a debit card.",
            "Apply for a Social Insurance Number (SIN) at a Service Canada location.",
            "Apply for Alberta Health Care Insurance Plan (AHCIP) coverage.",
            "Begin your search for permanent housing using online resources (e.g., RentFaster, Facebook Marketplace) focusing on areas near your school and accessible by public transportation.",
            "Familiarize yourself with Calgary's public transportation system (Calgary Transit): purchase a monthly pass or load funds onto a reloadable card.",
            "Explore local coding communities and meetups (e.g., CalgaryJS, Meetup.com) to network and share your passion.",
            "Visit local music venues and record stores (e.g., Broken City, Recordland) to discover Calgary's music scene and possibly find open mic nights.",
            "Register for your courses at your educational institution and attend any orientation sessions for international students.",
            "Locate essential amenities near your accommodation and school: grocery stores, pharmacies, libraries."
        ],
        "profile_picture_path": "images/alaik.jpg"  # 👈 Path to photo
    })
    print("Created user:", user)