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

// Sign up a new user - creates account in backend with JWT
export const signup = async (userData) => {
  try {
    const { username, password, email, name, phone, dob, country, occupation, languages, interests } = userData;

    // Format phone number
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Create FormData for backend
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("email", email);
    formData.append("name", name);
    formData.append("dob", dob);
    formData.append("phone", formattedPhone);
    formData.append("country", country || "");
    formData.append("occupation", occupation || "");
    formData.append("languages", JSON.stringify(languages || []));
    formData.append("interests", JSON.stringify(interests || []));

    // Call backend API
    const response = await fetch("http://localhost:8000/api/signup", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Unable to create account. Please try again.",
      };
    }

    // Store JWT token in localStorage
    localStorage.setItem("settlerr_token", data.token);
    localStorage.setItem("settlerr_user", JSON.stringify({
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      name: data.name,
    }));

    console.log("✅ User created successfully:", data.username);

    return {
      success: true,
      user: { username: data.username, userId: data.user_id },
      userId: data.user_id,
      token: data.token,
    };
  } catch (error) {
    console.error("Error signing up:", error);

    // Make error messages user-friendly
    let userMessage = "Unable to create account. Please try again.";

    if (error.message.includes("Failed to fetch")) {
      userMessage = "Cannot connect to server. Please make sure the backend is running.";
    } else if (error.message.includes("Network")) {
      userMessage = "Network error. Please check your internet connection.";
    }

    return { success: false, error: userMessage };
  }
};

// Login user - authenticates with backend and returns JWT
export const login = async (username, password) => {
  try {
    // Create FormData for backend
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    // Call backend API
    const response = await fetch("http://localhost:8000/api/login", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Invalid username or password",
      };
    }

    // Store JWT token in localStorage
    localStorage.setItem("settlerr_token", data.token);
    localStorage.setItem("settlerr_user", JSON.stringify({
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      name: data.name,
    }));

    console.log("✅ Login successful:", data.username);

    return {
      success: true,
      isSignedIn: true,
      user: { username: data.username, userId: data.user_id },
      attributes: {
        email: data.email,
        name: data.name,
      },
      profile: data.profile,
      token: data.token,
    };
  } catch (error) {
    console.error("Error signing in:", error);

    // Make error messages user-friendly
    let userMessage = "Unable to sign in. Please try again.";

    if (error.message.includes("Failed to fetch")) {
      userMessage = "Cannot connect to server. Please make sure the backend is running.";
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
