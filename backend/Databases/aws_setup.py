import boto3

# --- AWS CONFIGURATION ---
REGION = "us-east-1"
dynamodb = boto3.client("dynamodb", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)

USERS_TABLE = "Users"
EVENTS_TABLE = "Events"
S3_BUCKET = "settlerr-user-photos"  # must be globally unique


# --- CREATE USERS TABLE ---
def create_users_table():
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
