# Settlerr AWS Cognito & DynamoDB Setup Script (PowerShell)
# This script automates the creation of Cognito User Pool, Identity Pool, and DynamoDB table
# Make sure you have AWS CLI installed and configured with your credentials

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Settlerr AWS Setup Script (PowerShell)"
Write-Host "========================================"
Write-Host ""

# Check if AWS CLI is installed
$awsCliInstalled = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCliInstalled) {
    Write-Host "❌ AWS CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
}

# Configuration
$REGION = "us-east-1"
$USER_POOL_NAME = "settlerr-user-pool"
$APP_CLIENT_NAME = "settlerr-web-app"
$IDENTITY_POOL_NAME = "settlerr-identity-pool"
$DYNAMODB_TABLE = "settlerr-users"
$IAM_ROLE_NAME = "Cognito_settlerrAuth_Role"

Write-Host "Configuration:"
Write-Host "  Region: $REGION"
Write-Host "  User Pool Name: $USER_POOL_NAME"
Write-Host "  DynamoDB Table: $DYNAMODB_TABLE"
Write-Host ""
$continue = Read-Host "Press Enter to continue or Ctrl+C to cancel"
Write-Host ""

# Step 1: Create Cognito User Pool
Write-Host "📝 Step 1: Creating Cognito User Pool..." -ForegroundColor Cyan
$schema = @"
[
  {\"Name\": \"email\", \"AttributeDataType\": \"String\", \"Required\": true, \"Mutable\": true},
  {\"Name\": \"name\", \"AttributeDataType\": \"String\", \"Required\": true, \"Mutable\": true},
  {\"Name\": \"birthdate\", \"AttributeDataType\": \"String\", \"Required\": true, \"Mutable\": true},
  {\"Name\": \"phone_number\", \"AttributeDataType\": \"String\", \"Required\": true, \"Mutable\": true}
]
"@

$policies = @"
{
  \"PasswordPolicy\": {
    \"MinimumLength\": 8,
    \"RequireUppercase\": true,
    \"RequireLowercase\": true,
    \"RequireNumbers\": true,
    \"RequireSymbols\": true
  }
}
"@

$USER_POOL_OUTPUT = aws cognito-idp create-user-pool `
    --pool-name $USER_POOL_NAME `
    --auto-verified-attributes email `
    --username-attributes email username `
    --policies $policies `
    --schema $schema `
    --email-configuration EmailSendingAccount=COGNITO_DEFAULT `
    --region $REGION `
    --output json | ConvertFrom-Json

$USER_POOL_ID = $USER_POOL_OUTPUT.UserPool.Id
Write-Host "✅ User Pool Created: $USER_POOL_ID" -ForegroundColor Green
Write-Host ""

# Step 2: Create App Client
Write-Host "📝 Step 2: Creating App Client..." -ForegroundColor Cyan
$APP_CLIENT_OUTPUT = aws cognito-idp create-user-pool-client `
    --user-pool-id $USER_POOL_ID `
    --client-name $APP_CLIENT_NAME `
    --no-generate-secret `
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH `
    --region $REGION `
    --output json | ConvertFrom-Json

$APP_CLIENT_ID = $APP_CLIENT_OUTPUT.UserPoolClient.ClientId
Write-Host "✅ App Client Created: $APP_CLIENT_ID" -ForegroundColor Green
Write-Host ""

# Step 3: Create Identity Pool
Write-Host "📝 Step 3: Creating Identity Pool..." -ForegroundColor Cyan
$providerName = "cognito-idp.$REGION.amazonaws.com/$USER_POOL_ID"
$IDENTITY_POOL_OUTPUT = aws cognito-identity create-identity-pool `
    --identity-pool-name $IDENTITY_POOL_NAME `
    --no-allow-unauthenticated-identities `
    --cognito-identity-providers "ProviderName=$providerName,ClientId=$APP_CLIENT_ID,ServerSideTokenCheck=false" `
    --region $REGION `
    --output json | ConvertFrom-Json

$IDENTITY_POOL_ID = $IDENTITY_POOL_OUTPUT.IdentityPoolId
Write-Host "✅ Identity Pool Created: $IDENTITY_POOL_ID" -ForegroundColor Green
Write-Host ""

# Step 4: Create IAM roles for Identity Pool
Write-Host "📝 Step 4: Setting up IAM roles..." -ForegroundColor Cyan

# Get AWS Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text

# Create trust policy for authenticated users
$trustPolicy = @"
{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Effect\": \"Allow\",
      \"Principal\": {
        \"Federated\": \"cognito-identity.amazonaws.com\"
      },
      \"Action\": \"sts:AssumeRoleWithWebIdentity\",
      \"Condition\": {
        \"StringEquals\": {
          \"cognito-identity.amazonaws.com:aud\": \"$IDENTITY_POOL_ID\"
        },
        \"ForAnyValue:StringLike\": {
          \"cognito-identity.amazonaws.com:amr\": \"authenticated\"
        }
      }
    }
  ]
}
"@

$trustPolicyFile = "$env:TEMP\cognito-trust-policy.json"
$trustPolicy | Out-File -FilePath $trustPolicyFile -Encoding utf8

# Create IAM role
try {
    aws iam create-role `
        --role-name $IAM_ROLE_NAME `
        --assume-role-policy-document "file://$trustPolicyFile" `
        --region $REGION
}
catch {
    Write-Host "Role may already exist" -ForegroundColor Yellow
}

# Create policy for DynamoDB and S3 access
$permissionsPolicy = @"
{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Effect\": \"Allow\",
      \"Action\": [
        \"dynamodb:GetItem\",
        \"dynamodb:PutItem\",
        \"dynamodb:UpdateItem\",
        \"dynamodb:DeleteItem\",
        \"dynamodb:Query\",
        \"dynamodb:Scan\"
      ],
      \"Resource\": [
        \"arn:aws:dynamodb:$REGION:${ACCOUNT_ID}:table/$DYNAMODB_TABLE\",
        \"arn:aws:dynamodb:$REGION:${ACCOUNT_ID}:table/$DYNAMODB_TABLE/*\"
      ]
    },
    {
      \"Effect\": \"Allow\",
      \"Action\": [
        \"s3:GetObject\",
        \"s3:PutObject\",
        \"s3:DeleteObject\"
      ],
      \"Resource\": \"arn:aws:s3:::settlerr-user-photos/*\"
    }
  ]
}
"@

