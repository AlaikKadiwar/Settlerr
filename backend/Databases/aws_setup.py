import boto3
import os
from botocore.config import Config
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- AWS CONFIGURATION ---
REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
USERS_TABLE = "Users"
EVENTS_TABLE = "Events"
S3_BUCKET = "settlerr-user-photos"  # must be globally unique

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
def get_dynamodb_client():
    """Get or reuse DynamoDB client with connection pooling"""
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "dynamodb",
            region_name=REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            config=BOTO3_CONFIG
        )
    else:
        return boto3.client("dynamodb", region_name=REGION, config=BOTO3_CONFIG)

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
        return boto3.client("s3", region_name=REGION, config=BOTO3_CONFIG)


# --- CREATE USERS TABLE ---
def create_users_table():
    dynamodb = get_dynamodb_client()
    try:
        print("🔧 Creating Users table...")
        dynamodb.create_table(
            TableName=USERS_TABLE,
            KeySchema=[
                {"AttributeName": "user_id", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "user_id", "AttributeType": "S"},
                {"AttributeName": "username", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST",
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "username-index",
                    "KeySchema": [
                        {"AttributeName": "username", "KeyType": "HASH"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ]
        )
        print("✅ Users table created")
    except dynamodb.exceptions.ResourceInUseException:
        print("⚠️ Users table already exists")


# --- CREATE EVENTS TABLE ---
def create_events_table():
    dynamodb = get_dynamodb_client()
    try:
        print("🔧 Creating Events table...")
        dynamodb.create_table(
            TableName=EVENTS_TABLE,
            KeySchema=[
                {"AttributeName": "event_id", "KeyType": "HASH"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "event_id", "AttributeType": "S"},
                {"AttributeName": "date", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST",
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "date-index",
                    "KeySchema": [
                        {"AttributeName": "date", "KeyType": "HASH"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ]
        )
        print("✅ Events table created")
        print("ℹ️ Fields for each event:")
        print("   name, organizer, about, venue, date, time, rsvp_limit, rsvp_users, tasks")
    except dynamodb.exceptions.ResourceInUseException:
        print("⚠️ Events table already exists")


# --- CREATE S3 BUCKET ---
def create_s3_bucket():
    s3 = get_s3_client()
    try:
        print(f"🪣 Creating S3 bucket '{S3_BUCKET}'...")

        if REGION == "us-east-1":
            s3.create_bucket(Bucket=S3_BUCKET)
        else:
            s3.create_bucket(
                Bucket=S3_BUCKET,
                CreateBucketConfiguration={"LocationConstraint": REGION}
            )

        print(f"✅ S3 bucket '{S3_BUCKET}' created")
    except s3.exceptions.BucketAlreadyOwnedByYou:
        print("⚠️ Bucket already exists and is owned by you")
    except s3.exceptions.BucketAlreadyExists:
        print("⚠️ Bucket name already taken (choose a new one)")


# --- RUN SETUP ---
if __name__ == "__main__":
    create_users_table()
    create_events_table()
    create_s3_bucket()
    print("🏗️ AWS setup complete.")
