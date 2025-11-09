/**
 * Application Constants
 * Shared constants used across the Settlerr application
 */

/**
 * XP Level System
 * Defines progression levels based on XP points earned
 */
export const XP_LEVELS = [
  { level: 1, title: "New Arrival", min: 0, max: 100, icon: "🌱" },
  { level: 2, title: "Settling In", min: 100, max: 250, icon: "🏠" },
  { level: 3, title: "Explorer", min: 250, max: 500, icon: "🗺️" },
  { level: 4, title: "Local Navigator", min: 500, max: 1000, icon: "🧭" },
  { level: 5, title: "Community Member", min: 1000, max: 2000, icon: "🤝" },
  { level: 6, title: "Calgary Expert", min: 2000, max: 5000, icon: "⭐" },
  { level: 7, title: "City Ambassador", min: 5000, max: Infinity, icon: "👑" },
];
