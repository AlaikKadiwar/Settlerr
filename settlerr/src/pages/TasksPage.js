import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { logout as logoutUser } from "../services/authService";
import taskService from "../services/taskService";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import UserAvatar from "../components/common/UserAvatar";
import "./TasksPage.css";

const isDemoMode = process.env.REACT_APP_USE_DEMO_AUTH === "true";

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
  const { user, isAuthenticated, logout } = useAuth();

  // State for forcing file input re-render
  const [uploadKeys, setUploadKeys] = useState({});

  // Load user profile for avatar
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : { name: "User", profilePicture: null };
  });

  const [usingDemoTasks, setUsingDemoTasks] = useState(false);

  // State for tasks fetched from backend (or demo fallback)
  const [individualTasks, setIndividualTasks] = useState([]);

  const [groupedTasks, setGroupedTasks] = useState([]);

  const [isLoading, setIsLoading] = useState(true);


  const getUsername = useCallback(() => {
    const storedRaw = localStorage.getItem("current_user");
    let storedUser = null;
    if (storedRaw) {
      try {
        storedUser = JSON.parse(storedRaw);
      } catch (error) {
        console.warn("Failed to parse stored user:", error);
      }
    }

    return (
      user?.username ||
      storedUser?.username ||
      storedUser?.user?.username ||
      null
    );
  }, [user]);

  const fallbackToDemoTasks = useCallback(() => {
    if (isDemoMode) {
      const safeParse = (key, fallback) => {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw);
        } catch (error) {
          console.warn(`Failed to parse stored ${key}:`, error);
          return fallback;
        }
      };

      setIndividualTasks(safeParse("individualTasks", DEMO_TASKS.individual));
      setGroupedTasks(safeParse("groupedTasks", DEMO_TASKS.grouped));
      setUsingDemoTasks(true);
    } else {
      setIndividualTasks([]);
      setGroupedTasks([]);
      setUsingDemoTasks(false);
    }
  }, []);

  // Persist demo-mode data to localStorage for continuity
  useEffect(() => {
    if (isDemoMode && usingDemoTasks) {
      localStorage.setItem("individualTasks", JSON.stringify(individualTasks));
    }
  }, [individualTasks, usingDemoTasks]);

  useEffect(() => {
    if (isDemoMode && usingDemoTasks) {
      localStorage.setItem("groupedTasks", JSON.stringify(groupedTasks));
    }
  }, [groupedTasks, usingDemoTasks]);

  // check if user is logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const decodeTaskPayload = useCallback((payload) => {
    const tryParseJson = (value) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) return null;
      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith("{") && trimmed.endsWith("}"))
      ) {
        try {
          return JSON.parse(trimmed);
        } catch (error) {
          console.warn("Failed to parse JSON task payload:", error);
        }
      }
      return null;
    };

    if (Array.isArray(payload)) {
      const isCharArray =
        payload.length > 0 &&
        payload.every(
          (item) => typeof item === "string" && item.length <= 2
        );

      if (isCharArray) {
        const joined = payload.join("");
        const parsed = tryParseJson(joined);
        if (parsed !== null) {
          return decodeTaskPayload(parsed);
        }
      }

      return payload.map((item) => decodeTaskPayload(item));
    }

    if (typeof payload === "object" && payload !== null) {
      const entries = Object.entries(payload).map(([key, value]) => [
        key,
        decodeTaskPayload(value),
      ]);
      return Object.fromEntries(entries);
    }

    if (typeof payload === "string") {
      const parsed = tryParseJson(payload);
      if (parsed !== null) {
        return decodeTaskPayload(parsed);
      }
    }

    return payload;
  }, []);

  const triggerFilePicker = useCallback((inputId) => {
    const fileInput = document.getElementById(inputId);
    if (fileInput) {
      fileInput.click();
    } else {
      console.warn("File input not found:", inputId);
    }
  }, []);

  const validateImageFile = (file) => {
    if (!file) {
      return "No file selected";
    }
    if (!file.type.startsWith("image/")) {
      return "Please select an image file";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "Image size must be less than 5MB";
    }
    return null;
  };

  const loadTasks = useCallback(async () => {
    const username = getUsername();

    if (!username) {
      console.warn("No username available to fetch tasks");
      fallbackToDemoTasks();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const isTaskObjectShape = (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }

      const taskKeys = [
        "description",
        "task_description",
        "title",
        "name",
        "type",
        "location",
        "completed",
        "status",
        "details",
        "text",
      ];

      return Object.keys(value).some((key) => taskKeys.includes(key));
    };

    const flattenTasks = (raw) => {
      if (!raw && raw !== 0) {
        return [];
      }
      if (Array.isArray(raw)) {
        return raw.flatMap((item) => flattenTasks(item));
      }
      if (typeof raw === "object") {
        if (isTaskObjectShape(raw)) {
          return [raw];
        }
        return Object.values(raw).flatMap((value) => flattenTasks(value));
      }
      if (typeof raw === "string") {
        return [raw];
      }
      return [];
    };

    const normalizeTask = (task, idx) => {
      if (typeof task === "string") {
        const cleaned = task.replace(/^[-•\s]+/, "");
        const sentence = cleaned.split(/[.!?]/)[0] || cleaned;
        const title = sentence.length > 80 ? `${sentence.slice(0, 77)}...` : sentence;
        return {
          id: idx + 1,
          title: title || `Task ${idx + 1}`,
          description: cleaned,
          completed: false,
          imageRequired: true,
          uploadedImage: null,
          type: "",
          targetImage: null,
          location: null,
        };
      }

      const description =
        task.description ||
        task.task_description ||
        task.details ||
        task.text ||
        task.task ||
        "";

      const titleCandidate = task.title || task.name || description;
      const sentence = (description || titleCandidate || "").split(/[.!?]/)[0].trim();
      const computedTitle = sentence
        ? sentence.length > 80
          ? `${sentence.slice(0, 77)}...`
          : sentence
        : `Task ${idx + 1}`;

      const type = (task.type || task.category || "").toString().toLowerCase();

      return {
        id: task.id || task.task_id || task.taskId || `task-${idx + 1}`,
        title: titleCandidate || computedTitle,
        description: description || titleCandidate || `Task ${idx + 1}`,
        completed: Boolean(task.completed || task.done || task.status === "completed"),
        imageRequired: task.imageRequired !== undefined ? task.imageRequired : true,
        uploadedImage: task.uploadedImage || null,
        type,
        targetImage: task.targetImage || task.target_image || null,
        location: task.location || task.address || task.venue || null,
      };
    };

    const isGroupedTask = (task) => {
      const type = (task.type || "").toLowerCase();
      if (["person", "location", "group", "meet", "visit"].includes(type)) {
        return true;
      }
      if (task.targetImage || task.location) {
        return true;
      }
      return false;
    };

    try {
      const response = await taskService.getUserTasks(username);

      if (response.success) {
        const sanitizedPayload = decodeTaskPayload(response.tasks);
        const flattened = flattenTasks(sanitizedPayload);

        if (flattened.length === 0) {
          console.warn("Backend returned no tasks for user", username);
          fallbackToDemoTasks();
          setIsLoading(false);
          return;
        }

        const normalized = flattened.map((task, idx) => normalizeTask(task, idx));

        const individual = [];
        const grouped = [];

        normalized.forEach((task) => {
          if (isGroupedTask(task)) {
            grouped.push(task);
          } else {
            individual.push(task);
          }
        });

        setIndividualTasks(individual);
        setGroupedTasks(grouped);
        setUsingDemoTasks(false);
        localStorage.removeItem("individualTasks");
        localStorage.removeItem("groupedTasks");
        setIsLoading(false);
        return;
      }

      console.error("Failed to load tasks:", response.error);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }

    fallbackToDemoTasks();
    setIsLoading(false);
  }, [getUsername, fallbackToDemoTasks, decodeTaskPayload]);

  const processTaskImageUpload = useCallback(
    async (taskId, file, mode) => {
      if (!file) {
        console.warn("No file provided for upload");
        return;
      }

      const isGrouped = mode === "grouped";
      const setTasks = isGrouped ? setGroupedTasks : setIndividualTasks;
      const storageKey = isGrouped ? "groupedTasks" : "individualTasks";
      const uploadKeyId = `${isGrouped ? "grouped" : "individual"}-${taskId}`;
      const tasks = isGrouped ? groupedTasks : individualTasks;
      const targetTask = tasks.find((t) => t.id === taskId);

      if (!targetTask) {
        console.warn("Task not found for upload:", taskId);
        return;
      }

      const previewUrl = URL.createObjectURL(file);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, uploadedImage: previewUrl } : t))
      );

      const username = getUsername();

      if (usingDemoTasks || !username) {
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskId ? { ...t, completed: true, uploadedImage: previewUrl } : t
          );
          if (usingDemoTasks) {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          }
          return updated;
        });
        setUploadKeys((prev) => ({ ...prev, [uploadKeyId]: Date.now() }));
        return;
      }

      const resetPreview = () => {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, uploadedImage: null } : t))
        );
      };

      try {
        const res = await taskService.checkTaskCompletion(
          username,
          targetTask.description,
          file
        );

        if (res.success && res.data) {
          if (res.data.task_removed || res.data.task_completed) {
            setTasks((prev) => {
              const updated = prev.filter((t) => t.id !== taskId);
              if (usingDemoTasks) {
                localStorage.setItem(storageKey, JSON.stringify(updated));
              }
              return updated;
            });
            alert("✅ Task verified and removed from your list");
            await loadTasks();
          } else {
            alert(
              "Image uploaded but task not verified. Please try another photo or check the task instructions."
            );
            resetPreview();
            setUploadKeys((prev) => ({ ...prev, [uploadKeyId]: Date.now() }));
          }
        } else {
          console.error("Verification failed:", res?.error);
          const message = res?.error ? `Failed to verify task: ${res.error}` : "Failed to verify task. Try again later.";
          alert(message);
          resetPreview();
          setUploadKeys((prev) => ({ ...prev, [uploadKeyId]: Date.now() }));
        }
      } catch (error) {
        console.error("Error verifying task:", error);
        alert(`Failed to verify task: ${error.message || "Please try again later."}`);
        resetPreview();
        setUploadKeys((prev) => ({ ...prev, [uploadKeyId]: Date.now() }));
      }
    },
    [groupedTasks, individualTasks, getUsername, usingDemoTasks, loadTasks]
  );

  // Fetch tasks on mount and whenever the signed-in user changes
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // logout function
  const handleLogout = async () => {
    await logoutUser();
    logout();
    navigate("/");
  };

  // Handle image upload for individual tasks - send to backend for verification
  const handleIndividualImageUpload = async (taskId, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    await processTaskImageUpload(taskId, file, "individual");

    if (event.target) {
      event.target.value = "";
    }
  };

  // Handle image upload for grouped tasks - similar to individual
  const handleGroupedImageUpload = async (taskId, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    await processTaskImageUpload(taskId, file, "grouped");

    if (event.target) {
      event.target.value = "";
    }
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

        {isLoading ? (
          <div className="tasks-loading-state" role="status" aria-live="polite">
            <div className="tasks-loading-spinner" aria-hidden="true"></div>
            <p className="tasks-loading-text">Loading your tasks&hellip;</p>
          </div>
        ) : (
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
                {individualTasks.map((task) => {
                  const inputId = `individual-upload-${task.id}`;
                  return (
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
                          id={inputId}
                          key={uploadKeys[`individual-${task.id}`] || 0}
                          capture="environment"
                        />
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => triggerFilePicker(inputId)}
                        >
                          📷 Take Photo / Choose File
                        </Button>
                      </div>
                    )}
                  </Card>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Grouped/Event Tasks */}
            <div className="tasks-section">
              <div className="section-header">
                <h2>🎯 Networking & Exploration Tasks</h2>
                <p className="text-muted">Meet people and explore Calgary</p>
              </div>

              <div className="tasks-grid">
                {groupedTasks.map((task) => {
                  const inputId = `grouped-upload-${task.id}`;
                  return (
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
                          id={inputId}
                          key={uploadKeys[`grouped-${task.id}`] || 0}
                          capture="environment"
                        />
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={() => triggerFilePicker(inputId)}
                        >
                          📷 Take Photo / Choose File
                        </Button>
                      </div>
                    )}
                  </Card>
                  );
                })}
              </div>
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
