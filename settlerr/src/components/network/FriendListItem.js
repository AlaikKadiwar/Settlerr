/**
 * FriendListItem Component
 *
 * Displays a friend in the network list with View Profile and Remove options.
 * Shows friend's avatar, name, level, and action buttons.
 *
 * @component
 */

import { useState } from "react";
import "./FriendListItem.css";
import UserAvatar from "../common/UserAvatar";
import Button from "../common/Button";

const FriendListItem = ({ friend, onViewProfile, onRemove }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleRemoveClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = () => {
    onRemove(friend.id);
    setShowConfirmModal(false);
  };

  const handleCancelRemove = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="friend-list-item">
        <div className="friend-info">
          <UserAvatar
            profilePicture={friend.profilePicture}
            username={friend.name}
            size="medium"
          />
          <div className="friend-details">
            <h3>{friend.name}</h3>
            <p className="friend-level">
              {friend.levelTitle} • {friend.xp} XP
            </p>
            <p className="friend-location">{friend.location}</p>
          </div>
        </div>

        <div className="friend-actions">
          <Button variant="outline" onClick={() => onViewProfile(friend)}>
            View Profile
          </Button>
          <Button
            variant="outline"
            onClick={handleRemoveClick}
            className="remove-btn"
          >
            Remove Friend
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelRemove}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Remove Friend?</h3>
            <p>
              Are you sure you want to remove <strong>{friend.name}</strong>{" "}
              from your network?
            </p>
            <div className="modal-actions">
              <Button variant="outline" onClick={handleCancelRemove}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRemove}
                className="danger-btn"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FriendListItem;
