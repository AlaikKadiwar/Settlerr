import boto3
import uuid
import os
import bcrypt
from boto3.dynamodb.conditions import Attr, Key
from botocore.config import Config
from botocore.exceptions import ClientError
from functools import lru_cache
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# AWS Configuration
REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
USERS_TABLE = "Users"
S3_BUCKET = "settlerr-user-photos"

# Boto3 configuration with connection pooling and retries
BOTO3_CONFIG = Config(
    region_name=REGION,
    retries={
        'max_attempts': 5,
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=60,
    max_pool_connections=50
)

@lru_cache(maxsize=1)
def get_dynamodb_resource():
    """Get or reuse DynamoDB resource with connection pooling"""
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        return boto3.resource(
            "dynamodb",
            region_name=REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            config=BOTO3_CONFIG
        )
    else:
        # Fall back to default credentials (IAM role, ~/.aws/credentials, etc.)
        return boto3.resource("dynamodb", region_name=REGION, config=BOTO3_CONFIG)

@lru_cache(maxsize=1)
def get_s3_client():
    """Get or reuse S3 client with connection pooling"""
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            config=BOTO3_CONFIG
        )
    else:
        # Fall back to default credentials (IAM role, ~/.aws/credentials, etc.)
        return boto3.client("s3", region_name=REGION, config=BOTO3_CONFIG)

# --- QUERY HELPERS ---

def get_user_by_id(user_id: str):
    """Fast lookup by primary key (user_id)."""
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(USERS_TABLE)
    resp = table.get_item(Key={"user_id": user_id})
    return resp.get("Item")


def get_user_by_username_scan(username: str):
    """Scan table to find user by username. Scans entire table if needed."""
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(USERS_TABLE)
    
    # Scan without Limit to ensure we find the user even if table is large
    # FilterExpression will only return matching items
    resp = table.scan(FilterExpression=Attr("username").eq(username))
    items = resp.get("Items", [])
    
    # Handle pagination if table is very large
    while "LastEvaluatedKey" in resp and not items:
        resp = table.scan(
            FilterExpression=Attr("username").eq(username),
            ExclusiveStartKey=resp["LastEvaluatedKey"]
        )
        items.extend(resp.get("Items", []))
    
    return items[0] if items else None


def get_user_by_username_query(username: str):
    """
    Efficient lookup if you create a GSI on 'username' (index name: 'username-index').
    Requires the GSI to exist (see aws_setup.py change below).
    """
    dynamodb = get_dynamodb_resource()
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
    dynamodb = get_dynamodb_resource()
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
    dynamodb = get_dynamodb_resource()
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
    dynamodb = get_dynamodb_resource()
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
    dynamodb = get_dynamodb_resource()
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
    
    s3 = get_s3_client()
    file_name = os.path.basename(file_path)
    s3_key = f"user_photos/{user_id}/{file_name}"

    # Upload to S3
    s3.upload_file(file_path, S3_BUCKET, s3_key)
    print(f"✅ Uploaded {file_name} to S3")

    # Return public URL
    return f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}"

# Create user and store their photo
def create_user(data: dict):
    dynamodb = get_dynamodb_resource()
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


def update_user_profile(username: str, updates: dict):
    """Update arbitrary fields on a user identified by username."""
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(USERS_TABLE)

    try:
        user = get_user_by_username_scan(username)
        if not user:
            return {"success": False, "error": "User not found"}

        # Build UpdateExpression dynamically
        expr_parts = []
        expr_values = {}
        expr_names = {}

        for i, (k, v) in enumerate(updates.items()):
            key_placeholder = f":val{i}"
            name_placeholder = f"#k{i}"
            expr_parts.append(f"{name_placeholder} = {key_placeholder}")
            expr_values[key_placeholder] = v
            expr_names[name_placeholder] = k

        update_expr = "SET " + ", ".join(expr_parts)

        table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names,
        )

        # Return the updated user object
        updated = get_user_by_id(user["user_id"])
        return {"success": True, "user": updated}

    except Exception as e:
        return {"success": False, "error": str(e)}


def list_all_users(limit: int = 50):
    """Return up to `limit` users by scanning the Users table."""
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(USERS_TABLE)

    try:
        resp = table.scan(Limit=limit)
        items = resp.get("Items", [])

        # Handle pagination if necessary
        while "LastEvaluatedKey" in resp and len(items) < limit:
            resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"], Limit=limit - len(items))
            items.extend(resp.get("Items", []))

        return items
    except Exception as e:
        return []

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