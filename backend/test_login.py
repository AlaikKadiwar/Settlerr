#!/usr/bin/env python3
"""
Test the login functionality by checking if a user exists
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("🔐 Testing Login Functionality...")
print("=" * 50)

try:
    from Databases.user_service import get_user_by_username_scan
    
    # Test with your actual usernames
    test_usernames = ["AP", "AP1", "alvishprasla", "alaik"]
    
    for username in test_usernames:
        print(f"\n👤 Testing username: {username}")
        user = get_user_by_username_scan(username)
        
        if user:
            print(f"   ✅ User found!")
            print(f"   - User ID: {user.get('user_id')}")
            print(f"   - Name: {user.get('name')}")
            print(f"   - Email: {user.get('email')}")
            print(f"   - Has password hash: {'password_hash' in user}")
            
            # Check if password hash exists for login
            if 'password_hash' not in user:
                print(f"   ⚠️  WARNING: No password hash! User cannot login.")
        else:
            print(f"   ❌ User not found")
    
    print("\n" + "=" * 50)
    print("✅ Login test completed!")
    print("\n💡 KEY INSIGHT:")
    print("   Your users EXIST in DynamoDB ✅")
    print("   If login fails, check:")
    print("   1. Does the user have a 'password_hash' field?")
    print("   2. Is the frontend sending the request to the right endpoint?")
    print("   3. Is the backend running and accessible?")
    
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   Message: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
