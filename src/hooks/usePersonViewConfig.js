/**
 * usePersonViewConfig - Hook for building PersonView props configuration
 * Consolidates all PersonView prop preparation into a single hook
 * Works in both bundle (database) and legacy (JSON) storage modes
 */

import { useCallback, useMemo } from 'react';

export function usePersonViewConfig({
  storageMode,
  selectedPersonId,
  personForView,
  peopleForView,
  unionsForView,
  data,
  dbUnions,
  places,
  personCitations,
  birthCitations,
  deathCitations,
  eventCitations,
  personUnionCitations,
  mediaCitations,
  dbSources,
  // Operations
  personOps,
  setFocusedView,
  navigateToPerson,
  navigateBack,
  navigateForward,
  canNavigateBack,
  canNavigateForward,
  setSelectedPersonId,
  createPlace,
  createPerson,
  fetchPersons,
  deletePerson,
  fetchAllUnions,
  triggerRefresh,
  setData,
  generateId,
  // Citation handlers
  citationHandlers,
}) {
  /**
   * Build allUnions array (works in both modes)
   */
  const allUnions = useMemo(() => {
    if (storageMode === 'bundle') {
      return dbUnions.map(u => ({
        id: u.id,
        partner1Id: u.person1_id,
        partner2Id: u.person2_id,
        childIds: u.childIds || [],
      }));
    }
    return data.unions || [];
  }, [storageMode, dbUnions, data.unions]);

  /**
   * Handle creating a new place
   */
  const handleCreatePlace = useCallback(
    async (name) => {
      if (storageMode === 'bundle') {
        const id = await createPlace({ name });
        return { id, name };
      }
      return null;
    },
    [storageMode, createPlace]
  );

  /**
   * Handle creating a new person
   */
  const handleCreatePerson = useCallback(
    ({ firstName, lastName, gender }) => {
      if (storageMode === 'bundle') {
        // Generate ID upfront so we can return it immediately
        const newId = generateId();
        // Create person in database asynchronously
        createPerson({
          id: newId,
          given_names: firstName || '',
          surname: lastName || '',
          gender: gender || 'unknown',
        }).then(() => {
          fetchPersons();
        });
        return newId;
      } else {
        // Legacy mode
        const newId = String(Date.now());
        const newPerson = {
          id: newId,
          firstName: firstName || '',
          lastName: lastName || '',
          middleName: '',
          maidenName: '',
          nickname: '',
          title: '',
          gender: gender || 'male',
          birthDate: { type: 'unknown' },
          deathDate: { type: 'unknown' },
          birthPlace: '',
          deathPlace: '',
          notes: '',
          image: '',
          events: [],
        };
        setData(prev => ({
          ...prev,
          people: [...(prev.people || []), newPerson]
        }));
        return newId;
      }
    },
    [storageMode, generateId, createPerson, fetchPersons, setData]
  );

  /**
   * Handle deleting a person
   */
  const handleDeletePerson = useCallback(
    async (personId) => {
      // Clear selection first to avoid showing deleted person
      setSelectedPersonId(null);
      setFocusedView('pedigree');

      if (storageMode === 'bundle') {
        // Then delete and trigger refresh for all hooks (including Sidebar)
        await deletePerson(personId);
        await fetchAllUnions();
        triggerRefresh();
      } else {
        // Legacy mode - update data
        setData(prev => ({
          ...prev,
          people: (prev.people || []).filter(p => p.id !== personId),
          // Also remove from any unions
          unions: (prev.unions || []).map(u => ({
            ...u,
            childIds: (u.childIds || []).filter(id => id !== personId)
          })).filter(u => u.partner1Id !== personId && u.partner2Id !== personId)
        }));
      }
    },
    [storageMode, setSelectedPersonId, setFocusedView, deletePerson, fetchAllUnions, triggerRefresh, setData]
  );

  /**
   * Handle cancel (close PersonView and go back to pedigree)
   */
  const handleCancel = useCallback(
    () => {
      setFocusedView('pedigree');
    },
    [setFocusedView]
  );

  /**
   * Build the complete PersonView props object
   */
  const personViewProps = useMemo(
    () => ({
      person: personForView,
      sources: data.sources || {},
      onAddSource: () => {}, // TODO: Implement onAddSource
      allPeople: peopleForView,
      existingUnions: unionsForView,
      allUnions,
      onUnionsChange: personOps.onUnionsChange,
      onSave: personOps.onSave,
      onCancel: handleCancel,
      onSelectPerson: navigateToPerson,
      onNavigateBack: navigateBack,
      canNavigateBack: canNavigateBack,
      onNavigateForward: navigateForward,
      canNavigateForward: canNavigateForward,
      places: places,
      onCreatePlace: handleCreatePlace,
      onParentsChange: personOps.onParentsChange,
      onRemoveChild: personOps.onRemoveChild,
      onCreatePerson: handleCreatePerson,
      onDelete: handleDeletePerson,
      // Citation props
      personCitations,
      birthCitations,
      deathCitations,
      eventCitations,
      unionCitations: personUnionCitations,
      mediaCitations,
      onCreateCitation: citationHandlers.onCreateCitation,
      onUpdateCitation: citationHandlers.onUpdateCitation,
      onDeleteCitation: citationHandlers.onDeleteCitation,
      dbSources,
    }),
    [
      personForView,
      data.sources,
      peopleForView,
      unionsForView,
      allUnions,
      personOps,
      handleCancel,
      navigateToPerson,
      navigateBack,
      canNavigateBack,
      navigateForward,
      canNavigateForward,
      places,
      handleCreatePlace,
      handleCreatePerson,
      handleDeletePerson,
      personCitations,
      birthCitations,
      deathCitations,
      eventCitations,
      personUnionCitations,
      mediaCitations,
      citationHandlers,
      dbSources,
    ]
  );

  return {
    personViewProps,
    handleDeletePerson,
  };
}
