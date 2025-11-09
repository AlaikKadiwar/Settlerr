# AWS Cognito + DynamoDB Setup Guide

This guide walks you through setting up AWS Cognito for authentication and DynamoDB for user profile storage in the Settlerr application.

## Prerequisites

- AWS Account
- AWS CLI installed (optional but recommended)
- Basic understanding of AWS services

## Part 1: AWS Cognito Setup

### Step 1: Create a User Pool

1. **Navigate to AWS Cognito Console**
   - Go to https://console.aws.amazon.com/cognito/
   - Click "Create user pool"

2. **Configure Sign-in Experience**
   - Cognito user pool sign-in options:
     - ☑️ User name
     - ☑️ Email
   - Click "Next"

3. **Configure Security Requirements**
   - Password policy:
     - Minimum length: 8 characters
     - ☑️ Contains at least 1 number
     - ☑️ Contains at least 1 special character
     - ☑️ Contains at least 1 uppercase letter
     - ☑️ Contains at least 1 lowercase letter
   - Multi-factor authentication: Optional (choose "No MFA" for development)
   - Click "Next"

4. **Configure Sign-up Experience**
   - Self-registration: ☑️ Enable self-registration
   - Attribute verification: ☑️ Email
   - Required attributes:
     - ☑️ name
     - ☑️ email
     - ☑️ birthdate
     - ☑️ phone_number
   - Click "Next"

5. **Configure Message Delivery**
   - Email provider: Choose "Send email with Amazon SES" (for production) or "Send email with Cognito" (for development)
   - Click "Next"

6. **Integrate Your App**
   - User pool name: `settlerr-user-pool`
   - App client name: `settlerr-web-client`
   - Client secret: ⚠️ Don't generate a client secret (not needed for web apps)
   - Click "Next"

7. **Review and Create**
   - Review all settings
   - Click "Create user pool"

