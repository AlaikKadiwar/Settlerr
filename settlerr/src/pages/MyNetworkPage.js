import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import UserAvatar from "../components/common/UserAvatar";
import FriendListItem from "../components/network/FriendListItem";
import FriendProfileModal from "../components/network/FriendProfileModal";
import Card from "../components/common/Card";
import "../pages/TasksPage.css";

// Demo friends data
const DEMO_FRIENDS = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1 (403) 555-0101",
    location: "Beltline, Calgary",
    xp: 750,
    levelTitle: "Resident",
    profilePicture: null,
    rsvps: [
      { title: "Community Potluck", date: "Nov 15, 2025" },
      { title: "Calgary Tower Tour", date: "Nov 20, 2025" },
    ],
    socialMedia: {
      instagram: "@sarahjohnson",
      twitter: "",
      whatsapp: "+1 (403) 555-0101",
      facebook: "",
    },
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "mchen@email.com",
    phone: "+1 (403) 555-0102",
    location: "Downtown, Calgary",
    xp: 1200,
    levelTitle: "Local Expert",
    profilePicture: null,
    rsvps: [{ title: "Tech Meetup", date: "Nov 18, 2025" }],
    socialMedia: {
      instagram: "",
      twitter: "@michaelchen",
      whatsapp: "",
      facebook: "michael.chen",
    },
  },
  {
    id: 3,
    name: "Priya Patel",
    email: "priya.p@email.com",
    phone: "+1 (403) 555-0103",
    location: "Kensington, Calgary",
    xp: 550,
    levelTitle: "Newcomer",
    profilePicture: null,
    rsvps: [
      { title: "Language Exchange", date: "Nov 12, 2025" },
      { title: "Hiking at Nose Hill", date: "Nov 25, 2025" },
    ],
    socialMedia: {
      instagram: "@priyapatel",
      twitter: "",
      whatsapp: "+1 (403) 555-0103",
      facebook: "",
    },
  },
  {
    id: 4,
    name: "James Wilson",
    email: "jwilson@email.com",
    phone: "+1 (403) 555-0104",
    location: "Inglewood, Calgary",
    xp: 320,
    levelTitle: "Newcomer",
    profilePicture: null,
    rsvps: [],
    socialMedia: {
      instagram: "",
      twitter: "",
      whatsapp: "",
      facebook: "",
    },
  },
];

// My Network page
const MyNetworkPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Load user profile for avatar
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : { name: "User", profilePicture: null };
  });

  // Friends list state
  const [friends, setFriends] = useState(() => {
    const saved = localStorage.getItem("friendsList");
    return saved ? JSON.parse(saved) : DEMO_FRIENDS;
  });

  // Selected friend for profile modal
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Save friends to localStorage
  useEffect(() => {
    localStorage.setItem("friendsList", JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/");
  };

  const handleViewProfile = (friend) => {
    setSelectedFriend(friend);
  };

  const handleRemoveFriend = (friendId) => {
    setFriends(friends.filter((f) => f.id !== friendId));
  };

  const handleCloseModal = () => {
    setSelectedFriend(null);
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
          <Link to="/events" className="nav-link">
            Events
          </Link>
          <Link to="/network" className="nav-link active">
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
        <h1>My Network</h1>
        <button onClick={handleLogout} className="mobile-logout-btn">
          🚪
        </button>
      </div>

      <div className="app-content">
        <div className="page-header desktop-only">
          <h1>My Network</h1>
          <p className="text-muted">
            Connect with newcomers and community members
          </p>
        </div>

        <Card>
          <h2>My Friends ({friends.length})</h2>
          {friends.length > 0 ? (
            <div className="friends-list">
              {friends.map((friend) => (
                <FriendListItem
                  key={friend.id}
                  friend={friend}
                  onViewProfile={handleViewProfile}
                  onRemove={handleRemoveFriend}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <div className="empty-icon">👥</div>
              <h3>No friends yet</h3>
              <p>Start connecting with people in your community!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Friend Profile Modal */}
      {selectedFriend && (
        <FriendProfileModal
          friend={selectedFriend}
          onClose={handleCloseModal}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link to="/tasks" className="mobile-nav-item">
          <span className="mobile-nav-icon">📋</span>
          <span>Tasks</span>
        </Link>
        <Link to="/events" className="mobile-nav-item">
          <span className="mobile-nav-icon">🎉</span>
          <span>Events</span>
        </Link>
        <Link to="/network" className="mobile-nav-item active">
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

export default MyNetworkPage;
