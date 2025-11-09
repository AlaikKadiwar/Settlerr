// Event service - fetch events and RSVP via backend
import authService from "./authService";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const getSuggestedEvents = async (username) => {
	try {
		const resp = await fetch(`${API_URL}/api/getSuggestedEvents?username=${encodeURIComponent(username)}`, {
			headers: authService.getAuthHeaders(),
		});
		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to fetch suggested events" };
		return { success: true, events: data.events || [] };
	} catch (error) {
		console.error("❌ Error fetching suggested events:", error);
		return { success: false, error: error.message };
	}
};

export const getRecommendedEvents = async (username, min_score = 50.0, top_n = 10) => {
	try {
		const params = new URLSearchParams({ username, min_score: String(min_score), top_n: String(top_n) });
		const resp = await fetch(`${API_URL}/api/getRecommendedEvents?${params.toString()}`, {
			headers: authService.getAuthHeaders(),
		});
		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to fetch recommended events" };
		return { success: true, events: data.events || [] };
	} catch (error) {
		console.error("❌ Error fetching recommended events:", error);
		return { success: false, error: error.message };
	}
};

export const rsvpEvent = async (username, event_name) => {
	try {
		const form = new URLSearchParams();
		form.append("username", username);
		form.append("event_name", event_name);

		const resp = await fetch(`${API_URL}/api/rsvpEvent`, {
			method: "POST",
			headers: { ...authService.getAuthHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
			body: form.toString(),
		});

		const data = await resp.json();
		if (!resp.ok) return { success: false, error: data.error || "Failed to RSVP" };
		return { success: true, data };
	} catch (error) {
		console.error("❌ Error RSVPing to event:", error);
		return { success: false, error: error.message };
	}
};

export default { getSuggestedEvents, getRecommendedEvents, rsvpEvent };
