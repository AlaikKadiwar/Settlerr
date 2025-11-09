// Authentication context - manages user state across the app
// Mike set this up to share login state between pages
import React, { createContext, useState, useEffect } from "react";
import { getCurrentAuthUser } from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in when app loads
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const result = await getCurrentAuthUser();

      if (result.success && result.user) {
        setUser(result.user);
        setUserAttributes(result.attributes);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setUserAttributes(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login - updates user state after successful authentication
  const login = (userData, attributes) => {
    setUser(userData);
    setUserAttributes(attributes);
    setIsAuthenticated(true);
  };

  // Logout - clears user state
  const logout = () => {
    setUser(null);
    setUserAttributes(null);
    setIsAuthenticated(false);
  };

  // Provide auth state and methods to all components
  const value = {
    user,
    userAttributes,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
