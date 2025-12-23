/**
 * useUnions - Hook for union and children CRUD operations
 */

import { useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

export function useUnions() {
  const { query, get, run, transaction } = useDatabase();

  // Get a union by ID
  const getUnion = useCallback(async (id) => {
    return await get(`
      SELECT * FROM union_
      WHERE id = ? AND deleted_at IS NULL
    `, [id]);
  }, [get]);

  // Get union with spouse and children details
  const getUnionFull = useCallback(async (id) => {
    const union = await getUnion(id);
    if (!union) return null;

    // Get both persons
    const [person1, person2] = await Promise.all([
      union.person1_id ? get('SELECT * FROM person WHERE id = ?', [union.person1_id]) : null,
      union.person2_id ? get('SELECT * FROM person WHERE id = ?', [union.person2_id]) : null,
    ]);

    // Get children
    const children = await query(`
      SELECT p.*, uc.birth_order, uc.relationship
      FROM union_child uc
      JOIN person p ON uc.person_id = p.id
      WHERE uc.union_id = ? AND uc.deleted_at IS NULL AND p.deleted_at IS NULL
      ORDER BY uc.birth_order, p.id
    `, [id]);

    // Get marriage event
    const marriageEvent = await get(`
      SELECT e.*, p.name as place_name
      FROM event e
      LEFT JOIN place p ON e.place_id = p.id
      WHERE e.union_id = ? AND e.type = 'marriage' AND e.deleted_at IS NULL
    `, [id]);

    return {
      ...union,
      person1,
      person2,
      children,
      marriageEvent,
    };
  }, [getUnion, get, query]);

  // Get all unions for a person
  const getUnionsForPerson = useCallback(async (personId) => {
    const unions = await query(`
      SELECT u.*,
             CASE WHEN u.person1_id = ? THEN u.person2_id ELSE u.person1_id END as spouse_id
      FROM union_ u
      WHERE (u.person1_id = ? OR u.person2_id = ?) AND u.deleted_at IS NULL
    `, [personId, personId, personId]);

    // Get spouse details and children for each union
    for (const union of unions) {
      if (union.spouse_id) {
        union.spouse = await get('SELECT * FROM person WHERE id = ?', [union.spouse_id]);
      }
      union.children = await query(`
        SELECT p.*, uc.birth_order, uc.relationship
        FROM union_child uc
        JOIN person p ON uc.person_id = p.id
        WHERE uc.union_id = ? AND uc.deleted_at IS NULL AND p.deleted_at IS NULL
        ORDER BY uc.birth_order, p.id
      `, [union.id]);
    }

    return unions;
  }, [query, get]);

  // Create a new union
  const createUnion = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO union_ (id, person1_id, person2_id, type, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.person1_id,
      data.person2_id || null,
      data.type || 'marriage',
      data.status || null,
      data.notes || null,
      now,
      now,
    ]);

    return id;
  }, [run]);

  // Update a union
  const updateUnion = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    if (data.person2_id !== undefined) {
      fields.push('person2_id = ?');
      values.push(data.person2_id);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE union_ SET ${fields.join(', ')} WHERE id = ?`, values);
  }, [run]);

  // Delete a union (soft delete)
  const deleteUnion = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE union_ SET deleted_at = ? WHERE id = ?', [now, id]);
  }, [run]);

  // Add a child to a union
  const addChild = useCallback(async (unionId, personId, data = {}) => {
    const id = generateId();
    const now = new Date().toISOString();

    // Get current max birth_order
    const maxOrder = await get(`
      SELECT MAX(birth_order) as max_order FROM union_child
      WHERE union_id = ? AND deleted_at IS NULL
    `, [unionId]);

    const birthOrder = data.birth_order ?? ((maxOrder?.max_order || 0) + 1);

    await run(`
      INSERT INTO union_child (id, union_id, person_id, birth_order, relationship, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      unionId,
      personId,
      birthOrder,
      data.relationship || 'biological',
      data.notes || null,
      now,
    ]);

    return id;
  }, [run, get]);

  // Remove a child from a union
  const removeChild = useCallback(async (unionId, personId) => {
    const now = new Date().toISOString();
    await run(`
      UPDATE union_child SET deleted_at = ?
      WHERE union_id = ? AND person_id = ?
    `, [now, unionId, personId]);
  }, [run]);

  // Update child relationship
  const updateChild = useCallback(async (unionId, personId, data) => {
    const fields = [];
    const values = [];

    if (data.birth_order !== undefined) {
      fields.push('birth_order = ?');
      values.push(data.birth_order);
    }
    if (data.relationship !== undefined) {
      fields.push('relationship = ?');
      values.push(data.relationship);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length > 0) {
      values.push(unionId, personId);
      await run(`
        UPDATE union_child SET ${fields.join(', ')}
        WHERE union_id = ? AND person_id = ?
      `, values);
    }
  }, [run]);

  // Create union with spouse (creates spouse person if needed)
  const createUnionWithSpouse = useCallback(async (personId, spouseData, unionData = {}) => {
    const now = new Date().toISOString();
    const unionId = generateId();
    const spouseId = generateId();

    await transaction([
      // Create spouse
      {
        sql: `INSERT INTO person (id, given_names, surname, gender, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          spouseId,
          spouseData.given_names || null,
          spouseData.surname || null,
          spouseData.gender || 'unknown',
          now,
          now,
        ],
      },
      // Create union
      {
        sql: `INSERT INTO union_ (id, person1_id, person2_id, type, status, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          unionId,
          personId,
          spouseId,
          unionData.type || 'marriage',
          unionData.status || null,
          unionData.notes || null,
          now,
          now,
        ],
      },
    ]);

    return { unionId, spouseId };
  }, [transaction]);

  // Create child for a union (creates child person)
  const createChildForUnion = useCallback(async (unionId, childData = {}) => {
    const now = new Date().toISOString();
    const childId = generateId();
    const linkId = generateId();

    // Get current max birth_order
    const maxOrder = await get(`
      SELECT MAX(birth_order) as max_order FROM union_child
      WHERE union_id = ? AND deleted_at IS NULL
    `, [unionId]);

    const birthOrder = (maxOrder?.max_order || 0) + 1;

    await transaction([
      // Create child person
      {
        sql: `INSERT INTO person (id, given_names, surname, gender, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          childId,
          childData.given_names || null,
          childData.surname || null,
          childData.gender || 'unknown',
          now,
          now,
        ],
      },
      // Link to union
      {
        sql: `INSERT INTO union_child (id, union_id, person_id, birth_order, relationship, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          linkId,
          unionId,
          childId,
          birthOrder,
          'biological',
          now,
        ],
      },
    ]);

    return childId;
  }, [transaction, get]);

  // Find or create union between two persons
  const findOrCreateUnion = useCallback(async (person1Id, person2Id) => {
    // Check if union already exists
    const existing = await get(`
      SELECT id FROM union_
      WHERE ((person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?))
        AND deleted_at IS NULL
    `, [person1Id, person2Id, person2Id, person1Id]);

    if (existing) {
      return existing.id;
    }

    return await createUnion({ person1_id: person1Id, person2_id: person2Id });
  }, [get, createUnion]);

  return {
    getUnion,
    getUnionFull,
    getUnionsForPerson,
    createUnion,
    updateUnion,
    deleteUnion,
    addChild,
    removeChild,
    updateChild,
    createUnionWithSpouse,
    createChildForUnion,
    findOrCreateUnion,
  };
}

export default useUnions;
