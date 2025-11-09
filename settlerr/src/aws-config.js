/**
 * AWS Amplify Configuration for Amplify v6
 * Configures AWS Cognito for authentication and DynamoDB for data storage
 *
 * Environment Variables Required:
 * - REACT_APP_AWS_REGION: AWS region (e.g., us-east-1)
 * - REACT_APP_USER_POOL_ID: Cognito User Pool ID
 * - REACT_APP_USER_POOL_CLIENT_ID: Cognito App Client ID
 * - REACT_APP_IDENTITY_POOL_ID: Cognito Identity Pool ID (for DynamoDB access)
 * - REACT_APP_DYNAMODB_TABLE: DynamoDB table name for user profiles
 *
 * Setup Instructions:
 * 1. Create Cognito User Pool in AWS Console
 * 2. Create Cognito Identity Pool with User Pool as auth provider
 * 3. Create DynamoDB table for user profiles
 * 4. Update .env.local with your AWS credentials
 */

const awsConfig = {
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito Region
      region: process.env.REACT_APP_AWS_REGION || "us-east-1",

      // REQUIRED - Amazon Cognito User Pool ID
      userPoolId: process.env.REACT_APP_USER_POOL_ID || "us-east-1_PLACEHOLDER",

      // REQUIRED - Amazon Cognito App Client ID
      userPoolClientId:
        process.env.REACT_APP_USER_POOL_CLIENT_ID || "placeholder-client-id",

      // OPTIONAL - Amazon Cognito Identity Pool ID (for DynamoDB access)
      identityPoolId:
        process.env.REACT_APP_IDENTITY_POOL_ID || "us-east-1:placeholder-id",

      // OPTIONAL - This is used when autoSignIn is enabled for Auth.signUp
      signUpVerificationMethod: "code", // 'code' | 'link'

      loginWith: {
        username: true,
        email: true, // Enable email login
        phone: false,
      },
    },
  },
};

// DynamoDB Configuration
export const dynamoDBConfig = {
  region: process.env.REACT_APP_AWS_REGION || "us-east-1",
  tableName: process.env.REACT_APP_DYNAMODB_TABLE || "settlerr-users",
};

export default awsConfig;
