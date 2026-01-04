/**
 * NotesSection - Display and manage notes for any entity
 */

import { useState, useEffect, useCallback } from 'react';
import { useNotes } from '../data/useNotes';
import { useDatabase } from '../data/DatabaseContext';
import './NotesSection.css';

export function NotesSection({
  entityType,
  entityId,
  compact = false,
  showAddButton = true,
  externalAddTrigger = false,
  onAddingChange,
}) {
  const { isOpen, refreshTrigger } = useDatabase();
  const { getNotesForEntity, createNote, updateNote, deleteNote } = useNotes();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editNote, setEditNote] = useState({ title: '', content: '' });

  // Load notes
  useEffect(() => {
    if (!entityId || !isOpen) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getNotesForEntity(entityType, entityId)
      .then(setNotes)
      .catch(err => console.error('Error loading notes:', err))
      .finally(() => setLoading(false));
  }, [entityType, entityId, isOpen, getNotesForEntity, refreshTrigger]);

  // Respond to external add trigger
  useEffect(() => {
    if (externalAddTrigger) {
      setIsAdding(true);
    }
  }, [externalAddTrigger]);

  // Notify parent when adding state changes
  useEffect(() => {
    onAddingChange?.(isAdding);
  }, [isAdding, onAddingChange]);

  // Refresh notes
  const refreshNotes = async () => {
    const updated = await getNotesForEntity(entityType, entityId);
    setNotes(updated);
  };

  // Add new note
  const handleAdd = async () => {
    if (!newNote.content.trim()) return;

    try {
      await createNote({
        entity_type: entityType,
        entity_id: entityId,
        title: newNote.title.trim() || null,
        content: newNote.content.trim(),
      });
      setNewNote({ title: '', content: '' });
      setIsAdding(false);
      await refreshNotes();
    } catch (err) {
      console.error('Error creating note:', err);
    }
  };

  // Start editing
  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditNote({ title: note.title || '', content: note.content });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editNote.content.trim()) return;

    try {
      await updateNote(editingId, {
        title: editNote.title.trim() || null,
        content: editNote.content.trim(),
      });
      setEditingId(null);
      setEditNote({ title: '', content: '' });
      await refreshNotes();
    } catch (err) {
      console.error('Error updating note:', err);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote({ title: '', content: '' });
  };

  // Delete note
  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;

    try {
      await deleteNote(id);
      await refreshNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  if (loading) {
    return <div className="notes-section-loading">Loading notes...</div>;
  }

  return (
    <div className={`notes-section ${compact ? 'compact' : ''}`}>
      {/* Notes List */}
      {notes.length > 0 && (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-item">
              {editingId === note.id ? (
                // Edit mode
                <div className="note-edit-form">
                  <input
                    type="text"
                    className="note-title-input"
                    placeholder="Title (optional)"
                    value={editNote.title}
                    onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                  />
                  <textarea
                    className="note-content-input"
                    placeholder="Note content..."
                    value={editNote.content}
                    onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
                    rows={3}
                    autoFocus
                  />
                  <div className="note-form-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-small"
                      onClick={handleSaveEdit}
                      disabled={!editNote.content.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="note-header">
                    {note.title && <span className="note-title">{note.title}</span>}
                    <span className="note-header-spacer" />
                    <span className="note-date">{formatDate(note.created_at)}</span>
                    <div className="note-actions">
                      <button
                        type="button"
                        className="note-action-btn"
                        onClick={() => handleStartEdit(note)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="note-action-btn note-delete-btn"
                        onClick={() => handleDelete(note.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="note-content">{note.content}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Note Form */}
      {isAdding ? (
        <div className="note-add-form">
          <input
            type="text"
            className="note-title-input"
            placeholder="Title (optional)"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
          />
          <textarea
            className="note-content-input"
            placeholder="Write a note..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={3}
            autoFocus
          />
          <div className="note-form-actions">
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => {
                setIsAdding(false);
                setNewNote({ title: '', content: '' });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-small"
              onClick={handleAdd}
              disabled={!newNote.content.trim()}
            >
              Add Note
            </button>
          </div>
        </div>
      ) : showAddButton ? (
        <button
          type="button"
          className="note-add-btn"
          onClick={() => setIsAdding(true)}
        >
          + Add Note
        </button>
      ) : null}

      {/* Empty state */}
      {notes.length === 0 && !isAdding && (
        <div className="notes-empty">No notes yet</div>
      )}
    </div>
  );
}

export default NotesSection;
