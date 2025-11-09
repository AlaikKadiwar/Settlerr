import boto3
from botocore.exceptions import ClientError

USER_POOL_ID = "us-east-1_LDsILTZ0U"
CLIENT_ID = "66n7av2qrgort3l0jcmlps1q2f"

client = boto3.client("cognito-idp", region_name="us-east-1")

def sign_up(username, password, email):
    try:
        resp = client.sign_up(
            ClientId=CLIENT_ID,
            Username=username,
            Password=password,
            UserAttributes=[
                {"Name": "email", "Value": email}
            ]
        )
        print("✅ User signed up:", resp)
    except ClientError as e:
        print("❌ Error during sign-up:", e.response["Error"]["Message"])

def confirm_user(username, code):
    """Use the confirmation code from the email"""
    try:
        client.confirm_sign_up(ClientId=CLIENT_ID, Username=username, ConfirmationCode=code)
        print("✅ User confirmed!")
    except ClientError as e:
        print("❌ Confirmation failed:", e.response["Error"]["Message"])

def login(username, password):
    try:
        resp = client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": username, "PASSWORD": password}
        )
        print("✅ Login successful!")
        print("ID Token:", resp["AuthenticationResult"]["IdToken"])
    except ClientError as e:
        print("❌ Login failed:", e.response["Error"]["Message"])

# Example usage
if __name__ == "__main__":
    sign_up("alaik", "SuperSecret123!", "alaik@example.com")
    # confirm_user("alaik", "123456")  # after you receive the email
    # login("alaik", "SuperSecret123!")
