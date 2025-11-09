/**
 * MyAccountPage Component
 *
 * Main user account management page for the Settlerr app.
 * Provides profile editing, security settings, and event management.
 *
 * Features:
 * - Profile management (name, location, occupation, languages, interests)
 * - Security settings (email, phone, password)
 * - XP level system with progress tracking
 * - RSVP'd events list
 * - Password verification for security changes
 * - Searchable occupation dropdown
 * - Location search functionality
 *
 * @component
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import {
  validateEmail,
  validatePhone,
  formatPhoneNumber,
} from "../utils/validators";
import { XP_LEVELS } from "../utils/constants";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import ProfileImageUpload from "../components/profile/ProfileImageUpload";
import UserAvatar from "../components/common/UserAvatar";
import "../pages/TasksPage.css";
import "./MyAccountPage.css";

/**
 * Common Languages List
 * Array of 30 most commonly spoken languages worldwide.
 * Used for multi-select language preferences in user profile.
 */
const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Hindi",
  "Arabic",
  "French",
  "Bengali",
  "Portuguese",
  "Russian",
  "Urdu",
  "Indonesian",
  "German",
  "Japanese",
  "Swahili",
  "Marathi",
  "Telugu",
  "Turkish",
  "Tamil",
  "Vietnamese",
  "Korean",
  "Italian",
  "Thai",
  "Gujarati",
  "Persian",
  "Polish",
  "Ukrainian",
  "Punjabi",
  "Tagalog",
  "Kannada",
  "Malayalam",
];

/**
 * Common Interests List
 * Array of 24 popular interest categories.
 * Used for multi-select interest preferences in user profile.
 */
const COMMON_INTERESTS = [
  "Sports",
  "Music",
  "Technology",
  "Reading",
  "Cooking",
  "Travel",
  "Art",
  "Photography",
  "Gaming",
  "Fitness",
  "Movies",
  "Fashion",
  "Food",
  "Nature",
  "Volunteering",
  "Dancing",
  "Writing",
  "Hiking",
  "Yoga",
  "Meditation",
  "Gardening",
  "Crafts",
  "Business",
  "Science",
];

/**
 * Common Occupations List
 * Array of 30 common job titles and occupations.
 * Used for searchable dropdown in occupation field.
 * Users can search/filter this list to quickly select their occupation.
 */
const COMMON_OCCUPATIONS = [
  "Software Engineer",
  "Data Scientist",
  "Project Manager",
  "Teacher",
  "Nurse",
  "Doctor",
  "Accountant",
  "Marketing Manager",
  "Sales Representative",
  "Lawyer",
  "Engineer",
  "Designer",
  "Consultant",
  "Analyst",
  "Administrator",
  "Chef",
  "Mechanic",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Retail Worker",
  "Customer Service",
  "Healthcare Worker",
  "Social Worker",
  "Student",
  "Entrepreneur",
  "Freelancer",
  "Artist",
  "Writer",
  "Other",
];

/**
 * XP Level System Configuration
 * Defines 7 progression levels for user gamification.
 * Each level has:
 * - level: Numeric level (1-7)
 * - name: Display name for the level
 * - min: Minimum XP required to reach this level
 * - max: Maximum XP before next level
 * - icon: Emoji icon representing the level
 *
 * Progression: New Arrival → Settling In → Explorer → Local Navigator
 *              → Community Member → Calgary Expert → City Ambassador
 */

/**
 * MyAccountPage Component
 * Main component for user account management
 */
