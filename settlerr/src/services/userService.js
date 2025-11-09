// User service - fetch & update user profiles via backend
import authService from "./authService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const getUserProfile = async (username) => {
	try {
		const resp = await fetch(`${API_URL}/api/getUserProfile?username=${encodeURIComponent(username)}`, {
			headers: authService.getAuthHeaders(),
		});

		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to fetch profile" };

		return { success: true, user: data.user };
	} catch (error) {
		console.error("❌ Error fetching profile:", error);
		return { success: false, error: error.message };
	}
};

export const updateUserProfile = async (username, updates) => {
	try {
		const payload = { username, ...updates };
		const resp = await fetch(`${API_URL}/api/updateUserProfile`, {
			method: "POST",
			headers: { ...authService.getAuthHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to update profile" };

		return { success: true, user: data.user };
	} catch (error) {
		console.error("❌ Error updating profile:", error);
		return { success: false, error: error.message };
	}
};

export default { getUserProfile, updateUserProfile };
