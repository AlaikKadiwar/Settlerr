import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import UserAvatar from "../components/common/UserAvatar";
import "../pages/TasksPage.css";
import "./EventsPage.css";

// REMOVED DEMO DATA - Now fetching from backend

const DEMO_EVENTS_OLD = {
  suggested: [
    {
      id: 1,
      title: "Newcomers Welcome Meetup",
      date: "2025-11-15",
      time: "6:00 PM - 8:00 PM",
      location: "Central Library, Downtown Calgary",
      image:
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop",
      attendees: 45,
      category: "Networking",
      description:
        "Join us for an evening of meeting fellow newcomers to Calgary! This casual meetup is perfect for making new friends, sharing experiences, and learning about the city. Light refreshments will be provided.",
      organizer: "Calgary Newcomer Services",
      rsvpStatus: false,
    },
    {
      id: 2,
      title: "Job Search Workshop",
      date: "2025-11-18",
      time: "2:00 PM - 4:30 PM",
      location: "Bow Valley College, South Campus",
      image:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
      attendees: 30,
      category: "Career",
      description:
        "Learn essential job search strategies for the Canadian job market. Topics include: resume writing, cover letters, interview preparation, and networking tips. Free workshop with career counselors.",
      organizer: "Calgary Career Hub",
      rsvpStatus: false,
    },
    {
      id: 3,
      title: "English Conversation Circle",
      date: "2025-11-20",
      time: "7:00 PM - 8:30 PM",
      location: "Hillhurst Community Centre",
      image:
        "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&h=400&fit=crop",
      attendees: 25,
      category: "Language",
      description:
        "Practice your English speaking skills in a friendly, supportive environment. All levels welcome! Meet people from around the world while improving your conversation skills.",
      organizer: "Calgary Language Exchange",
      rsvpStatus: false,
    },
    {
      id: 4,
      title: "Winter Festival Kickoff",
      date: "2025-11-22",
      time: "5:00 PM - 9:00 PM",
      location: "Olympic Plaza",
      image:
        "https://images.unsplash.com/photo-1482686115713-0fbcaced6e28?w=600&h=400&fit=crop",
      attendees: 200,
      category: "Festival",
      description:
        "Celebrate the start of Calgary's winter season with music, food trucks, ice skating, and fireworks! Free admission. Bring the whole family for an unforgettable evening.",
      organizer: "City of Calgary",
      rsvpStatus: false,
    },
  ],
  other: [
    {
      id: 5,
      title: "Yoga in the Park",
      date: "2025-11-16",
      time: "9:00 AM - 10:00 AM",
      location: "Prince's Island Park",
      image:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
      attendees: 18,
      category: "Wellness",
      description:
        "Start your weekend with a relaxing outdoor yoga session. All levels welcome. Bring your own mat and water bottle.",
      organizer: "Calgary Wellness Collective",
      rsvpStatus: false,
    },
    {
      id: 6,
      title: "Tech Networking Night",
      date: "2025-11-19",
      time: "6:30 PM - 9:00 PM",
      location: "Innovation Hub, Beltline",
      image:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
      attendees: 60,
      category: "Technology",
      description:
        "Connect with Calgary's tech community. Great for developers, designers, and tech enthusiasts. Pizza and drinks provided!",
      organizer: "Calgary Tech Meetup",
      rsvpStatus: false,
    },
    {
      id: 7,
      title: "Cooking Class: Canadian Cuisine",
      date: "2025-11-21",
      time: "6:00 PM - 8:30 PM",
      location: "SAIT Culinary Campus",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop",
      attendees: 15,
      category: "Food & Drink",
      description:
        "Learn to cook classic Canadian dishes with a professional chef. Hands-on experience and meal included. $35 per person.",
      organizer: "SAIT Culinary Arts",
      rsvpStatus: false,
    },
    {
      id: 8,
      title: "Calgary Flames Watch Party",
      date: "2025-11-23",
      time: "7:00 PM - 10:00 PM",
      location: "The Pint Sports Bar, 17th Ave",
      image:
        "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=600&h=400&fit=crop",
      attendees: 80,
      category: "Sports",
      description:
        "Join fellow hockey fans to watch the Flames game on the big screen. Drink specials and game-day food menu available.",
      organizer: "Calgary Sports Fans",
      rsvpStatus: false,
    },
    {
      id: 9,
      title: "Art Gallery Opening",
      date: "2025-11-24",
      time: "7:00 PM - 9:30 PM",
      location: "Glenbow Museum",
      image:
        "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&h=400&fit=crop",
      attendees: 40,
      category: "Arts & Culture",
      description:
        "Exhibition opening featuring local and international artists. Complimentary wine and cheese. Free admission for newcomers.",
      organizer: "Glenbow Museum",
      rsvpStatus: false,
    },
    {
      id: 10,
      title: "Hiking Group: Nose Hill",
      date: "2025-11-17",
      time: "10:00 AM - 12:00 PM",
      location: "Nose Hill Park - Main Entrance",
      image:
        "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
      attendees: 22,
      category: "Outdoor",
      description:
        "Explore one of Calgary's largest parks with fellow outdoor enthusiasts. Moderate difficulty. Dress for the weather!",
      organizer: "Calgary Hiking Group",
      rsvpStatus: false,
    },
  ],
};

