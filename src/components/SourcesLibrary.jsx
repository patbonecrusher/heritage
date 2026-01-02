/**
 * SourcesLibrary - Component for viewing and managing sources
 */

import { useState, useEffect } from 'react';
import { useSources, SOURCE_TYPES, COMMON_SOURCES } from '../data/useSources';
import { useDatabase } from '../data/DatabaseContext';
import './SourcesLibrary.css';

export function SourcesLibrary({ onClose }) {
  const { isOpen, triggerRefresh } = useDatabase();
  const { sources, loading, createSource, updateSource, deleteSource } = useSources();

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSource, setEditingSource] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // New source form state
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'website',
    url: '',
    author: '',
    publisher: '',
    repository: '',
    notes: '',
  });

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAddDialog) {
          setShowAddDialog(false);
        } else if (editingSource) {
          setEditingSource(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showAddDialog, editingSource]);

  // Filter and search sources
  const filteredSources = sources.filter(source => {
    if (filter !== 'all' && source.type !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        source.name,
        source.url,
        source.author,
        source.publisher,
        source.repository,
        source.notes,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    }
    return true;
  });

  // Handle create source
  const handleCreate = async () => {
    if (!newSource.name.trim()) return;

    try {
      await createSource(newSource);
      setShowAddDialog(false);
      setNewSource({
        name: '',
        type: 'website',
        url: '',
        author: '',
        publisher: '',
        repository: '',
        notes: '',
      });
      triggerRefresh();
    } catch (err) {
      console.error('Error creating source:', err);
    }
  };

  // Handle update source
  const handleUpdate = async () => {
    if (!editingSource || !editingSource.name.trim()) return;

    try {
      await updateSource(editingSource.id, editingSource);
      setEditingSource(null);
      triggerRefresh();
    } catch (err) {
      console.error('Error updating source:', err);
    }
  };

  // Handle delete source
  const handleDelete = async (source) => {
    try {
      await deleteSource(source.id);
      setDeleteConfirm(null);
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting source:', err);
    }
  };

  // Add common source
  const handleAddCommon = async (common) => {
    try {
      await createSource(common);
      triggerRefresh();
    } catch (err) {
      console.error('Error adding common source:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'website': return '🌐';
      case 'book': return '📕';
      case 'document': return '📄';
      case 'certificate': return '📜';
      case 'photo': return '📷';
      case 'oral': return '🎙️';
      case 'archive': return '🏛️';
      case 'newspaper': return '📰';
      case 'church_record': return '⛪';
      case 'government_record': return '🏛️';
      default: return '📋';
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog sources-library" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Sources Library</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="sources-library-toolbar">
          <input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sources-search-input"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sources-filter-select"
          >
            <option value="all">All Types</option>
            {Object.entries(SOURCE_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setShowAddDialog(true)}>
            + Add Source
          </button>
        </div>

        {/* Quick add common sources */}
        <div className="sources-common">
          <span className="sources-common-label">Quick add:</span>
          {COMMON_SOURCES.filter(c => !sources.some(s => s.name === c.name)).map(common => (
            <button
              key={common.name}
              className="sources-common-btn"
              onClick={() => handleAddCommon(common)}
              title={common.url}
            >
              + {common.name}
            </button>
          ))}
        </div>

        <div className="sources-library-content">
          {loading ? (
            <div className="sources-loading">Loading sources...</div>
          ) : filteredSources.length === 0 ? (
            <div className="sources-empty">
              {searchQuery ? 'No matching sources found' : 'No sources yet. Add one above!'}
            </div>
          ) : (
            <div className="sources-list">
              {filteredSources.map(source => (
                <div key={source.id} className="source-item">
                  <div className="source-icon">{getTypeIcon(source.type)}</div>
                  <div className="source-info">
                    <div className="source-name">{source.name}</div>
                    <div className="source-meta">
                      <span className="source-type">{SOURCE_TYPES[source.type] || source.type}</span>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-url"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit
                        </a>
                      )}
                      {source.author && <span className="source-author">by {source.author}</span>}
                    </div>
                  </div>
                  <div className="source-actions">
                    <button
                      className="source-action-btn"
                      onClick={() => setEditingSource({ ...source })}
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className="source-action-btn danger"
                      onClick={() => setDeleteConfirm(source)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <span className="sources-count">{filteredSources.length} source{filteredSources.length !== 1 ? 's' : ''}</span>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Add Source Dialog */}
      {showAddDialog && (
        <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
          <div className="dialog source-edit-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Add Source</h3>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="field-label">Name *</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="text-input"
                  placeholder="Source name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="field-label">Type</label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                  className="text-input"
                >
                  {Object.entries(SOURCE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="field-label">URL</label>
                <input
                  type="text"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="text-input"
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label className="field-label">Author</label>
                <input
                  type="text"
                  value={newSource.author}
                  onChange={(e) => setNewSource({ ...newSource, author: e.target.value })}
                  className="text-input"
                  placeholder="Author name"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Publisher / Repository</label>
                <input
                  type="text"
                  value={newSource.repository}
                  onChange={(e) => setNewSource({ ...newSource, repository: e.target.value })}
                  className="text-input"
                  placeholder="Publisher or repository name"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Notes</label>
                <textarea
                  value={newSource.notes}
                  onChange={(e) => setNewSource({ ...newSource, notes: e.target.value })}
                  className="textarea-input"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setShowAddDialog(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newSource.name.trim()}
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Source Dialog */}
      {editingSource && (
        <div className="dialog-overlay" onClick={() => setEditingSource(null)}>
          <div className="dialog source-edit-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Edit Source</h3>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="field-label">Name *</label>
                <input
                  type="text"
                  value={editingSource.name}
                  onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                  className="text-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="field-label">Type</label>
                <select
                  value={editingSource.type}
                  onChange={(e) => setEditingSource({ ...editingSource, type: e.target.value })}
                  className="text-input"
                >
                  {Object.entries(SOURCE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="field-label">URL</label>
                <input
                  type="text"
                  value={editingSource.url || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, url: e.target.value })}
                  className="text-input"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Author</label>
                <input
                  type="text"
                  value={editingSource.author || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, author: e.target.value })}
                  className="text-input"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Publisher / Repository</label>
                <input
                  type="text"
                  value={editingSource.repository || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, repository: e.target.value })}
                  className="text-input"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Notes</label>
                <textarea
                  value={editingSource.notes || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, notes: e.target.value })}
                  className="textarea-input"
                  rows={3}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setEditingSource(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdate}
                disabled={!editingSource.name.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="dialog-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="dialog delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Delete Source</h3>
            </div>
            <div className="dialog-body">
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <p className="delete-warning">This will also remove all citations linked to this source.</p>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SourcesPanelContent - Compact view for the library panel
 */
export function SourcesPanelContent({ onOpenFullLibrary }) {
  const { isOpen, triggerRefresh } = useDatabase();
  const { sources, loading, createSource } = useSources();

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sources
  const filteredSources = sources.filter(source => {
    if (filter !== 'all' && source.type !== filter) {
      return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return source.name.toLowerCase().includes(query) ||
           (source.url && source.url.toLowerCase().includes(query));
  });

  const sourceTypes = [...new Set(sources.map(s => s.type))].filter(Boolean);

  // Handle drag start for sources
  const handleDragStart = (e, source) => {
    e.dataTransfer.setData('application/heritage-source', JSON.stringify({
      type: 'source',
      id: source.id,
      name: source.name,
      sourceType: source.type,
      url: source.url,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  // Add common source
  const handleAddCommon = async (common) => {
    try {
      await createSource(common);
      triggerRefresh();
    } catch (err) {
      console.error('Error adding common source:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'website': return '🌐';
      case 'book': return '📕';
      case 'document': return '📄';
      case 'certificate': return '📜';
      case 'archive': return '🏛️';
      case 'church_record': return '⛪';
      default: return '📋';
    }
  };

  if (!isOpen) {
    return (
      <div className="sources-panel-content">
        <div className="panel-empty">Open a bundle to view sources</div>
      </div>
    );
  }

  return (
    <div className="sources-panel-content">
      <div className="panel-search">
        <input
          type="text"
          placeholder="Search sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="panel-toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {sourceTypes.map(type => (
            <option key={type} value={type}>
              {SOURCE_TYPES[type] || type}
            </option>
          ))}
        </select>
        {/* Quick add dropdown for common sources */}
        {COMMON_SOURCES.filter(c => !sources.some(s => s.name === c.name)).length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const common = COMMON_SOURCES.find(c => c.name === e.target.value);
                if (common) handleAddCommon(common);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ Add</option>
            {COMMON_SOURCES.filter(c => !sources.some(s => s.name === c.name)).map(common => (
              <option key={common.name} value={common.name}>
                {common.name}
              </option>
            ))}
          </select>
        )}
        {onOpenFullLibrary && (
          <button
            className="btn-secondary btn-small"
            onClick={onOpenFullLibrary}
            title="Open full library to manage sources"
          >
            Manage
          </button>
        )}
      </div>

      <div className="panel-stats">
        {loading ? 'Loading...' : `${filteredSources.length} sources`}
      </div>

      <div className="panel-list">
        {loading ? (
          <div className="panel-loading">Loading sources...</div>
        ) : filteredSources.length === 0 ? (
          <div className="panel-empty">
            {sources.length === 0 ? (
              <>
                <p>No sources</p>
                <p className="panel-empty-hint">Add sources in full library view</p>
              </>
            ) : (
              <p>No matches</p>
            )}
          </div>
        ) : (
          filteredSources.map(source => (
            <div
              key={source.id}
              className="source-item"
              draggable
              onDragStart={(e) => handleDragStart(e, source)}
              onDragEnd={handleDragEnd}
              title={source.url || source.name}
            >
              <span className="source-icon">{getTypeIcon(source.type)}</span>
              <div className="source-info">
                <span className="source-name">{source.name}</span>
                {source.type && (
                  <span className="source-type">{SOURCE_TYPES[source.type] || source.type}</span>
                )}
              </div>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↗
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SourcesLibrary;
