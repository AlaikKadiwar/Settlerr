import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  signup as signupUser,
  storeUserProfile,
} from "../services/authService";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import "./AuthPages.css";

// List of countries for the dropdown - Sarah added most common ones
// TODO: maybe load this from an API later?
const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Ethiopia",
  "France",
  "Germany",
  "Ghana",
  "Greece",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Kenya",
  "Mexico",
  "Morocco",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Syria",
  "Tanzania",
  "Thailand",
  "Turkey",
  "Uganda",
  "Ukraine",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Yemen",
  "Zimbabwe",
];

// Phone country codes - added by Mike
const COUNTRY_CODES = [
  { code: "+1", country: "US/Canada" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "India" },
  { code: "+86", country: "China" },
  { code: "+61", country: "Australia" },
  { code: "+81", country: "Japan" },
  { code: "+82", country: "South Korea" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+92", country: "Pakistan" },
  { code: "+234", country: "Nigeria" },
  { code: "+62", country: "Indonesia" },
  { code: "+55", country: "Brazil" },
  { code: "+52", country: "Mexico" },
  { code: "+63", country: "Philippines" },
  { code: "+20", country: "Egypt" },
  { code: "+27", country: "South Africa" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+90", country: "Turkey" },
  { code: "+971", country: "UAE" },
];

// Common languages list
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

// interests array - we can add more later
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

// Immigration status options - Alex
const STATUS_OPTIONS = [
  { value: "work-permit", label: "Work Permit" },
  { value: "study-permit", label: "Study Permit" },
  { value: "refugee", label: "Refugee" },
  { value: "permanent-resident", label: "Permanent Resident" },
  { value: "citizen", label: "Citizen" },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // tracks which step user is on
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // form state - stores all user input across the 3 steps
  const [formData, setFormData] = useState({
    // Step 1 - account creation
    username: "",
    password: "",
    confirmPassword: "",
    // Step 2 - personal details
    name: "", // full name
    email: "",
    dob: "", // date of birth
    countryCode: "+1", // default to Canada
    phone: "",
    // Step 3 - preferences and background
    country: "", // country of origin
    occupation: "",
    selectedLanguages: [], // array because users can speak multiple languages
    selectedInterests: [], // hobbies, activities they're interested in
  });

  // password validation state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    text: "",
    color: "",
  });

  // autocomplete states for step 3
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [languageInput, setLanguageInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [filteredLanguages, setFilteredLanguages] = useState([]);
  const [filteredInterests, setFilteredInterests] = useState([]);

  // Check password strength - Mike wrote this
  // gives score from 0-5 based on length and character variety
  const validatePassword = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++; // bonus for longer passwords
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // mixed case
    if (/[0-9]/.test(password)) score++; // has numbers
    if (/[^a-zA-Z0-9]/.test(password)) score++; // special chars

    const strengths = [
      { score: 0, text: "", color: "" },
      { score: 1, text: "Very Weak", color: "#ef4444" },
      { score: 2, text: "Weak", color: "#f59e0b" },
      { score: 3, text: "Fair", color: "#eab308" },
      { score: 4, text: "Good", color: "#10b981" },
      { score: 5, text: "Strong", color: "#059669" },
    ];

    return strengths[score];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "password") {
      setPasswordStrength(validatePassword(value));
    }

    if (name === "country") {
      if (value) {
        const filtered = COUNTRIES.filter((c) =>
          c.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCountries(filtered);
        setShowCountryDropdown(true);
      } else {
        setShowCountryDropdown(false);
      }
    }
  };

  const handleCountrySelect = (country) => {
    setFormData({ ...formData, country });
    setShowCountryDropdown(false);
  };

  const handleLanguageInput = (e) => {
    const value = e.target.value;
    setLanguageInput(value);
    if (value) {
      const filtered = COMMON_LANGUAGES.filter(
        (lang) =>
          lang.toLowerCase().includes(value.toLowerCase()) &&
          !formData.selectedLanguages.includes(lang)
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages([]);
    }
  };

  const addLanguage = (language) => {
    if (!formData.selectedLanguages.includes(language)) {
      setFormData({
        ...formData,
        selectedLanguages: [...formData.selectedLanguages, language],
      });
      setLanguageInput("");
      setFilteredLanguages([]);
    }
  };

  const removeLanguage = (language) => {
    setFormData({
      ...formData,
      selectedLanguages: formData.selectedLanguages.filter(
        (l) => l !== language
      ),
    });
  };

  const handleInterestInput = (e) => {
    const value = e.target.value;
    setInterestInput(value);
    if (value) {
      const filtered = COMMON_INTERESTS.filter(
        (interest) =>
          interest.toLowerCase().includes(value.toLowerCase()) &&
          !formData.selectedInterests.includes(interest)
      );
      setFilteredInterests(filtered);
    } else {
      setFilteredInterests([]);
    }
  };

  const addInterest = (interest) => {
    if (!formData.selectedInterests.includes(interest)) {
      setFormData({
        ...formData,
        selectedInterests: [...formData.selectedInterests, interest],
      });
      setInterestInput("");
      setFilteredInterests([]);
    }
  };

  const removeInterest = (interest) => {
    setFormData({
      ...formData,
      selectedInterests: formData.selectedInterests.filter(
        (i) => i !== interest
      ),
    });
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setError("");

    // Validation for step 1
    if (currentStep === 1) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match!");
        return;
      }
      if (passwordStrength.score < 3) {
        setError("Please use a stronger password (at least Fair strength)");
        return;
      }
    }

    // Validation for step 2
    if (currentStep === 2) {
      if (
        !formData.email ||
        !formData.name ||
        !formData.dob ||
        !formData.phone
      ) {
        setError("Please fill in all required fields");
        return;
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - submit to backend API
      setLoading(true);

      try {
        // Combine country code and phone number
        const fullPhone = formData.countryCode + formData.phone;

        // Create user via backend API
        const result = await signupUser({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          name: formData.name,
          phone: fullPhone,
          dob: formData.dob,
          country: formData.country,
          occupation: formData.occupation,
          languages: formData.selectedLanguages,
          interests: formData.selectedInterests,
        });

        if (result.success) {
          console.log("User created:", result.userId);

          // Auto sign in the user
          login(result.user, { email: formData.email, name: formData.name });

          alert("Signup complete! Welcome to Settlerr!");
          navigate("/tasks");
        } else {
          setError(result.error || "Signup failed. Please try again.");
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h3>Create Your Account</h3>
            <Input
              label="Username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  ></div>
                </div>
                <span
                  style={{
                    color: passwordStrength.color,
                    fontSize: "0.875rem",
                  }}
                >
                  {passwordStrength.text}
                </span>
                <p className="password-hint">
                  Use 8+ characters with uppercase, lowercase, numbers, and
                  symbols
                </p>
              </div>
            )}
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>Personal Information</h3>
            <Input
              label="Full Name"
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
            />
            <div className="phone-input-group">
              <label className="input-label">
                Phone Number <span className="required">*</span>
              </label>
              <div className="phone-input-wrapper">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className="country-code-select"
                >
                  {COUNTRY_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} ({item.country})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="phone"
                  placeholder="123-456-7890"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field phone-number"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Tell Us About Yourself</h3>
            <div className="input-group">
              <label className="input-label">
                Country of Origin <span className="required">*</span>
              </label>
              <input
                type="text"
                name="country"
                placeholder="Start typing your country..."
                value={formData.country}
                onChange={handleChange}
                onFocus={() => formData.country && setShowCountryDropdown(true)}
                className="input-field"
                autoComplete="off"
                required
              />
              {showCountryDropdown && filteredCountries.length > 0 && (
                <div className="dropdown-menu">
                  {filteredCountries.map((country) => (
                    <div
                      key={country}
                      className="dropdown-item"
                      onClick={() => handleCountrySelect(country)}
                    >
                      {country}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Interests</label>
              <input
                type="text"
                placeholder="Type to search and add interests..."
                value={interestInput}
                onChange={handleInterestInput}
                className="input-field"
                autoComplete="off"
              />
              {filteredInterests.length > 0 && (
                <div className="dropdown-menu">
                  {filteredInterests.map((interest) => (
                    <div
                      key={interest}
                      className="dropdown-item"
                      onClick={() => addInterest(interest)}
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              )}
              {formData.selectedInterests.length > 0 && (
                <div className="chips-container">
                  {formData.selectedInterests.map((interest) => (
                    <div key={interest} className="chip">
                      <span>{interest}</span>
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="chip-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Occupation"
              type="text"
              name="occupation"
              placeholder="e.g., Software Engineer, Student, Business Analyst"
              value={formData.occupation}
              onChange={handleChange}
              required
            />

            <div className="input-group">
              <label className="input-label">Languages</label>
              <input
                type="text"
                placeholder="Type to search and add languages..."
                value={languageInput}
                onChange={handleLanguageInput}
                className="input-field"
                autoComplete="off"
              />
              {filteredLanguages.length > 0 && (
                <div className="dropdown-menu">
                  {filteredLanguages.map((lang) => (
                    <div
                      key={lang}
                      className="dropdown-item"
                      onClick={() => addLanguage(lang)}
                    >
                      {lang}
                    </div>
                  ))}
                </div>
              )}
              {formData.selectedLanguages.length > 0 && (
                <div className="chips-container">
                  {formData.selectedLanguages.map((lang) => (
                    <div key={lang} className="chip">
                      <span>{lang}</span>
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className="chip-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title" onClick={() => navigate("/")}>
            Settlerr
          </h1>
          <h2>Join Settlerr</h2>
          <p className="text-muted">Start your journey in Calgary</p>
        </div>

        <div className="step-indicator">
          <div
            className={`step ${currentStep >= 1 ? "active" : ""} ${
              currentStep > 1 ? "completed" : ""
            }`}
          >
            1
          </div>
          <div className="step-line"></div>
          <div
            className={`step ${currentStep >= 2 ? "active" : ""} ${
              currentStep > 2 ? "completed" : ""
            }`}
          >
            2
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep >= 3 ? "active" : ""}`}>3</div>
        </div>

        <Card>
          <form onSubmit={handleNext}>
            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "0.5rem",
                  color: "#c33",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}

            {renderStepContent()}

            <div className="button-group">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  fullWidth
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : currentStep === 3
                  ? "Complete Signup"
                  : "Next"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="auth-switch">
          <p className="text-muted">
            Already have an account?{" "}
            <a onClick={() => navigate("/login")}>Login</a>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default SignupPage;
