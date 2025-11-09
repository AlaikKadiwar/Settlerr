/**
 * UserAvatar Component
 *
 * Displays user's profile picture or initials as fallback.
 * Used in navigation and other parts of the app.
 *
 * @component
 */

import "./UserAvatar.css";

const UserAvatar = ({ profilePicture, username, size = "small" }) => {
  /**
   * Get initials from username for default avatar
   */
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={`user-avatar user-avatar-${size}`}>
      {profilePicture ? (
        <img src={profilePicture} alt={username} className="avatar-image" />
      ) : (
        <div className="avatar-initials">{getInitials(username)}</div>
      )}
    </div>
  );
};

export default UserAvatar;
