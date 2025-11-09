#!/usr/bin/env python3
"""
List all users in the DynamoDB Users table
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("🔍 Scanning Users table in DynamoDB...")
print("=" * 50)

try:
    from Databases.user_service import get_dynamodb_resource
    
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table("Users")
    
    # Scan the entire table (warning: expensive for large tables)
    response = table.scan()
    users = response.get('Items', [])
    
    print(f"\n📊 Found {len(users)} user(s) in the database:\n")
    
    if users:
        for idx, user in enumerate(users, 1):
            print(f"{idx}. Username: {user.get('username', 'N/A')}")
            print(f"   User ID: {user.get('user_id', 'N/A')}")
            print(f"   Name: {user.get('name', 'N/A')}")
            print(f"   Email: {user.get('email', 'N/A')}")
            print(f"   Location: {user.get('location', 'N/A')}")
            print(f"   Tasks: {len(user.get('tasks', []))} task(s)")
            print(f"   Events: {len(user.get('events_attending', []))} event(s)")
            print()
    else:
        print("❌ No users found in the database!")
        print("\n💡 The table exists but is empty. You need to:")
        print("   1. Create a user through the signup flow")
        print("   2. Or run the user creation script")
        print("   3. Check if you're looking at the right region/table")
        
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   Message: {str(e)}")
    import traceback
    print("\n📋 Full traceback:")
    traceback.print_exc()
    sys.exit(1)

print("=" * 50)
