import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { login as loginUser } from "../services/authService";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import "./AuthPages.css";

// Login page - Sarah
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // update form fields as user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // clear error when user starts typing again
  };

  // handle login submission with AWS Cognito
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call Amplify login with email or username
      const result = await loginUser(
        formData.usernameOrEmail,
        formData.password
      );

      if (result.success && result.isSignedIn) {
        // Update auth context
        login(result.user, result.attributes);
        console.log("Login successful:", result.user);
        navigate("/tasks"); // go to main app
      } else if (result.nextStep) {
        // Handle additional steps (MFA, password reset, etc.)
        setError(`Additional step required: ${result.nextStep.signInStep}`);
      } else {
        setError(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title" onClick={() => navigate("/")}>
            Settlerr
          </h1>
          <h2>Welcome Back</h2>
          <p className="text-muted">Login to continue your journey</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
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

            <Input
              label="Email or Username"
              type="text"
              name="usernameOrEmail"
              placeholder="Enter your email or username"
              value={formData.usernameOrEmail}
              onChange={handleChange}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <div className="form-footer">
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Card>

        <div className="auth-switch">
          <p className="text-muted">
            Don't have an account?{" "}
            <a onClick={() => navigate("/signup")}>Sign up</a>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
