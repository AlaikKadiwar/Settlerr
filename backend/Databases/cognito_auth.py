import boto3
import hmac, hashlib, base64

USER_POOL_ID = "us-east-1_LDsILTZ0U"
CLIENT_ID = "66n7av2qrgort3l0jcmlps1q2f"
CLIENT_SECRET = "lrne1s9hh80u6cfnq9n0shg11sj65gi6g9mdsupuiq9a6dvih55"
REGION = "us-east-1"

def calculate_secret_hash(username):
    message = username + CLIENT_ID
    dig = hmac.new(
        CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

client = boto3.client("cognito-idp", region_name=REGION)

def login(username, password):
    try:
        resp = client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password,
                "SECRET_HASH": calculate_secret_hash(username)
            }
        )
        print("✅ Login successful!")
        print("🪪 ID Token:", resp["AuthenticationResult"]["IdToken"][:100] + "...")
    except client.exceptions.NotAuthorizedException:
        print("❌ Incorrect username or password.")
    except client.exceptions.UserNotConfirmedException:
        print("❌ User not confirmed.")
    except Exception as e:
        print(f"❌ Error during login: {e}")

if __name__ == "__main__":
    login("alaik", "SuperSecret123!")