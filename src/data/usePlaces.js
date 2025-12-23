/**
 * usePlaces - Hook for place CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useDatabase, generateId } from './DatabaseContext';

// Place types
export const PLACE_TYPES = {
  country: 'Country',
  province: 'Province/State',
  county: 'County',
  city: 'City',
  town: 'Town',
  parish: 'Parish',
  township: 'Township',
  village: 'Village',
  neighborhood: 'Neighborhood',
  address: 'Address',
  cemetery: 'Cemetery',
  church: 'Church',
  hospital: 'Hospital',
  other: 'Other',
};

export function usePlaces() {
  const { query, get, run, isOpen } = useDatabase();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all places
  const fetchPlaces = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const rows = await query(`
        SELECT * FROM place WHERE deleted_at IS NULL
        ORDER BY name
      `);
      setPlaces(rows);
    } catch (err) {
      console.error('Error fetching places:', err);
    } finally {
      setLoading(false);
    }
  }, [query, isOpen]);

  // Load places when bundle opens
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
    } else {
      setPlaces([]);
    }
  }, [isOpen, fetchPlaces]);

  // Get a place by ID
  const getPlace = useCallback(async (id) => {
    return await get('SELECT * FROM place WHERE id = ? AND deleted_at IS NULL', [id]);
  }, [get]);

  // Get place with full hierarchy (parent chain)
  const getPlaceWithHierarchy = useCallback(async (id) => {
    const place = await getPlace(id);
    if (!place) return null;

    const hierarchy = [place];
    let current = place;

    while (current.parent_id) {
      const parent = await getPlace(current.parent_id);
      if (parent) {
        hierarchy.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return {
      ...place,
      hierarchy,
      fullName: hierarchy.map(p => p.name).join(', '),
    };
  }, [getPlace]);

  // Get current place (follow mapped_to chain)
  const getCurrentPlace = useCallback(async (id) => {
    let place = await getPlace(id);
    while (place?.mapped_to_id) {
      place = await getPlace(place.mapped_to_id);
    }
    return place;
  }, [getPlace]);

  // Create a new place
  const createPlace = useCallback(async (data) => {
    const id = generateId();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO place (id, name, type, parent_id, mapped_to_id, latitude, longitude, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.name,
      data.type || null,
      data.parent_id || null,
      data.mapped_to_id || null,
      data.latitude || null,
      data.longitude || null,
      data.notes || null,
      now,
      now,
    ]);

    await fetchPlaces();
    return id;
  }, [run, fetchPlaces]);

  // Update a place
  const updatePlace = useCallback(async (id, data) => {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const updateableFields = ['name', 'type', 'parent_id', 'mapped_to_id', 'latitude', 'longitude', 'notes'];
    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE place SET ${fields.join(', ')} WHERE id = ?`, values);
    await fetchPlaces();
  }, [run, fetchPlaces]);

  // Delete a place (soft delete)
  const deletePlace = useCallback(async (id) => {
    const now = new Date().toISOString();
    await run('UPDATE place SET deleted_at = ? WHERE id = ?', [now, id]);
    await fetchPlaces();
  }, [run, fetchPlaces]);

  // Search places by name
  const searchPlaces = useCallback(async (searchTerm) => {
    if (!searchTerm) return places;
    const term = `%${searchTerm}%`;
    return await query(`
      SELECT * FROM place
      WHERE deleted_at IS NULL AND name LIKE ?
      ORDER BY name
    `, [term]);
  }, [query, places]);

  // Find or create a place by name
  const findOrCreatePlace = useCallback(async (name, parentId = null) => {
    // Check if exists
    const existing = await get(`
      SELECT id FROM place
      WHERE name = ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        AND deleted_at IS NULL
    `, [name, parentId, parentId]);

    if (existing) {
      return existing.id;
    }

    return await createPlace({ name, parent_id: parentId });
  }, [get, createPlace]);

  // Get children of a place
  const getChildPlaces = useCallback(async (parentId) => {
    return await query(`
      SELECT * FROM place
      WHERE parent_id = ? AND deleted_at IS NULL
      ORDER BY name
    `, [parentId]);
  }, [query]);

  // Format place for display (with hierarchy)
  const formatPlace = useCallback((place) => {
    if (!place) return '';
    if (place.fullName) return place.fullName;
    return place.name;
  }, []);

  return {
    places,
    loading,
    fetchPlaces,
    getPlace,
    getPlaceWithHierarchy,
    getCurrentPlace,
    createPlace,
    updatePlace,
    deletePlace,
    searchPlaces,
    findOrCreatePlace,
    getChildPlaces,
    formatPlace,
    PLACE_TYPES,
  };
}

export default usePlaces;
