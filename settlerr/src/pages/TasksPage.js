import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import UserAvatar from "../components/common/UserAvatar";
import "./TasksPage.css";

// Demo tasks data - Replace this with JSON file import later
// TODO: Replace with: import tasksData from './data/tasks.json';
const DEMO_TASKS = {
  individual: [
    {
      id: 1,
      title: "Open a Canadian bank account",
      description: "Visit a bank and open your first Canadian bank account",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 2,
      title: "Apply for SIN number",
      description: "Apply for your Social Insurance Number at Service Canada",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 3,
      title: "Download transit app",
      description: "Download and set up Calgary Transit app on your phone",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 4,
      title: "Get a library card",
      description: "Register for a Calgary Public Library card",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
  ],
  grouped: [
    {
      id: 101,
      title: "Meet Sarah Chen",
      description: "Connect with Sarah, a student ambassador from China",
      type: "person",
      targetImage:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      location: null,
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 102,
      title: "Visit Calgary Tower",
      description: "Take a photo at this iconic Calgary landmark",
      type: "location",
      targetImage:
        "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=400&h=400&fit=crop",
      location: "Calgary Tower, Downtown",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 103,
      title: "Meet Raj Patel",
      description: "Connect with Raj, an international student from India",
      type: "person",
      targetImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      location: null,
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
    {
      id: 104,
      title: "Visit Stephen Avenue",
      description: "Explore the historic Stephen Avenue Walk",
      type: "location",
      targetImage:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop",
      location: "Stephen Avenue, Downtown",
      completed: false,
      imageRequired: true,
      uploadedImage: null,
    },
  ],
};

// Tasks page - main page after login
const TasksPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // State for forcing file input re-render
  const [uploadKeys, setUploadKeys] = useState({});

  // Load user profile for avatar
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : { name: "User", profilePicture: null };
  });

  // State for tasks - load from localStorage or use demo data
  const [individualTasks, setIndividualTasks] = useState(() => {
    const saved = localStorage.getItem("individualTasks");
    return saved ? JSON.parse(saved) : DEMO_TASKS.individual;
  });

  const [groupedTasks, setGroupedTasks] = useState(() => {
    const saved = localStorage.getItem("groupedTasks");
    return saved ? JSON.parse(saved) : DEMO_TASKS.grouped;
  });

  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("individualTasks", JSON.stringify(individualTasks));
  }, [individualTasks]);

  useEffect(() => {
    localStorage.setItem("groupedTasks", JSON.stringify(groupedTasks));
  }, [groupedTasks]);

  // check if user is logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // logout function
  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/");
  };

  // Handle image upload for individual tasks
  const handleIndividualImageUpload = (taskId, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      console.log("No file selected");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      event.target.value = ""; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      event.target.value = ""; // Reset input
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      console.error("Error reading file");
      alert("Failed to read the image file. Please try again.");
      event.target.value = ""; // Reset input
    };

    reader.onloadend = () => {
      if (reader.result) {
        setIndividualTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, uploadedImage: reader.result, completed: true }
              : task
          )
        );
        // Force re-render of file input by changing its key
        setUploadKeys((prev) => ({
          ...prev,
          [`individual-${taskId}`]: Date.now(),
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  // Handle image upload for grouped tasks
  const handleGroupedImageUpload = (taskId, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      console.log("No file selected");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      event.target.value = ""; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      event.target.value = ""; // Reset input
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      console.error("Error reading file");
      alert("Failed to read the image file. Please try again.");
      event.target.value = ""; // Reset input
    };

    reader.onloadend = () => {
      if (reader.result) {
        setGroupedTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, uploadedImage: reader.result, completed: true }
              : task
          )
        );
        // Force re-render of file input by changing its key
        setUploadKeys((prev) => ({
          ...prev,
          [`grouped-${taskId}`]: Date.now(),
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  // Calculate progress
  const totalTasks = individualTasks.length + groupedTasks.length;
  const completedTasks = [...individualTasks, ...groupedTasks].filter(
    (t) => t.completed
  ).length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="app-container">
      {/* Navigation bar - Desktop */}
      <nav className="app-nav desktop-nav">
        <div className="nav-brand">Settlerr</div>
        <div className="nav-links">
          <Link to="/tasks" className="nav-link active">
            Tasks
          </Link>
          <Link to="/events" className="nav-link">
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
        <h1>My Tasks</h1>
        <button onClick={handleLogout} className="mobile-logout-btn">
          🚪
        </button>
      </div>

      <div className="app-content">
        <div className="page-header desktop-only">
          <h1>My Tasks</h1>
          <p className="text-muted">
            Complete tasks to earn points and track your settlement progress
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="progress-card">
          <div className="progress-info">
            <div>
              <h3>Your Progress</h3>
              <p className="text-muted">Keep going! You're doing great 🎉</p>
            </div>
            <div className="progress-stats">
              <span className="progress-number">{progressPercent}%</span>
            </div>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="progress-text">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </Card>

        {/* Section 1: Individual Tasks */}
        <div className="tasks-section">
          <div className="section-header">
            <h2>📋 Individual Tasks</h2>
            <p className="text-muted">
              Complete these essential settlement tasks
            </p>
          </div>

          <div className="tasks-grid">
            {individualTasks.map((task) => (
              <Card
                key={task.id}
                className={`task-card ${task.completed ? "completed" : ""}`}
              >
                <div className="task-header">
                  <h3>{task.title}</h3>
                  {task.completed && (
                    <span className="completion-badge">✓ Completed</span>
                  )}
                </div>
                <p className="task-description">{task.description}</p>

                {task.completed && task.uploadedImage ? (
                  <div className="uploaded-image-container">
                    <img
                      src={task.uploadedImage}
                      alt="Completed task"
                      className="uploaded-image"
                    />
                    <p className="upload-success">✓ Task completed!</p>
                  </div>
                ) : (
                  <div className="upload-section">
                    <p className="upload-instruction">
                      📸 Upload a photo to complete this task
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleIndividualImageUpload(task.id, e)}
                      style={{ display: "none" }}
                      id={`individual-upload-${task.id}`}
                      key={uploadKeys[`individual-${task.id}`] || 0}
                    />
                    <label
                      htmlFor={`individual-upload-${task.id}`}
                      style={{ cursor: "pointer" }}
                    >
                      <Button variant="primary" as="span">
                        📷 Take Photo / Choose File
                      </Button>
                    </label>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Section 2: Grouped/Event Tasks */}
        <div className="tasks-section">
          <div className="section-header">
            <h2>🎯 Networking & Exploration Tasks</h2>
            <p className="text-muted">Meet people and explore Calgary</p>
          </div>

          <div className="tasks-grid">
            {groupedTasks.map((task) => (
              <Card
                key={task.id}
                className={`task-card grouped-task ${
                  task.completed ? "completed" : ""
                }`}
              >
                <div className="task-header">
                  <h3>{task.title}</h3>
                  {task.completed && (
                    <span className="completion-badge">✓ Completed</span>
                  )}
                </div>

                {/* Target Image */}
                <div className="target-image-container">
                  <img
                    src={task.targetImage}
                    alt={task.title}
                    className="target-image"
                  />
                  {task.type === "person" && (
                    <span className="task-type-badge">👤 Person</span>
                  )}
                  {task.type === "location" && (
                    <span className="task-type-badge">📍 Location</span>
                  )}
                </div>

                <p className="task-description">{task.description}</p>
                {task.location && (
                  <p className="task-location">� {task.location}</p>
                )}

                {task.completed && task.uploadedImage ? (
                  <div className="uploaded-image-container">
                    <img
                      src={task.uploadedImage}
                      alt="Completed task"
                      className="uploaded-image"
                    />
                    <p className="upload-success">✓ Task completed!</p>
                  </div>
                ) : (
                  <div className="upload-section">
                    <p className="upload-instruction">
                      📸{" "}
                      {task.type === "person"
                        ? "Upload a photo with this person"
                        : "Upload a photo at this location"}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleGroupedImageUpload(task.id, e)}
                      style={{ display: "none" }}
                      id={`grouped-upload-${task.id}`}
                      key={uploadKeys[`grouped-${task.id}`] || 0}
                    />
                    <label
                      htmlFor={`grouped-upload-${task.id}`}
                      style={{ cursor: "pointer" }}
                    >
                      <Button variant="primary" as="span">
                        📷 Take Photo / Choose File
                      </Button>
                    </label>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <Link to="/tasks" className="mobile-nav-item active">
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
        <Link to="/account" className="mobile-nav-item">
          <span className="mobile-nav-icon">👤</span>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};

export default TasksPage;