// Events page
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

  // RSVP handler - TODO: Connect to backend API
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
            Discover events and activities in Calgary
          </p>
        </div>

        {/* Suggested Events Section */}
        <div className="events-section">
          <div className="section-header">
            <h2>✨ Suggested for You</h2>
            <p className="text-muted">
              Personalized recommendations based on your profile
            </p>
          </div>

          <div className="events-grid">
            {suggestedEvents.map((event) => (
              <Card key={event.id} className="event-card">
                <div className="event-image-container">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="event-image"
                  />
                  <span className="event-category">{event.category}</span>
                </div>

                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>

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
                      <span>{event.attendees} attending</span>
                    </div>
                  </div>

                  <div className="event-actions">
                    <Button
                      variant={event.rsvpStatus ? "secondary" : "primary"}
                      onClick={() => handleRSVP(event.id, true)}
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
        </div>

        {/* Other Events Section */}
        <div className="events-section">
          <div className="section-header">
            <h2>� Other Events in Calgary</h2>
            <p className="text-muted">Explore more happening around the city</p>
          </div>

          <div className="events-grid">
            {otherEvents.map((event) => (
              <Card key={event.id} className="event-card">
                <div className="event-image-container">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="event-image"
                  />
                  <span className="event-category">{event.category}</span>
                </div>

                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>

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
                      <span>{event.attendees} attending</span>
                    </div>
                  </div>

                  <div className="event-actions">
                    <Button
                      variant={event.rsvpStatus ? "secondary" : "primary"}
                      onClick={() => handleRSVP(event.id, false)}
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
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={handleCloseModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              <span className="desktop-only">✕</span>
              <span className="mobile-only">← Back</span>
            </button>

            <div className="modal-image-container">
              <img
                src={selectedEvent.image}
                alt={selectedEvent.title}
                className="modal-image"
              />
              <span className="modal-category">{selectedEvent.category}</span>
            </div>

            <div className="modal-content">
              <h2 className="modal-title">{selectedEvent.title}</h2>

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
                    <p>{selectedEvent.attendees} people attending</p>
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

              <div className="modal-actions">
                <Button
                  variant={selectedEvent.rsvpStatus ? "secondary" : "primary"}
                  onClick={() => {
                    const isSuggested = suggestedEvents.some(
                      (e) => e.id === selectedEvent.id
                    );
                    handleRSVP(selectedEvent.id, isSuggested);
                    // Update selectedEvent state
                    setSelectedEvent({
                      ...selectedEvent,
                      rsvpStatus: !selectedEvent.rsvpStatus,
                    });
                  }}
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
