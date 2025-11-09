/**
 * ProfileImageUpload Component
 *
 * Handles profile picture upload with preview and S3 integration.
 * Features:
 * - Image preview before upload
 * - Drag and drop support
 * - File size validation (max 5MB)
 * - Accepted formats: JPG, PNG, GIF
 * - Circular avatar preview
 *
 * @component
 */

import { useState, useRef } from "react";
import "./ProfileImageUpload.css";

const ProfileImageUpload = ({ currentImage, onImageChange, username }) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Maximum file size: 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  /**
   * Validate and process selected image file
   */
  const handleFileSelect = (file) => {
    setError("");

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      onImageChange(file, reader.result);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Handle file input change
   */
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle drag and drop events
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Trigger file input click
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Remove current profile picture
   */
  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onImageChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    <div className="profile-image-upload">
      <div
        className={`image-upload-area ${isDragging ? "dragging" : ""}`}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />

        {preview ? (
          <div className="image-preview-container">
            <img
              src={preview}
              alt="Profile preview"
              className="image-preview"
            />
            <div className="image-overlay">
              <button
                type="button"
                className="remove-image-btn"
                onClick={handleRemove}
                title="Remove image"
              >
                ✕
              </button>
              <div className="change-text">Click to change</div>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="default-avatar">{getInitials(username)}</div>
            <div className="upload-instructions">
              <p className="upload-title">Click to upload profile picture</p>
              <p className="upload-hint">or drag and drop</p>
              <p className="upload-formats">JPG, PNG, GIF or WebP (max 5MB)</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}

      {uploading && <div className="upload-progress">Uploading...</div>}
    </div>
  );
};

export default ProfileImageUpload;
