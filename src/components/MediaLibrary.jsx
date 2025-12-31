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
  const { getAllMedia, importAndCreateMedia, deleteMediaRecord } = useMedia();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all'); // all, photo, document, etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // media item to delete

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
    <div className="media-library-overlay">
      <div className="media-library">
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
                      {item.linked_persons && (
                        <span className="media-item-persons">
                          {item.linked_persons}
                        </span>
                      )}
                    </div>
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
      </div>
    </div>
  );
}

export default MediaLibrary;
