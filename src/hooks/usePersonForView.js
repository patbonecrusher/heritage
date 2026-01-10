/**
 * usePersonForView - Hook for transforming raw data into PersonView format
 * Converts both bundle and legacy data into the unified format PersonView expects
 */

import { useMemo } from 'react';
import { dbEventToDateFormat, dbUnionToPersonViewFormat } from '../utils/formatConverters';

export function usePersonForView({
  storageMode,
  selectedPersonId,
  selectedPerson,
  loadedBirthEvent,
  loadedDeathEvent,
  loadedOtherEvents,
  loadedUnions,
  loadedParentUnion,
  loadedDataForPersonId,
  persons,
  vitalEvents,
  data,
}) {
  // Transform selected person to view format
  const personForView = useMemo(() => {
    if (!selectedPerson) return null;

    if (storageMode === 'bundle') {
      // Convert database person to legacy format for PersonView
      // Only use loaded events if they belong to the currently selected person
      const eventsReady = loadedDataForPersonId === selectedPersonId;
      return {
        id: selectedPerson.id,
        firstName: selectedPerson.given_names || '',
        lastName: selectedPerson.surname || '',
        maidenName: selectedPerson.surname_at_birth || '',
        gender: selectedPerson.gender || '',
        notes: selectedPerson.notes || '',
        // Convert database events to PersonView format (only if loaded for this person)
        birthDate: eventsReady ? dbEventToDateFormat(loadedBirthEvent) : { type: 'unknown' },
        deathDate: selectedPerson.is_living
          ? { type: 'alive', display: 'Living' }
          : (eventsReady ? dbEventToDateFormat(loadedDeathEvent) : { type: 'unknown' }),
        birthPlace: eventsReady ? (loadedBirthEvent?.place_detail || loadedBirthEvent?.place_name || '') : '',
        birthPlaceId: eventsReady ? (loadedBirthEvent?.place_id || null) : null,
        birthEventId: eventsReady ? (loadedBirthEvent?.id || null) : null,
        deathPlace: eventsReady ? (loadedDeathEvent?.place_detail || loadedDeathEvent?.place_name || '') : '',
        deathPlaceId: eventsReady ? (loadedDeathEvent?.place_id || null) : null,
        deathEventId: eventsReady ? (loadedDeathEvent?.id || null) : null,
        // Convert other events from database format (only if loaded for this person)
        events: eventsReady ? loadedOtherEvents.map(e => ({
          id: e.id,
          type: e.type,
          date: dbEventToDateFormat(e),
          place: e.place_detail || e.place_name || '',
          placeId: e.place_id || null,
          description: e.description || '',
        })) : [],
        sources: [],
      };
    }

    // Legacy mode - use person as-is
    return selectedPerson;
  }, [
    storageMode,
    selectedPersonId,
    selectedPerson,
    loadedBirthEvent,
    loadedDeathEvent,
    loadedOtherEvents,
    loadedDataForPersonId,
  ]);

  // Transform unions to view format
  const unionsForView = useMemo(() => {
    if (!selectedPersonId) return [];

    if (storageMode === 'bundle') {
      const eventsReady = loadedDataForPersonId === selectedPersonId;

      if (eventsReady) {
        // Unions where person is a partner
        const partnerUnions = loadedUnions.map(u => dbUnionToPersonViewFormat(u, selectedPersonId));
        // Parent union where person is a child (needs different format for getParentIds to work)
        const parentUnionFormatted = loadedParentUnion ? {
          id: loadedParentUnion.id,
          partner1Id: loadedParentUnion.person1_id,
          partner2Id: loadedParentUnion.person2_id,
          childIds: (loadedParentUnion.children || []).map(c => c.id),
          type: loadedParentUnion.type || 'marriage',
        } : null;
        return parentUnionFormatted
          ? [...partnerUnions, parentUnionFormatted]
          : partnerUnions;
      }

      return [];
    }

    // Legacy mode - filter unions for selected person
    return (data.unions || []).filter(u =>
      u.partner1Id === selectedPersonId || u.partner2Id === selectedPersonId ||
      (u.childIds || []).includes(selectedPersonId)
    );
  }, [
    storageMode,
    selectedPersonId,
    loadedUnions,
    loadedParentUnion,
    loadedDataForPersonId,
    data.unions,
  ]);

  // Transform all people to AllPeople format for PersonPicker dropdowns
  const allPeople = useMemo(() => {
    if (storageMode === 'bundle') {
      return persons.map(p => {
        const vital = vitalEvents[p.id] || {};
        return {
          id: p.id,
          firstName: p.given_names || '',
          lastName: p.surname || '',
          gender: p.gender || '',
          birthDate: vital.birthDate,
          deathDate: vital.deathDate,
        };
      });
    }

    // Legacy mode
    return (data.people || []).map(p => ({
      id: p.id,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      gender: p.gender || '',
      birthDate: p.birthDate,
      deathDate: p.deathDate,
    }));
  }, [storageMode, persons, vitalEvents, data.people]);

  return {
    personForView,
    unionsForView,
    allPeople,
  };
}
