# Cognito Setup Steps for Settlerr

## Your Current Configuration
✅ AWS Region: `us-east-1`
✅ AWS Credentials: Configured
✅ DynamoDB Table: `Events` (exists)
✅ S3 Bucket: `settlerr-user-photos`

## What You Need to Create
❌ Cognito User Pool
❌ Cognito App Client
❌ Cognito Identity Pool
❌ DynamoDB Table: `settlerr-users` (for user profiles)

---

## Step 1: Create Cognito User Pool

### Option A: Using AWS Console (Recommended for First Time)

1. **Go to AWS Cognito Console**
   ```
   https://console.aws.amazon.com/cognito/v2/home?region=us-east-1
   ```

2. **Click "Create user pool"**

3. **Step 1: Configure sign-in experience**
   - Sign-in options:
     - ☑️ Email
     - ☑️ User name
   - User name requirements: Leave default
   - Click **Next**

4. **Step 2: Configure security requirements**
   - Password policy mode: Choose "Cognito defaults" or customize:
     - Minimum length: 8 characters
     - ☑️ Require numbers
     - ☑️ Require special characters
     - ☑️ Require uppercase letters
     - ☑️ Require lowercase letters
   - Multi-factor authentication: 
     - Select "No MFA" for now (you can enable later)
   - User account recovery: 
     - ☑️ Enable self-service account recovery
     - ☑️ Email only
   - Click **Next**

5. **Step 3: Configure sign-up experience**
   - Self-service sign-up: ☑️ Enable
   - Cognito-assisted verification: ☑️ Allow Cognito to automatically send messages
   - Verifying attribute changes: ☑️ Keep original attribute value active
   - Attributes to verify: ☑️ Send email message, verify email address
   - Required attributes:
     - ☑️ name
     - ☑️ birthdate
     - ☑️ email (already required)
     - ☑️ phone_number (click "Add more")
   - Click **Next**

6. **Step 4: Configure message delivery**
   - Email: Select "Send email with Cognito"
   - FROM email address: `no-reply@verificationemail.com` (default)
   - FROM sender name: `Settlerr`
   - REPLY-TO email address: Leave empty or add your support email
   - Click **Next**

7. **Step 5: Integrate your app**
   - User pool name: `settlerr-user-pool`
   - Hosted authentication pages: Don't select (we're using custom UI)
   - Domain: Skip for now
   - Initial app client:
     - App type: ☑️ Public client
     - App client name: `settlerr-web-app`
     - Client secret: ⚠️ **Don't generate a client secret** (uncheck this!)
     - Authentication flows:
       - ☑️ ALLOW_USER_PASSWORD_AUTH
       - ☑️ ALLOW_REFRESH_TOKEN_AUTH
   - Click **Next**

8. **Step 6: Review and create**
   - Review all settings
   - Click **Create user pool**

