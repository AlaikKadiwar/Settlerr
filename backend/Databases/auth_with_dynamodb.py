import boto3
import uuid
from botocore.exceptions import ClientError

# === CONFIGURATION ===
REGION = "us-east-1"  # change to your AWS region
USER_POOL_ID = "us-east-1_XXXXXXX"
CLIENT_ID = "4pq3exampleappclientid"
USERS_TABLE = "Users"

# AWS clients
cognito = boto3.client("cognito-idp", region_name=REGION)
dynamodb = boto3.resource("dynamodb", region_name=REGION)
users_table = dynamodb.Table(USERS_TABLE)

# === FUNCTIONS ===

def sign_up_user(username, password, email, age, interests, photo_url):
    """Registers the user in Cognito and DynamoDB."""
    try:
        # 1️⃣ Sign up in Cognito
        resp = cognito.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password,
            UserAttributes=[{"Name": "email", "Value": email}],
        )

        user_sub = resp["UserSub"]  # Cognito’s unique user ID (UUID)

        # 2️⃣ Add user entry to DynamoDB
        users_table.put_item(
            Item={
                "user_id": user_sub,
                "username": username,
                "email": email,
                "age": age,
                "interests": interests,
                "photo_url": photo_url,
                "verified": False,
            }
        )

        print(f"✅ User '{username}' created in Cognito and DynamoDB.")
        print(f"UserSub: {user_sub}")

    except ClientError as e:
        print("❌ Error:", e.response["Error"]["Message"])


def confirm_user(username, code):
    """Confirm sign-up via verification code."""
    try:
        cognito.confirm_sign_up(ClientId=CLIENT_ID, Username=username, ConfirmationCode=code)
        # Update DynamoDB record as verified
        resp = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=username)
        user_sub = next(attr["Value"] for attr in resp["UserAttributes"] if attr["Name"] == "sub")
        users_table.update_item(
            Key={"user_id": user_sub},
            UpdateExpression="SET verified = :v",
            ExpressionAttributeValues={":v": True}
        )
        print(f"✅ User {username} confirmed and verified.")
    except ClientError as e:
        print("❌ Confirmation failed:", e.response["Error"]["Message"])


def login_user(username, password):
    """Authenticate user and return Cognito tokens."""
    try:
        resp = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": username, "PASSWORD": password}
        )
        print("✅ Login successful!")
        return resp["AuthenticationResult"]
    except ClientError as e:
        print("❌ Login failed:", e.response["Error"]["Message"])
        return None


# === DEMO ===
if __name__ == "__main__":
    # 1️⃣ Sign up
    sign_up_user(
        username="alaik",
        password="SuperSecret123!",
        email="alaik@example.com",
        age=25,
        interests=["tech", "AI", "networking"],
        photo_url="https://settlerr-user-photos.s3.amazonaws.com/alaik.jpg"
    )

    # 2️⃣ Confirm user (after email)
    # confirm_user("alaik", "123456")

    # 3️⃣ Login
    # tokens = login_user("alaik", "SuperSecret123!")
    # print(tokens)