8. **Save Your Credentials**
   - After creation, note down:
     - **User Pool ID**: Found at the top (e.g., `us-east-1_XXXXXXXXX`)
     - **App Client ID**: Go to "App integration" tab → "App clients" (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxx`)
     - **AWS Region**: Your selected region (e.g., `us-east-1`)

### Step 2: Create an Identity Pool (for DynamoDB Access)

1. **Navigate to Identity Pools**
   - In Cognito console, click "Federated Identities" or "Identity pools"
   - Click "Create identity pool"

2. **Configure Identity Pool**
   - Identity pool name: `settlerr-identity-pool`
   - Enable access to unauthenticated identities: ❌ No
   - Authentication providers:
     - Click "Cognito"
     - User Pool ID: Enter your User Pool ID from Step 1
     - App Client ID: Enter your App Client ID from Step 1
   - Click "Create Pool"

3. **Configure IAM Roles**
   - AWS will create two IAM roles:
     - Authenticated role: For logged-in users
     - Unauthenticated role: For guest access
   - Click "Allow" to create the roles

4. **Update IAM Role Permissions**
   - Go to IAM Console → Roles
   - Find the authenticated role (e.g., `Cognito_settlerrAuth_Role`)
   - Click "Add permissions" → "Create inline policy"
   - Use the JSON editor and paste:

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
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/settlerr-users"
    }
  ]
}
```

   - Replace `YOUR_REGION` and `YOUR_ACCOUNT_ID` with your values
   - Name the policy: `SettlerrDynamoDBAccess`
   - Click "Create policy"

5. **Save Your Identity Pool ID**
   - Go back to Identity Pools
   - Click on `settlerr-identity-pool`
   - Note the **Identity Pool ID** (e.g., `us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Part 2: DynamoDB Setup

### Step 1: Create DynamoDB Table

1. **Navigate to DynamoDB Console**
   - Go to https://console.aws.amazon.com/dynamodb/
   - Click "Create table"

2. **Configure Table**
   - Table name: `settlerr-users`
   - Partition key: `userId` (Type: String)
   - Table settings: Use default settings (or customize for production)
   - Click "Create table"

3. **Wait for Table Creation**
   - Wait until status shows "Active" (usually takes 1-2 minutes)

4. **Optional: Add Global Secondary Index (GSI)**
   - If you need to query by username or email:
     - Go to table → "Indexes" tab
     - Click "Create index"
     - Partition key: `username` (String) or `email` (String)
     - Index name: `username-index` or `email-index`
     - Click "Create index"

### Step 2: Table Schema

The table will automatically store these fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `userId` | String | Primary Key - Cognito User ID |
| `username` | String | Username |
| `email` | String | Email address |
| `name` | String | Full name |
| `phone` | String | Phone number |
| `location` | String | User location |
| `occupation` | String | User occupation |
| `languages` | List | Array of languages |
| `interests` | List | Array of interests |
| `xp` | Number | Experience points |
| `joinedDate` | String | Account creation date |
| `createdAt` | String | Timestamp |
| `updatedAt` | String | Last update timestamp |

## Part 3: Configure Your Application

### Step 1: Update Environment Variables

Edit `.env.local` in your project root:

```bash
# AWS Cognito Configuration
REACT_APP_AWS_REGION=us-east-1                                    # Your AWS region
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX                       # From Cognito User Pool
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx         # From App Client
REACT_APP_IDENTITY_POOL_ID=us-east-1:xxxx-xxxx-xxxx-xxxx-xxxx   # From Identity Pool
REACT_APP_DYNAMODB_TABLE=settlerr-users                          # DynamoDB table name

# Set to false to use real AWS (true for local development)
REACT_APP_USE_DEMO_AUTH=false
```

### Step 2: Restart Your Application

```bash
npm start
```

## Part 4: Testing

### Test Signup Flow

1. **Create a New Account**
   - Navigate to `/signup`
   - Fill in the registration form
   - Submit the form

2. **Verify Email**
   - Check your email for verification code
   - Enter the code when prompted
   - Or verify in AWS Cognito Console:
     - Go to User Pool → Users
     - Find the user → Actions → Confirm account

3. **Check DynamoDB**
   - Go to DynamoDB Console
   - Open `settlerr-users` table
   - Click "Explore table items"
   - You should see the new user profile

### Test Login Flow

1. **Login**
   - Navigate to `/login`
   - Enter username and password
   - Click "Login"

2. **Verify Session**
   - After login, you should be redirected to tasks page
   - Your profile data should load from DynamoDB

### Test Profile Updates

1. **Update Profile**
   - Navigate to `/account`
   - Edit profile information
   - Save changes

2. **Verify in DynamoDB**
   - Check DynamoDB table for updated values
   - `updatedAt` timestamp should be recent

## Part 5: Production Optimization (Optional)

### Enable Auto-Scaling for DynamoDB

```bash
# Install AWS CLI
aws dynamodb update-table \
  --table-name settlerr-users \
  --billing-mode PAY_PER_REQUEST
```

### Add CloudWatch Alarms

Monitor your Cognito and DynamoDB usage:

1. Go to CloudWatch Console
2. Create alarms for:
   - Cognito user pool sign-in failures
   - DynamoDB read/write capacity
   - DynamoDB throttled requests

### Enable DynamoDB Backups

```bash
aws dynamodb update-continuous-backups \
  --table-name settlerr-users \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

## Troubleshooting

### Issue: "User pool does not exist"

**Solution**: Verify your `REACT_APP_USER_POOL_ID` in `.env.local`

### Issue: "Access denied to DynamoDB"

**Solution**: 
1. Check IAM role permissions
2. Ensure Identity Pool is configured with correct User Pool
3. Verify `REACT_APP_IDENTITY_POOL_ID` is correct

### Issue: "Network error"

**Solution**:
1. Check CORS settings in API Gateway (if using)
2. Verify AWS credentials are valid
3. Check internet connection

### Issue: "Table not found"

**Solution**: Verify `REACT_APP_DYNAMODB_TABLE` matches your table name exactly

## Cost Estimation

**AWS Free Tier (First 12 months):**
- Cognito: 50,000 MAUs (Monthly Active Users) free
- DynamoDB: 25 GB storage + 25 read/write capacity units
- **Estimated cost for small app: $0-5/month**

**After Free Tier:**
- Cognito: $0.0055 per MAU (first 50K users)
- DynamoDB: Pay per request ($0.25 per million writes)
- **Estimated cost: $10-50/month for 1,000-10,000 users**

## Security Best Practices

1. **Enable MFA** for production
2. **Use HTTPS only** in production
3. **Rotate credentials** regularly
4. **Enable CloudTrail** for audit logging
5. **Use environment variables** (never commit credentials)
6. **Implement rate limiting** to prevent abuse
7. **Enable AWS WAF** for production API

## Next Steps

1. ✅ Create Cognito User Pool
2. ✅ Create Identity Pool
3. ✅ Create DynamoDB Table
4. ✅ Configure IAM Roles
5. ✅ Update .env.local
6. ✅ Test signup and login
7. ⏳ Deploy to production
8. ⏳ Set up monitoring and alarms

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Settlerr GitHub Repository](https://github.com/AlaikKadiwar/Settlerr)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Open an issue on GitHub
4. Contact AWS Support (for AWS-specific issues)

---

**Note**: This setup uses AWS Amplify v6 with the latest authentication APIs. If you're using an older version, some steps may differ.
