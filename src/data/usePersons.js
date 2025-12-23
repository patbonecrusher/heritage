/**
 * usePersons - Hook for person CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

export function usePersons() {
  const { query, get, run, transaction, isOpen } = useDatabase();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all persons
  const fetchPersons = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const rows = await query(`
        SELECT p.*,
               m.path as photo_path,
               m.thumbnail_path
        FROM person p
        LEFT JOIN media m ON p.primary_photo_id = m.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.surname, p.given_names
      `);
      setPersons(rows);
    } catch (err) {
      console.error('Error fetching persons:', err);
    } finally {
      setLoading(false);
    }
  }, [query, isOpen]);

  // Load persons when bundle opens
  useEffect(() => {
    if (isOpen) {
      fetchPersons();
    } else {
      setPersons([]);
    }
  }, [isOpen, fetchPersons]);

  // Get a single person by ID
  const getPerson = useCallback(async (id) => {
    const row = await get(`
      SELECT p.*,
             m.path as photo_path,
             m.thumbnail_path
      FROM person p
      LEFT JOIN media m ON p.primary_photo_id = m.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `, [id]);
    return row;
  }, [get]);

  // Get person with all related data
  const getPersonFull = useCallback(async (id) => {
    const person = await getPerson(id);
    if (!person) return null;

    // Get alternate names
    const names = await query(`
      SELECT * FROM person_name
      WHERE person_id = ? AND deleted_at IS NULL
    `, [id]);

    // Get events
    const events = await query(`
      SELECT e.*, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.person_id = ? AND e.deleted_at IS NULL
      ORDER BY e.date
    `, [id]);

    // Get unions (marriages)
    const unions = await query(`
      SELECT u.*,
             CASE WHEN u.person1_id = ? THEN u.person2_id ELSE u.person1_id END as spouse_id
      FROM union_ u
      WHERE (u.person1_id = ? OR u.person2_id = ?) AND u.deleted_at IS NULL
    `, [id, id, id]);

    // Get spouse details for each union
    for (const union of unions) {
      if (union.spouse_id) {
        union.spouse = await getPerson(union.spouse_id);
      }
      // Get children
      union.children = await query(`
        SELECT p.*, uc.birth_order
        FROM union_child uc
        JOIN person p ON uc.person_id = p.id
        WHERE uc.union_id = ? AND uc.deleted_at IS NULL AND p.deleted_at IS NULL
        ORDER BY uc.birth_order, p.id
      `, [union.id]);
    }

    // Get parents (find unions where this person is a child)
    const parentUnions = await query(`
      SELECT u.person1_id, u.person2_id
      FROM union_child uc
      JOIN union_ u ON uc.union_id = u.id
      WHERE uc.person_id = ? AND uc.deleted_at IS NULL AND u.deleted_at IS NULL
    `, [id]);

    let parents = [];
    if (parentUnions.length > 0) {
      const parentIds = [parentUnions[0].person1_id, parentUnions[0].person2_id].filter(Boolean);
      if (parentIds.length > 0) {
        parents = await query(`
          SELECT * FROM person WHERE id IN (${parentIds.map(() => '?').join(',')}) AND deleted_at IS NULL
        `, parentIds);
      }
    }

    // Get citations
    const citations = await query(`
      SELECT c.*, s.name as source_name, s.type as source_type
      FROM citation c
      JOIN source s ON c.source_id = s.id
      WHERE c.person_id = ? AND c.deleted_at IS NULL
    `, [id]);

    return {
      ...person,
      names,
      events,
      unions,
      parents,
      citations,
    };
  }, [getPerson, query]);

  // Create a new person
  const createPerson = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO person (id, given_names, surname, surname_at_birth, gender, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.given_names || null,
      data.surname || null,
      data.surname_at_birth || null,
      data.gender || 'unknown',
      data.notes || null,
      now,
      now,
    ]);

    await fetchPersons();
    return id;
  }, [run, fetchPersons]);

  // Update a person
  const updatePerson = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (data.given_names !== undefined) {
      fields.push('given_names = ?');
      values.push(data.given_names);
    }
    if (data.surname !== undefined) {
      fields.push('surname = ?');
      values.push(data.surname);
    }
    if (data.surname_at_birth !== undefined) {
      fields.push('surname_at_birth = ?');
      values.push(data.surname_at_birth);
    }
    if (data.gender !== undefined) {
      fields.push('gender = ?');
      values.push(data.gender);
    }
    if (data.primary_photo_id !== undefined) {
      fields.push('primary_photo_id = ?');
      values.push(data.primary_photo_id);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE person SET ${fields.join(', ')} WHERE id = ?`, values);
    await fetchPersons();
  }, [run, fetchPersons]);

  // Delete a person (soft delete)
  const deletePerson = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE person SET deleted_at = ? WHERE id = ?', [now, id]);
    await fetchPersons();
  }, [run, fetchPersons]);

  // Search persons by name
  const searchPersons = useCallback(async (searchTerm) => {
    if (!searchTerm) return persons;
    const term = `%${searchTerm}%`;
    return await query(`
      SELECT * FROM person
      WHERE deleted_at IS NULL
        AND (given_names LIKE ? OR surname LIKE ? OR surname_at_birth LIKE ?)
      ORDER BY surname, given_names
    `, [term, term, term]);
  }, [query, persons]);

  // Add alternate name
  const addPersonName = useCallback(async (personId, data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO person_name (id, person_id, type, given_names, surname, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      personId,
      data.type || 'alias',
      data.given_names || null,
      data.surname || null,
      data.notes || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Get persons grouped by surname (for sidebar)
  const getPersonsBySurname = useCallback(() => {
    const grouped = {};
    for (const person of persons) {
      const surname = person.surname || 'Unknown';
      if (!grouped[surname]) {
        grouped[surname] = [];
      }
      grouped[surname].push(person);
    }
    // Sort surnames alphabetically
    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(surname => ({
        surname,
        persons: grouped[surname].sort((a, b) =>
          (a.given_names || '').localeCompare(b.given_names || '')
        ),
      }));
  }, [persons]);

  return {
    persons,
    loading,
    fetchPersons,
    getPerson,
    getPersonFull,
    createPerson,
    updatePerson,
    deletePerson,
    searchPersons,
    addPersonName,
    getPersonsBySurname,
  };
}

export default usePersons;
