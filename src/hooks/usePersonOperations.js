/**
 * usePersonOperations - Hook for all person data mutation operations
 * Handles saving person data, managing unions, parents, and children
 * Works in both bundle (database) and legacy (JSON) storage modes
 */

import { useCallback } from 'react';
import { dateFormatToDbEvent } from '../utils/formatConverters';

export function usePersonOperations({
  storageMode,
  selectedPersonId,
  data,
  setData,
  showToast,
  // Bundle mode dependencies
  updatePersonDb,
  createUnion,
  updateUnion,
  deleteUnion,
  addChild,
  removeChild,
  createEvent,
  updateEvent,
  deleteEvent,
  upsertBirthEvent,
  upsertDeathEvent,
  upsertMarriageEvent,
  getBirthEvent,
  getDeathEvent,
  getEventsForPerson,
  getUnionsForPerson,
  getParentUnionForPerson,
  findOrCreateUnion,
  fetchAllUnions,
  triggerRefresh,
  // State setters for bundle mode
  setLoadedBirthEvent,
  setLoadedDeathEvent,
  setLoadedOtherEvents,
  setLoadedUnions,
  setLoadedParentUnion,
  // Current data for comparison
  loadedUnions = [],
  loadedOtherEvents = [],
}) {
  /**
   * Handle person data save (basic fields: name, gender, notes, dates)
   */
  const onSave = useCallback(
    async (updatedData) => {
      if (!selectedPersonId) return;

      if (storageMode === 'bundle') {
        try {
          // Save person to database
          const isLiving = updatedData.deathDate?.type === 'alive';
          await updatePersonDb(selectedPersonId, {
            given_names: updatedData.firstName,
            surname: updatedData.lastName,
            surname_at_birth: updatedData.maidenName,
            nickname: updatedData.nickname,
            gender: updatedData.gender,
            notes: updatedData.notes,
            is_living: isLiving ? 1 : 0,
          });

          // Save birth event to database
          if (updatedData.birthDate && updatedData.birthDate.type !== 'unknown') {
            const birthEventData = dateFormatToDbEvent(updatedData.birthDate);
            await upsertBirthEvent(selectedPersonId, {
              date: birthEventData.date,
              date_qualifier: birthEventData.date_qualifier,
              place_id: updatedData.birthPlaceId || null,
              place_detail: updatedData.birthPlace || null,
            });
          }

          // Save death event to database (only if not living)
          if (!isLiving && updatedData.deathDate && updatedData.deathDate.type !== 'unknown') {
            const deathEventData = dateFormatToDbEvent(updatedData.deathDate);
            await upsertDeathEvent(selectedPersonId, {
              date: deathEventData.date,
              date_qualifier: deathEventData.date_qualifier,
              place_id: updatedData.deathPlaceId || null,
              place_detail: updatedData.deathPlace || null,
            });
          }

          // Handle other events (non-birth/death)
          const updatedEvents = updatedData.events || [];
          const updatedEventIds = new Set(updatedEvents.filter(e => e.id).map(e => e.id));
          const loadedEventIds = new Set(loadedOtherEvents.map(e => e.id));

          // Delete removed events
          for (const loadedEvent of loadedOtherEvents) {
            if (!updatedEventIds.has(loadedEvent.id)) {
              await deleteEvent(loadedEvent.id);
            }
          }

          // Create or update events
          for (const event of updatedEvents) {
            const eventData = dateFormatToDbEvent(event.date);
            if (!event.id || !loadedEventIds.has(event.id)) {
              // Create new event
              await createEvent({
                person_id: selectedPersonId,
                type: event.type,
                date: eventData.date,
                date_qualifier: eventData.date_qualifier,
                place_id: event.placeId || null,
                place_detail: event.place || null,
                description: event.description || null,
              });
            } else {
              // Update existing event
              await updateEvent(event.id, {
                type: event.type,
                date: eventData.date,
                date_qualifier: eventData.date_qualifier,
                place_id: event.placeId || null,
                place_detail: event.place || null,
                description: event.description || null,
              });
            }
          }

          // Reload events after save
          const [birth, death, allEvents] = await Promise.all([
            getBirthEvent(selectedPersonId),
            getDeathEvent(selectedPersonId),
            getEventsForPerson(selectedPersonId),
          ]);
          setLoadedBirthEvent(birth);
          setLoadedDeathEvent(death);
          const otherEvents = (allEvents || []).filter(e => e.type !== 'birth' && e.type !== 'death');
          setLoadedOtherEvents(otherEvents);

          // Trigger refresh to update sidebar
          triggerRefresh();

          showToast('Saved');
        } catch (error) {
          console.error('Error saving person:', error);
          showToast('Error saving person');
        }
      } else {
        // Legacy mode - update local state
        setData(prev => ({
          ...prev,
          people: (prev.people || []).map(p =>
            p.id === selectedPersonId
              ? { ...p, ...updatedData }
              : p
          )
        }));
        showToast('Saved');
      }
    },
    [
      storageMode,
      selectedPersonId,
      setData,
      showToast,
      updatePersonDb,
      createEvent,
      updateEvent,
      deleteEvent,
      upsertBirthEvent,
      upsertDeathEvent,
      getBirthEvent,
      getDeathEvent,
      getEventsForPerson,
      setLoadedBirthEvent,
      setLoadedDeathEvent,
      setLoadedOtherEvents,
      loadedOtherEvents,
      triggerRefresh,
    ]
  );

  /**
   * Handle union changes (create, update, delete unions and manage children)
   */
  const onUnionsChange = useCallback(
    async (updatedUnions) => {
      if (storageMode === 'bundle') {
        try {
          // Handle unions in bundle mode via database
          const existingUnionIds = new Set(loadedUnions.map(u => u.id));
          const updatedUnionIds = new Set(updatedUnions.map(u => u.id));

          // Delete removed unions
          for (const existing of loadedUnions) {
            if (!updatedUnionIds.has(existing.id)) {
              await deleteUnion(existing.id);
            }
          }

          // Create or update unions
          for (const union of updatedUnions) {
            if (!existingUnionIds.has(union.id) || union.id.startsWith('union-new-')) {
              // Create new union
              const newUnionId = await createUnion({
                person1_id: selectedPersonId,
                person2_id: union.partnerId || union.partner2Id,
                type: union.type || 'marriage',
                status: union.endReason || null,
                prior_status_1: union.priorStatus1 || null,
                prior_status_2: union.priorStatus2 || null,
              });
              // Add children to new union
              for (const childId of (union.childIds || [])) {
                await addChild(newUnionId, childId);
              }
              // Create marriage event if date provided
              if (union.startDate && union.startDate.type !== 'unknown') {
                const eventData = dateFormatToDbEvent(union.startDate);
                await createEvent({
                  union_id: newUnionId,
                  type: 'marriage',
                  date: eventData.date,
                  date_qualifier: eventData.date_qualifier,
                  place_detail: union.startPlace || null,
                  place_id: union.startPlaceId || null,
                });
              }
            } else {
              // Update existing union
              // Need to map priorStatus based on who is person1 in the database
              const existingDbUnion = loadedUnions.find(u => u.id === union.id);
              const isCurrentPerson1 = existingDbUnion?.person1_id === selectedPersonId;
              await updateUnion(union.id, {
                type: union.type,
                status: union.endReason || null,
                // priorStatus1 in PersonView is always the current person's status
                // Map it back to the correct database column based on who is person1
                prior_status_1: isCurrentPerson1 ? (union.priorStatus1 || null) : (union.priorStatus2 || null),
                prior_status_2: isCurrentPerson1 ? (union.priorStatus2 || null) : (union.priorStatus1 || null),
              });

              // Update marriage event (date/place)
              if (union.startDate && union.startDate.type !== 'unknown') {
                const eventData = dateFormatToDbEvent(union.startDate);
                await upsertMarriageEvent(union.id, {
                  date: eventData.date,
                  date_qualifier: eventData.date_qualifier,
                  place_detail: union.startPlace || null,
                  place_id: union.startPlaceId || null,
                });
              }

              // Sync children - compare existing vs updated
              const existingUnion = loadedUnions.find(u => u.id === union.id);
              const existingChildIds = new Set((existingUnion?.children || []).map(c => c.id));
              const updatedChildIds = new Set(union.childIds || []);

              // Remove children that are no longer in the union
              for (const existingChildId of existingChildIds) {
                if (!updatedChildIds.has(existingChildId)) {
                  await removeChild(union.id, existingChildId);
                }
              }

              // Add new children
              for (const childId of updatedChildIds) {
                if (!existingChildIds.has(childId)) {
                  await addChild(union.id, childId);
                }
              }
            }
          }

          // Reload unions for PersonView
          const reloadedUnions = await getUnionsForPerson(selectedPersonId);
          setLoadedUnions(reloadedUnions || []);
          // Also refresh the global unions list for pedigree/descendants views
          await fetchAllUnions();
        } catch (error) {
          console.error('Error updating unions:', error);
          showToast('Error updating unions');
        }
      } else {
        // Legacy mode - update local state
        setData(prev => {
          const otherUnions = (prev.unions || []).filter(u =>
            u.partner1Id !== selectedPersonId && u.partner2Id !== selectedPersonId
          );
          return {
            ...prev,
            unions: [...otherUnions, ...updatedUnions]
          };
        });
      }
    },
    [
      storageMode,
      selectedPersonId,
      setData,
      showToast,
      createUnion,
      deleteUnion,
      addChild,
      removeChild,
      createEvent,
      updateEvent,
      updateUnion,
      upsertMarriageEvent,
      getUnionsForPerson,
      fetchAllUnions,
      setLoadedUnions,
      loadedUnions,
    ]
  );

  /**
   * Handle parent assignment changes
   */
  const onParentsChange = useCallback(
    async ({ personId, fatherId, motherId }) => {
      if (storageMode === 'bundle') {
        try {
          // Handle parent changes in bundle mode via database

          // First, remove person from any existing parent union
          const existingParentUnion = await getParentUnionForPerson(personId);
          if (existingParentUnion) {
            await removeChild(existingParentUnion.id, personId);
          }

          // If new parents selected, add to their union
          if (fatherId || motherId) {
            // Find or create union for parents
            const unionId = await findOrCreateUnion(
              fatherId || motherId,
              fatherId && motherId ? (fatherId === (fatherId || motherId) ? motherId : fatherId) : null
            );
            // Add this person as child
            await addChild(unionId, personId);
          }

          // Reload unions (both partner unions and parent union)
          const [reloadedUnions, reloadedParentUnion] = await Promise.all([
            getUnionsForPerson(selectedPersonId),
            getParentUnionForPerson(personId),
          ]);
          setLoadedUnions(reloadedUnions || []);
          setLoadedParentUnion(reloadedParentUnion);
          // Also refresh the global unions list for pedigree/descendants views
          await fetchAllUnions();
        } catch (error) {
          console.error('Error updating parents:', error);
          showToast('Error updating parents');
        }
      } else {
        // Legacy mode
        setData(prev => {
          // Find existing union where this person is a child
          const existingParentUnion = (prev.unions || []).find(u =>
            (u.childIds || []).includes(personId)
          );

          // If no parents selected, remove person from any parent union
          if (!fatherId && !motherId) {
            if (existingParentUnion) {
              return {
                ...prev,
                unions: prev.unions.map(u =>
                  u.id === existingParentUnion.id
                    ? { ...u, childIds: (u.childIds || []).filter(id => id !== personId) }
                    : u
                ).filter(u => (u.childIds || []).length > 0 || u.partner1Id || u.partner2Id)
              };
            }
            return prev;
          }

          // Check if there's already a union between these two parents
          const parentsUnion = (prev.unions || []).find(u =>
            (u.partner1Id === fatherId && u.partner2Id === motherId) ||
            (u.partner1Id === motherId && u.partner2Id === fatherId) ||
            (fatherId && !motherId && (u.partner1Id === fatherId || u.partner2Id === fatherId)) ||
            (motherId && !fatherId && (u.partner1Id === motherId || u.partner2Id === motherId))
          );

          if (parentsUnion) {
            // Add person to existing parents union, remove from old union if different
            let updatedUnions = prev.unions.map(u => {
              if (u.id === parentsUnion.id) {
                const newChildIds = (u.childIds || []).includes(personId)
                  ? u.childIds
                  : [...(u.childIds || []), personId];
                return { ...u, childIds: newChildIds };
              }
              if (existingParentUnion && u.id === existingParentUnion.id && u.id !== parentsUnion.id) {
                return { ...u, childIds: (u.childIds || []).filter(id => id !== personId) };
              }
              return u;
            });
            return { ...prev, unions: updatedUnions };
          }

          // Create new union for parents
          const newUnion = {
            id: `union-${Date.now()}`,
            partner1Id: fatherId || '',
            partner2Id: motherId || '',
            type: 'marriage',
            startDate: null,
            startPlace: '',
            endDate: null,
            endReason: '',
            childIds: [personId],
            sources: []
          };

          // Remove from old parent union if exists
          let updatedUnions = existingParentUnion
            ? prev.unions.map(u =>
                u.id === existingParentUnion.id
                  ? { ...u, childIds: (u.childIds || []).filter(id => id !== personId) }
                  : u
              )
            : prev.unions || [];

          return { ...prev, unions: [...updatedUnions, newUnion] };
        });
      }
    },
    [
      storageMode,
      selectedPersonId,
      setData,
      showToast,
      removeChild,
      addChild,
      findOrCreateUnion,
      getParentUnionForPerson,
      getUnionsForPerson,
      fetchAllUnions,
      setLoadedUnions,
      setLoadedParentUnion,
    ]
  );

  /**
   * Handle removing a child from a union
   */
  const onRemoveChild = useCallback(
    async (unionId, childId) => {
      if (storageMode === 'bundle') {
        try {
          // Remove child from union in database
          await removeChild(unionId, childId);
          // Reload unions
          const reloadedUnions = await getUnionsForPerson(selectedPersonId);
          setLoadedUnions(reloadedUnions || []);
          await fetchAllUnions();
        } catch (error) {
          console.error('Error removing child:', error);
          showToast('Error removing child');
        }
      } else {
        // Legacy mode
        setData(prev => ({
          ...prev,
          unions: prev.unions.map(u =>
            u.id === unionId
              ? { ...u, childIds: (u.childIds || []).filter(id => id !== childId) }
              : u
          )
        }));
      }
    },
    [
      storageMode,
      selectedPersonId,
      setData,
      showToast,
      removeChild,
      getUnionsForPerson,
      fetchAllUnions,
      setLoadedUnions,
    ]
  );

  return {
    onSave,
    onUnionsChange,
    onParentsChange,
    onRemoveChild,
  };
}
