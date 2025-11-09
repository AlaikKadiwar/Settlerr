import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import UserAvatar from "../components/common/UserAvatar";
import "../pages/TasksPage.css";
import "./EventsPage.css";

// Events page - Fetches top 10 recommended events from backend
const EventsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Load user profile for avatar
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : { name: "User", profilePicture: null };
  });

  // Get username from localStorage
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem("settlerr_user");
    if (saved) {
      const user = JSON.parse(saved);
      return user.username;
    }
    return "";
  });

  // State management for events from backend
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch recommended events from backend
  const fetchRecommendedEvents = async () => {
    if (!username) {
      setError("Username not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/getRecommendedEvents?username=${username}&min_score=40&top_n=10`
      );
      const data = await response.json();

      if (data.success) {
        // Transform backend events to match frontend format
        const formattedEvents = data.events.map((event) => ({
          id: event.event_id,
          title: event.name,
          description: event.about || "No description available",
          date: event.date,
          time: event.time,
          location: event.venue || "Location TBA",
          organizer: event.organizer || "Unknown",
          attendees: event.rsvp_users?.length || 0,
          rsvpLimit: event.rsvp_limit || 50,
          tasks: event.tasks || [],
          matchScore: event.match_score || 0,
          matchReasoning: event.match_reasoning || "",
          relevanceFactors: event.relevance_factors || [],
          rsvpStatus: false,
        }));

        setRecommendedEvents(formattedEvents);
        setError("");
      } else {
        setError(data.error || "Failed to load events");
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Could not connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchRecommendedEvents();
    }
  }, [isAuthenticated, navigate, username]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/");
  };

  // RSVP handler - Updates local state (TODO: Connect to backend API)
  const handleRSVP = (eventId) => {
    setRecommendedEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? { ...event, rsvpStatus: !event.rsvpStatus }
          : event
      )
    );
    
    // Update selected event if it's the one being RSVP'd
    if (selectedEvent && selectedEvent.id === eventId) {
      setSelectedEvent({ ...selectedEvent, rsvpStatus: !selectedEvent.rsvpStatus });
    }
  };

  // View details handler
  const handleViewDetails = (event) => {
    setSelectedEvent(event);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="app-container">
      {/* Desktop Navigation */}
      <nav className="app-nav desktop-nav">
        <div className="nav-brand">Settlerr</div>
        <div className="nav-links">
          <Link to="/tasks" className="nav-link">
            Tasks
          </Link>
          <Link to="/events" className="nav-link active">
            Events
          </Link>
          <Link to="/network" className="nav-link">
            My Network
          </Link>
          <Link to="/account" className="nav-link nav-link-with-avatar">
            <UserAvatar
              profilePicture={userProfile.profilePicture}
              username={userProfile.name}
              size="small"
            />
            <span>My Account</span>
          </Link>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </nav>

      {/* Mobile Header */}
      <div className="mobile-header">
        <h1>Community Events</h1>
        <button onClick={handleLogout} className="mobile-logout-btn">
          🚪
        </button>
      </div>

      <div className="app-content">
        <div className="page-header desktop-only">
          <h1>Community Events</h1>
          <p className="text-muted">
            AI-powered event recommendations based on your profile
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container" style={{ textAlign: "center", padding: "40px" }}>
            <p>🔍 Finding the best events for you...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container" style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "var(--error-color, #ef4444)" }}>⚠️ {error}</p>
            <Button onClick={fetchRecommendedEvents} style={{ marginTop: "20px" }}>
              Try Again
            </Button>
          </div>
        )}

        {/* Recommended Events Section */}
        {!loading && !error && (
          <div className="events-section">
            <div className="section-header">
              <h2>✨ Your Top 10 Recommended Events</h2>
              <p className="text-muted">
                Matched to your interests, status, and profile ({recommendedEvents.length} events found)
              </p>
            </div>

            {recommendedEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p>No events found matching your profile. Check back later!</p>
              </div>
            ) : (
              <div className="events-grid">
                {recommendedEvents.map((event) => (
                  <Card key={event.id} className="event-card">
                    <div className="event-content">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                        <h3 className="event-title">{event.title}</h3>
                        {event.matchScore > 0 && (
                          <span style={{
                            background: event.matchScore >= 70 ? "#10b981" : event.matchScore >= 50 ? "#f59e0b" : "#6b7280",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                            marginLeft: "10px"
                          }}>
                            {Math.round(event.matchScore)}% Match
                          </span>
                        )}
                      </div>

                      <p style={{ 
                        color: "var(--text-secondary, #666)", 
                        fontSize: "14px", 
                        marginBottom: "15px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {event.description}
                      </p>

                      <div className="event-details">
                        <div className="event-detail-item">
                          <span className="event-icon">📅</span>
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="event-detail-item">
                          <span className="event-icon">🕐</span>
                          <span>{event.time}</span>
                        </div>
                        <div className="event-detail-item">
                          <span className="event-icon">📍</span>
                          <span>{event.location}</span>
                        </div>
                        <div className="event-detail-item">
                          <span className="event-icon">👥</span>
                          <span>{event.attendees}/{event.rsvpLimit} attending</span>
                        </div>
                      </div>

                      <div className="event-actions">
                        <Button
                          variant={event.rsvpStatus ? "secondary" : "primary"}
                          onClick={() => handleRSVP(event.id)}
                          className="rsvp-btn"
                        >
                          {event.rsvpStatus ? "✓ RSVP'd" : "RSVP"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleViewDetails(event)}
                          className="view-more-btn"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={handleCloseModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              <span className="desktop-only">✕</span>
              <span className="mobile-only">← Back</span>
            </button>

            <div className="modal-content">
              <h2 className="modal-title">{selectedEvent.title}</h2>

              {/* Match Score Badge */}
              {selectedEvent.matchScore > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <span style={{
                    background: selectedEvent.matchScore >= 70 ? "#10b981" : selectedEvent.matchScore >= 50 ? "#f59e0b" : "#6b7280",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "inline-block"
                  }}>
                    {Math.round(selectedEvent.matchScore)}% Match for You
                  </span>
                </div>
              )}

              <div className="modal-details">
                <div className="modal-detail-item">
                  <span className="modal-icon">📅</span>
                  <div>
                    <strong>Date</strong>
                    <p>{formatDate(selectedEvent.date)}</p>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-icon">🕐</span>
                  <div>
                    <strong>Time</strong>
                    <p>{selectedEvent.time}</p>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-icon">📍</span>
                  <div>
                    <strong>Location</strong>
                    <p>{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-icon">👥</span>
                  <div>
                    <strong>Attendees</strong>
                    <p>{selectedEvent.attendees}/{selectedEvent.rsvpLimit} people attending</p>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-icon">🏢</span>
                  <div>
                    <strong>Organizer</strong>
                    <p>{selectedEvent.organizer}</p>
                  </div>
                </div>
              </div>

              <div className="modal-description">
                <h3>About This Event</h3>
                <p>{selectedEvent.description}</p>
              </div>

              {/* Why This Match - AI Reasoning */}
              {selectedEvent.matchReasoning && (
                <div className="modal-description">
                  <h3>🎯 Why This Event Matches You</h3>
                  <p style={{ fontStyle: "italic", color: "#666" }}>{selectedEvent.matchReasoning}</p>
                </div>
              )}

              {/* Relevance Factors */}
              {selectedEvent.relevanceFactors && selectedEvent.relevanceFactors.length > 0 && (
                <div className="modal-description">
                  <h3>✨ Relevance Factors</h3>
                  <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                    {selectedEvent.relevanceFactors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Event Tasks */}
              {selectedEvent.tasks && selectedEvent.tasks.length > 0 && (
                <div className="modal-description">
                  <h3>📝 Event Tasks</h3>
                  <p style={{ marginBottom: "10px", color: "#666" }}>
                    Complete these tasks when you attend:
                  </p>
                  <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                    {selectedEvent.tasks.map((task, index) => (
                      <li key={index}>{task.replace(/^-\s*/, "")}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modal-actions">
                <Button
                  variant={selectedEvent.rsvpStatus ? "secondary" : "primary"}
                  onClick={() => handleRSVP(selectedEvent.id)}
                  className="modal-rsvp-btn"
                >
                  {selectedEvent.rsvpStatus ? "✓ RSVP'd" : "RSVP to Event"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link to="/tasks" className="mobile-nav-item">
          <span className="mobile-nav-icon">📋</span>
          <span>Tasks</span>
        </Link>
        <Link to="/events" className="mobile-nav-item active">
          <span className="mobile-nav-icon">🎉</span>
          <span>Events</span>
        </Link>
        <Link to="/network" className="mobile-nav-item">
          <span className="mobile-nav-icon">👥</span>
          <span>Network</span>
        </Link>
        <Link to="/account" className="mobile-nav-item">
          <span className="mobile-nav-icon">👤</span>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};

export default EventsPage;
