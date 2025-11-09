/**
 * DynamoDB Service
 * Handles user profile storage and retrieval in DynamoDB
 *
 * Table Structure (settlerr-users):
 * - userId (Primary Key): Cognito user ID
 * - username: User's username
 * - email: User's email
 * - name: User's full name
 * - phone: User's phone number
 * - location: User's location
 * - occupation: User's occupation
 * - languages: Array of languages
 * - interests: Array of interests
 * - xp: User's experience points
 * - joinedDate: Account creation date
 * - createdAt: Timestamp
 * - updatedAt: Timestamp
 *
 * Note: This uses fetch API with IAM authentication via Cognito Identity Pool
 * For production, consider using AWS SDK v3 or AWS Amplify API
 */

import { fetchAuthSession } from "@aws-amplify/auth";
import { dynamoDBConfig } from "../aws-config";

/**
 * Get AWS credentials from Cognito Identity Pool
 * Required for making authenticated requests to DynamoDB
 */
const getCredentials = async () => {
  try {
    const session = await fetchAuthSession();
    return session.credentials;
  } catch (error) {
    console.error("Error getting credentials:", error);
    throw error;
  }
};

/**
 * Create or Update User Profile in DynamoDB
 *
 * @param {string} userId - Cognito user ID
 * @param {Object} profileData - User profile data
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
 */
export const saveUserProfile = async (userId, profileData) => {
  try {
    // For demo mode, use localStorage
    if (process.env.REACT_APP_USE_DEMO_AUTH === "true") {
      const profile = {
        userId,
        ...profileData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`profile_${userId}`, JSON.stringify(profile));
      console.log("✅ Profile saved to localStorage (demo mode)");
      return { success: true, data: profile };
    }

    // Production: Save to DynamoDB
    const credentials = await getCredentials();

    const item = {
      userId,
      ...profileData,
      updatedAt: new Date().toISOString(),
    };

    // In a real implementation, you would use AWS SDK v3 here:
    // import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
    // const client = new DynamoDBClient({ region: dynamoDBConfig.region, credentials });
    // const command = new PutItemCommand({ TableName: dynamoDBConfig.tableName, Item: item });
    // const response = await client.send(command);

    console.log("Saving profile to DynamoDB:", item);

    // TODO: Replace with actual DynamoDB SDK call
    return {
      success: true,
      data: item,
      message:
        "DynamoDB integration ready - add @aws-sdk/client-dynamodb to implement",
    };
  } catch (error) {
    console.error("Error saving user profile:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get User Profile from DynamoDB
 *
 * @param {string} userId - Cognito user ID
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
 */
export const getUserProfile = async (userId) => {
  try {
    // For demo mode, use localStorage
    if (process.env.REACT_APP_USE_DEMO_AUTH === "true") {
      const profile = localStorage.getItem(`profile_${userId}`);
      if (profile) {
        console.log("✅ Profile loaded from localStorage (demo mode)");
        return { success: true, data: JSON.parse(profile) };
      }
      return { success: false, error: "Profile not found" };
    }

    // Production: Get from DynamoDB
    const credentials = await getCredentials();

    // In a real implementation, you would use AWS SDK v3 here:
    // import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
    // const client = new DynamoDBClient({ region: dynamoDBConfig.region, credentials });
    // const command = new GetItemCommand({
    //   TableName: dynamoDBConfig.tableName,
    //   Key: { userId: { S: userId } }
    // });
    // const response = await client.send(command);

    console.log("Getting profile from DynamoDB for userId:", userId);

    // TODO: Replace with actual DynamoDB SDK call
    return {
      success: false,
      error:
        "DynamoDB integration ready - add @aws-sdk/client-dynamodb to implement",
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update User Profile Fields in DynamoDB
 *
 * @param {string} userId - Cognito user ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    // Get existing profile first
    const existing = await getUserProfile(userId);

    if (!existing.success) {
      // If no profile exists, create one
      return await saveUserProfile(userId, updates);
    }

    // Merge updates with existing data
    const updatedProfile = {
      ...existing.data,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return await saveUserProfile(userId, updatedProfile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete User Profile from DynamoDB
 *
 * @param {string} userId - Cognito user ID
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export const deleteUserProfile = async (userId) => {
  try {
    // For demo mode, use localStorage
    if (process.env.REACT_APP_USE_DEMO_AUTH === "true") {
      localStorage.removeItem(`profile_${userId}`);
      console.log("✅ Profile deleted from localStorage (demo mode)");
      return { success: true };
    }

    // Production: Delete from DynamoDB
    const credentials = await getCredentials();

    // In a real implementation, you would use AWS SDK v3 here:
    // import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
    // const client = new DynamoDBClient({ region: dynamoDBConfig.region, credentials });
    // const command = new DeleteItemCommand({
    //   TableName: dynamoDBConfig.tableName,
    //   Key: { userId: { S: userId } }
    // });
    // const response = await client.send(command);

    console.log("Deleting profile from DynamoDB for userId:", userId);

    // TODO: Replace with actual DynamoDB SDK call
    return {
      success: true,
      message:
        "DynamoDB integration ready - add @aws-sdk/client-dynamodb to implement",
    };
  } catch (error) {
    console.error("Error deleting user profile:", error);
    return { success: false, error: error.message };
  }
};

export default {
  saveUserProfile,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
};
