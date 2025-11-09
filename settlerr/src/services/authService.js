// Authentication service using JWT tokens with FastAPI backend
// Handles signup, login, logout, and session management

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Storage keys
const TOKEN_KEY = "jwt_token";
const USER_KEY = "current_user";

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Sign up a new user - creates account via backend API
export const signup = async (userData) => {
  try {
    const { username, password, email, name, phone, dob, location, interests, status } = userData;

    // Create FormData to match backend expectations
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("email", email);
    formData.append("name", name);
    formData.append("phone", phone || "");
    formData.append("dob", dob || "");
    formData.append("country", location || "");
    formData.append("occupation", "");
    formData.append("languages", JSON.stringify([])); // Will be added later
    formData.append("interests", JSON.stringify(interests || []));

    const response = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      body: formData, // Send as FormData, not JSON
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.detail || "Unable to create account" 
      };
    }

    console.log("✅ User created successfully:", data.username);
    
    // Store the JWT token
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    
    // Store user info
    const userInfo = {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      name: data.name,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    
    return { 
      success: true, 
      user: userInfo,
      userId: data.user_id,
      token: data.token,
      message: data.message
    };
  } catch (error) {
    console.error("❌ Error signing up:", error);
    return { 
      success: false, 
      error: error.message || "Network error. Please check your connection." 
    };
  }
};

// Login user - authenticates with backend API and gets JWT token
export const login = async (username, password) => {
  try {
    // Create FormData to match backend expectations
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      body: formData, // Send as FormData, not JSON
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || data.detail || "Invalid username or password" 
      };
    }

    // Store JWT token and user info
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    
    const userInfo = {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      name: data.name,
      profile: data.profile,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    console.log("✅ Login successful:", username);
    return {
      success: true,
      isSignedIn: true,
      user: userInfo,
      token: data.token,
    };
  } catch (error) {
    console.error("❌ Error signing in:", error);
    return { 
      success: false, 
      error: error.message || "Network error. Please check your connection." 
    };
  }
};

// Logout user - clears JWT token and session
export const logout = async () => {
  try {
    // Clear stored auth data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    console.log("✅ Logout successful");
    return { success: true };
  } catch (error) {
    console.error("❌ Error signing out:", error);
    return { success: false, error: error.message };
  }
};

// Get current authenticated user from localStorage
export const getCurrentAuthUser = async () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    
    if (!token || !userStr) {
      return { success: false, error: null };
    }
    
    const user = JSON.parse(userStr);
    return { success: true, user, token };
  } catch (error) {
    console.log("No authenticated user");
    return { success: false, error: null };
  }
};

// Get user profile from backend
export const getUserProfile = async (username) => {
  try {
    const response = await fetch(`${API_URL}/api/getUserProfile?username=${username}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to fetch profile" };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    return { success: false, error: error.message };
  }
};

// Update user profile via backend
export const updateUserProfile = async (username, profileData) => {
  try {
    const response = await fetch(`${API_URL}/api/updateUserProfile`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, ...profileData }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update profile" };
    }

    // Update stored user data
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      const user = JSON.parse(userStr);
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }

    console.log("✅ Profile updated successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    return { success: false, error: error.message };
  }
};

export default {
  signup,
  login,
  logout,
  getCurrentAuthUser,
  getUserProfile,
  updateUserProfile,
  getAuthHeaders, // Export for use in other API calls
};
