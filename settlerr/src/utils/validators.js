/**
 * Validation Utilities
 * Reusable validation functions for form inputs
 */

/**
 * Validate Email Address
 * Checks if email matches standard email format
 *
 * @param {string} email - Email address to validate
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === "") {
    return { isValid: false, error: "Email is required" };
  }

  // Standard email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validate Phone Number
 * Accepts various phone formats:
 * - (403) 555-0123
 * - 403-555-0123
 * - 4035550123
 * - +1 403 555 0123
 *
 * @param {string} phone - Phone number to validate
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === "") {
    return { isValid: false, error: "Phone number is required" };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, "");

  // Check if it's a valid North American phone number (10-11 digits)
  if (digitsOnly.length < 10) {
    return { isValid: false, error: "Phone number must be at least 10 digits" };
  }

  if (digitsOnly.length > 11) {
    return { isValid: false, error: "Phone number is too long" };
  }

  // If 11 digits, first digit should be 1 (country code)
  if (digitsOnly.length === 11 && digitsOnly[0] !== "1") {
    return { isValid: false, error: "Invalid country code" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validate Password
 * Checks password strength requirements
 *
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  if (!password || password.trim() === "") {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters`,
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (requireNumber && !/\d/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one special character",
    };
  }

  return { isValid: true, error: "" };
};

/**
 * Format Phone Number
 * Converts phone number to standard format: (403) 555-0123
 *
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
      3,
      6
    )}-${digitsOnly.slice(6)}`;
  }

  if (digitsOnly.length === 11 && digitsOnly[0] === "1") {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(
      4,
      7
    )}-${digitsOnly.slice(7)}`;
  }

  return phone; // Return original if can't format
};
