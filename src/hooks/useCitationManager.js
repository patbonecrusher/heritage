/**
 * useCitationManager - Hook for managing citations in bundle mode
 * Handles creating, updating, and deleting citations with automatic reload logic
 */

import { useCallback } from 'react';

export function useCitationManager({
  // State setters
  setPersonCitations,
  setBirthCitations,
  setDeathCitations,
  setEventCitations,
  setPersonUnionCitations,
  setMediaCitations,
  setUnionCitations,

  // Query functions
  getCitationsForPerson,
  getCitationsForEvent,
  getCitationsForUnion,
  getCitationsForMedia,
  getMediaForPerson,

  // Database functions
  createCitation,
  updateCitation,
  deleteCitation,

  // Current context
  selectedPersonId,
  loadedBirthEvent,
  loadedDeathEvent,
  loadedOtherEvents,
  loadedUnions,
  editingUnionId,
}) {
  // Handle creating a citation
  const handleCreateCitation = useCallback(
    async (data) => {
      await createCitation(data);
      // Reload citations for the affected person, event or union
      if (data.person_id) {
        const citations = await getCitationsForPerson(data.person_id);
        setPersonCitations(citations || []);
      }
      if (data.event_id) {
        const eventId = data.event_id;
        const citations = await getCitationsForEvent(eventId);
        if (eventId === loadedBirthEvent?.id) {
          setBirthCitations(citations || []);
        } else if (eventId === loadedDeathEvent?.id) {
          setDeathCitations(citations || []);
        } else {
          setEventCitations(prev => ({ ...prev, [eventId]: citations || [] }));
        }
      }
      if (data.union_id) {
        const unionId = data.union_id;
        const citations = await getCitationsForUnion(unionId);
        setPersonUnionCitations(prev => ({ ...prev, [unionId]: citations || [] }));
      }
      if (data.media_id) {
        const mediaId = data.media_id;
        const citations = await getCitationsForMedia(mediaId);
        setMediaCitations(prev => ({ ...prev, [mediaId]: citations || [] }));
      }
    },
    [
      createCitation,
      getCitationsForPerson,
      getCitationsForEvent,
      getCitationsForUnion,
      getCitationsForMedia,
      loadedBirthEvent,
      loadedDeathEvent,
      setPersonCitations,
      setBirthCitations,
      setDeathCitations,
      setEventCitations,
      setPersonUnionCitations,
      setMediaCitations,
    ]
  );

  // Handle updating a citation
  const handleUpdateCitation = useCallback(
    async (citationId, data) => {
      await updateCitation(citationId, data);
      // Reload all citations for this person
      if (selectedPersonId) {
        const personCits = await getCitationsForPerson(selectedPersonId);
        setPersonCitations(personCits || []);
      }
      if (loadedBirthEvent?.id) {
        const citations = await getCitationsForEvent(loadedBirthEvent.id);
        setBirthCitations(citations || []);
      }
      if (loadedDeathEvent?.id) {
        const citations = await getCitationsForEvent(loadedDeathEvent.id);
        setDeathCitations(citations || []);
      }
      for (const event of loadedOtherEvents) {
        const citations = await getCitationsForEvent(event.id);
        if (citations && citations.length > 0) {
          setEventCitations(prev => ({ ...prev, [event.id]: citations }));
        }
      }
      // Also reload union citations
      for (const union of loadedUnions) {
        const citations = await getCitationsForUnion(union.id);
        setPersonUnionCitations(prev => ({ ...prev, [union.id]: citations || [] }));
      }
      // Also reload media citations
      if (selectedPersonId) {
        const media = await getMediaForPerson(selectedPersonId);
        for (const item of media || []) {
          const citations = await getCitationsForMedia(item.id);
          setMediaCitations(prev => ({ ...prev, [item.id]: citations || [] }));
        }
      }
    },
    [
      updateCitation,
      selectedPersonId,
      getCitationsForPerson,
      getCitationsForEvent,
      getCitationsForUnion,
      getCitationsForMedia,
      getMediaForPerson,
      loadedBirthEvent,
      loadedDeathEvent,
      loadedOtherEvents,
      loadedUnions,
      setPersonCitations,
      setBirthCitations,
      setDeathCitations,
      setEventCitations,
      setPersonUnionCitations,
      setMediaCitations,
    ]
  );

  // Handle deleting a citation
  const handleDeleteCitation = useCallback(
    async (citationId) => {
      await deleteCitation(citationId);
      // Reload all citations for this person
      if (selectedPersonId) {
        const personCits = await getCitationsForPerson(selectedPersonId);
        setPersonCitations(personCits || []);
      }
      if (loadedBirthEvent?.id) {
        const citations = await getCitationsForEvent(loadedBirthEvent.id);
        setBirthCitations(citations || []);
      }
      if (loadedDeathEvent?.id) {
        const citations = await getCitationsForEvent(loadedDeathEvent.id);
        setDeathCitations(citations || []);
      }
      const citationsMap = {};
      for (const event of loadedOtherEvents) {
        const citations = await getCitationsForEvent(event.id);
        if (citations && citations.length > 0) {
          citationsMap[event.id] = citations;
        }
      }
      setEventCitations(citationsMap);
      // Also reload union citations
      const unionCitationsMap = {};
      for (const union of loadedUnions) {
        const citations = await getCitationsForUnion(union.id);
        if (citations && citations.length > 0) {
          unionCitationsMap[union.id] = citations;
        }
      }
      setPersonUnionCitations(unionCitationsMap);
      // Also reload media citations
      if (selectedPersonId) {
        const media = await getMediaForPerson(selectedPersonId);
        const mediaCitationsMap = {};
        for (const item of media || []) {
          const citations = await getCitationsForMedia(item.id);
          if (citations && citations.length > 0) {
            mediaCitationsMap[item.id] = citations;
          }
        }
        setMediaCitations(mediaCitationsMap);
      }
    },
    [
      deleteCitation,
      selectedPersonId,
      getCitationsForPerson,
      getCitationsForEvent,
      getCitationsForUnion,
      getCitationsForMedia,
      getMediaForPerson,
      loadedBirthEvent,
      loadedDeathEvent,
      loadedOtherEvents,
      loadedUnions,
      setPersonCitations,
      setBirthCitations,
      setDeathCitations,
      setEventCitations,
      setPersonUnionCitations,
      setMediaCitations,
    ]
  );

  // Handle union dialog citations (simpler reload logic)
  const handleCreateUnionDialogCitation = useCallback(
    async (data) => {
      await createCitation(data);
      // Reload union citations
      if (editingUnionId) {
        const citations = await getCitationsForUnion(editingUnionId);
        setUnionCitations(citations || []);
      }
    },
    [createCitation, editingUnionId, getCitationsForUnion, setUnionCitations]
  );

  const handleUpdateUnionDialogCitation = useCallback(
    async (citationId, data) => {
      await updateCitation(citationId, data);
      // Reload union citations
      if (editingUnionId) {
        const citations = await getCitationsForUnion(editingUnionId);
        setUnionCitations(citations || []);
      }
    },
    [updateCitation, editingUnionId, getCitationsForUnion, setUnionCitations]
  );

  const handleDeleteUnionDialogCitation = useCallback(
    async (citationId) => {
      await deleteCitation(citationId);
      // Reload union citations
      if (editingUnionId) {
        const citations = await getCitationsForUnion(editingUnionId);
        setUnionCitations(citations || []);
      }
    },
    [deleteCitation, editingUnionId, getCitationsForUnion, setUnionCitations]
  );

  return {
    // PersonView citation handlers
    onCreateCitation: handleCreateCitation,
    onUpdateCitation: handleUpdateCitation,
    onDeleteCitation: handleDeleteCitation,

    // UnionDialog citation handlers
    onCreateUnionCitation: handleCreateUnionDialogCitation,
    onUpdateUnionCitation: handleUpdateUnionDialogCitation,
    onDeleteUnionCitation: handleDeleteUnionDialogCitation,
  };
}
