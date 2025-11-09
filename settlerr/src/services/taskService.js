// Task service - interacts with backend API for tasks
import authService from "./authService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Get tasks for a user
export const getUserTasks = async (username) => {
  try {
    const resp = await fetch(`${API_URL}/api/getUserTasks?username=${encodeURIComponent(username)}`, {
      headers: authService.getAuthHeaders(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { success: false, error: data.error || "Failed to fetch tasks" };
    }

    return { success: true, tasks: data.tasks || [] };
  } catch (error) {
    console.error("❌ Error fetching user tasks:", error);
    return { success: false, error: error.message };
  }
};

// Send image + task description to backend for verification
export const checkTaskCompletion = async (username, taskDescription, file) => {
  try {
    const form = new FormData();
    form.append("username", username);
    form.append("task_description", taskDescription);
    form.append("image", file);

    const headers = { ...authService.getAuthHeaders() };
    if (headers["Content-Type"]) {
      delete headers["Content-Type"];
    }

    const resp = await fetch(`${API_URL}/api/checkTaskCompletion`, {
      method: "POST",
      body: form,
      // Note: do not set Content-Type for FormData; browser handles it
      headers,
    });

    const data = await resp.json();

    if (!resp.ok) {
      const detail = data?.detail ? JSON.stringify(data.detail) : null;
      const errorMessage = data?.error || detail || `Verification failed (${resp.status})`;
      return { success: false, error: errorMessage, status: resp.status, raw: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error("❌ Error verifying task completion:", error);
    return { success: false, error: error.message };
  }
};

export default {
  getUserTasks,
  checkTaskCompletion,
};
