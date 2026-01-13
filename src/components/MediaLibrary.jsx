/**
 * MediaLibrary - Component for viewing all media in the database
 */

import { useState, useEffect } from 'react';
import { useMedia, MEDIA_TYPES } from '../data/useMedia';
import { useDatabase } from '../data/DatabaseContext';
import PhotoViewer from './PhotoViewer';
import './MediaLibrary.css';

// Icons for media types
const MEDIA_ICONS = {
  photo: '📷',
  document: '📄',
  certificate: '📜',
  headstone: '🪦',
  newspaper: '📰',
  map: '🗺️',
  other: '📎'
};

// Check if media can be displayed as an image
const isDisplayableImage = (item) => {
  // Explicitly reject PDFs and documents by extension first
  const ext = item.path?.split('.').pop()?.toLowerCase() || item.filename?.split('.').pop()?.toLowerCase();

  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx'].includes(ext)) {
    return false;
  }

  // Reject by mime type
  if (item.mime_type === 'application/pdf') return false;
  if (item.mime_type?.startsWith('application/')) return false;

  // Check for image types
  if (item.mime_type?.startsWith('image/')) return true;
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
};

// Get icon for media item
const getMediaIcon = (item) => {
  // Check mime type first for non-image files
  if (item.mime_type === 'application/pdf') return '📄';
  if (item.mime_type?.startsWith('application/')) return '📄';

  // Check extension for legacy data
  const ext = item.path?.split('.').pop()?.toLowerCase() || item.filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return '📄';

  return MEDIA_ICONS[item.type] || MEDIA_ICONS.other;
};

