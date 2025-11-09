#!/bin/bash

# Settlerr AWS Cognito & DynamoDB Setup Script
# This script automates the creation of Cognito User Pool, Identity Pool, and DynamoDB table
# Make sure you have AWS CLI installed and configured with your credentials

set -e  # Exit on error

echo "========================================"
echo "Settlerr AWS Setup Script"
echo "========================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Configuration
REGION="us-east-1"
USER_POOL_NAME="settlerr-user-pool"
APP_CLIENT_NAME="settlerr-web-app"
IDENTITY_POOL_NAME="settlerr-identity-pool"
DYNAMODB_TABLE="settlerr-users"
IAM_ROLE_NAME="Cognito_settlerrAuth_Role"

echo "Configuration:"
echo "  Region: $REGION"
echo "  User Pool Name: $USER_POOL_NAME"
echo "  DynamoDB Table: $DYNAMODB_TABLE"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Create Cognito User Pool
echo "📝 Step 1: Creating Cognito User Pool..."
USER_POOL_OUTPUT=$(aws cognito-idp create-user-pool \
  --pool-name "$USER_POOL_NAME" \
  --auto-verified-attributes email \
  --username-attributes email username \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --schema \
    '[
      {"Name": "email", "AttributeDataType": "String", "Required": true, "Mutable": true},
      {"Name": "name", "AttributeDataType": "String", "Required": true, "Mutable": true},
      {"Name": "birthdate", "AttributeDataType": "String", "Required": true, "Mutable": true},
      {"Name": "phone_number", "AttributeDataType": "String", "Required": true, "Mutable": true}
    ]' \
  --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
  --region "$REGION" \
  --output json)

USER_POOL_ID=$(echo "$USER_POOL_OUTPUT" | grep -o '"Id": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
echo "✅ User Pool Created: $USER_POOL_ID"
echo ""

# Step 2: Create App Client
echo "📝 Step 2: Creating App Client..."
APP_CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "$APP_CLIENT_NAME" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --region "$REGION" \
  --output json)

APP_CLIENT_ID=$(echo "$APP_CLIENT_OUTPUT" | grep -o '"ClientId": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
echo "✅ App Client Created: $APP_CLIENT_ID"
echo ""

# Step 3: Create Identity Pool
echo "📝 Step 3: Creating Identity Pool..."
IDENTITY_POOL_OUTPUT=$(aws cognito-identity create-identity-pool \
  --identity-pool-name "$IDENTITY_POOL_NAME" \
  --no-allow-unauthenticated-identities \
  --cognito-identity-providers \
    "ProviderName=cognito-idp.$REGION.amazonaws.com/$USER_POOL_ID,ClientId=$APP_CLIENT_ID,ServerSideTokenCheck=false" \
  --region "$REGION" \
  --output json)

IDENTITY_POOL_ID=$(echo "$IDENTITY_POOL_OUTPUT" | grep -o '"IdentityPoolId": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
echo "✅ Identity Pool Created: $IDENTITY_POOL_ID"
echo ""

# Step 4: Create IAM roles for Identity Pool
echo "📝 Step 4: Setting up IAM roles..."

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create trust policy for authenticated users
cat > /tmp/cognito-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "$IDENTITY_POOL_ID"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name "$IAM_ROLE_NAME" \
  --assume-role-policy-document file:///tmp/cognito-trust-policy.json \
  --region "$REGION" || echo "Role may already exist"

# Create policy for DynamoDB and S3 access
cat > /tmp/cognito-permissions-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$DYNAMODB_TABLE",
        "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$DYNAMODB_TABLE/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::settlerr-user-photos/*"
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name "$IAM_ROLE_NAME" \
  --policy-name "SettlerrAppAccess" \
  --policy-document file:///tmp/cognito-permissions-policy.json

echo "✅ IAM roles configured"
echo ""

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$IAM_ROLE_NAME" --query 'Role.Arn' --output text)

# Set identity pool roles
aws cognito-identity set-identity-pool-roles \
  --identity-pool-id "$IDENTITY_POOL_ID" \
  --roles authenticated="$ROLE_ARN" \
  --region "$REGION"

echo "✅ Identity pool roles set"
echo ""

# Step 5: Create DynamoDB table
echo "📝 Step 5: Creating DynamoDB table..."
aws dynamodb create-table \
  --table-name "$DYNAMODB_TABLE" \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" || echo "Table may already exist"

echo "✅ DynamoDB table created: $DYNAMODB_TABLE"
echo ""

# Clean up temp files
rm /tmp/cognito-trust-policy.json
rm /tmp/cognito-permissions-policy.json

# Step 6: Display results and next steps
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "📋 Add these values to your .env.local file:"
echo ""
echo "REACT_APP_AWS_REGION=$REGION"
echo "REACT_APP_USER_POOL_ID=$USER_POOL_ID"
echo "REACT_APP_USER_POOL_CLIENT_ID=$APP_CLIENT_ID"
echo "REACT_APP_IDENTITY_POOL_ID=$IDENTITY_POOL_ID"
echo "REACT_APP_DYNAMODB_TABLE=$DYNAMODB_TABLE"
echo "REACT_APP_USE_DEMO_AUTH=false"
echo ""
echo "========================================"
echo "Next Steps:"
echo "1. Update your .env.local file with the values above"
echo "2. Restart your React app: npm start"
echo "3. Test signup and login"
echo "========================================"
