# Quick Start: AWS Integration

## Summary of Changes

### ✅ Part 1: Email & Phone Validation Added

**Files Modified:**
- `src/utils/validators.js` - Added validation functions
- `src/pages/MyAccountPage.js` - Integrated validators

**Features:**
- ✅ Email validation with regex pattern
- ✅ Phone number validation (10-11 digits, North American format)
- ✅ Automatic phone number formatting: `(403) 555-0123`
- ✅ Real-time validation before saving
- ✅ User-friendly error messages

**Usage Example:**
```javascript
import { validateEmail, validatePhone, formatPhoneNumber } from '../utils/validators';

const emailCheck = validateEmail('user@example.com');
// Returns: { isValid: true, error: '' }

const phoneCheck = validatePhone('4035550123');
// Returns: { isValid: true, error: '' }

const formatted = formatPhoneNumber('4035550123');
// Returns: '(403) 555-0123'
```

### ✅ Part 2: AWS Cognito + DynamoDB Integration

**Files Created:**
- `src/services/dynamoDBService.js` - DynamoDB CRUD operations
- `AWS_COGNITO_DYNAMODB_SETUP.md` - Complete setup guide

**Files Modified:**
- `src/aws-config.js` - Added Identity Pool and DynamoDB config
- `src/services/authService.js` - Integrated DynamoDB profile storage
- `.env.local` - Added new environment variables

**Architecture:**

```
┌─────────────┐
│  React App  │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────┐                 ┌──────────────┐
│   Cognito    │                 │   DynamoDB   │
│  User Pool   │                 │    Table     │
│              │                 │              │
│ - Auth       │                 │ - Profiles   │
│ - Users      │                 │ - XP/Data    │
└──────────────┘                 └──────────────┘
       │                                 │
       └────────┬────────────────────────┘
                ▼
         ┌──────────────┐
         │ Identity Pool │
         │ (IAM Roles)   │
         └──────────────┘
```

## How It Works

### 1. Signup Flow
```javascript
// User signs up
signup({ username, password, email, name, phone, dob })
  ↓
// Creates user in Cognito
signUp() → Cognito User Pool
  ↓
// Stores profile in DynamoDB
saveUserProfile() → DynamoDB Table
  ↓
// Returns success + userId
```

### 2. Login Flow
```javascript
// User logs in
login(username, password)
  ↓
// Authenticates with Cognito
signIn() → Cognito User Pool
  ↓
// Loads profile from DynamoDB
getUserProfile() → DynamoDB Table
  ↓
// Returns user + attributes + profile
```

### 3. Profile Update Flow
```javascript
// User updates profile
updateUserProfile(attributes)
  ↓
// Updates Cognito attributes
updateUserAttributes() → Cognito
  ↓
// Updates DynamoDB profile
saveUserProfile() → DynamoDB
  ↓
// Returns success
```

## Environment Variables

Add to `.env.local`:

```bash
# Required for AWS Cognito
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Required for DynamoDB access
REACT_APP_IDENTITY_POOL_ID=us-east-1:xxxx-xxxx-xxxx-xxxx-xxxx
REACT_APP_DYNAMODB_TABLE=settlerr-users

# Development mode (set to false for production)
REACT_APP_USE_DEMO_AUTH=true
```

## Demo Mode vs Production Mode

### Demo Mode (Current - Default)
```bash
REACT_APP_USE_DEMO_AUTH=true
```
- ✅ No AWS credentials needed
- ✅ Works immediately
- ✅ Data stored in localStorage
- ✅ Perfect for development/testing
- ❌ Data lost on browser clear

### Production Mode (AWS)
```bash
REACT_APP_USE_DEMO_AUTH=false
```
- ✅ Secure authentication
- ✅ Persistent data storage
- ✅ Scalable to millions of users
- ✅ AWS security best practices
- ⚠️ Requires AWS setup (see guide)

## Testing Validation

### Test Email Validation
```javascript
// In browser console or component
import { validateEmail } from './src/utils/validators';

// Valid emails
validateEmail('user@example.com')          // ✅ Valid
validateEmail('test.user@settlerr.com')    // ✅ Valid

// Invalid emails
validateEmail('')                          // ❌ "Email is required"
validateEmail('notanemail')                // ❌ "Please enter a valid email"
validateEmail('user@')                     // ❌ "Please enter a valid email"
```

### Test Phone Validation
```javascript
import { validatePhone } from './src/utils/validators';

// Valid phones
validatePhone('4035550123')                // ✅ Valid
validatePhone('(403) 555-0123')            // ✅ Valid
validatePhone('403-555-0123')              // ✅ Valid
validatePhone('+1 403 555 0123')           // ✅ Valid

// Invalid phones
validatePhone('')                          // ❌ "Phone is required"
validatePhone('123')                       // ❌ "At least 10 digits"
validatePhone('12345678901234')            // ❌ "Too long"
```

