// Network service - list users / find people
import authService from "./authService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const listUsers = async (interest = null, limit = 50) => {
	try {
		const params = new URLSearchParams();
		if (interest) params.append("interest", interest);
		if (limit) params.append("limit", String(limit));

		const resp = await fetch(`${API_URL}/api/listUsers?${params.toString()}`, {
			headers: authService.getAuthHeaders(),
		});

		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to list users" };

		return { success: true, users: data.users || [] };
	} catch (error) {
		console.error("❌ Error listing users:", error);
		return { success: false, error: error.message };
	}
};

export default { listUsers };
