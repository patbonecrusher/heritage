/**
 * usePersonDataLoader - Hook for loading person data in bundle mode
 * Handles loading birth/death events, other events, unions, and associated citations
 */

import { useState, useEffect, useCallback } from 'react';

export function usePersonDataLoader({
  storageMode,
  selectedPersonId,
  isOpen,
  editingUnionId,
  triggerRefresh,
  // Database query functions
  getBirthEvent,
  getDeathEvent,
  getEventsForPerson,
  getUnionsForPerson,
  getParentUnionForPerson,
  getCitationsForPerson,
  getCitationsForEvent,
  getCitationsForUnion,
  getMediaForPerson,
  getCitationsForMedia,
  getAllVitalEvents,
}) {
  // Loaded events for selected person
  const [loadedBirthEvent, setLoadedBirthEvent] = useState(null);
  const [loadedDeathEvent, setLoadedDeathEvent] = useState(null);
  const [loadedOtherEvents, setLoadedOtherEvents] = useState([]);
  const [loadedUnions, setLoadedUnions] = useState([]);
  const [loadedParentUnion, setLoadedParentUnion] = useState(null);
  const [loadedDataForPersonId, setLoadedDataForPersonId] = useState(null);

  // Citations for selected person's data
  const [personCitations, setPersonCitations] = useState([]);
  const [birthCitations, setBirthCitations] = useState([]);
  const [deathCitations, setDeathCitations] = useState([]);
  const [eventCitations, setEventCitations] = useState({});
  const [personUnionCitations, setPersonUnionCitations] = useState({});
  const [unionCitations, setUnionCitations] = useState([]);
  const [mediaCitations, setMediaCitations] = useState({});

  // Vital events for all persons
  const [vitalEvents, setVitalEvents] = useState({});

  // Load person data when selectedPersonId changes
  useEffect(() => {
    // Clear previous person's data immediately
    setLoadedBirthEvent(null);
    setLoadedDeathEvent(null);
    setLoadedOtherEvents([]);
    setLoadedUnions([]);
    setLoadedParentUnion(null);
    setLoadedDataForPersonId(null);
    setBirthCitations([]);
    setDeathCitations([]);
    setEventCitations({});
    setPersonUnionCitations({});
    setMediaCitations({});

    const loadPersonData = async () => {
      if (storageMode === 'bundle' && selectedPersonId && isOpen) {
        // Load birth and death events, unions, and parent union
        const [birth, death, allEvents, unions, parentUnion] = await Promise.all([
          getBirthEvent(selectedPersonId),
          getDeathEvent(selectedPersonId),
          getEventsForPerson(selectedPersonId),
          getUnionsForPerson(selectedPersonId),
          getParentUnionForPerson(selectedPersonId),
        ]);

        setLoadedBirthEvent(birth);
        setLoadedDeathEvent(death);

        // Filter out birth/death events from other events
        const otherEvents = (allEvents || []).filter(
          e => e.type !== 'birth' && e.type !== 'death'
        );
        setLoadedOtherEvents(otherEvents);
        setLoadedUnions(unions || []);
        setLoadedParentUnion(parentUnion);
        setLoadedDataForPersonId(selectedPersonId);
        setPersonCitations([]);

        // Load citations for person
        const personCits = await getCitationsForPerson(selectedPersonId);
        setPersonCitations(personCits || []);

        // Load citations for birth and death events
        if (birth?.id) {
          const citations = await getCitationsForEvent(birth.id);
          setBirthCitations(citations || []);
        }
        if (death?.id) {
          const citations = await getCitationsForEvent(death.id);
          setDeathCitations(citations || []);
        }

        // Load citations for other events
        const citationsMap = {};
        for (const event of otherEvents) {
          const citations = await getCitationsForEvent(event.id);
          if (citations && citations.length > 0) {
            citationsMap[event.id] = citations;
          }
        }
        setEventCitations(citationsMap);

        // Load citations for unions
        const unionCitationsMap = {};
        for (const union of (unions || [])) {
          const citations = await getCitationsForUnion(union.id);
          if (citations && citations.length > 0) {
            unionCitationsMap[union.id] = citations;
          }
        }
        setPersonUnionCitations(unionCitationsMap);

        // Load citations for media
        const media = await getMediaForPerson(selectedPersonId);
        const mediaCitationsMap = {};
        for (const item of (media || [])) {
          const citations = await getCitationsForMedia(item.id);
          if (citations && citations.length > 0) {
            mediaCitationsMap[item.id] = citations;
          }
        }
        setMediaCitations(mediaCitationsMap);
      }
    };

    loadPersonData();
  }, [
    storageMode,
    selectedPersonId,
    isOpen,
    getBirthEvent,
    getDeathEvent,
    getEventsForPerson,
    getUnionsForPerson,
    getParentUnionForPerson,
    getCitationsForPerson,
    getCitationsForEvent,
    getCitationsForUnion,
    getMediaForPerson,
    getCitationsForMedia,
  ]);

  // Load union editing citations
  useEffect(() => {
    const loadUnionCitations = async () => {
      if (storageMode === 'bundle' && editingUnionId && isOpen) {
        const citations = await getCitationsForUnion(editingUnionId);
        setUnionCitations(citations || []);
      } else {
        setUnionCitations([]);
      }
    };
    loadUnionCitations();
  }, [storageMode, editingUnionId, isOpen, getCitationsForUnion]);

  // Load vital events for all persons
  useEffect(() => {
    const loadVitalEvents = async () => {
      if (storageMode === 'bundle' && isOpen) {
        const events = await getAllVitalEvents();
        setVitalEvents(events);
      }
    };
    loadVitalEvents();
  }, [storageMode, isOpen, getAllVitalEvents, triggerRefresh]);

  return {
    // Loaded person data
    loadedBirthEvent,
    loadedDeathEvent,
    loadedOtherEvents,
    loadedUnions,
    loadedParentUnion,
    loadedDataForPersonId,

    // Citations
    personCitations,
    birthCitations,
    deathCitations,
    eventCitations,
    personUnionCitations,
    unionCitations,
    mediaCitations,

    // Vital events
    vitalEvents,

    // Setters (for external updates)
    setLoadedBirthEvent,
    setLoadedDeathEvent,
    setLoadedOtherEvents,
    setLoadedUnions,
    setLoadedParentUnion,
    setPersonCitations,
    setBirthCitations,
    setDeathCitations,
    setEventCitations,
    setPersonUnionCitations,
    setUnionCitations,
    setMediaCitations,
    setVitalEvents,
  };
}
