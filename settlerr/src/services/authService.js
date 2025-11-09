// Authentication service using AWS Amplify
// Handles signup, login, logout, and session management
import { Amplify } from "aws-amplify";
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  updateUserAttributes,
} from "@aws-amplify/auth";
import awsConfig from "../aws-config";
import { saveUserProfile, getUserProfile } from "./dynamoDBService";

// Check if we should use demo auth (for development without AWS)
const USE_DEMO_AUTH = process.env.REACT_APP_USE_DEMO_AUTH === "true";

// Only configure Amplify if not using demo auth
if (!USE_DEMO_AUTH) {
  try {
    Amplify.configure(awsConfig);
    console.log("✅ Amplify configured with AWS Cognito");
  } catch (error) {
    console.error("❌ Error configuring Amplify:", error);
  }
}

// Demo auth storage (for development only)
const demoUsers = new Map();

// Pre-create a demo user for easy testing
if (USE_DEMO_AUTH) {
  demoUsers.set("demo", {
    userId: "demo-user-123",
    username: "demo",
    password: "Demo123!",
    attributes: {
      email: "demo@settlerr.com",
      name: "Demo User",
      phone_number: "+14031234567",
      birthdate: "1995-01-01",
    },
  });
  console.log("🎯 Demo user ready! Username: demo | Password: Demo123!");
}

// Sign up a new user - creates account in Cognito or demo storage
export const signup = async (userData) => {
  if (USE_DEMO_AUTH) {
    // Demo mode - store in memory
    const { username, password, email, name, phone, dob } = userData;

    if (demoUsers.has(username)) {
      return { success: false, error: "Username already exists" };
    }

    const userId = `demo-${Date.now()}`;
    demoUsers.set(username, {
      userId,
      username,
      password,
      attributes: { email, name, phone_number: phone, birthdate: dob },
    });

    console.log("✅ Demo user created:", username);
    return {
      success: true,
      user: { username, userId },
      userId,
    };
  }

  try {
    const { username, password, email, name, phone, dob } = userData;

    // Format phone number to E.164 format (+1234567890)
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Create user in Cognito
    const { user, userId } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          name,
          birthdate: dob, // format: YYYY-MM-DD
          phone_number: formattedPhone,
        },
        autoSignIn: true,
      },
    });

    console.log("User signed up successfully:", user);

    // Store additional profile data in DynamoDB
    const profileData = {
      username,
      email,
      name,
      phone: formattedPhone,
      birthdate: dob,
      createdAt: new Date().toISOString(),
      xp: 0,
      joinedDate: new Date().toISOString().split("T")[0],
    };

    const dbResult = await saveUserProfile(userId, profileData);
    if (!dbResult.success) {
      console.warn(
        "Profile saved to Cognito but DynamoDB storage failed:",
        dbResult.error
      );
    }

    return { success: true, user, userId };
  } catch (error) {
    console.error("Error signing up:", error);

    // Make error messages user-friendly
    let userMessage = "Unable to create account. Please try again.";

    if (error.message.includes("validation error")) {
      userMessage =
        "AWS is not configured yet. Please use demo mode or contact support.";
    } else if (error.message.includes("UsernameExistsException")) {
      userMessage =
        "This username is already taken. Please choose another one.";
    } else if (error.message.includes("InvalidPasswordException")) {
      userMessage =
        "Password doesn't meet requirements. Use 8+ characters with numbers and symbols.";
    } else if (error.message.includes("InvalidParameterException")) {
      userMessage = "Please check your information and try again.";
    } else if (error.message.includes("Network")) {
      userMessage = "Network error. Please check your internet connection.";
    }

    return { success: false, error: userMessage };
  }
};

