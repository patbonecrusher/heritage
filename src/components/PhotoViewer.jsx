/**
 * PhotoViewer - Component for viewing photos with face detection and tagging
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { detectFaces, loadModels } from '../utils/faceDetector';
import { useMedia } from '../data/useMedia';
import { usePersons } from '../data/usePersons';
import { useSources } from '../data/useSources';
import { useDatabase } from '../data/DatabaseContext';
import CitationList from './CitationList';
import CitationDialog from './CitationDialog';
import NotesSection from './NotesSection';
import './PhotoViewer.css';

// Media type options
const MEDIA_TYPE_OPTIONS = {
  photo: 'Photo',
  document: 'Document',
  certificate: 'Certificate',
  headstone: 'Headstone',
  newspaper: 'Newspaper',
  map: 'Map',
  audio: 'Audio',
  video: 'Video',
  other: 'Other',
};

export function PhotoViewer({
  mediaId,
  imageSrc,
  mediaPath,
  title: initialTitle,
  filename,
  mediaType: initialMediaType,
  mimeType,
  description: initialDescription,
  dateTaken: initialDateTaken,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  citations: passedCitations,
  onAddCitation: passedOnAddCitation,
  onEditCitation: passedOnEditCitation,
  onDeleteCitation: passedOnDeleteCitation,
  dbSources = [],
}) {
  // Check if this is an image that supports face detection
  const isImage = mimeType?.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(
      (filename || '').split('.').pop()?.toLowerCase()
    );
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
  const justResizedRef = useRef(false);

  // Moving state
  const [moving, setMoving] = useState(null); // { index, isSaved, startX, startY, startBox }
  const justMovedRef = useRef(false);

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const { getFaceTags, createFaceTag, updateFaceTag, deleteFaceTag, updateMedia } = useMedia();
  const { persons } = usePersons();
  const { triggerRefresh } = useDatabase();
  const { getCitationsForMedia, createCitation, updateCitation, deleteCitation } = useSources();

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialTitle || '');
  const titleInputRef = useRef(null);

  // Media metadata state
  const [description, setDescription] = useState(initialDescription || '');
  const [currentType, setCurrentType] = useState(initialMediaType || 'photo');
  const [dateTaken, setDateTaken] = useState(initialDateTaken || '');

  // Sync state when media changes (navigation)
  useEffect(() => {
    setEditedTitle(initialTitle || '');
    setDescription(initialDescription || '');
    setCurrentType(initialMediaType || 'photo');
    setDateTaken(initialDateTaken || '');
    setIsEditingTitle(false);
  }, [mediaId, initialTitle, initialDescription, initialMediaType, initialDateTaken]);

  // Citation state
  const [citations, setCitations] = useState([]);
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [editingCitation, setEditingCitation] = useState(null);

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

  // Load citations for this media
  useEffect(() => {
    if (mediaId) {
      getCitationsForMedia(mediaId).then(cites => {
        setCitations(cites || []);
      });
    }
  }, [mediaId, getCitationsForMedia]);

  // Refresh citations
  const refreshCitations = async () => {
    if (mediaId) {
      const cites = await getCitationsForMedia(mediaId);
      setCitations(cites || []);
    }
  };

  // Handle add citation
  const handleAddCitation = () => {
    setEditingCitation(null);
    setCitationDialogOpen(true);
  };

  // Handle edit citation
  const handleEditCitation = (citation) => {
    setEditingCitation(citation);
    setCitationDialogOpen(true);
  };

  // Handle delete citation
  const handleDeleteCitation = async (citationId) => {
    await deleteCitation(citationId);
    await refreshCitations();
  };

  // Handle save citation
  const handleSaveCitation = async (data) => {
    if (editingCitation) {
      await updateCitation(editingCitation.id, data);
    } else {
      await createCitation(data);
    }
    setCitationDialogOpen(false);
    setEditingCitation(null);
    await refreshCitations();
  };

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle title save
  const handleSaveTitle = async () => {
    if (mediaId && editedTitle !== initialTitle) {
      await updateMedia(mediaId, { title: editedTitle || null });
      triggerRefresh();
    }
    setIsEditingTitle(false);
  };

  // Handle title key press
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditedTitle(initialTitle || '');
      setIsEditingTitle(false);
    }
  };

  // Handle field changes with auto-save
  const handleDescriptionChange = async (value) => {
    setDescription(value);
  };

  const handleDescriptionBlur = async () => {
    if (mediaId && description !== initialDescription) {
      await updateMedia(mediaId, { description: description || null });
      triggerRefresh();
    }
  };

  const handleTypeChange = async (value) => {
    setCurrentType(value);
    if (mediaId) {
      await updateMedia(mediaId, { type: value });
      triggerRefresh();
    }
  };

  const handleDateChange = async (value) => {
    setDateTaken(value);
    if (mediaId) {
      await updateMedia(mediaId, { date_taken: value || null });
      triggerRefresh();
    }
  };

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
  const handleFaceClick = (e, index, isSaved) => {
    e.stopPropagation();
    // Don't open picker if we just finished resizing/moving or if currently resizing/moving
    if (justResizedRef.current || justMovedRef.current || resizing || moving) {
      justResizedRef.current = false;
      justMovedRef.current = false;
      return;
    }
    // Don't open if clicking on a resize handle
    if (e.target.classList.contains('resize-handle')) {
      return;
    }
    setSelectedFaceIndex({ index, isSaved });
    setShowPersonPicker(true);
    setSearchTerm('');
  };

  // Start moving a face box
  const startMove = (e, index, isSaved) => {
    // Don't start move if clicking on resize handle or remove button
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('remove-tag-btn')) {
      return;
    }
    e.stopPropagation();

    const box = isSaved ? savedFaceTags[index] : detectedFaces[index];
    const startBox = isSaved
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : { x: box.xPct, y: box.yPct, width: box.widthPct, height: box.heightPct };

    setMoving({
      index,
      isSaved,
      startX: e.clientX,
      startY: e.clientY,
      startBox,
      hasMoved: false,
    });
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
      // Prevent click from opening picker right after resize - set BEFORE async ops
      justResizedRef.current = true;

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

  // Handle mouse move during move
  useEffect(() => {
    if (!moving) return;

    const handleMouseMove = (e) => {
      if (!photoContainerRef.current || !imageRef.current) return;

      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate delta in percentage of image size
      const deltaX = ((e.clientX - moving.startX) / imgRect.width) * 100;
      const deltaY = ((e.clientY - moving.startY) / imgRect.height) * 100;

      // Only consider it a move if we've moved more than a tiny amount
      const hasMoved = Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5;

      const { startBox } = moving;
      let newX = startBox.x + deltaX;
      let newY = startBox.y + deltaY;

      // Clamp to image bounds
      newX = Math.max(0, Math.min(100 - startBox.width, newX));
      newY = Math.max(0, Math.min(100 - startBox.height, newY));

      // Update the appropriate state
      if (moving.isSaved) {
        setSavedFaceTags(prev => prev.map((tag, i) =>
          i === moving.index ? { ...tag, x: newX, y: newY } : tag
        ));
      } else {
        setDetectedFaces(prev => prev.map((face, i) =>
          i === moving.index
            ? { ...face, xPct: newX, yPct: newY }
            : face
        ));
      }

      if (hasMoved && !moving.hasMoved) {
        setMoving(prev => ({ ...prev, hasMoved: true }));
      }
    };

    const handleMouseUp = async () => {
      // Only set justMoved if we actually moved
      if (moving.hasMoved) {
        justMovedRef.current = true;

        // Save the updated coordinates to database if it's a saved tag
        if (moving.isSaved) {
          const tag = savedFaceTags[moving.index];
          await updateFaceTag(tag.id, {
            x: tag.x,
            y: tag.y,
            width: tag.width,
            height: tag.height,
          });
          // Trigger global refresh so PersonPhoto updates
          triggerRefresh();
        }
      }
      setMoving(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [moving, savedFaceTags, updateFaceTag, triggerRefresh]);

  // Handle wheel event for zoom (trackpad pinch gesture)
  const handleWheel = useCallback((e) => {
    // Trackpad pinch gestures send wheel events with ctrlKey
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      setScale(prev => Math.min(Math.max(0.5, prev + delta), 5));
    } else if (scale > 1) {
      // When zoomed in, use wheel for panning
      e.preventDefault();
      setTranslate(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [scale]);

  // Add wheel listener to photo container
  useEffect(() => {
    const container = photoContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Handle pan start (drag to pan when zoomed)
  const handlePanStart = useCallback((e) => {
    if (scale > 1 && e.button === 0 && !resizing) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  }, [scale, translate, resizing]);

  // Handle pan move
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e) => {
      setTranslate({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart]);

  // Reset zoom
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Always allow Escape to close, regardless of other states
      if (e.key === 'Escape') {
        
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Don't navigate if person picker is open or if focus is in an input
      if (showPersonPicker || e.target.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasNext, hasPrevious, onNext, onPrevious, onClose, showPersonPicker]);

  // Render resize handles for a face box
  const handleResizeClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const renderResizeHandles = (index, isSaved) => (
    <>
      <div className="resize-handle nw" onMouseDown={(e) => startResize(e, index, isSaved, 'nw')} onClick={handleResizeClick} />
      <div className="resize-handle ne" onMouseDown={(e) => startResize(e, index, isSaved, 'ne')} onClick={handleResizeClick} />
      <div className="resize-handle sw" onMouseDown={(e) => startResize(e, index, isSaved, 'sw')} onClick={handleResizeClick} />
      <div className="resize-handle se" onMouseDown={(e) => startResize(e, index, isSaved, 'se')} onClick={handleResizeClick} />
      <div className="resize-handle n" onMouseDown={(e) => startResize(e, index, isSaved, 'n')} onClick={handleResizeClick} />
      <div className="resize-handle s" onMouseDown={(e) => startResize(e, index, isSaved, 's')} onClick={handleResizeClick} />
      <div className="resize-handle w" onMouseDown={(e) => startResize(e, index, isSaved, 'w')} onClick={handleResizeClick} />
      <div className="resize-handle e" onMouseDown={(e) => startResize(e, index, isSaved, 'e')} onClick={handleResizeClick} />
    </>
  );

  return (
    <div
      className="photo-viewer-overlay"
      onClick={(e) => {
        console.log('PhotoViewer: overlay clicked', e);
        onClose();
      }}
      onWheel={e => e.stopPropagation()}
    >
      <div className="photo-viewer-container" onClick={e => e.stopPropagation()} ref={containerRef}>
        <div className="photo-viewer-header">
          <div className="photo-viewer-nav">
            <button
              className="nav-btn prev"
              onClick={onPrevious}
              disabled={!hasPrevious}
              title="Previous (←)"
            >
              ‹
            </button>
            <button
              className="nav-btn next"
              onClick={onNext}
              disabled={!hasNext}
              title="Next (→)"
            >
              ›
            </button>
          </div>
          <div className="photo-viewer-title-section">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                className="photo-viewer-title-input"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={handleTitleKeyDown}
                placeholder={filename || 'Enter title...'}
              />
            ) : (
              <div
                className="photo-viewer-title editable"
                onClick={() => {
                  setEditedTitle(editedTitle || filename || '');
                  setIsEditingTitle(true);
                }}
                title="Click to edit title"
              >
                {editedTitle || filename || 'Media Viewer'}
                <span className="edit-icon">✎</span>
              </div>
            )}
            {filename && (
              <div className="photo-viewer-filename">{filename}</div>
            )}
          </div>
          <div className="photo-viewer-actions">
            {isImage && (
              <button
                className="detect-faces-btn"
                onClick={runDetection}
                disabled={!modelsReady || detecting || !imageLoaded}
              >
                {detecting ? 'Detecting...' : modelsReady ? 'Detect Faces' : 'Loading models...'}
              </button>
            )}
            <button
              className="close-btn"
              onClick={() => {
                
                onClose();
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="photo-viewer-main">
        <div className="photo-viewer-content">
          <div
            className={`photo-container ${isPanning ? 'panning' : ''} ${scale > 1 ? 'zoomed' : ''}`}
            ref={photoContainerRef}
            onMouseDown={handlePanStart}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Photo"
              onLoad={handleImageLoad}
              draggable={false}
            />

            {/* Render saved face tags */}
            {savedFaceTags.map((tag, index) => {
              const isSelected = selectedFaceIndex?.isSaved && selectedFaceIndex?.index === index;
              const isMoving = moving?.isSaved && moving?.index === index;
              return (
                <div
                  key={tag.id}
                  className={`face-box saved ${isSelected ? 'selected' : ''} ${resizing?.isSaved && resizing?.index === index ? 'resizing' : ''} ${isMoving ? 'moving' : ''}`}
                  style={{
                    left: `${tag.x}%`,
                    top: `${tag.y}%`,
                    width: `${tag.width}%`,
                    height: `${tag.height}%`,
                  }}
                  onMouseDown={(e) => startMove(e, index, true)}
                  onClick={(e) => handleFaceClick(e, index, true)}
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
                  {/* Person picker inside selected face box */}
                  {showPersonPicker && isSelected && (
                    <div className="person-picker" onClick={(e) => e.stopPropagation()}>
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
              );
            })}

            {/* Render detected (unsaved) faces */}
            {detectedFaces.map((face, index) => {
              const isSelected = selectedFaceIndex?.isSaved === false && selectedFaceIndex?.index === index;
              const isMoving = moving?.isSaved === false && moving?.index === index;
              return (
                <div
                  key={`detected-${index}`}
                  className={`face-box detected ${isSelected ? 'selected' : ''} ${resizing?.isSaved === false && resizing?.index === index ? 'resizing' : ''} ${isMoving ? 'moving' : ''}`}
                  style={{
                    left: `${face.xPct}%`,
                    top: `${face.yPct}%`,
                    width: `${face.widthPct}%`,
                    height: `${face.heightPct}%`,
                  }}
                  onMouseDown={(e) => startMove(e, index, false)}
                  onClick={(e) => handleFaceClick(e, index, false)}
                >
                  <span className="face-label">Click to identify</span>
                  {renderResizeHandles(index, false)}
                  {/* Person picker inside selected face box */}
                  {showPersonPicker && isSelected && (
                    <div className="person-picker" onClick={(e) => e.stopPropagation()}>
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
              );
            })}
          </div>
        </div>

        <div className="photo-viewer-sidebar">
          <div className="photo-viewer-sidebar-content">
            {/* Details Section */}
            <div className="photo-viewer-info-section">
              <div className="photo-viewer-section-title">Details</div>
              <div className="photo-viewer-fields">
                <label className="photo-viewer-field">
                  <span className="field-label">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Add a description..."
                    rows={2}
                  />
                </label>
                <label className="photo-viewer-field">
                  <span className="field-label">Type</span>
                  <select
                    value={currentType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    {Object.entries(MEDIA_TYPE_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="photo-viewer-field">
                  <span className="field-label">Date Taken</span>
                  <input
                    type="date"
                    value={dateTaken}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {isImage && (
              <div className="photo-viewer-info-section">
                <div className="photo-viewer-section-title">Face Tags</div>
                <div className="face-count">
                  {savedFaceTags.length > 0 ? (
                    <span>{savedFaceTags.length} tagged</span>
                  ) : (
                    <span className="empty-text">No faces tagged</span>
                  )}
                  {detectedFaces.length > 0 && (
                    <span>{detectedFaces.length} detected (untagged)</span>
                  )}
                </div>
              </div>
            )}

            <div className="photo-viewer-info-section">
              <div className="photo-viewer-section-title">Sources</div>
              <CitationList
                citations={citations}
                onAdd={handleAddCitation}
                onEdit={handleEditCitation}
                onDelete={handleDeleteCitation}
                isEditing={true}
              />
            </div>

            <div className="photo-viewer-info-section">
              <div className="photo-viewer-section-title">Notes</div>
              <NotesSection
                entityType="media"
                entityId={mediaId}
                compact
              />
            </div>
          </div>

          <div className="photo-viewer-sidebar-footer">
            <div className="zoom-controls">
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              {scale !== 1 && (
                <button className="reset-zoom-btn" onClick={resetZoom}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        </div>

        <CitationDialog
          isOpen={citationDialogOpen}
          initialData={editingCitation}
          entityType="media"
          entityId={mediaId}
          onSave={handleSaveCitation}
          onClose={() => {
            setCitationDialogOpen(false);
            setEditingCitation(null);
          }}
        />
      </div>
    </div>
  );
}

export default PhotoViewer;
