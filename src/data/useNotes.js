/**
 * useNotes - Hook for managing notes on any entity
 */

import { useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

// Entity types that can have notes
export const NOTE_ENTITY_TYPES = {
  person: 'person',
  event: 'event',
  union: 'union',
  media: 'media',
  place: 'place',
  source: 'source',
  citation: 'citation',
};

export function useNotes() {
  const { query, get, run } = useDatabase();

  // Get all notes for an entity
  const getNotesForEntity = useCallback(async (entityType, entityId) => {
    return await query(`
      SELECT * FROM note
      WHERE entity_type = ? AND entity_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [entityType, entityId]);
  }, [query]);

  // Get a single note by ID
  const getNote = useCallback(async (id) => {
    return await get('SELECT * FROM note WHERE id = ? AND deleted_at IS NULL', [id]);
  }, [get]);

  // Create a new note
  const createNote = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO note (
        id, entity_type, entity_id, title, content, is_private,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.entity_type,
      data.entity_id,
      data.title || null,
      data.content,
      data.is_private ? 1 : 0,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Update an existing note
  const updateNote = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.is_private !== undefined) {
      fields.push('is_private = ?');
      values.push(data.is_private ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE note SET ${fields.join(', ')} WHERE id = ?`, values);
  }, [run]);

  // Delete a note (soft delete)
  const deleteNote = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE note SET deleted_at = ? WHERE id = ?', [now, id]);
  }, [run]);

  // Get note count for an entity
  const getNoteCount = useCallback(async (entityType, entityId) => {
    const result = await get(`
      SELECT COUNT(*) as count FROM note
      WHERE entity_type = ? AND entity_id = ? AND deleted_at IS NULL
    `, [entityType, entityId]);
    return result?.count || 0;
  }, [get]);

  // Get all notes for multiple entities (batch query)
  const getNotesForEntities = useCallback(async (entityType, entityIds) => {
    if (!entityIds || entityIds.length === 0) return {};

    const placeholders = entityIds.map(() => '?').join(',');
    const rows = await query(`
      SELECT * FROM note
      WHERE entity_type = ? AND entity_id IN (${placeholders}) AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [entityType, ...entityIds]);

    // Group by entity_id
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.entity_id]) {
        grouped[row.entity_id] = [];
      }
      grouped[row.entity_id].push(row);
    }
    return grouped;
  }, [query]);

  return {
    getNotesForEntity,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    getNoteCount,
    getNotesForEntities,
    NOTE_ENTITY_TYPES,
  };
}

export default useNotes;
