import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePersonViewConfig } from '../../hooks/usePersonViewConfig';

describe('usePersonViewConfig', () => {
  const mockPersonOps = {
    onUnionsChange: vi.fn(),
    onSave: vi.fn(),
    onParentsChange: vi.fn(),
    onRemoveChild: vi.fn(),
  };

  const mockCitationHandlers = {
    onCreateCitation: vi.fn(),
    onUpdateCitation: vi.fn(),
    onDeleteCitation: vi.fn(),
  };

  const defaultProps = {
    storageMode: 'legacy',
    selectedPersonId: 'person-1',
    personForView: {
      id: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
    },
    peopleForView: [
      { id: 'person-1', firstName: 'John', lastName: 'Doe' },
    ],
    unionsForView: [],
    data: { sources: {} },
    dbUnions: [],
    places: [],
    personCitations: [],
    birthCitations: [],
    deathCitations: [],
    eventCitations: new Map(),
    personUnionCitations: new Map(),
    mediaCitations: new Map(),
    dbSources: {},
    personOps: mockPersonOps,
    setFocusedView: vi.fn(),
    navigateToPerson: vi.fn(),
    navigateBack: vi.fn(),
    navigateForward: vi.fn(),
    canNavigateBack: false,
    canNavigateForward: false,
    setSelectedPersonId: vi.fn(),
    createPlace: vi.fn(),
    createPerson: vi.fn(),
    fetchPersons: vi.fn(),
    deletePerson: vi.fn(),
    fetchAllUnions: vi.fn(),
    triggerRefresh: vi.fn(),
    setData: vi.fn(),
    generateId: vi.fn(),
    citationHandlers: mockCitationHandlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns personViewProps object', () => {
    const { result } = renderHook(() => usePersonViewConfig(defaultProps));

    expect(result.current).toHaveProperty('personViewProps');
    expect(typeof result.current.personViewProps).toBe('object');
  });

  it('includes all required props in personViewProps', () => {
    const { result } = renderHook(() => usePersonViewConfig(defaultProps));
    const { personViewProps } = result.current;

    // Data props
    expect(personViewProps).toHaveProperty('person');
    expect(personViewProps).toHaveProperty('allPeople');
    expect(personViewProps).toHaveProperty('existingUnions');
    expect(personViewProps).toHaveProperty('allUnions');
    expect(personViewProps).toHaveProperty('sources');
    expect(personViewProps).toHaveProperty('places');

    // Handler props
    expect(personViewProps).toHaveProperty('onSave');
    expect(personViewProps).toHaveProperty('onUnionsChange');
    expect(personViewProps).toHaveProperty('onParentsChange');
    expect(personViewProps).toHaveProperty('onRemoveChild');
    expect(personViewProps).toHaveProperty('onCreatePerson');
    expect(personViewProps).toHaveProperty('onDelete');
    expect(personViewProps).toHaveProperty('onCancel');
    expect(personViewProps).toHaveProperty('onSelectPerson');
    expect(personViewProps).toHaveProperty('onNavigateBack');
    expect(personViewProps).toHaveProperty('onNavigateForward');
    expect(personViewProps).toHaveProperty('onCreatePlace');

    // Navigation props
    expect(personViewProps).toHaveProperty('canNavigateBack');
    expect(personViewProps).toHaveProperty('canNavigateForward');

    // Citation props
    expect(personViewProps).toHaveProperty('personCitations');
    expect(personViewProps).toHaveProperty('birthCitations');
    expect(personViewProps).toHaveProperty('deathCitations');
    expect(personViewProps).toHaveProperty('eventCitations');
    expect(personViewProps).toHaveProperty('unionCitations');
    expect(personViewProps).toHaveProperty('mediaCitations');
    expect(personViewProps).toHaveProperty('onCreateCitation');
    expect(personViewProps).toHaveProperty('onUpdateCitation');
    expect(personViewProps).toHaveProperty('onDeleteCitation');
    expect(personViewProps).toHaveProperty('dbSources');
  });

  it('builds allUnions for legacy mode', () => {
    const propsWithUnions = {
      ...defaultProps,
      storageMode: 'legacy',
      data: {
        sources: {},
        unions: [
          { id: 'union-1', partner1Id: 'person-1', partner2Id: 'person-2', childIds: [] }
        ]
      },
    };

    const { result } = renderHook(() => usePersonViewConfig(propsWithUnions));
    expect(result.current.personViewProps.allUnions).toHaveLength(1);
    expect(result.current.personViewProps.allUnions[0].id).toBe('union-1');
  });

  it('builds allUnions for bundle mode', () => {
    const propsWithDbUnions = {
      ...defaultProps,
      storageMode: 'bundle',
      dbUnions: [
        { id: 'union-1', person1_id: 'person-1', person2_id: 'person-2', childIds: [] }
      ],
    };

    const { result } = renderHook(() => usePersonViewConfig(propsWithDbUnions));
    expect(result.current.personViewProps.allUnions).toHaveLength(1);
    expect(result.current.personViewProps.allUnions[0].partner1Id).toBe('person-1');
  });

  it('delegates onSave to personOps', () => {
    const { result } = renderHook(() => usePersonViewConfig(defaultProps));
    expect(result.current.personViewProps.onSave).toBe(mockPersonOps.onSave);
  });

  it('delegates onUnionsChange to personOps', () => {
    const { result } = renderHook(() => usePersonViewConfig(defaultProps));
    expect(result.current.personViewProps.onUnionsChange).toBe(mockPersonOps.onUnionsChange);
  });

  it('provides handler functions that work', () => {
    const mockSetFocusedView = vi.fn();
    const propsWithMocks = {
      ...defaultProps,
      setFocusedView: mockSetFocusedView,
    };

    const { result } = renderHook(() => usePersonViewConfig(propsWithMocks));

    // Test onCancel
    expect(typeof result.current.personViewProps.onCancel).toBe('function');
    result.current.personViewProps.onCancel();
    expect(mockSetFocusedView).toHaveBeenCalledWith('pedigree');
  });
});
