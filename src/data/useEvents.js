/**
 * useEvents - Hook for event CRUD operations
 */

import { useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

// Common event types
export const EVENT_TYPES = {
  // Life events
  birth: 'Birth',
  death: 'Death',
  baptism: 'Baptism',
  burial: 'Burial',
  cremation: 'Cremation',
  christening: 'Christening',
  confirmation: 'Confirmation',
  bar_mitzvah: 'Bar Mitzvah',
  bat_mitzvah: 'Bat Mitzvah',
  first_communion: 'First Communion',
  blessing: 'Blessing',

  // Family events
  adoption: 'Adoption',
  marriage: 'Marriage',
  divorce: 'Divorce',
  annulment: 'Annulment',
  engagement: 'Engagement',
  separation: 'Separation',

  // Migration
  immigration: 'Immigration',
  emigration: 'Emigration',
  naturalization: 'Naturalization',

  // Records
  census: 'Census',
  residence: 'Residence',

  // Career
  occupation: 'Occupation',
  education: 'Education',
  graduation: 'Graduation',
  military: 'Military Service',
  retirement: 'Retirement',

  // Other
  medical: 'Medical',
  will: 'Will',
  probate: 'Probate',
  custom: 'Custom',
};

export function useEvents() {
  const { query, get, run } = useDatabase();

  // Get an event by ID
  const getEvent = useCallback(async (id) => {
    return await get(`
      SELECT e.*, p.name as place_name, p.type as place_type
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.id = ? AND e.deleted_at IS NULL
    `, [id]);
  }, [get]);

  // Get all events for a person
  const getEventsForPerson = useCallback(async (personId) => {
    return await query(`
      SELECT e.*, p.name as place_name, p.type as place_type
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.person_id = ? AND e.deleted_at IS NULL
      ORDER BY e.date, e.type
    `, [personId]);
  }, [query]);

  // Get all events for a union
  const getEventsForUnion = useCallback(async (unionId) => {
    return await query(`
      SELECT e.*, p.name as place_name, p.type as place_type
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.union_id = ? AND e.deleted_at IS NULL
      ORDER BY e.date, e.type
    `, [unionId]);
  }, [query]);

  // Get birth event for a person
  const getBirthEvent = useCallback(async (personId) => {
    return await get(`
      SELECT e.*, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.person_id = ? AND e.type = 'birth' AND e.deleted_at IS NULL
    `, [personId]);
  }, [get]);

  // Get death event for a person
  const getDeathEvent = useCallback(async (personId) => {
    return await get(`
      SELECT e.*, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.person_id = ? AND e.type = 'death' AND e.deleted_at IS NULL
    `, [personId]);
  }, [get]);

  // Get marriage event for a union
  const getMarriageEvent = useCallback(async (unionId) => {
    return await get(`
      SELECT e.*, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.union_id = ? AND e.type = 'marriage' AND e.deleted_at IS NULL
    `, [unionId]);
  }, [get]);

  // Create a new event
  const createEvent = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO event (
        id, person_id, union_id, type, custom_type,
        date, date_qualifier, date_end,
        place_id, place_detail, description,
        age_at_event, occupation, cause, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.person_id || null,
      data.union_id || null,
      data.type,
      data.custom_type || null,
      data.date || null,
      data.date_qualifier || 'exact',
      data.date_end || null,
      data.place_id || null,
      data.place_detail || null,
      data.description || null,
      data.age_at_event || null,
      data.occupation || null,
      data.cause || null,
      data.notes || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Update an event
  const updateEvent = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const updateableFields = [
      'type', 'custom_type', 'date', 'date_qualifier', 'date_end',
      'place_id', 'place_detail', 'description', 'age_at_event',
      'occupation', 'cause', 'notes'
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

    await run(`UPDATE event SET ${fields.join(', ')} WHERE id = ?`, values);
  }, [run]);

  // Delete an event (soft delete)
  const deleteEvent = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE event SET deleted_at = ? WHERE id = ?', [now, id]);
  }, [run]);

  // Upsert birth event (create or update)
  const upsertBirthEvent = useCallback(async (personId, data) => {
    const existing = await getBirthEvent(personId);
    if (existing) {
      await updateEvent(existing.id, data);
      return existing.id;
    } else {
      return await createEvent({ ...data, person_id: personId, type: 'birth' });
    }
  }, [getBirthEvent, updateEvent, createEvent]);

  // Upsert death event (create or update)
  const upsertDeathEvent = useCallback(async (personId, data) => {
    const existing = await getDeathEvent(personId);
    if (existing) {
      await updateEvent(existing.id, data);
      return existing.id;
    } else {
      return await createEvent({ ...data, person_id: personId, type: 'death' });
    }
  }, [getDeathEvent, updateEvent, createEvent]);

  // Upsert marriage event (create or update)
  const upsertMarriageEvent = useCallback(async (unionId, data) => {
    const existing = await getMarriageEvent(unionId);
    if (existing) {
      await updateEvent(existing.id, data);
      return existing.id;
    } else {
      return await createEvent({ ...data, union_id: unionId, type: 'marriage' });
    }
  }, [getMarriageEvent, updateEvent, createEvent]);

  // Format a date for display
  const formatEventDate = useCallback((event) => {
    if (!event?.date) return '';

    let dateStr = event.date;

    // Handle qualifiers
    switch (event.date_qualifier) {
      case 'about':
        dateStr = `c. ${dateStr}`;
        break;
      case 'before':
        dateStr = `bef. ${dateStr}`;
        break;
      case 'after':
        dateStr = `aft. ${dateStr}`;
        break;
      case 'between':
        if (event.date_end) {
          dateStr = `${dateStr} – ${event.date_end}`;
        }
        break;
      case 'calculated':
        dateStr = `calc. ${dateStr}`;
        break;
    }

    return dateStr;
  }, []);

  // Get all birth/death events for all persons (for tooltip display)
  // Returns a map: { personId: { birthDate: {...}, deathDate: {...} } }
  const getAllVitalEvents = useCallback(async () => {
    const events = await query(`
      SELECT e.person_id, e.type, e.date, e.date_qualifier, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.type IN ('birth', 'death') AND e.deleted_at IS NULL
    `);

    const result = {};
    for (const event of events) {
      if (!result[event.person_id]) {
        result[event.person_id] = {};
      }

      // Parse date to extract year
      const dateParts = event.date ? event.date.split('-') : [];
      const year = dateParts[0] || null;
      const month = dateParts[1] || null;
      const day = dateParts[2] || null;

      const dateObj = {
        type: event.date ? (event.date_qualifier === 'about' ? 'approximate' : 'exact') : 'unknown',
        year,
        month,
        day,
        place: event.place_name,
      };

      if (event.type === 'birth') {
        result[event.person_id].birthDate = dateObj;
        result[event.person_id].birthPlace = event.place_name;
      } else if (event.type === 'death') {
        result[event.person_id].deathDate = dateObj;
        result[event.person_id].deathPlace = event.place_name;
      }
    }

    return result;
  }, [query]);

  return {
    getEvent,
    getEventsForPerson,
    getEventsForUnion,
    getBirthEvent,
    getDeathEvent,
    getMarriageEvent,
    getAllVitalEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    upsertBirthEvent,
    upsertDeathEvent,
    upsertMarriageEvent,
    formatEventDate,
    EVENT_TYPES,
  };
}

export default useEvents;
