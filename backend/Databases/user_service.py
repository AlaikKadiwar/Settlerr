import boto3
import uuid
import os
import bcrypt
from boto3.dynamodb.conditions import Attr, Key

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


def remove_task_from_user(username: str, task_description: str):
    """Remove a task from user's tasks list by username"""
    table = dynamodb.Table(USERS_TABLE)
    
    try:
        user = get_user_by_username_scan(username)
        if not user:
            return {"success": False, "error": "User not found"}
        
        tasks = user.get("tasks", [])
        if task_description in tasks:
            tasks.remove(task_description)
            
            table.update_item(
                Key={"user_id": user["user_id"]},
                UpdateExpression="SET tasks = :tasks",
                ExpressionAttributeValues={":tasks": tasks}
            )
            
            return {"success": True, "message": "Task removed successfully"}
        else:
            return {"success": False, "error": "Task not found in user's task list"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

# AWS setup
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
s3 = boto3.client("s3", region_name="us-east-1")

USERS_TABLE = "Users"
S3_BUCKET = "settlerr-user-photos"  # ⚠️ replace with your actual bucket name

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