$permissionsPolicyFile = "$env:TEMP\cognito-permissions-policy.json"
$permissionsPolicy | Out-File -FilePath $permissionsPolicyFile -Encoding utf8

# Attach policy to role
aws iam put-role-policy `
    --role-name $IAM_ROLE_NAME `
    --policy-name "SettlerrAppAccess" `
    --policy-document "file://$permissionsPolicyFile"

Write-Host "✅ IAM roles configured" -ForegroundColor Green
Write-Host ""

# Get role ARN
$ROLE_ARN = aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text

# Set identity pool roles
aws cognito-identity set-identity-pool-roles `
    --identity-pool-id $IDENTITY_POOL_ID `
    --roles "authenticated=$ROLE_ARN" `
    --region $REGION

Write-Host "✅ Identity pool roles set" -ForegroundColor Green
Write-Host ""

# Step 5: Create DynamoDB table
Write-Host "📝 Step 5: Creating DynamoDB table..." -ForegroundColor Cyan
try {
    aws dynamodb create-table `
        --table-name $DYNAMODB_TABLE `
        --attribute-definitions AttributeName=userId, AttributeType=S `
        --key-schema AttributeName=userId, KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region $REGION
}
catch {
    Write-Host "Table may already exist" -ForegroundColor Yellow
}

Write-Host "✅ DynamoDB table created: $DYNAMODB_TABLE" -ForegroundColor Green
Write-Host ""

# Clean up temp files
Remove-Item -Path $trustPolicyFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $permissionsPolicyFile -Force -ErrorAction SilentlyContinue

# Step 6: Display results and next steps
Write-Host "========================================"
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "📋 Add these values to your .env.local file:" -ForegroundColor Yellow
Write-Host ""
Write-Host "REACT_APP_AWS_REGION=$REGION"
Write-Host "REACT_APP_USER_POOL_ID=$USER_POOL_ID"
Write-Host "REACT_APP_USER_POOL_CLIENT_ID=$APP_CLIENT_ID"
Write-Host "REACT_APP_IDENTITY_POOL_ID=$IDENTITY_POOL_ID"
Write-Host "REACT_APP_DYNAMODB_TABLE=$DYNAMODB_TABLE"
Write-Host "REACT_APP_USE_DEMO_AUTH=false"
Write-Host ""
Write-Host "========================================"
Write-Host "Next Steps:"
Write-Host "1. Update your .env.local file with the values above"
Write-Host "2. Restart your React app: npm start"
Write-Host "3. Test signup and login"
Write-Host "========================================"