export function MediaLibrary({ onClose }) {
  const { isOpen, triggerRefresh } = useDatabase();
  const { getAllMedia, importAndCreateMedia, deleteMediaRecord, updateMedia } = useMedia();

  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all'); // all, photo, document, etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // media item to delete
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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
    <div
      className="media-library-overlay"
      onWheel={e => e.stopPropagation()}
      onClick={(e) => {
        
        onClose();
      }}
    >
      <div className="media-library" onClick={e => e.stopPropagation()}>
        <div className="media-library-header">
          <h2>Media Library</h2>
          <button
            className="media-library-close"
            onClick={() => {
              
              onClose();
            }}
          >
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

          <div className="media-library-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ▦
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
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
          ) : viewMode === 'grid' ? (
            <div className="media-library-grid">
              {filteredMedia.map(item => (
                <div key={item.id} className="media-library-item">
                  <button
                    className="media-item-main"
                    onClick={() => setSelectedMedia(item)}
                    title={item.filename}
                  >
                    <div className="media-item-preview">
                      {isDisplayableImage(item) && (item.thumbnailFullPath || item.fullPath) ? (
                        <img
                          src={item.thumbnailFullPath || item.fullPath}
                          alt={item.title || item.filename}
                          loading="lazy"
                        />
                      ) : (
                        <div className="media-item-icon">
                          {getMediaIcon(item)}
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
                      setSelectedMedia(item);
                    }}
                    title="View & Edit"
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
          ) : (
            <div className="media-library-list">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  className="media-list-item"
                  onClick={() => setSelectedMedia(item)}
                >
                  <div className="media-list-thumbnail">
                    {isDisplayableImage(item) && (item.thumbnailFullPath || item.fullPath) ? (
                      <img
                        src={item.thumbnailFullPath || item.fullPath}
                        alt={item.title || item.filename}
                        loading="lazy"
                      />
                    ) : (
                      <div className="media-item-icon">
                        {getMediaIcon(item)}
                      </div>
                    )}
                  </div>
                  <div className="media-list-info">
                    <div className="media-list-title">
                      {item.title || item.filename}
                    </div>
                    <div className="media-list-filename">
                      {item.filename}
                    </div>
                    {item.description && (
                      <div className="media-list-description">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="media-list-meta">
                    <span className="media-list-type">
                      {MEDIA_TYPES[item.type] || item.type}
                    </span>
                    {item.date_taken && (
                      <span className="media-list-date">{item.date_taken}</span>
                    )}
                    {item.linked_persons && (
                      <span className="media-list-persons">{item.linked_persons}</span>
                    )}
                  </div>
                  <div className="media-list-badges">
                    {item.face_count > 0 && (
                      <span className="media-badge face-badge">{item.face_count}</span>
                    )}
                    {item.citation_count > 0 && (
                      <span className="media-badge citation-badge">{item.citation_count}</span>
                    )}
                  </div>
                  <div className="media-list-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMedia(item);
                      }}
                      title="View & Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(item);
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
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
            title={selectedMedia.title}
            filename={selectedMedia.filename}
            mediaType={selectedMedia.type}
            mimeType={selectedMedia.mime_type}
            description={selectedMedia.description}
            dateTaken={selectedMedia.date_taken}
            onClose={() => {
              setSelectedMedia(null);
              refreshMedia(); // Refresh in case data was changed
            }}
            hasNext={filteredMedia.findIndex(m => m.id === selectedMedia.id) < filteredMedia.length - 1}
            hasPrevious={filteredMedia.findIndex(m => m.id === selectedMedia.id) > 0}
            onNext={() => {
              const currentIndex = filteredMedia.findIndex(m => m.id === selectedMedia.id);
              if (currentIndex < filteredMedia.length - 1) {
                setSelectedMedia(filteredMedia[currentIndex + 1]);
              }
            }}
            onPrevious={() => {
              const currentIndex = filteredMedia.findIndex(m => m.id === selectedMedia.id);
              if (currentIndex > 0) {
                setSelectedMedia(filteredMedia[currentIndex - 1]);
              }
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
    if (filter !== 'all') {
      if (filter === 'photo') {
        // Show images only
        if (!isDisplayableImage(item)) return false;
      } else if (filter === 'document') {
        // Show non-images only
        if (isDisplayableImage(item)) return false;
      } else if (item.type !== filter) {
        return false;
      }
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
        <div className="panel-filter-buttons">
          <button
            className={`panel-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`panel-filter-btn ${filter === 'photo' ? 'active' : ''}`}
            onClick={() => setFilter('photo')}
          >
            📷
          </button>
          <button
            className={`panel-filter-btn ${filter === 'document' ? 'active' : ''}`}
            onClick={() => setFilter('document')}
          >
            📄
          </button>
        </div>
        <div className="panel-toolbar-actions">
          <button onClick={() => handleImport('photos')} title="Add Photo">+📷</button>
          <button onClick={() => handleImport('documents')} title="Add Document">+📄</button>
          {onOpenFullLibrary && (
            <button
              onClick={onOpenFullLibrary}
              title="Open full library"
            >
              ⚙
            </button>
          )}
        </div>
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
                  {isDisplayableImage(item) ? (
                    <img
                      src={item.thumbnailFullPath || item.fullPath}
                      alt={item.title || item.filename}
                      loading="lazy"
                    />
                  ) : (
                    <div className="media-item-icon">
                      {getMediaIcon(item)}
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
          title={selectedMedia.title}
          filename={selectedMedia.filename}
          mediaType={selectedMedia.type}
          mimeType={selectedMedia.mime_type}
          description={selectedMedia.description}
          dateTaken={selectedMedia.date_taken}
          onClose={() => {
            setSelectedMedia(null);
            refreshMedia(); // Refresh in case faces were tagged
          }}
          hasNext={filteredMedia.findIndex(m => m.id === selectedMedia.id) < filteredMedia.length - 1}
          hasPrevious={filteredMedia.findIndex(m => m.id === selectedMedia.id) > 0}
          onNext={() => {
            const currentIndex = filteredMedia.findIndex(m => m.id === selectedMedia.id);
            if (currentIndex < filteredMedia.length - 1) {
              setSelectedMedia(filteredMedia[currentIndex + 1]);
            }
          }}
          onPrevious={() => {
            const currentIndex = filteredMedia.findIndex(m => m.id === selectedMedia.id);
            if (currentIndex > 0) {
              setSelectedMedia(filteredMedia[currentIndex - 1]);
            }
          }}
        />
      )}
    </div>
  );
}