const MyAccountPage = () => {
  // Routing and authentication hooks
  const navigate = useNavigate();
  const { user, userAttributes, isAuthenticated, logout } = useAuth();

  /**
   * User Profile State
   * Stores all user profile data in localStorage for persistence.
   * Includes password field for demo authentication validation.
   *
   * Default profile is populated from localStorage or uses demo data.
   */
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved
      ? JSON.parse(saved)
      : {
          name: userAttributes?.name || user?.username || "Demo User",
          email: userAttributes?.email || "demo@settlerr.com",
          phone: userAttributes?.phone_number || "+1 (403) 555-0123",
          location: "Calgary, AB",
          occupation: "Software Engineer",
          languages: ["English", "Hindi"],
          interests: ["Technology", "Travel", "Sports"],
          xp: 450,
          joinedDate: "2025-10-15",
          password: "Demo123!", // Store demo password for validation (security verification)
          profilePicture: null, // Profile picture URL or data URI
          socialMedia: {
            instagram: "",
            twitter: "",
            whatsapp: "",
            facebook: "",
          },
        };
  });

  /**
   * Edit Mode States
   * Track whether profile or security sections are in edit mode.
   */
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);

  /**
   * Edit Form State
   * Temporary storage for profile edits before saving.
   * Initialized with current profile values when editing starts.
   */
  const [editForm, setEditForm] = useState({ ...profile });

  /**
   * Security Form State
   * Manages security-related field updates (email, phone, password).
   * - currentPassword: No longer used directly (kept for compatibility)
   * - newEmail: Updated email address
   * - newPhone: Updated phone number
   * - newPassword: New password (only if changing password)
   * - confirmPassword: Password confirmation field
   */
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newEmail: profile.email,
    newPhone: profile.phone,
    newPassword: "",
    confirmPassword: "",
  });

  /**
   * UI Control States
   * Various states for controlling UI behavior and visibility.
   */
  // Password change toggle - shows/hides password fields in security form
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Password verification modal - shown when saving security changes
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // Password verification input - user enters current password to confirm changes
  const [verificationPassword, setVerificationPassword] = useState("");

  // Active tab selector - 'profile', 'security', or 'events'
  const [selectedTab, setSelectedTab] = useState("profile");

  // Message banner for success/error notifications
  const [message, setMessage] = useState({ type: "", text: "" });

  // Location search input value - for future autocomplete functionality
  const [locationSearch, setLocationSearch] = useState("");

  // Occupation search input - filters occupation dropdown
  const [occupationSearch, setOccupationSearch] = useState(profile.occupation);

  // Controls occupation dropdown visibility
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);

  /**
   * RSVP'd Events State
   * Loads and displays events the user has RSVP'd to.
   * Combines suggested and other events from localStorage, filters for RSVP status.
   */
  const [rsvpedEvents, setRsvpedEvents] = useState(() => {
    const suggestedEvents = JSON.parse(
      localStorage.getItem("suggestedEvents") || "[]"
    );
    const otherEvents = JSON.parse(localStorage.getItem("otherEvents") || "[]");
    return [...suggestedEvents, ...otherEvents].filter(
      (event) => event.rsvpStatus
    );
  });

  /**
   * Calculate Current Level and Progress
   * Determines user's current XP level based on their XP points.
   *
   * @param {number} xp - User's current XP points
   * @returns {Object} Current level object from XP_LEVELS array
   */
  const getCurrentLevel = (xp) => {
    return (
      XP_LEVELS.find((level) => xp >= level.min && xp < level.max) ||
      XP_LEVELS[0]
    );
  };

  // Current level based on user's XP
  const currentLevel = getCurrentLevel(profile.xp);

  // Next level to reach (or undefined if at max level)
  const nextLevel = XP_LEVELS.find((level) => level.min > profile.xp);

  // Progress percentage to next level (0-100)
  const progressToNext = nextLevel
    ? ((profile.xp - currentLevel.min) / (nextLevel.min - currentLevel.min)) *
      100
    : 100;

  /**
   * Authentication Check Effect
   * Redirects to login page if user is not authenticated.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  /**
   * Profile Persistence Effect
   * Saves profile to localStorage whenever it changes.
   * Ensures user data persists across sessions.
   */
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  /**
   * Handle User Logout
   * Logs out user and redirects to home page.
   */
  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      logout();
      navigate("/");
    }
  };

  /**
   * Profile Edit Handlers
   * Functions to manage profile editing workflow.
   */

  /**
   * Enter Profile Edit Mode
   * Initializes edit form with current profile values.
   */
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setEditForm({ ...profile });
  };

  /**
   * Cancel Profile Edit
   * Exits edit mode and reverts changes.
   */
  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditForm({ ...profile });
    setMessage({ type: "", text: "" });
  };

  /**
   * Save Profile Changes
   * Applies edit form changes to profile and exits edit mode.
   * Shows success message for 3 seconds.
   */
  const handleSaveProfile = () => {
    setProfile({ ...profile, ...editForm });
    setIsEditingProfile(false);
    setMessage({ type: "success", text: "Profile updated successfully!" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  /**
   * Handle Profile Image Change
   * Updates profile picture in both edit form and profile state.
   * In a real app, this would upload to S3.
   *
   * @param {File} file - The selected image file
   * @param {string} preview - Data URI preview of the image
   */
  const handleProfileImageChange = (file, preview) => {
    // Update edit form
    setEditForm((prev) => ({
      ...prev,
      profilePicture: preview,
    }));

    // In a real app, upload to S3 here:
    // const uploadToS3 = async () => {
    //   const key = `profile-pictures/${user.userId}/${file.name}`;
    //   // Upload logic with AWS S3 SDK
    // };

    // For demo, just store the data URI
    setProfile((prev) => ({
      ...prev,
      profilePicture: preview,
    }));

    setMessage({ type: "success", text: "Profile picture updated!" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  /**
   * Handle Social Media Links Change
   * Updates social media links in edit form.
   *
   * @param {string} platform - Social media platform (instagram, twitter, whatsapp, facebook)
   * @param {string} value - URL or username for the platform
   */
  const handleSocialMediaChange = (platform, value) => {
    setEditForm((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value,
      },
    }));
  };

  /**
   * Multi-Select Handlers
   * Toggle functions for languages and interests chips.
   */

  /**
   * Toggle Interest Selection
   * Adds or removes an interest from the edit form.
   *
   * @param {string} interest - Interest to toggle
   */
  const toggleInterest = (interest) => {
    setEditForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  /**
   * Toggle Language Selection
   * Adds or removes a language from the edit form.
   *
   * @param {string} language - Language to toggle
   */
  const toggleLanguage = (language) => {
    setEditForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language],
    }));
  };

  /**
   * Security Update Handlers
   * Functions for managing security settings updates with password verification.
   */

  /**
   * Initiate Security Update
   * Triggered when security form is submitted.
   * Opens password verification modal instead of saving directly.
   * This ensures security changes require password confirmation.
   *
   * @param {Event} e - Form submit event
   */
  const handleSecurityUpdate = (e) => {
    e.preventDefault();
    setShowPasswordPrompt(true);
  };

  /**
   * Verify Password and Save Security Changes
   * Core security validation function.
   *
   * Flow:
   * 1. Validates entered password matches stored password
   * 2. If password change requested, validates new password
   * 3. Updates profile with new email, phone, and/or password
   * 4. Resets all forms and shows success message
   *
   * Security: Prevents unauthorized changes by requiring correct password.
   * This fixes the bug where wrong passwords were accepted.
   */
  const handleVerifyAndSave = () => {
    // Step 1: Validate current password
    if (verificationPassword !== profile.password) {
      setMessage({
        type: "error",
        text: "Incorrect password. Changes not saved.",
      });
      setVerificationPassword("");
      return;
    }

    // Step 2: Validate email and phone before saving
    const emailValidation = validateEmail(securityForm.newEmail);
    if (!emailValidation.isValid) {
      setMessage({
        type: "error",
        text: emailValidation.error,
      });
      return;
    }

    const phoneValidation = validatePhone(securityForm.newPhone);
    if (!phoneValidation.isValid) {
      setMessage({
        type: "error",
        text: phoneValidation.error,
      });
      return;
    }

    // Step 3: If changing password, validate new password requirements
    if (showPasswordFields) {
      // Check minimum length requirement
      if (securityForm.newPassword.length < 8) {
        setMessage({
          type: "error",
          text: "New password must be at least 8 characters",
        });
        return;
      }
      // Check passwords match
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        setMessage({ type: "error", text: "Passwords do not match" });
        return;
      }

      // Step 4a: Update profile with new password
      setProfile((prev) => ({
        ...prev,
        email: securityForm.newEmail,
        phone: formatPhoneNumber(securityForm.newPhone), // Format phone before saving
        password: securityForm.newPassword,
      }));
    } else {
      // Step 4b: Update only email and phone (no password change)
      setProfile((prev) => ({
        ...prev,
        email: securityForm.newEmail,
        phone: formatPhoneNumber(securityForm.newPhone), // Format phone before saving
      }));
    }

    // Step 5: Reset all forms and UI states
    setIsEditingSecurity(false);
    setShowPasswordPrompt(false);
    setVerificationPassword("");
    setSecurityForm({
      currentPassword: "",
      newEmail: securityForm.newEmail,
      newPhone: formatPhoneNumber(securityForm.newPhone),
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswordFields(false);

    // Step 6: Show success message
    setMessage({
      type: "success",
      text: "Security settings updated successfully!",
    });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  /**
   * Occupation Dropdown Handlers
   */

  /**
   * Filter Occupations Based on Search
   * Creates filtered list of occupations matching search term.
   * Case-insensitive search.
   */
  const filteredOccupations = COMMON_OCCUPATIONS.filter((occ) =>
    occ.toLowerCase().includes(occupationSearch.toLowerCase())
  );

  /**
   * Handle Occupation Selection from Dropdown
   * Updates both the search input and edit form when user selects an occupation.
   * Closes dropdown after selection.
   *
   * @param {string} occupation - Selected occupation from dropdown
   */
  const handleOccupationSelect = (occupation) => {
    setOccupationSearch(occupation);
    setEditForm({ ...editForm, occupation });
    setShowOccupationDropdown(false);
  };

  /**
   * Utility Functions
   */

  /**
   * Format Date for Display
   * Converts ISO date string to readable format.
   *
   * @param {string} dateString - ISO date string (e.g., "2025-10-15")
   * @returns {string} Formatted date (e.g., "October 15, 2025")
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Component Render
   * Main JSX structure with responsive design (desktop + mobile navigation).
   */
  return (
    <div className="app-container">
      {/* ========================================
          DESKTOP NAVIGATION BAR
          Top navigation for larger screens
          Shows: Logo, Links, Logout button
          Hidden on mobile (< 768px)
      ======================================== */}
      <nav className="app-nav desktop-nav">
        <div className="nav-brand">Settlerr</div>
        <div className="nav-links">
          <Link to="/tasks" className="nav-link">
            Tasks
          </Link>
          <Link to="/events" className="nav-link">
            Events
          </Link>
          <Link to="/network" className="nav-link">
            My Network
          </Link>
          <Link to="/account" className="nav-link nav-link-with-avatar active">
            <UserAvatar
              profilePicture={profile.profilePicture}
              username={profile.name}
              size="small"
            />
            <span>My Account</span>
          </Link>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </nav>

      {/* ========================================
          MOBILE HEADER
          Top bar for mobile devices
          Shows: Page title, Logout icon
          Visible only on mobile (< 768px)
      ======================================== */}
      <div className="mobile-header">
        <h1>My Account</h1>
        <button onClick={handleLogout} className="mobile-logout-btn">
          🚪
        </button>
      </div>

      {/* ========================================
          MAIN CONTENT AREA
      ======================================== */}
      <div className="app-content">
        {/* Page Header - Desktop Only */}
        <div className="page-header desktop-only">
          <h1>My Account</h1>
          <p className="text-muted">Manage your profile and settings</p>
        </div>

        {/* ========================================
            MESSAGE BANNER
            Displays success/error messages
            Auto-dismisses after 3 seconds
        ======================================== */}
        {message.text && (
          <div className={`message-banner ${message.type}`}>{message.text}</div>
        )}

        {/* ========================================
            XP LEVEL CARD
            Shows current level, XP, progress bar
            Gamification element for user engagement
        ======================================== */}
        <Card className="level-card">
          <div className="level-header">
            <div className="level-icon">{currentLevel.icon}</div>
            <div className="level-info">
              <h3>
                Level {currentLevel.level}: {currentLevel.name}
              </h3>
              <p className="text-muted">
                {profile.xp} XP{" "}
                {nextLevel &&
                  `• ${nextLevel.min - profile.xp} XP to ${nextLevel.name}`}
              </p>
            </div>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progressToNext}%` }}
            ></div>
          </div>
          <p className="level-description">
            Complete tasks, attend events, and connect with others to level up!
            🎉
          </p>
        </Card>

        {/* ========================================
            TAB NAVIGATION
            Switches between Profile, Security, and Events tabs
        ======================================== */}
        <div className="account-tabs">
          <button
            className={`tab-btn ${selectedTab === "profile" ? "active" : ""}`}
            onClick={() => setSelectedTab("profile")}
          >
            👤 Profile
          </button>
          <button
            className={`tab-btn ${selectedTab === "security" ? "active" : ""}`}
            onClick={() => setSelectedTab("security")}
          >
            🔒 Security
          </button>
          <button
            className={`tab-btn ${selectedTab === "events" ? "active" : ""}`}
            onClick={() => setSelectedTab("events")}
          >
            🎉 My Events ({rsvpedEvents.length})
          </button>
        </div>

        {/* ========================================
            PROFILE TAB CONTENT
            User profile information and editing
            
            Sections:
            - Basic Info: Name (locked), Location, Occupation, Member Since
            - Languages: Multi-select chips
            - Interests: Multi-select chips
            
            Features:
            - Edit mode toggle
            - Name field is read-only (cannot be changed after creation)
            - Occupation has searchable dropdown
            - Location has search functionality for Calgary areas
        ======================================== */}
        {selectedTab === "profile" && (
          <Card className="profile-section">
            <div className="section-header-with-action">
              <h2>Profile Information</h2>
              {!isEditingProfile ? (
                <Button variant="outline" onClick={handleEditProfile}>
                  ✏️ Edit
                </Button>
              ) : (
                <div className="edit-actions">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {/* ========================================
                PROFILE PICTURE UPLOAD
                Upload and preview profile picture
            ======================================== */}
            <ProfileImageUpload
              currentImage={profile.profilePicture}
              onImageChange={handleProfileImageChange}
              username={profile.name}
            />

            <div className="profile-grid">
              {/* ========================================
                  NAME FIELD (READ-ONLY)
                  Name cannot be changed after account creation
                  Shows notice when in edit mode
              ======================================== */}
              <div className="profile-field">
                <label>Name</label>
                <p>{profile.name}</p>
                {isEditingProfile && (
                  <p className="field-note">Name cannot be changed</p>
                )}
              </div>

              {/* Location field with search */}
              <div className="profile-field">
                <label>Location</label>
                {isEditingProfile ? (
                  <div className="location-search-container">
                    <Input
                      value={locationSearch || editForm.location}
                      onChange={(e) => {
                        setLocationSearch(e.target.value);
                        setEditForm({ ...editForm, location: e.target.value });
                      }}
                      placeholder="Search for your location in Calgary..."
                    />
                    <p className="field-note">
                      📍 Enter your neighborhood or area in Calgary (e.g.,
                      Downtown, Beltline, Kensington)
                    </p>
                  </div>
                ) : (
                  <p>{profile.location}</p>
                )}
              </div>

              {/* Occupation field with searchable dropdown */}
              <div className="profile-field">
                <label>Occupation</label>
                {isEditingProfile ? (
                  <div className="occupation-search-container">
                    <Input
                      value={occupationSearch}
                      onChange={(e) => {
                        setOccupationSearch(e.target.value);
                        setShowOccupationDropdown(true);
                      }}
                      onFocus={() => setShowOccupationDropdown(true)}
                      placeholder="Search or type your occupation..."
                    />
                    {showOccupationDropdown &&
                      filteredOccupations.length > 0 && (
                        <div className="occupation-dropdown">
                          {filteredOccupations.map((occ) => (
                            <div
                              key={occ}
                              className="occupation-option"
                              onClick={() => handleOccupationSelect(occ)}
                            >
                              {occ}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ) : (
                  <p>{profile.occupation}</p>
                )}
              </div>

              {/* Member since - read only */}
              <div className="profile-field">
                <label>Member Since</label>
                <p>{formatDate(profile.joinedDate)}</p>
              </div>
            </div>

            {/* ========================================
                LANGUAGES SECTION
                Multi-select chips for language preferences
                Edit mode: Click to toggle selection
                View mode: Display selected languages
            ======================================== */}
            <div className="profile-section-group">
              <h3>Languages</h3>
              {isEditingProfile ? (
                <div className="chips-grid">
                  {COMMON_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      className={`chip ${
                        editForm.languages.includes(lang) ? "selected" : ""
                      }`}
                      onClick={() => toggleLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="chips-display">
                  {profile.languages.map((lang) => (
                    <span key={lang} className="chip selected">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================
                INTERESTS SECTION
                Multi-select chips for interest preferences
                Edit mode: Click to toggle selection
                View mode: Display selected interests
            ======================================== */}
            <div className="profile-section-group">
              <h3>Interests</h3>
              {isEditingProfile ? (
                <div className="chips-grid">
                  {COMMON_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      className={`chip ${
                        editForm.interests.includes(interest) ? "selected" : ""
                      }`}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="chips-display">
                  {profile.interests.map((interest) => (
                    <span key={interest} className="chip selected">
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================
                SOCIAL MEDIA CONNECTIONS
                Link social media accounts
            ======================================== */}
            <div className="profile-section-group">
              <h3>Social Media</h3>
              <p className="field-note">
                Connect your social media accounts (optional)
              </p>
              {isEditingProfile ? (
                <div className="social-media-grid">
                  <div className="social-input-group">
                    <label>
                      <span className="social-icon">📷</span>
                      Instagram
                    </label>
                    <Input
                      type="text"
                      value={editForm.socialMedia?.instagram || ""}
                      onChange={(e) =>
                        handleSocialMediaChange("instagram", e.target.value)
                      }
                      placeholder="@username or profile URL"
                    />
                  </div>

                  <div className="social-input-group">
                    <label>
                      <span className="social-icon">𝕏</span>X (Twitter)
                    </label>
                    <Input
                      type="text"
                      value={editForm.socialMedia?.twitter || ""}
                      onChange={(e) =>
                        handleSocialMediaChange("twitter", e.target.value)
                      }
                      placeholder="@username or profile URL"
                    />
                  </div>

                  <div className="social-input-group">
                    <label>
                      <span className="social-icon">💬</span>
                      WhatsApp
                    </label>
                    <Input
                      type="text"
                      value={editForm.socialMedia?.whatsapp || ""}
                      onChange={(e) =>
                        handleSocialMediaChange("whatsapp", e.target.value)
                      }
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="social-input-group">
                    <label>
                      <span className="social-icon">📘</span>
                      Facebook
                    </label>
                    <Input
                      type="text"
                      value={editForm.socialMedia?.facebook || ""}
                      onChange={(e) =>
                        handleSocialMediaChange("facebook", e.target.value)
                      }
                      placeholder="Profile URL or username"
                    />
                  </div>
                </div>
              ) : (
                <div className="social-media-display">
                  {profile.socialMedia?.instagram && (
                    <div className="social-item">
                      <span className="social-icon">📷</span>
                      <strong>Instagram:</strong>{" "}
                      {profile.socialMedia.instagram}
                    </div>
                  )}
                  {profile.socialMedia?.twitter && (
                    <div className="social-item">
                      <span className="social-icon">𝕏</span>
                      <strong>X:</strong> {profile.socialMedia.twitter}
                    </div>
                  )}
                  {profile.socialMedia?.whatsapp && (
                    <div className="social-item">
                      <span className="social-icon">💬</span>
                      <strong>WhatsApp:</strong> {profile.socialMedia.whatsapp}
                    </div>
                  )}
                  {profile.socialMedia?.facebook && (
                    <div className="social-item">
                      <span className="social-icon">📘</span>
                      <strong>Facebook:</strong> {profile.socialMedia.facebook}
                    </div>
                  )}
                  {!profile.socialMedia?.instagram &&
                    !profile.socialMedia?.twitter &&
                    !profile.socialMedia?.whatsapp &&
                    !profile.socialMedia?.facebook && (
                      <p className="text-muted">No social media linked</p>
                    )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ========================================
            SECURITY TAB CONTENT
            Manage email, phone, and password
            
            Features:
            - View mode: Shows current values (password hidden)
            - Edit mode: Form with validation
            - Password change is optional (toggle to show/hide fields)
            - Password verification modal required before saving
            
            Security: All changes require entering current password
        ======================================== */}
        {selectedTab === "security" && (
          <Card className="security-section">
            <h2>Security Settings</h2>
            <p className="text-muted">Update your email, phone, or password</p>

            {!isEditingSecurity ? (
              <div className="security-info">
                <div className="security-item">
                  <div className="security-label">
                    <span className="security-icon">📧</span>
                    <strong>Email</strong>
                  </div>
                  <p>{profile.email}</p>
                </div>

                <div className="security-item">
                  <div className="security-label">
                    <span className="security-icon">📱</span>
                    <strong>Phone</strong>
                  </div>
                  <p>{profile.phone}</p>
                </div>

                <div className="security-item">
                  <div className="security-label">
                    <span className="security-icon">🔑</span>
                    <strong>Password</strong>
                  </div>
                  <p>••••••••</p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setIsEditingSecurity(true);
                    setSecurityForm({
                      ...securityForm,
                      newEmail: profile.email,
                      newPhone: profile.phone,
                    });
                  }}
                >
                  Update Security Settings
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSecurityUpdate} className="security-form">
                <div className="form-group">
                  <label>Email</label>
                  <Input
                    type="email"
                    value={securityForm.newEmail}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        newEmail: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <Input
                    type="tel"
                    value={securityForm.newPhone}
                    onChange={(e) =>
                      setSecurityForm({
                        ...securityForm,
                        newPhone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-divider">
                  <button
                    type="button"
                    className="change-password-toggle"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                  >
                    {showPasswordFields ? "− Hide" : "+ Change"} Password
                  </button>
                </div>

                {showPasswordFields && (
                  <>
                    <div className="form-group">
                      <label>New Password</label>
                      <Input
                        type="password"
                        value={securityForm.newPassword}
                        onChange={(e) =>
                          setSecurityForm({
                            ...securityForm,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="At least 8 characters"
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <Input
                        type="password"
                        value={securityForm.confirmPassword}
                        onChange={(e) =>
                          setSecurityForm({
                            ...securityForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </>
                )}

                <p className="security-note">
                  🔒 You will be asked to verify your current password before
                  saving changes.
                </p>

                <div className="form-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditingSecurity(false);
                      setShowPasswordFields(false);
                      setSecurityForm({
                        currentPassword: "",
                        newEmail: profile.email,
                        newPhone: profile.phone,
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setMessage({ type: "", text: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {/* ========================================
            MY EVENTS TAB CONTENT
            Display list of RSVP'd events
            
            Shows:
            - Event thumbnail image
            - Event title
            - Date and time
            - Location
            - Button to view full event details
            
            Empty state: Shows message and button to browse events
        ======================================== */}
        {selectedTab === "events" && (
          <div className="my-events-section">
            <Card>
              <h2>My RSVP'd Events</h2>
              <p className="text-muted">Events you've registered for</p>

              {rsvpedEvents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No Events Yet</h3>
                  <p>RSVP to events to see them here</p>
                  <Button variant="primary" onClick={() => navigate("/events")}>
                    Browse Events
                  </Button>
                </div>
              ) : (
                <div className="events-list">
                  {rsvpedEvents.map((event) => (
                    <div key={event.id} className="event-item">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="event-thumb"
                      />
                      <div className="event-item-content">
                        <h4>{event.title}</h4>
                        <p className="event-item-date">
                          📅 {formatDate(event.date)} • {event.time}
                        </p>
                        <p className="event-item-location">
                          📍 {event.location}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/events")}
                        className="event-item-btn"
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ========================================
          PASSWORD VERIFICATION MODAL
          Security modal for confirming user identity
          
          Flow:
          1. User clicks "Save Changes" on security form
          2. This modal appears as overlay
          3. User must enter current password
          4. Validates password before allowing changes
          
          Features:
          - Full-screen overlay with backdrop
          - Auto-focus on password input
          - Shows error message if password incorrect
          - Cancel or Verify & Save actions
          
          Security: Prevents unauthorized changes to sensitive data
      ======================================== */}
      {showPasswordPrompt && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <h3>🔒 Verify Your Password</h3>
            <p className="modal-description">
              Please enter your current password to save security changes.
            </p>
            <div className="form-group">
              <Input
                type="password"
                value={verificationPassword}
                onChange={(e) => setVerificationPassword(e.target.value)}
                placeholder="Enter your current password"
                autoFocus
              />
            </div>
            {message.type === "error" && (
              <p className="error-message">{message.text}</p>
            )}
            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setVerificationPassword("");
                  setMessage({ type: "", text: "" });
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleVerifyAndSave}>
                Verify & Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MOBILE BOTTOM NAVIGATION
          Fixed bottom navigation bar for mobile devices
          
          Shows 4 tabs:
          - Tasks
          - Events
          - Network (My Network)
          - Account (active/highlighted)
          
          Visible only on mobile (< 768px)
          Each tab has icon and label
      ======================================== */}
      <nav className="mobile-bottom-nav">
        <Link to="/tasks" className="mobile-nav-item">
          <span className="mobile-nav-icon">📋</span>
          <span>Tasks</span>
        </Link>
        <Link to="/events" className="mobile-nav-item">
          <span className="mobile-nav-icon">🎉</span>
          <span>Events</span>
        </Link>
        <Link to="/network" className="mobile-nav-item">
          <span className="mobile-nav-icon">👥</span>
          <span>Network</span>
        </Link>
        <Link to="/account" className="mobile-nav-item active">
          <span className="mobile-nav-icon">👤</span>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};

export default MyAccountPage;
