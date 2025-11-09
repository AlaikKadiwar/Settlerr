#!/usr/bin/env python3
"""
Quick test script to verify AWS DynamoDB connection and user lookup
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("🔍 Testing AWS DynamoDB Connection...")
print("=" * 50)

try:
    from Databases.user_service import get_user_by_username_scan
    
    # Test with a known username
    test_username = "alaik"
    print(f"\n📋 Looking up user: {test_username}")
    
    user = get_user_by_username_scan(test_username)
    
    if user:
        print(f"✅ SUCCESS! User found:")
        print(f"   - User ID: {user.get('user_id', 'N/A')}")
        print(f"   - Username: {user.get('username', 'N/A')}")
        print(f"   - Name: {user.get('name', 'N/A')}")
        print(f"   - Email: {user.get('email', 'N/A')}")
        print(f"   - Location: {user.get('location', 'N/A')}")
        print(f"   - Interests: {user.get('interests', [])}")
        print(f"   - Tasks count: {len(user.get('tasks', []))}")
        print(f"   - Events attending: {len(user.get('events_attending', []))}")
    else:
        print(f"❌ User '{test_username}' not found in database")
        print("\n💡 This could mean:")
        print("   1. The user doesn't exist in DynamoDB")
        print("   2. The AWS connection is working but table is empty")
        print("   3. Try creating the user first")
        
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   Message: {str(e)}")
    print("\n💡 Possible issues:")
    print("   1. AWS credentials not configured")
    print("   2. DynamoDB table doesn't exist")
    print("   3. Network connectivity issues")
    print("   4. Wrong region configured")
    import traceback
    print("\n📋 Full traceback:")
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 50)
print("✅ Connection test completed successfully!")
print("The boto3 connection fixes are working! 🎉")