9. **Save Your Credentials**
   After creation, you'll see:
   - **User Pool ID**: Copy this (format: `us-east-1_XXXXXXXXX`)
   - Go to "App integration" tab → "App clients" → Click on `settlerr-web-app`
   - **Client ID**: Copy this (format: `xxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Option B: Using AWS CLI (Advanced)

```bash
# Create User Pool
aws cognito-idp create-user-pool \
  --pool-name settlerr-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --schema Name=name,AttributeDataType=String,Required=true \
          Name=email,AttributeDataType=String,Required=true \
          Name=birthdate,AttributeDataType=String,Required=true \
          Name=phone_number,AttributeDataType=String,Required=true \
  --region us-east-1

# Note the UserPoolId from the output

# Create App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name settlerr-web-app \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1

# Note the ClientId from the output
```

---

## Step 2: Create Cognito Identity Pool

### Option A: Using AWS Console

1. **Go to Identity Pools**
   ```
   https://console.aws.amazon.com/cognito/v2/home?region=us-east-1
   ```
   - Click "Identity pools" in the left menu
   - Click "Create identity pool"

2. **Configure Identity Pool**
   - Identity pool name: `settlerr-identity-pool`
   - ☑️ Enable access to unauthenticated identities: **NO** (uncheck)
   - Expand "Authentication flow settings"
   - Select: ☑️ Authenticated role selection: "Use default role"

3. **User access**
   - Click "Next"

4. **Connect identity providers**
   - Select "Amazon Cognito user pool"
   - User pool ID: Paste your User Pool ID from Step 1
   - App client ID: Paste your App Client ID from Step 1
   - Click "Next"

5. **Configure properties**
   - Identity pool name: `settlerr-identity-pool`
   - Click "Next"

6. **Configure permissions**
   - Authenticated role: "Create a new IAM role"
   - Role name: `Cognito_settlerrAuth_Role`
   - Click "Next"

7. **Review and create**
   - Click "Create identity pool"

8. **Update IAM Role for DynamoDB Access**
   - After creation, click "Edit identity pool"
   - Note the **Identity Pool ID** (format: `us-east-1:xxxx-xxxx-xxxx-xxxx-xxxx`)
   - Go to IAM Console → Roles
   - Find `Cognito_settlerrAuth_Role`
   - Click "Add permissions" → "Create inline policy"
   - Click "JSON" tab and paste:

```json
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
        "arn:aws:dynamodb:us-east-1:*:table/settlerr-users",
        "arn:aws:dynamodb:us-east-1:*:table/settlerr-users/*"
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
```
   - Name: `SettlerrAppAccess`
   - Click "Create policy"

### Option B: Using AWS CLI

```bash
# Create Identity Pool
aws cognito-identity create-identity-pool \
  --identity-pool-name settlerr-identity-pool \
  --allow-unauthenticated-identities false \
  --cognito-identity-providers \
    ProviderName=cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX,ClientId=YOUR_CLIENT_ID \
  --region us-east-1

# Note the IdentityPoolId from output
```

---

## Step 3: Create DynamoDB Table for User Profiles

You already have an "Events" table, but you need a separate table for user profiles.

### Option A: Using AWS Console

1. **Go to DynamoDB Console**
   ```
   https://console.aws.amazon.com/dynamodb/home?region=us-east-1
   ```

2. **Create Table**
   - Click "Create table"
   - Table name: `settlerr-users`
   - Partition key: `userId` (String)
   - Table settings: "Customize settings"
   - Read/write capacity mode: "On-demand" (recommended for variable workload)
   - Click "Create table"

3. **Wait for Active Status**
   - Wait 1-2 minutes for table to become Active

### Option B: Using AWS CLI

```bash
aws dynamodb create-table \
  --table-name settlerr-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Step 4: Update Your .env.local File

After completing steps 1-3, update your `.env.local` file:

```bash
# Replace these values with your actual ones:
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX        # From Step 1
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxx  # From Step 1
REACT_APP_IDENTITY_POOL_ID=us-east-1:xxxx-xxxx-xxxx  # From Step 2

# Enable AWS mode (disable demo)
REACT_APP_USE_DEMO_AUTH=false
```

---

## Step 5: Test Your Setup

1. **Restart your app**
   ```bash
   npm start
   ```

2. **Test Signup**
   - Go to http://localhost:3000/signup
   - Create a new account
   - Check your email for verification code
   - Verify the account

3. **Test Login**
   - Go to http://localhost:3000/login
   - Login with your new credentials
   - You should be redirected to the tasks page

4. **Verify DynamoDB**
   - Go to DynamoDB Console
   - Open `settlerr-users` table
   - Click "Explore table items"
   - You should see your user profile

---

## Quick Commands Summary

```bash
# After you have the credentials, update .env.local:
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_ABC123XYZ
REACT_APP_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
REACT_APP_IDENTITY_POOL_ID=us-east-1:aaaa-bbbb-cccc-dddd-eeee
REACT_APP_DYNAMODB_TABLE=settlerr-users
REACT_APP_USE_DEMO_AUTH=false

# Restart app
npm start
```

---

## Troubleshooting

### Issue: "User pool does not exist"
**Fix**: Double-check `REACT_APP_USER_POOL_ID` in `.env.local`

### Issue: "Access denied" when saving profile
**Fix**: 
1. Verify Identity Pool is created
2. Check IAM role has DynamoDB permissions
3. Ensure policy includes correct table ARN

### Issue: Email not sending
**Fix**: 
1. In Cognito User Pool → Messaging
2. Verify email is configured
3. For production, set up Amazon SES

### Issue: "Network error"
**Fix**: Check browser console for detailed error

---

## Next Steps

Once everything is working:
1. ✅ Enable MFA for production security
2. ✅ Set up custom email templates in Cognito
3. ✅ Configure custom domain for authentication
4. ✅ Set up CloudWatch alarms for monitoring
5. ✅ Enable DynamoDB backups

---

## Need Help?

Reply with which step you're on and any errors you're seeing!
