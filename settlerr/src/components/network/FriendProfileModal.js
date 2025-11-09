/**
 * FriendProfileModal Component
 *
 * Displays detailed friend profile information in a modal overlay.
 * Shows: name, email, phone, RSVPs, level info, social media links
 *
 * @component
 */

import "./FriendProfileModal.css";
import { XP_LEVELS } from "../../utils/constants";

const FriendProfileModal = ({ friend, onClose }) => {
  if (!friend) return null;

  // Calculate friend's level based on XP
  const getCurrentLevel = (xp) => {
    return (
      XP_LEVELS.find((level) => xp >= level.min && xp < level.max) ||
      XP_LEVELS[0]
    );
  };

  const currentLevel = getCurrentLevel(friend.xp);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="friend-profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="friend-profile-header">
          <div className="friend-avatar-large">
            {friend.profilePicture ? (
              <img src={friend.profilePicture} alt={friend.name} />
            ) : (
              <div className="avatar-initials-large">
                {friend.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)}
              </div>
            )}
          </div>
          <h2>{friend.name}</h2>
          <p className="friend-location">{friend.location}</p>
        </div>

        <div className="friend-profile-details">
          {/* Contact Information */}
          <div className="detail-section">
            <h3>Contact Information</h3>
            <div className="detail-item">
              <span className="detail-icon">📧</span>
              <div>
                <strong>Email</strong>
                <p>{friend.email}</p>
              </div>
            </div>
            {friend.phone && (
              <div className="detail-item">
                <span className="detail-icon">📱</span>
                <div>
                  <strong>Phone</strong>
                  <p>{friend.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Level & XP */}
          <div className="detail-section">
            <h3>Level & Progress</h3>
            <div className="level-display">
              <div className="level-icon-large">{currentLevel.icon}</div>
              <div className="level-info">
                <h4>{currentLevel.title}</h4>
                <p className="level-xp">{friend.xp} XP</p>
              </div>
            </div>
          </div>

          {/* RSVPs */}
          {friend.rsvps && friend.rsvps.length > 0 && (
            <div className="detail-section">
              <h3>Upcoming Events ({friend.rsvps.length})</h3>
              <div className="rsvp-list">
                {friend.rsvps.map((event, index) => (
                  <div key={index} className="rsvp-item">
                    <span className="rsvp-icon">📅</span>
                    <div>
                      <strong>{event.title}</strong>
                      <p className="text-muted">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Media Links */}
          {friend.socialMedia &&
            (friend.socialMedia.instagram ||
              friend.socialMedia.twitter ||
              friend.socialMedia.whatsapp ||
              friend.socialMedia.facebook) && (
              <div className="detail-section">
                <h3>Social Media</h3>
                <div className="social-links">
                  {friend.socialMedia.instagram && (
                    <div className="social-link-item">
                      <span className="social-icon">📷</span>
                      <div>
                        <strong>Instagram</strong>
                        <p>{friend.socialMedia.instagram}</p>
                      </div>
                    </div>
                  )}
                  {friend.socialMedia.twitter && (
                    <div className="social-link-item">
                      <span className="social-icon">𝕏</span>
                      <div>
                        <strong>X (Twitter)</strong>
                        <p>{friend.socialMedia.twitter}</p>
                      </div>
                    </div>
                  )}
                  {friend.socialMedia.whatsapp && (
                    <div className="social-link-item">
                      <span className="social-icon">💬</span>
                      <div>
                        <strong>WhatsApp</strong>
                        <p>{friend.socialMedia.whatsapp}</p>
                      </div>
                    </div>
                  )}
                  {friend.socialMedia.facebook && (
                    <div className="social-link-item">
                      <span className="social-icon">📘</span>
                      <div>
                        <strong>Facebook</strong>
                        <p>{friend.socialMedia.facebook}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FriendProfileModal;
