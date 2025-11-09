import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import "./HomePage.css";

// Landing page - team effort
// Sarah did the hero section, Mike worked on features, Alex did styling
const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            <span>Your Settlement Companion</span>
          </div>
          <h1 className="hero-title">
            Welcome to <span className="gradient-text">Settlerr</span>
          </h1>
          <p className="hero-description">
            Your companion for settling in Calgary. Discover community events,
            networking opportunities, and connect with fellow newcomers,
            international students, and workers as you make Calgary your home.
          </p>
          <div className="cta-buttons">
            <Button variant="primary" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section - showcases what we offer */}
      <section className="features-section">
        <div className="section-header">
          <h2>Features to Help You Settle</h2>
          <p className="section-subtitle">
            Everything you need to build your new life in Calgary
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎉</div>
            <h3>Community Events</h3>
            <p>
              Discover events tailored for newcomers - from cultural
              celebrations to community meetups and orientation sessions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Networking Events</h3>
            <p>
              Connect with professionals and fellow newcomers at networking
              events designed to help you build meaningful relationships.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">�</div>
            <h3>Job Hunt Events</h3>
            <p>
              Attend job fairs, career workshops, and employer meetups to
              kickstart your career in Calgary.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎓</div>
            <h3>School & Education Fairs</h3>
            <p>
              Explore educational opportunities at school fairs and information
              sessions for students and families.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">�</div>
            <h3>Build Your Network</h3>
            <p>
              Connect with locals and fellow newcomers to create a supportive
              community as you settle in.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Gamified Progress</h3>
            <p>
              Track your settlement milestones, earn badges, and celebrate your
              achievements along the way.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2025 Settlerr. Empowering newcomers to thrive in Calgary.</p>
        {process.env.REACT_APP_USE_DEMO_AUTH === "true" && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "rgba(255, 200, 0, 0.1)",
              border: "1px solid rgba(255, 200, 0, 0.3)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "#ffc800",
            }}
          >
            🔧 Running in DEMO MODE - No AWS required
          </div>
        )}
      </footer>
    </div>
  );
};

export default HomePage;
