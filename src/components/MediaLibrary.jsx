/**
 * MediaLibrary - Component for viewing all media in the database
 */

import { useState, useEffect } from 'react';
import { useMedia, MEDIA_TYPES } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import PhotoViewer from './PhotoViewer';
import './MediaLibrary.css';

export function MediaLibrary({ onClose }) {
  const { isOpen, triggerRefresh } = useDatabase();
  const { getAllMedia, importAndCreateMedia, deleteMediaRecord, updateMedia } = useMedia();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all'); // all, photo, document, etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // media item to delete
  const [editingMedia, setEditingMedia] = useState(null); // media item being edited

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load all media
  useEffect(() => {
    if (!isOpen) {
      setMedia([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getAllMedia()
      .then(items => setMedia(items || []))
      .catch(err => console.error('Error loading media:', err))
      .finally(() => setLoading(false));
  }, [isOpen, getAllMedia]);

  // Refresh media list
  const refreshMedia = async () => {
    setLoading(true);
    try {
      const items = await getAllMedia();
      setMedia(items || []);
    } catch (err) {
      console.error('Error refreshing media:', err);
    } finally {
      setLoading(false);
    }
  };

  // Import new media
  const handleImport = async (type) => {
    try {
      const imported = await importAndCreateMedia(type);
      if (imported && imported.length > 0) {
        await refreshMedia();
      }
    } catch (err) {
      console.error('Error importing media:', err);
    }
  };

  // Delete media
  const handleDelete = async (item, deleteFile = true) => {
    try {
      await deleteMediaRecord(item.id, deleteFile);
      setDeleteConfirm(null);
      await refreshMedia();
      // Trigger global refresh so PersonView updates
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting media:', err);
    }
  };

  // Save media edits
  const handleSaveEdit = async () => {
    if (!editingMedia) return;
    try {
      await updateMedia(editingMedia.id, {
        title: editingMedia.title,
        description: editingMedia.description,
        type: editingMedia.type,
        date_taken: editingMedia.date_taken,
      });
      setEditingMedia(null);
      await refreshMedia();
    } catch (err) {
      console.error('Error saving media:', err);
    }
  };

  // Filter and search media
  const filteredMedia = media.filter(item => {
    // Type filter
    if (filter !== 'all' && item.type !== filter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.filename,
        item.title,
        item.description,
        item.linked_persons,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    }
    return true;
  });

  // Get unique types for filter dropdown
  const mediaTypes = [...new Set(media.map(m => m.type))].filter(Boolean);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-library-overlay" onWheel={e => e.stopPropagation()} onClick={onClose}>
      <div className="media-library" onClick={e => e.stopPropagation()}>
        <div className="media-library-header">
          <h2>Media Library</h2>
          <button className="media-library-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="media-library-toolbar">
          <div className="media-library-search">
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="media-library-filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {mediaTypes.map(type => (
                <option key={type} value={type}>
                  {MEDIA_TYPES[type] || type}
                </option>
              ))}
            </select>
          </div>

          <div className="media-library-actions">
            <button
              className="btn-secondary"
              onClick={() => handleImport('photos')}
            >
              + Photos
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleImport('documents')}
            >
              + Documents
            </button>
          </div>
        </div>

        <div className="media-library-stats">
          {loading ? (
            'Loading...'
          ) : (
            `${filteredMedia.length} of ${media.length} items`
          )}
        </div>

        <div className="media-library-content">
          {loading ? (
            <div className="media-library-loading">Loading media...</div>
          ) : filteredMedia.length === 0 ? (
            <div className="media-library-empty">
              {media.length === 0 ? (
                <>
                  <p>No media in library</p>
                  <p className="empty-hint">Import photos or documents to get started</p>
                </>
              ) : (
                <p>No media matches your search</p>
              )}
            </div>
          ) : (
            <div className="media-library-grid">
              {filteredMedia.map(item => (
                <div key={item.id} className="media-library-item">
                  <button
                    className="media-item-main"
                    onClick={() => setSelectedMedia(item)}
                    title={item.filename}
                  >
                    <div className="media-item-preview">
                      {item.thumbnailFullPath || item.fullPath ? (
                        <img
                          src={item.thumbnailFullPath || item.fullPath}
                          alt={item.title || item.filename}
                          loading="lazy"
                        />
                      ) : (
                        <div className="media-item-icon">
                          {item.type === 'document' ? '📄' :
                           item.type === 'certificate' ? '📜' :
                           item.type === 'headstone' ? '🪦' :
                           item.type === 'newspaper' ? '📰' :
                           item.type === 'map' ? '🗺️' : '📷'}
                        </div>
                      )}
                    </div>
                    <div className="media-item-info">
                      <span className="media-item-name">
                        {item.title || item.filename}
                      </span>
                      {item.description && (
                        <span className="media-item-description">
                          {item.description}
                        </span>
                      )}
                      {item.linked_persons && (
                        <span className="media-item-persons">
                          {item.linked_persons}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    className="media-item-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMedia({ ...item });
                    }}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    className="media-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(item);
                    }}
                    title="Delete"
                  >
                    ×
                  </button>
                  {item.face_count > 0 && (
                    <span className="media-item-face-count">{item.face_count}</span>
                  )}
                  <span className="media-item-type">
                    {MEDIA_TYPES[item.type] || item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedMedia && (
          <PhotoViewer
            mediaId={selectedMedia.id}
            imageSrc={selectedMedia.fullPath}
            mediaPath={selectedMedia.path}
            onClose={() => {
              setSelectedMedia(null);
              refreshMedia(); // Refresh in case faces were tagged
            }}
          />
        )}

        {deleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>Delete Media?</h3>
              <p>Are you sure you want to delete "{deleteConfirm.title || deleteConfirm.filename}"?</p>
              {(deleteConfirm.linked_persons || deleteConfirm.tagged_faces) && (
                <div className="delete-warning">
                  {deleteConfirm.linked_persons && (
                    <p>Linked to: {deleteConfirm.linked_persons}</p>
                  )}
                  {deleteConfirm.tagged_faces && (
                    <p>Tagged faces: {deleteConfirm.tagged_faces}</p>
                  )}
                </div>
              )}
              <div className="delete-confirm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(deleteConfirm, true)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {editingMedia && (
          <div className="delete-confirm-overlay">
            <div className="media-edit-dialog">
              <h3>Edit Media</h3>
              <div className="media-edit-preview">
                {editingMedia.thumbnailFullPath || editingMedia.fullPath ? (
                  <img
                    src={editingMedia.thumbnailFullPath || editingMedia.fullPath}
                    alt={editingMedia.title || editingMedia.filename}
                  />
                ) : (
                  <div className="media-item-icon">
                    {MEDIA_TYPES[editingMedia.type] || editingMedia.type}
                  </div>
                )}
              </div>
              <div className="media-edit-fields">
                <label>
                  Title
                  <input
                    type="text"
                    value={editingMedia.title || ''}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      title: e.target.value
                    })}
                    placeholder={editingMedia.filename}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={editingMedia.description || ''}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      description: e.target.value
                    })}
                    placeholder="Add a description..."
                    rows={3}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={editingMedia.type || 'photo'}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      type: e.target.value
                    })}
                  >
                    {Object.entries(MEDIA_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Date Taken
                  <input
                    type="date"
                    value={editingMedia.date_taken || ''}
                    onChange={(e) => setEditingMedia({
                      ...editingMedia,
                      date_taken: e.target.value
                    })}
                  />
                </label>
              </div>
              <div className="delete-confirm-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingMedia(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaLibrary;

/**
 * MediaPanelContent - Embedded panel version for LibraryPanel
 * Simplified view with draggable items for drag-and-drop to PersonView
 */
export function MediaPanelContent({ onOpenFullLibrary }) {
  const { isOpen } = useDatabase();
  const { getAllMedia, importAndCreateMedia } = useMedia();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Load all media
  useEffect(() => {
    if (!isOpen) {
      setMedia([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getAllMedia()
      .then(items => setMedia(items || []))
      .catch(err => console.error('Error loading media:', err))
      .finally(() => setLoading(false));
  }, [isOpen, getAllMedia]);

  // Refresh media list
  const refreshMedia = async () => {
    try {
      const items = await getAllMedia();
      setMedia(items || []);
    } catch (err) {
      console.error('Error refreshing media:', err);
    }
  };

  // Import new media
  const handleImport = async (type) => {
    try {
      const imported = await importAndCreateMedia(type);
      if (imported && imported.length > 0) {
        await refreshMedia();
      }
    } catch (err) {
      console.error('Error importing media:', err);
    }
  };

  // Handle drag start
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/heritage-media', JSON.stringify({
      type: 'media',
      id: item.id,
      mediaType: item.type,
      filename: item.filename,
      title: item.title,
      thumbnailFullPath: item.thumbnailFullPath,
      fullPath: item.fullPath,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  // Filter and search media
  const filteredMedia = media.filter(item => {
    if (filter !== 'all' && item.type !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        item.filename,
        item.title,
        item.description,
        item.linked_persons,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    }
    return true;
  });

  const mediaTypes = [...new Set(media.map(m => m.type))].filter(Boolean);

  // Get media icon
  const getMediaIcon = (type) => {
    switch (type) {
      case 'document': return '📄';
      case 'certificate': return '📜';
      case 'headstone': return '🪦';
      case 'newspaper': return '📰';
      case 'map': return '🗺️';
      default: return '📷';
    }
  };

  if (!isOpen) {
    return (
      <div className="media-panel-content">
        <div className="panel-empty">Open a bundle to view media</div>
      </div>
    );
  }

  return (
    <div className="media-panel-content">
      <div className="panel-search">
        <input
          type="text"
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="panel-toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          {mediaTypes.map(type => (
            <option key={type} value={type}>
              {MEDIA_TYPES[type] || type}
            </option>
          ))}
        </select>
        <button onClick={() => handleImport('photos')}>+ Photo</button>
        <button onClick={() => handleImport('documents')}>+ Doc</button>
        {onOpenFullLibrary && (
          <button
            className="btn-secondary btn-small"
            onClick={onOpenFullLibrary}
            title="Open full library to manage media"
          >
            Manage
          </button>
        )}
      </div>

      <div className="panel-stats">
        {loading ? 'Loading...' : `${filteredMedia.length} items`}
      </div>

      <div className="panel-list">
        {loading ? (
          <div className="panel-loading">Loading media...</div>
        ) : filteredMedia.length === 0 ? (
          <div className="panel-empty">
            {media.length === 0 ? (
              <>
                <p>No media</p>
                <p className="panel-empty-hint">Import photos or documents</p>
              </>
            ) : (
              <p>No matches</p>
            )}
          </div>
        ) : (
          <div className="media-grid">
            {filteredMedia.map(item => {
              // Build tooltip with tagged person names
              const tooltipParts = [`Click to view/edit, drag to link: ${item.title || item.filename}`];
              if (item.tagged_faces) {
                tooltipParts.push(`Tagged: ${item.tagged_faces}`);
              }
              const tooltip = tooltipParts.join('\n');

              return (
                <div
                  key={item.id}
                  className="media-item"
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedMedia(item)}
                  title={tooltip}
                >
                  {item.thumbnailFullPath || item.fullPath ? (
                    <img
                      src={item.thumbnailFullPath || item.fullPath}
                      alt={item.title || item.filename}
                      loading="lazy"
                    />
                  ) : (
                    <div className="media-item-icon">
                      {getMediaIcon(item.type)}
                    </div>
                  )}
                  <div className="media-item-badges">
                    {item.face_count > 0 && (
                      <span className="media-badge face-badge" title={item.tagged_faces || 'Tagged faces'}>
                        {item.face_count}
                      </span>
                    )}
                    {item.citation_count > 0 && (
                      <span className="media-badge citation-badge" title="Citations">
                        {item.citation_count}
                      </span>
                    )}
                  </div>
                  <div className="media-item-label">
                    {item.title || item.filename}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedMedia && (
        <PhotoViewer
          mediaId={selectedMedia.id}
          imageSrc={selectedMedia.fullPath}
          mediaPath={selectedMedia.path}
          onClose={() => {
            setSelectedMedia(null);
            refreshMedia(); // Refresh in case faces were tagged
          }}
        />
      )}
    </div>
  );
}
