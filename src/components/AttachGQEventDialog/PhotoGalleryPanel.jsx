/**
 * PhotoGalleryPanel - Photo upload and display for GQ event attachment
 *
 * Features:
 * - Drag-drop photo upload
 * - Main image display with zoom controls
 * - Thumbnail strip for navigation
 * - Photo metadata editor (label, page range)
 */

import React, { useState, useRef } from 'react';
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
  const [zoomLevel, setZoomLevel] = useState(100);
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPageRange, setEditPageRange] = useState('');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const photoDisplayRef = useRef(null);
  const imageRef = useRef(null);

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
  // Zoom
  // ============================================

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleZoomFit = () => {
    setZoomLevel(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // ============================================
  // Pinch Zoom & Panning
  // ============================================

  const handleWheel = (e) => {
    if (!photoDisplayRef.current) return;

    // Check if ctrl/cmd is pressed (pinch gesture or zoom)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -25 : 25;
      setZoomLevel((prev) => Math.max(50, Math.min(300, prev + delta)));
    }
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 100 && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && imageRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPanOffset({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset pan when zoom changes
  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
    if (newZoom === 100) {
      setPanOffset({ x: 0, y: 0 });
    }
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
                    transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    cursor: isDragging ? 'grabbing' : zoomLevel > 100 ? 'grab' : 'default',
                  }}
                  className="main-photo"
                  draggable={false}
                />
              </div>

              {/* Zoom Controls */}
              <div className="zoom-controls">
                <button
                  onClick={() => handleZoomChange(Math.max(50, zoomLevel - 25))}
                  title="Zoom Out"
                  className="zoom-btn"
                >
                  −
                </button>
                <span className="zoom-level">{zoomLevel}%</span>
                <button
                  onClick={() => handleZoomChange(Math.min(300, zoomLevel + 25))}
                  title="Zoom In"
                  className="zoom-btn"
                >
                  +
                </button>
                <button
                  onClick={handleZoomFit}
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

                {editingPhotoId === photo.id && (
                  <div
                    className="edit-overlay"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="edit-form">
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
    </div>
  );
}