### Test in MyAccountPage
1. Go to http://localhost:3000/login
2. Login with: `demo` / `Demo123!`
3. Navigate to "My Account" → "Security" tab
4. Click "Update Security Settings"
5. Try invalid email: `notanemail`
6. Try invalid phone: `123`
7. Should see error messages ❌
8. Try valid data → Save → Should work ✅

## API Reference

### Validators

#### `validateEmail(email)`
- **Returns**: `{ isValid: boolean, error: string }`
- **Checks**: Empty, regex pattern

#### `validatePhone(phone)`
- **Returns**: `{ isValid: boolean, error: string }`
- **Checks**: Empty, length (10-11 digits), country code

#### `validatePassword(password, options)`
- **Returns**: `{ isValid: boolean, error: string }`
- **Options**: `{ minLength, requireUppercase, requireLowercase, requireNumber, requireSpecial }`

#### `formatPhoneNumber(phone)`
- **Returns**: `string` - Formatted phone number
- **Format**: `(403) 555-0123`

### DynamoDB Service

#### `saveUserProfile(userId, profileData)`
- **Creates or updates** user profile in DynamoDB
- **Demo mode**: Uses localStorage
- **Production**: Uses DynamoDB PutItem

#### `getUserProfile(userId)`
- **Retrieves** user profile from DynamoDB
- **Returns**: `{ success: boolean, data?: Object, error?: string }`

#### `updateUserProfile(userId, updates)`
- **Merges** updates with existing profile
- **Returns**: `{ success: boolean, data?: Object, error?: string }`

#### `deleteUserProfile(userId)`
- **Deletes** user profile from DynamoDB
- **Returns**: `{ success: boolean, error?: string }`

## Next Steps to Production

### 1. Install AWS SDK (Optional - for full DynamoDB integration)
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### 2. Follow Setup Guide
Read `AWS_COGNITO_DYNAMODB_SETUP.md` for detailed AWS setup instructions.

### 3. Update Configuration
```bash
# Update .env.local with your AWS credentials
REACT_APP_USE_DEMO_AUTH=false
```

### 4. Test in Production Mode
```bash
npm start
```

### 5. Deploy to Production
```bash
npm run build
# Deploy build folder to your hosting service
```

## Troubleshooting

### Validation Not Working
- ✅ Check imports: `import { validateEmail } from '../utils/validators'`
- ✅ Check function call: `validateEmail(email)` not `validateEmail()`
- ✅ Check error display: `{message.type === 'error' && <p>{message.text}</p>}`

### AWS Connection Issues
- ✅ Verify `.env.local` values are correct
- ✅ Check `REACT_APP_USE_DEMO_AUTH=false`
- ✅ Restart server after env changes: `npm start`
- ✅ Check AWS Console for User Pool/Identity Pool status
- ✅ Check browser console for error messages

### DynamoDB Access Denied
- ✅ Verify Identity Pool is configured
- ✅ Check IAM role has DynamoDB permissions
- ✅ Verify table name matches `.env.local`

## Code Examples

### Using Validation in Forms
```javascript
import { validateEmail, validatePhone } from '../utils/validators';

const handleSubmit = (e) => {
  e.preventDefault();
  
  // Validate email
  const emailCheck = validateEmail(formData.email);
  if (!emailCheck.isValid) {
    setError(emailCheck.error);
    return;
  }
  
  // Validate phone
  const phoneCheck = validatePhone(formData.phone);
  if (!phoneCheck.isValid) {
    setError(phoneCheck.error);
    return;
  }
  
  // All valid, proceed
  saveChanges();
};
```

### Saving Profile to DynamoDB
```javascript
import { saveUserProfile } from '../services/dynamoDBService';

const handleSave = async () => {
  const userId = currentUser.userId;
  const profileData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '(403) 555-0123',
    location: 'Calgary, AB',
    occupation: 'Software Engineer',
  };
  
  const result = await saveUserProfile(userId, profileData);
  
  if (result.success) {
    console.log('Profile saved!', result.data);
  } else {
    console.error('Error:', result.error);
  }
};
```

## Support

- 📖 **Full Setup Guide**: See `AWS_COGNITO_DYNAMODB_SETUP.md`
- 🐛 **Issues**: Open issue on GitHub
- 💬 **Questions**: Contact team or check AWS documentation

---

**Status**: ✅ Demo mode working | ⏳ AWS setup required for production
