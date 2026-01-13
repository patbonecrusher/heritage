/**
 * PhotoGalleryPanel - Photo upload and display for GQ event attachment
 *
 * Features:
 * - Drag-drop photo upload
 * - Main image display with zoom controls
 * - Thumbnail strip for navigation
 * - Photo metadata editor (label, page range)
 */

import React, { useState } from 'react';
import { useImageZoom } from '@/hooks/useImageZoom';
import './PhotoGalleryPanel.css';

export function PhotoGalleryPanel({
  photos,
  mainPhotoIndex,
  onAddPhotos,
  onRemovePhoto,
  onUpdatePhotoMetadata,
  onSetMainPhoto,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPageRange, setEditPageRange] = useState('');

  const {
    zoomLevel,
    panOffset,
    isDragging,
    containerRef: photoDisplayRef,
    imageRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomChange,
    zoomIn,
    zoomOut,
    fitToWindow,
    containerStyle,
    transformStyle,
  } = useImageZoom(100);

  const [fileInputRef] = useState(() => React.createRef());

  const mainPhoto = photos[mainPhotoIndex] || null;

  // ============================================
  // Drag & Drop
  // ============================================

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('Please drop image files only');
      return;
    }

    onAddPhotos(imageFiles);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  // ============================================
  // Edit Metadata
  // ============================================

  const startEditingPhoto = (photo) => {
    setEditingPhotoId(photo.id);
    setEditLabel(photo.label);
    setEditPageRange(photo.pageRange);
  };

  const savePhotoMetadata = () => {
    if (editingPhotoId) {
      onUpdatePhotoMetadata(editingPhotoId, editLabel, editPageRange);
      setEditingPhotoId(null);
    }
  };

  const cancelEditingPhoto = () => {
    setEditingPhotoId(null);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="photo-gallery-panel">
      <div className="gallery-header">
        <h3>Photos ({photos.length})</h3>
      </div>

      {/* Main Photo Display */}
      <div className="photo-display-container">
        {mainPhoto ? (
          <>
            <div className="photo-display-wrapper">
              <div
                ref={photoDisplayRef}
                className="photo-display"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: zoomLevel > 100 ? 'grab' : 'default' }}
              >
                <img
                  ref={imageRef}
                  src={mainPhoto.preview}
                  alt={mainPhoto.label}
                  style={{
                    ...transformStyle,
                    cursor: isDragging ? 'grabbing' : zoomLevel > 100 ? 'grab' : 'default',
                  }}
                  className="main-photo"
                  draggable={false}
                />
              </div>

              {/* Zoom Controls */}
              <div className="zoom-controls">
                <button
                  onClick={zoomOut}
                  title="Zoom Out"
                  className="zoom-btn"
                >
                  −
                </button>
                <span className="zoom-level">{zoomLevel}%</span>
                <button
                  onClick={zoomIn}
                  title="Zoom In"
                  className="zoom-btn"
                >
                  +
                </button>
                <button
                  onClick={fitToWindow}
                  title="Fit to Window"
                  className="zoom-btn"
                >
                  ⊡
                </button>
              </div>

              {/* Photo Info */}
              {mainPhoto && (
                <div className="photo-info">
                  <div className="info-label">{mainPhoto.label}</div>
                  {mainPhoto.pageRange && (
                    <div className="info-pages">p. {mainPhoto.pageRange}</div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="photo-display-empty">
            <div className="empty-icon">📷</div>
            <p>No photos yet</p>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="upload-icon">⬇️</div>
        <p className="upload-text">
          Drag photos here or{' '}
          <button onClick={handleBrowseClick} className="link-button">
            browse
          </button>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 0 && (
        <div className="thumbnails-container">
          <div className="thumbnails">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`thumbnail ${
                  index === mainPhotoIndex ? 'active' : ''
                }`}
              >
                <img
                  src={photo.preview}
                  alt={`Photo ${index + 1}`}
                  onClick={() => onSetMainPhoto(index)}
                  className="thumbnail-image"
                />

                <div className="thumbnail-number">{index + 1}</div>

                <div className="thumbnail-actions">
                  <button
                    onClick={() => startEditingPhoto(photo)}
                    title="Edit"
                    className="action-btn edit-btn"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onRemovePhoto(photo.id)}
                    title="Remove"
                    className="action-btn delete-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Count */}
      {photos.length > 0 && (
        <div className="photo-count">
          Showing photo {mainPhotoIndex + 1} of {photos.length}
        </div>
      )}

      {/* Edit Overlay - Full screen positioned overlay */}
      {editingPhotoId && (
        <div
          className="edit-overlay-full"
          onClick={() => setEditingPhotoId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setEditingPhotoId(null);
            }
          }}
          role="presentation"
          tabIndex={-1}
        >
          <div
            className="edit-form"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <h3 className="edit-form-title">Edit Photo Metadata</h3>

            <div className="form-group">
              <label>Document Type:</label>
              <select
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              >
                <option value="GQ Screenshot">GQ Screenshot</option>
                <option value="Drouin Original">Drouin Original</option>
                <option value="Full Scan">Full Scan</option>
                <option value="Church Record">Church Record</option>
                <option value="Document">Document</option>
              </select>
            </div>

            <div className="form-group">
              <label>Page Range:</label>
              <input
                type="text"
                value={editPageRange}
                onChange={(e) => setEditPageRange(e.target.value)}
                placeholder="e.g., 21 or 21-22"
              />
            </div>

            <div className="button-group">
              <button
                onClick={savePhotoMetadata}
                className="btn-primary"
              >
                Save
              </button>
              <button
                onClick={cancelEditingPhoto}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
