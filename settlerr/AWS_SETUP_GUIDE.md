# AWS Setup Guide for Settlerr

## Step-by-Step: Get Your AWS Credentials

### Part 1: Create AWS Cognito User Pool

1. **Go to AWS Console**
   - Open: https://console.aws.amazon.com/
   - Sign in with your AWS account

2. **Navigate to Cognito**
   - In the search bar at the top, type "Cognito"
   - Click on "Amazon Cognito"

3. **Create User Pool**
   - Click **"Create user pool"** button
   
   **Step 1: Configure sign-in experience**
   - Select: ☑ **Email** (for username)
   - Click **Next**
   
   **Step 2: Configure security requirements**
   - Password policy: Choose "Cognito defaults" or customize
     - Recommended: Minimum 8 characters, uppercase, lowercase, numbers
   - Multi-factor authentication: **No MFA** (or Optional if you want)
   - Click **Next**
   
   **Step 3: Configure sign-up experience**
   - Self-service sign-up: ✅ **Enable**
   - Required attributes:
     - ☑ email
     - ☑ name
     - ☑ birthdate
     - ☑ phone_number
   - Click **Next**
   
   **Step 4: Configure message delivery**
   - Email provider: **Send email with Cognito** (easiest for testing)
   - Click **Next**
   
   **Step 5: Integrate your app**
   - User pool name: `settlerr-users` (or any name you like)
   - App client name: `settlerr-web-app`
   - Client secret: **Don't generate a client secret** (important!)
   - Click **Next**
   
   **Step 6: Review and create**
   - Review all settings
   - Click **Create user pool**

4. **Get Your Credentials**
   
   After creation, you'll see your User Pool:
   
   **A. User Pool ID:**
   - On the User Pool overview page
   - Look for "User pool ID" 
   - Format: `us-east-1_XXXXXXXXX`
   - **Copy this value**
   
   **B. Region:**
   - From the User Pool ID, the region is the first part
   - Example: If ID is `us-east-1_abc123`, region is `us-east-1`
   - **Note this down**
   
   **C. App Client ID:**
   - Click on "App integration" tab
   - Scroll down to "App clients"
   - Click on your app client name (`settlerr-web-app`)
   - Look for "Client ID"
   - Format: `1234567890abcdefghijklmnop` (26 characters)
   - **Copy this value**

---

### Part 2: Create DynamoDB Table (For User Profiles)

1. **Navigate to DynamoDB**
   - In AWS Console search bar, type "DynamoDB"
   - Click on "DynamoDB"

2. **Create Table**
   - Click **"Create table"**
   - Table name: `settlerr-users`
   - Partition key: `userId` (String)
   - Table settings: **Use default settings**
   - Click **Create table**
   
3. **Note the Region**
   - Make sure you're in the **same region** as your Cognito User Pool
   - Check the region dropdown at the top-right of AWS Console

---

### Part 3: Update Your App Configuration

Once you have all the values, update the `src/aws-config.js` file:

```javascript
const awsConfig = {
  Auth: {
    region: 'us-east-1', // ← Your region
    userPoolId: 'us-east-1_abc123xyz', // ← Your User Pool ID
    userPoolWebClientId: '1a2b3c4d5e6f7g8h9i0j', // ← Your App Client ID
    mandatorySignIn: false,
    cookieStorage: {
      domain: 'localhost',
      path: '/',
      expires: 7,
      secure: false,
    },
  }
};
```

---

## Summary - What You Need:

| Item | Example Value | Where to Find |
|------|---------------|---------------|
| **Region** | `us-east-1` | Cognito User Pool overview |
| **User Pool ID** | `us-east-1_abc123xyz` | Cognito User Pool overview |
| **App Client ID** | `1a2b3c4d5e6f7g8h9i0j` | Cognito → App integration → App clients |
| **DynamoDB Table** | `settlerr-users` | You create this (same region!) |

---

## Testing Your Setup

After updating `aws-config.js`:

1. Save all files
2. Restart your dev server: `npm start`
3. Try signing up a new user
4. Check AWS Cognito Console → Users to see if the user was created

---

## Troubleshooting

**"User pool client does not exist"**
- Double-check your App Client ID
- Make sure you didn't generate a client secret

**"Invalid region"**
- Verify region matches User Pool region
- Common regions: `us-east-1`, `us-west-2`, `ca-central-1`

**Email not sending**
- For testing, use "Send email with Cognito"
- For production, set up Amazon SES

---

Need help? Check the values in AWS Console carefully - copy/paste to avoid typos!
