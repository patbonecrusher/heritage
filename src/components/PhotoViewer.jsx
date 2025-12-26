/**
 * PhotoViewer - Component for viewing photos with face detection and tagging
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { detectFaces, loadModels } from '../utils/faceDetector';
import { useMedia } from '../data/useMedia';
import { usePersons } from '../data/usePersons';
import { useDatabase } from '../data/DatabaseContext';
import './PhotoViewer.css';

export function PhotoViewer({ mediaId, imageSrc, mediaPath, onClose }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const photoContainerRef = useRef(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [savedFaceTags, setSavedFaceTags] = useState([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(null);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Resizing state
  const [resizing, setResizing] = useState(null); // { index, isSaved, handle, startX, startY, startBox }

  const { getFaceTags, createFaceTag, updateFaceTag, deleteFaceTag } = useMedia();
  const { persons } = usePersons();
  const { triggerRefresh } = useDatabase();

  // Load face detection models on mount
  useEffect(() => {
    loadModels()
      .then(() => setModelsReady(true))
      .catch(err => console.error('Failed to load face models:', err));
  }, []);

  // Load existing face tags for this media
  useEffect(() => {
    if (mediaId) {
      getFaceTags(mediaId).then(tags => {
        setSavedFaceTags(tags);
      });
    }
  }, [mediaId, getFaceTags]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Run face detection
  const runDetection = useCallback(async () => {
    if (!modelsReady || detecting) return;

    setDetecting(true);
    try {
      // Fetch image as base64 to avoid CORS issues with canvas
      let base64Src = null;
      if (mediaPath && window.electronAPI?.bundle?.readMediaBase64) {
        base64Src = await window.electronAPI.bundle.readMediaBase64(mediaPath);
      }

      if (!base64Src) {
        console.error('Could not load image for face detection');
        setDetecting(false);
        return;
      }

      // Create an image element with the base64 source
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = base64Src;
      });

      const faces = await detectFaces(img);

      // Filter out faces that already have saved tags (by position overlap)
      const newFaces = faces.filter(face => {
        return !savedFaceTags.some(tag => {
          // Check if positions overlap significantly (within 10%)
          const overlap = (
            Math.abs(face.xPct - tag.x) < 10 &&
            Math.abs(face.yPct - tag.y) < 10
          );
          return overlap;
        });
      });

      setDetectedFaces(newFaces);
    } catch (err) {
      console.error('Face detection failed:', err);
    } finally {
      setDetecting(false);
    }
  }, [modelsReady, detecting, savedFaceTags, mediaPath]);

  // Handle clicking on a detected face
  const handleFaceClick = (index, isSaved) => {
    setSelectedFaceIndex({ index, isSaved });
    setShowPersonPicker(true);
    setSearchTerm('');
  };

  // Assign a person to the selected face
  const assignPerson = async (personId) => {
    if (!selectedFaceIndex) return;

    const { index, isSaved } = selectedFaceIndex;

    if (isSaved) {
      // Update existing face tag
      const tag = savedFaceTags[index];
      await updateFaceTag(tag.id, { person_id: personId });

      // Refresh tags
      const updatedTags = await getFaceTags(mediaId);
      setSavedFaceTags(updatedTags);
    } else {
      // Create new face tag from detected face
      const face = detectedFaces[index];
      await createFaceTag({
        media_id: mediaId,
        person_id: personId,
        x: face.xPct,
        y: face.yPct,
        width: face.widthPct,
        height: face.heightPct,
        confidence: 'certain',
      });

      // Remove from detected faces and refresh saved tags
      setDetectedFaces(prev => prev.filter((_, i) => i !== index));
      const updatedTags = await getFaceTags(mediaId);
      setSavedFaceTags(updatedTags);
    }

    // Trigger global refresh so PersonPhoto updates
    triggerRefresh();

    setShowPersonPicker(false);
    setSelectedFaceIndex(null);
  };

  // Remove a face tag
  const removeFaceTag = async (tagId) => {
    await deleteFaceTag(tagId);
    const updatedTags = await getFaceTags(mediaId);
    setSavedFaceTags(updatedTags);
    // Trigger global refresh so PersonPhoto updates
    triggerRefresh();
  };

  // Filter persons by search term
  const filteredPersons = persons.filter(p => {
    if (!searchTerm) return true;
    const fullName = `${p.given_names || ''} ${p.surname || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Get person name for display
  const getPersonName = (tag) => {
    if (tag.given_names || tag.surname) {
      return `${tag.given_names || ''} ${tag.surname || ''}`.trim();
    }
    return tag.label || 'Unknown';
  };

  // Start resizing a face box
  const startResize = (e, index, isSaved, handle) => {
    e.stopPropagation();
    e.preventDefault();

    const box = isSaved ? savedFaceTags[index] : detectedFaces[index];
    const startBox = isSaved
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : { x: box.xPct, y: box.yPct, width: box.widthPct, height: box.heightPct };

    setResizing({
      index,
      isSaved,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox,
    });
  };

  // Handle mouse move during resize
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      if (!photoContainerRef.current || !imageRef.current) return;

      const containerRect = photoContainerRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate delta in percentage of image size
      const deltaX = ((e.clientX - resizing.startX) / imgRect.width) * 100;
      const deltaY = ((e.clientY - resizing.startY) / imgRect.height) * 100;

      const { startBox, handle } = resizing;
      let newBox = { ...startBox };

      // Adjust box based on which handle is being dragged
      if (handle.includes('n')) {
        newBox.y = Math.max(0, startBox.y + deltaY);
        newBox.height = Math.max(5, startBox.height - deltaY);
      }
      if (handle.includes('s')) {
        newBox.height = Math.max(5, startBox.height + deltaY);
      }
      if (handle.includes('w')) {
        newBox.x = Math.max(0, startBox.x + deltaX);
        newBox.width = Math.max(5, startBox.width - deltaX);
      }
      if (handle.includes('e')) {
        newBox.width = Math.max(5, startBox.width + deltaX);
      }

      // Clamp to image bounds
      if (newBox.x + newBox.width > 100) newBox.width = 100 - newBox.x;
      if (newBox.y + newBox.height > 100) newBox.height = 100 - newBox.y;

      // Update the appropriate state
      if (resizing.isSaved) {
        setSavedFaceTags(prev => prev.map((tag, i) =>
          i === resizing.index ? { ...tag, ...newBox } : tag
        ));
      } else {
        setDetectedFaces(prev => prev.map((face, i) =>
          i === resizing.index
            ? { ...face, xPct: newBox.x, yPct: newBox.y, widthPct: newBox.width, heightPct: newBox.height }
            : face
        ));
      }
    };

    const handleMouseUp = async () => {
      // Save the updated coordinates to database if it's a saved tag
      if (resizing.isSaved) {
        const tag = savedFaceTags[resizing.index];
        await updateFaceTag(tag.id, {
          x: tag.x,
          y: tag.y,
          width: tag.width,
          height: tag.height,
        });
        // Trigger global refresh so PersonPhoto updates
        triggerRefresh();
      }
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, savedFaceTags, updateFaceTag, triggerRefresh]);

  // Render resize handles for a face box
  const renderResizeHandles = (index, isSaved) => (
    <>
      <div className="resize-handle nw" onMouseDown={(e) => startResize(e, index, isSaved, 'nw')} />
      <div className="resize-handle ne" onMouseDown={(e) => startResize(e, index, isSaved, 'ne')} />
      <div className="resize-handle sw" onMouseDown={(e) => startResize(e, index, isSaved, 'sw')} />
      <div className="resize-handle se" onMouseDown={(e) => startResize(e, index, isSaved, 'se')} />
      <div className="resize-handle n" onMouseDown={(e) => startResize(e, index, isSaved, 'n')} />
      <div className="resize-handle s" onMouseDown={(e) => startResize(e, index, isSaved, 's')} />
      <div className="resize-handle w" onMouseDown={(e) => startResize(e, index, isSaved, 'w')} />
      <div className="resize-handle e" onMouseDown={(e) => startResize(e, index, isSaved, 'e')} />
    </>
  );

  return (
    <div className="photo-viewer-overlay" onClick={onClose}>
      <div className="photo-viewer-container" onClick={e => e.stopPropagation()} ref={containerRef}>
        <div className="photo-viewer-header">
          <div className="photo-viewer-title">Photo Viewer</div>
          <div className="photo-viewer-actions">
            <button
              className="detect-faces-btn"
              onClick={runDetection}
              disabled={!modelsReady || detecting || !imageLoaded}
            >
              {detecting ? 'Detecting...' : modelsReady ? 'Detect Faces' : 'Loading models...'}
            </button>
            <button className="close-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="photo-viewer-content">
          <div className="photo-container" ref={photoContainerRef}>
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Photo"
              onLoad={handleImageLoad}
            />

            {/* Render saved face tags */}
            {savedFaceTags.map((tag, index) => (
              <div
                key={tag.id}
                className={`face-box saved ${selectedFaceIndex?.isSaved && selectedFaceIndex?.index === index ? 'selected' : ''} ${resizing?.isSaved && resizing?.index === index ? 'resizing' : ''}`}
                style={{
                  left: `${tag.x}%`,
                  top: `${tag.y}%`,
                  width: `${tag.width}%`,
                  height: `${tag.height}%`,
                }}
                onClick={() => handleFaceClick(index, true)}
              >
                <span className="face-label">{getPersonName(tag)}</span>
                <button
                  className="remove-tag-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFaceTag(tag.id);
                  }}
                >
                  x
                </button>
                {renderResizeHandles(index, true)}
              </div>
            ))}

            {/* Render detected (unsaved) faces */}
            {detectedFaces.map((face, index) => (
              <div
                key={`detected-${index}`}
                className={`face-box detected ${selectedFaceIndex?.isSaved === false && selectedFaceIndex?.index === index ? 'selected' : ''} ${resizing?.isSaved === false && resizing?.index === index ? 'resizing' : ''}`}
                style={{
                  left: `${face.xPct}%`,
                  top: `${face.yPct}%`,
                  width: `${face.widthPct}%`,
                  height: `${face.heightPct}%`,
                }}
                onClick={() => handleFaceClick(index, false)}
              >
                <span className="face-label">Click to identify</span>
                {renderResizeHandles(index, false)}
              </div>
            ))}
          </div>

          {/* Person picker dropdown */}
          {showPersonPicker && (
            <div className="person-picker">
              <div className="person-picker-header">
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <button onClick={() => setShowPersonPicker(false)}>Cancel</button>
              </div>
              <div className="person-list">
                {filteredPersons.map(person => (
                  <div
                    key={person.id}
                    className="person-option"
                    onClick={() => assignPerson(person.id)}
                  >
                    {person.given_names} {person.surname}
                  </div>
                ))}
                {filteredPersons.length === 0 && (
                  <div className="no-results">No matching people found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="photo-viewer-footer">
          <div className="face-count">
            {savedFaceTags.length > 0 && (
              <span>{savedFaceTags.length} tagged</span>
            )}
            {detectedFaces.length > 0 && (
              <span>{detectedFaces.length} detected (untagged)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoViewer;