// Login user - authenticates with Cognito or demo storage
export const login = async (username, password) => {
  if (USE_DEMO_AUTH) {
    // Demo mode - check memory storage
    const user = demoUsers.get(username);

    if (!user || user.password !== password) {
      return { success: false, error: "Invalid username or password" };
    }

    console.log("✅ Demo login successful:", username);
    return {
      success: true,
      isSignedIn: true,
      user: { username, userId: user.userId },
      attributes: user.attributes,
    };
  }

  try {
    const { isSignedIn, nextStep } = await signIn({ username, password });

    if (isSignedIn) {
      // Get user details after successful login
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      // Load user profile from DynamoDB
      const profileResult = await getUserProfile(currentUser.userId);
      const profile = profileResult.success ? profileResult.data : null;

      return {
        success: true,
        user: currentUser,
        attributes,
        profile,
        isSignedIn,
      };
    }

    // Handle additional steps (e.g., MFA, password reset)
    return { success: true, nextStep };
  } catch (error) {
    console.error("Error signing in:", error);

    // Make error messages user-friendly
    let userMessage = "Unable to sign in. Please try again.";

    if (error.message.includes("validation error")) {
      userMessage = "AWS is not configured yet. Please use demo mode.";
    } else if (error.message.includes("UserNotFoundException")) {
      userMessage = "Account not found. Please check your username or sign up.";
    } else if (error.message.includes("NotAuthorizedException")) {
      userMessage = "Incorrect username or password. Please try again.";
    } else if (error.message.includes("UserNotConfirmedException")) {
      userMessage = "Please verify your email before logging in.";
    } else if (error.message.includes("Network")) {
      userMessage = "Network error. Please check your internet connection.";
    }

    return { success: false, error: userMessage };
  }
};

// Logout user - ends Cognito session or clears demo session
export const logout = async () => {
  if (USE_DEMO_AUTH) {
    console.log("✅ Demo logout successful");
    return { success: true };
  }

  try {
    await signOut();
    console.log("User signed out successfully");
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: error.message };
  }
};

// Get current authenticated user
export const getCurrentAuthUser = async () => {
  if (USE_DEMO_AUTH) {
    // In demo mode, no persistent session
    return { success: false, error: null };
  }

  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    return { success: true, user, attributes };
  } catch (error) {
    console.log("No authenticated user");
    return { success: false, error: null };
  }
};

// Get user attributes (email, name, etc.)
export const getUserAttributes = async () => {
  if (USE_DEMO_AUTH) {
    return { success: false, error: "Demo mode - no attributes" };
  }

  try {
    const attributes = await fetchUserAttributes();
    return { success: true, attributes };
  } catch (error) {
    console.error("Error fetching user attributes:", error);
    return { success: false, error: error.message };
  }
};

// Store additional user data in DynamoDB
// This is called after successful Cognito signup or can be used to update profile
export const storeUserProfile = async (userId, profileData) => {
  try {
    const result = await saveUserProfile(userId, profileData);

    if (result.success) {
      console.log("✅ User profile stored successfully");
      return { success: true, data: result.data };
    } else {
      console.error("❌ Failed to store user profile:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error storing user profile:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Update Cognito user attributes (email, phone, name, etc.)
 * Also updates DynamoDB profile if changes are made
 *
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export const updateUserProfile = async (attributes) => {
  if (USE_DEMO_AUTH) {
    console.log("Demo mode - profile update simulated");
    return { success: true };
  }

  try {
    // Update Cognito attributes
    const cognitoResult = await updateUserAttributes({
      userAttributes: attributes,
    });

    console.log("Cognito attributes updated:", cognitoResult);

    // Update DynamoDB profile
    const currentUser = await getCurrentUser();
    const dbResult = await saveUserProfile(currentUser.userId, attributes);

    if (!dbResult.success) {
      console.warn(
        "Cognito updated but DynamoDB update failed:",
        dbResult.error
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
};

export default {
  signup,
  login,
  logout,
  getCurrentAuthUser,
  getUserAttributes,
  storeUserProfile,
  updateUserProfile,
};
