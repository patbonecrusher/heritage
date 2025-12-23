/**
 * useSources - Hook for sources and citations CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

// Source types
export const SOURCE_TYPES = {
  website: 'Website',
  book: 'Book',
  document: 'Document',
  certificate: 'Certificate',
  photo: 'Photo',
  oral: 'Oral History',
  archive: 'Archive',
  newspaper: 'Newspaper',
  church_record: 'Church Record',
  government_record: 'Government Record',
  other: 'Other',
};

// Common online sources
export const COMMON_SOURCES = [
  { name: 'FamilySearch', url: 'https://familysearch.org', type: 'website' },
  { name: 'Ancestry', url: 'https://ancestry.com', type: 'website' },
  { name: 'GénéalogieQuébec', url: 'https://genealogiequebec.com', type: 'website' },
  { name: 'BAnQ', url: 'https://banq.qc.ca', type: 'archive' },
  { name: 'FindAGrave', url: 'https://findagrave.com', type: 'website' },
  { name: 'MyHeritage', url: 'https://myheritage.com', type: 'website' },
];

// Confidence levels
export const CONFIDENCE_LEVELS = {
  certain: 'Certain',
  probable: 'Probable',
  possible: 'Possible',
  uncertain: 'Uncertain',
};

export function useSources() {
  const { query, get, run, isOpen } = useDatabase();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all sources
  const fetchSources = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const rows = await query(`
        SELECT * FROM source WHERE deleted_at IS NULL
        ORDER BY name
      `);
      setSources(rows);
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  }, [query, isOpen]);

  // Load sources when bundle opens
  useEffect(() => {
    if (isOpen) {
      fetchSources();
    } else {
      setSources([]);
    }
  }, [isOpen, fetchSources]);

  // Get a source by ID
  const getSource = useCallback(async (id) => {
    return await get('SELECT * FROM source WHERE id = ? AND deleted_at IS NULL', [id]);
  }, [get]);

  // Create a new source
  const createSource = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO source (id, type, name, url, author, publisher, publication_date, repository, call_number, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.type || 'other',
      data.name,
      data.url || null,
      data.author || null,
      data.publisher || null,
      data.publication_date || null,
      data.repository || null,
      data.call_number || null,
      data.notes || null,
      now,
      now,
    ]);

    await fetchSources();
    return id;
  }, [run, fetchSources]);

  // Update a source
  const updateSource = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const updateableFields = ['type', 'name', 'url', 'author', 'publisher', 'publication_date', 'repository', 'call_number', 'notes'];
    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE source SET ${fields.join(', ')} WHERE id = ?`, values);
    await fetchSources();
  }, [run, fetchSources]);

  // Delete a source (soft delete)
  const deleteSource = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE source SET deleted_at = ? WHERE id = ?', [now, id]);
    await fetchSources();
  }, [run, fetchSources]);

  // Find or create common source
  const findOrCreateCommonSource = useCallback(async (sourceName) => {
    const common = COMMON_SOURCES.find(s => s.name === sourceName);
    if (!common) return null;

    const existing = await get('SELECT id FROM source WHERE name = ? AND deleted_at IS NULL', [sourceName]);
    if (existing) {
      return existing.id;
    }

    return await createSource(common);
  }, [get, createSource]);

  // ============================================
  // Citations
  // ============================================

  // Get citation by ID
  const getCitation = useCallback(async (id) => {
    return await get(`
      SELECT c.*, s.name as source_name, s.type as source_type, s.url as source_url
      FROM citation c
      JOIN source s ON c.source_id = s.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `, [id]);
  }, [get]);

  // Get citations for a person
  const getCitationsForPerson = useCallback(async (personId) => {
    return await query(`
      SELECT c.*, s.name as source_name, s.type as source_type, s.url as source_url
      FROM citation c
      JOIN source s ON c.source_id = s.id
      WHERE c.person_id = ? AND c.deleted_at IS NULL
      ORDER BY s.name
    `, [personId]);
  }, [query]);

  // Get citations for an event
  const getCitationsForEvent = useCallback(async (eventId) => {
    return await query(`
      SELECT c.*, s.name as source_name, s.type as source_type, s.url as source_url
      FROM citation c
      JOIN source s ON c.source_id = s.id
      WHERE c.event_id = ? AND c.deleted_at IS NULL
      ORDER BY s.name
    `, [eventId]);
  }, [query]);

  // Get citations for a union
  const getCitationsForUnion = useCallback(async (unionId) => {
    return await query(`
      SELECT c.*, s.name as source_name, s.type as source_type, s.url as source_url
      FROM citation c
      JOIN source s ON c.source_id = s.id
      WHERE c.union_id = ? AND c.deleted_at IS NULL
      ORDER BY s.name
    `, [unionId]);
  }, [query]);

  // Create a citation
  const createCitation = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO citation (
        id, source_id, person_id, event_id, union_id, person_name_id,
        url, page, volume, entry_number, film_number, item_number, certificate_number,
        accessed_date, transcription, translation, abstract, confidence, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.source_id,
      data.person_id || null,
      data.event_id || null,
      data.union_id || null,
      data.person_name_id || null,
      data.url || null,
      data.page || null,
      data.volume || null,
      data.entry_number || null,
      data.film_number || null,
      data.item_number || null,
      data.certificate_number || null,
      data.accessed_date || null,
      data.transcription || null,
      data.translation || null,
      data.abstract || null,
      data.confidence || 'probable',
      data.notes || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Update a citation
  const updateCitation = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const updateableFields = [
      'source_id', 'url', 'page', 'volume', 'entry_number', 'film_number',
      'item_number', 'certificate_number', 'accessed_date', 'transcription',
      'translation', 'abstract', 'confidence', 'notes'
    ];

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE citation SET ${fields.join(', ')} WHERE id = ?`, values);
  }, [run]);

  // Delete a citation (soft delete)
  const deleteCitation = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE citation SET deleted_at = ? WHERE id = ?', [now, id]);
  }, [run]);

  // Quick cite: create source + citation in one step
  const quickCite = useCallback(async (entityType, entityId, sourceData, citationData = {}) => {
    // Find or create source
    let sourceId;
    const existingSource = await get(
      'SELECT id FROM source WHERE name = ? AND deleted_at IS NULL',
      [sourceData.name]
    );

    if (existingSource) {
      sourceId = existingSource.id;
    } else {
      sourceId = await createSource(sourceData);
    }

    // Create citation
    return await createCitation({
      source_id: sourceId,
      [`${entityType}_id`]: entityId,
      ...citationData,
    });
  }, [get, createSource, createCitation]);

  // Format citation for display
  const formatCitation = useCallback((citation) => {
    if (!citation) return '';

    let text = citation.source_name || 'Unknown Source';

    if (citation.page) {
      text += `, p. ${citation.page}`;
    }
    if (citation.entry_number) {
      text += `, entry ${citation.entry_number}`;
    }
    if (citation.url) {
      text += ` (${citation.url})`;
    }

    return text;
  }, []);

  return {
    // Sources
    sources,
    loading,
    fetchSources,
    getSource,
    createSource,
    updateSource,
    deleteSource,
    findOrCreateCommonSource,

    // Citations
    getCitation,
    getCitationsForPerson,
    getCitationsForEvent,
    getCitationsForUnion,
    createCitation,
    updateCitation,
    deleteCitation,
    quickCite,
    formatCitation,

    // Constants
    SOURCE_TYPES,
    COMMON_SOURCES,
    CONFIDENCE_LEVELS,
  };
}

export default useSources;
