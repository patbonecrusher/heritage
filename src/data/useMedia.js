/**
 * useMedia - Hook for media and face tagging operations
 */

import { useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

// Media types
export const MEDIA_TYPES = {
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

export function useMedia() {
  const { query, get, run, importMedia, resolveMediaPath, deleteMedia: deleteMediaFile } = useDatabase();

  // Get media by ID
  const getMedia = useCallback(async (id) => {
    const media = await get('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL', [id]);
    if (media && media.path) {
      media.fullPath = await resolveMediaPath(media.path);
      if (media.thumbnail_path) {
        media.thumbnailFullPath = await resolveMediaPath(media.thumbnail_path);
      }
    }
    return media;
  }, [get, resolveMediaPath]);

  // Get all media for a person
  const getMediaForPerson = useCallback(async (personId) => {
    const rows = await query(`
      SELECT m.*, ml.is_primary, ml.notes as link_notes, ml.page_number
      FROM media m
      JOIN media_link ml ON m.id = ml.media_id
      WHERE ml.person_id = ? AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
      ORDER BY ml.is_primary DESC, ml.sort_order, m.created_at
    `, [personId]);

    // Resolve paths
    for (const media of rows) {
      if (media.path) {
        media.fullPath = await resolveMediaPath(media.path);
      }
      if (media.thumbnail_path) {
        media.thumbnailFullPath = await resolveMediaPath(media.thumbnail_path);
      }
    }

    return rows;
  }, [query, resolveMediaPath]);

  // Get all media for an event
  const getMediaForEvent = useCallback(async (eventId) => {
    const rows = await query(`
      SELECT m.*, ml.notes as link_notes, ml.page_number, ml.page_range_start, ml.page_range_end
      FROM media m
      JOIN media_link ml ON m.id = ml.media_id
      WHERE ml.event_id = ? AND ml.deleted_at IS NULL AND m.deleted_at IS NULL
      ORDER BY ml.sort_order, m.created_at
    `, [eventId]);

    for (const media of rows) {
      if (media.path) {
        media.fullPath = await resolveMediaPath(media.path);
      }
      if (media.thumbnail_path) {
        media.thumbnailFullPath = await resolveMediaPath(media.thumbnail_path);
      }
    }

    return rows;
  }, [query, resolveMediaPath]);

  // Import and create media record
  const importAndCreateMedia = useCallback(async (type = 'photos', metadata = {}) => {
    const imported = await importMedia(type);
    if (!imported || imported.length === 0) return null;

    const results = [];
    const now = new Date().toISOString();

    for (const file of imported) {
      const id = file.id; // UUID from bundle-manager

      await run(`
        INSERT INTO media (
          id, path, thumbnail_path, filename, type, mime_type,
          title, description, date_taken, source_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        file.path,
        file.thumbnailPath || null,
        file.filename,
        type === 'photos' ? 'photo' : type === 'documents' ? 'document' : 'other',
        file.mimeType,
        metadata.title || null,
        metadata.description || null,
        metadata.date_taken || null,
        metadata.source_id || null,
        now,
        now,
      ]);

      results.push({ id, ...file });
    }

    return results;
  }, [importMedia, run]);

  // Create media record for external URL
  const createExternalMedia = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO media (
        id, external_url, type, title, description,
        external_source, requires_auth, source_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.external_url,
      data.type || 'document',
      data.title || null,
      data.description || null,
      data.external_source || 'other',
      data.requires_auth ? 1 : 0,
      data.source_id || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Link media to an entity
  const linkMedia = useCallback(async (mediaId, data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO media_link (
        id, media_id, person_id, event_id, union_id, place_id, citation_id,
        is_primary, sort_order, notes, page_number, page_range_start, page_range_end,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      mediaId,
      data.person_id || null,
      data.event_id || null,
      data.union_id || null,
      data.place_id || null,
      data.citation_id || null,
      data.is_primary ? 1 : 0,
      data.sort_order || null,
      data.notes || null,
      data.page_number || null,
      data.page_range_start || null,
      data.page_range_end || null,
      now,
    ]);

    return id;
  }, [run]);

  // Unlink media from an entity
  const unlinkMedia = useCallback(async (mediaId, entityType, entityId) => {
    const now = new Date().toISOString();
    const column = `${entityType}_id`;
    await run(`
      UPDATE media_link SET deleted_at = ?
      WHERE media_id = ? AND ${column} = ?
    `, [now, mediaId, entityId]);
  }, [run]);

  // Set primary photo for a person
  const setPrimaryPhoto = useCallback(async (personId, mediaId) => {
    // Update person's primary_photo_id
    await run('UPDATE person SET primary_photo_id = ?, updated_at = ? WHERE id = ?',
      [mediaId, new Date().toISOString(), personId]);

    // Update media_link is_primary flags
    await run(`
      UPDATE media_link SET is_primary = 0
      WHERE person_id = ? AND is_primary = 1
    `, [personId]);

    if (mediaId) {
      await run(`
        UPDATE media_link SET is_primary = 1
        WHERE person_id = ? AND media_id = ?
      `, [personId, mediaId]);
    }
  }, [run]);

  // Delete media (soft delete record, optionally delete file)
  const deleteMediaRecord = useCallback(async (id, deleteFile = false) => {
    const media = await getMedia(id);
    if (!media) return;

    const now = new Date().toISOString();

    // Soft delete record
    await run('UPDATE media SET deleted_at = ? WHERE id = ?', [now, id]);

    // Delete file if requested
    if (deleteFile && media.path) {
      await deleteMediaFile(media.path);
      if (media.thumbnail_path) {
        await deleteMediaFile(media.thumbnail_path);
      }
    }
  }, [getMedia, run, deleteMediaFile]);

  // ============================================
  // Face Tagging
  // ============================================

  // Get face tags for a media
  const getFaceTags = useCallback(async (mediaId) => {
    return await query(`
      SELECT ft.*, p.given_names, p.surname
      FROM face_tag ft
      LEFT JOIN person p ON ft.person_id = p.id
      WHERE ft.media_id = ? AND ft.deleted_at IS NULL
    `, [mediaId]);
  }, [query]);

  // Create a face tag
  const createFaceTag = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO face_tag (
        id, media_id, person_id, x, y, width, height,
        polygon, label, confidence, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.media_id,
      data.person_id || null,
      data.x,
      data.y,
      data.width,
      data.height,
      data.polygon ? JSON.stringify(data.polygon) : null,
      data.label || null,
      data.confidence || 'unknown',
      data.notes || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Update a face tag
  const updateFaceTag = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (data.person_id !== undefined) {
      fields.push('person_id = ?');
      values.push(data.person_id);
    }
    if (data.x !== undefined) {
      fields.push('x = ?');
      values.push(data.x);
    }
    if (data.y !== undefined) {
      fields.push('y = ?');
      values.push(data.y);
    }
    if (data.width !== undefined) {
      fields.push('width = ?');
      values.push(data.width);
    }
    if (data.height !== undefined) {
      fields.push('height = ?');
      values.push(data.height);
    }
    if (data.label !== undefined) {
      fields.push('label = ?');
      values.push(data.label);
    }
    if (data.confidence !== undefined) {
      fields.push('confidence = ?');
      values.push(data.confidence);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE face_tag SET ${fields.join(', ')} WHERE id = ?`, values);
  }, [run]);

  // Delete a face tag
  const deleteFaceTag = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE face_tag SET deleted_at = ? WHERE id = ?', [now, id]);
  }, [run]);

  // Get all media where a person is tagged
  const getMediaWithPerson = useCallback(async (personId) => {
    const rows = await query(`
      SELECT DISTINCT m.*, ft.x, ft.y, ft.width, ft.height
      FROM media m
      JOIN face_tag ft ON m.id = ft.media_id
      WHERE ft.person_id = ? AND ft.deleted_at IS NULL AND m.deleted_at IS NULL
    `, [personId]);

    for (const media of rows) {
      if (media.path) {
        media.fullPath = await resolveMediaPath(media.path);
      }
      if (media.thumbnail_path) {
        media.thumbnailFullPath = await resolveMediaPath(media.thumbnail_path);
      }
    }

    return rows;
  }, [query, resolveMediaPath]);

  return {
    // Core operations
    getMedia,
    getMediaForPerson,
    getMediaForEvent,
    importAndCreateMedia,
    createExternalMedia,
    linkMedia,
    unlinkMedia,
    setPrimaryPhoto,
    deleteMediaRecord,

    // Face tagging
    getFaceTags,
    createFaceTag,
    updateFaceTag,
    deleteFaceTag,
    getMediaWithPerson,

    // Constants
    MEDIA_TYPES,
  };
}

export default useMedia;
