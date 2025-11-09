import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import UserAvatar from "../components/common/UserAvatar";
import "./TasksPage.css";

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

  // Get username from localStorage
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem("settlerr_user");
    if (saved) {
      const user = JSON.parse(saved);
      return user.username;
    }
    return "";
  });

  // State for tasks - load from backend
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  // Fetch tasks from backend
  const fetchTasks = async () => {
    if (!username) {
      setError("Username not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/getUserTasks?username=${username}`
      );
      const data = await response.json();
      
      console.log("Received data from backend:", data); // Debug log

      if (data.success) {
        // Transform backend tasks to frontend format
        // Backend returns array of task strings like ["Task 1", "Task 2"]
        let tasksList = data.tasks || [];
        
        // Ensure we have an array
        if (!Array.isArray(tasksList)) {
          console.error("Tasks is not an array:", tasksList);
          setError("Invalid tasks format received from server");
          return;
        }
        
        // Filter out any single-character strings (corrupted data)
        const validTasks = tasksList.filter(task => 
          typeof task === 'string' && task.trim().length > 2
        );

        const formattedTasks = validTasks.map((taskDescription, index) => ({
          id: index + 1,
          title: taskDescription.replace(/^-\s*/, "").trim(),
          description: taskDescription.replace(/^-\s*/, "").trim(),
          completed: false,
          imageRequired: true,
          uploadedImage: null,
        }));
        
        setTasks(formattedTasks);
        setError("");
      } else {
        setError(data.error || "Failed to load tasks");
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Could not connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // check if user is logged in and fetch tasks
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchTasks();
    }
  }, [isAuthenticated, navigate, username]);

  // logout function
  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/");
  };

  // Handle image upload for tasks
  const handleTaskImageUpload = (taskId, event) => {
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
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, uploadedImage: reader.result, completed: true }
              : task
          )
        );
        // Force re-render of file input by changing its key
        setUploadKeys((prev) => ({
          ...prev,
          [`task-${taskId}`]: Date.now(),
        }));
      }
    };

    reader.readAsDataURL(file);
  };

  // Calculate progress
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

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

        {/* Loading State */}
        {loading && (
          <Card>
            <p style={{ textAlign: "center", padding: "2rem" }}>
              Loading your tasks...
            </p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card style={{ background: "#fee", border: "1px solid #fcc" }}>
            <p style={{ color: "#c33", textAlign: "center", padding: "1rem" }}>
              {error}
            </p>
          </Card>
        )}

        {/* Tasks Content */}
        {!loading && !error && (
          <>
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
                {completedTasksCount} of {totalTasks} tasks completed
              </p>
            </Card>

            {/* Tasks Section */}
            <div className="tasks-section">
              <div className="section-header">
                <h2>📋 Your Settling-In Tasks</h2>
                <p className="text-muted">
                  Complete these personalized tasks to settle into Calgary
                </p>
              </div>

              {tasks.length === 0 ? (
                <Card>
                  <p style={{ textAlign: "center", padding: "2rem" }}>
                    No tasks yet. Tasks will be generated when you sign up!
                  </p>
                </Card>
              ) : (
                <div className="tasks-grid">
                  {tasks.map((task) => (
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
                            onChange={(e) => handleTaskImageUpload(task.id, e)}
                            style={{ display: "none" }}
                            id={`task-upload-${task.id}`}
                            key={uploadKeys[`task-${task.id}`] || 0}
                          />
                          <label
                            htmlFor={`task-upload-${task.id}`}
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
              )}
            </div>
          </>
        )}

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
