import boto3
import hmac
import hashlib
import base64
import os
from botocore.exceptions import ClientError

# ==============================
# 🔧 AWS CONFIGURATION
# ==============================
REGION = "us-east-1"
USER_POOL_ID = "us-east-1_LDsILTZ0U"
CLIENT_ID = "66n7av2qrgort3l0jcmlps1q2f"
CLIENT_SECRET = "lrne1s9hh80u6cfnq9n0shg11sj65gi6g9mdsupuiq9a6dvih55"  # leave empty "" if no secret

USERS_TABLE = "Users"

cognito = boto3.client("cognito-idp", region_name=REGION)
dynamodb = boto3.resource("dynamodb", region_name=REGION)


# ==============================
# 🧩 HELPER FUNCTIONS
# ==============================
def get_secret_hash(username: str) -> str | None:
    """Compute Cognito SECRET_HASH if client secret exists."""
    if not CLIENT_SECRET:
        return None  # No secret hash needed
    message = username + CLIENT_ID
    dig = hmac.new(
        CLIENT_SECRET.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()


def signup_user(username: str, password: str, email: str):
    """Register a new user in Cognito."""
    try:
        params = {
            "ClientId": CLIENT_ID,
            "Username": username,
            "Password": password,
            "UserAttributes": [
                {"Name": "email", "Value": email}
            ]
        }
        secret_hash = get_secret_hash(username)
        if secret_hash:
            params["SecretHash"] = secret_hash

        resp = cognito.sign_up(**params)
        print(f"✅ Cognito signup successful for {username}")
        return resp
    except ClientError as e:
        print(f"❌ Error during sign-up: {e.response['Error']['Message']}")
        return None


def confirm_user(username: str):
    """Auto-confirm user in Cognito for development."""
    try:
        cognito.admin_confirm_sign_up(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        print(f"✅ User {username} confirmed in Cognito.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "UserNotFoundException":
            print("⚠️ User not found.")
        else:
            print("❌ Error confirming user:", e)


def save_user_to_dynamodb(username: str, email: str):
    """Save user record in DynamoDB."""
    table = dynamodb.Table(USERS_TABLE)
    item = {
        "user_id": username,  # or generate UUID
        "username": username,
        "email": email,
        "verified": True,
    }
    table.put_item(Item=item)
    print(f"✅ Saved user '{username}' to DynamoDB.")
def login_user(username: str, password: str):
    """Authenticate user with Cognito."""
    try:
        params = {
            "AuthFlow": "USER_PASSWORD_AUTH",
            "ClientId": CLIENT_ID,
            "AuthParameters": {
                "USERNAME": username,
                "PASSWORD": password
            }
        }

        secret_hash = get_secret_hash(username)
        if secret_hash:
            params["AuthParameters"]["SECRET_HASH"] = secret_hash

        resp = cognito.initiate_auth(**params)
        print("✅ Login successful!")
        print("🪪 ID Token:", resp["AuthenticationResult"]["IdToken"][:100], "...")
        return resp
    except ClientError as e:
        print(f"❌ Login failed: {e.response['Error']['Message']}")
        return None



# ==============================
# 🚀 MAIN FLOW
# ==============================
if __name__ == "__main__":
    username = "alaik"
    email = "alaik@example.com"
    password = "SuperSecret123!"

    response = signup_user(username, password, email)
    if not response:
        print("ℹ️ User already exists, trying to log in...")
        login_user(username, password)
    else:
        confirm_user(username)
        save_user_to_dynamodb(username, email)

