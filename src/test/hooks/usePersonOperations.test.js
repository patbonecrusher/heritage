import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonOperations } from '../../hooks/usePersonOperations';

describe('usePersonOperations', () => {
  const mockShowToast = vi.fn();
  const mockSetData = vi.fn();
  const mockSetLoadedBirthEvent = vi.fn();
  const mockSetLoadedDeathEvent = vi.fn();
  const mockSetLoadedOtherEvents = vi.fn();
  const mockSetLoadedUnions = vi.fn();
  const mockSetLoadedParentUnion = vi.fn();

  // Bundle mode mocks
  const mockUpdatePersonDb = vi.fn();
  const mockCreateUnion = vi.fn();
  const mockUpdateUnion = vi.fn();
  const mockDeleteUnion = vi.fn();
  const mockAddChild = vi.fn();
  const mockRemoveChild = vi.fn();
  const mockCreateEvent = vi.fn();
  const mockUpdateEvent = vi.fn();
  const mockDeleteEvent = vi.fn();
  const mockUpsertBirthEvent = vi.fn();
  const mockUpsertDeathEvent = vi.fn();
  const mockUpsertMarriageEvent = vi.fn();
  const mockGetBirthEvent = vi.fn();
  const mockGetDeathEvent = vi.fn();
  const mockGetEventsForPerson = vi.fn();
  const mockGetUnionsForPerson = vi.fn();
  const mockGetParentUnionForPerson = vi.fn();
  const mockFindOrCreateUnion = vi.fn();
  const mockFetchAllUnions = vi.fn();
  const mockTriggerRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBirthEvent.mockResolvedValue(null);
    mockGetDeathEvent.mockResolvedValue(null);
    mockGetEventsForPerson.mockResolvedValue([]);
    mockGetUnionsForPerson.mockResolvedValue([]);
  });

  const defaultProps = {
    storageMode: 'legacy',
    selectedPersonId: 'person-1',
    data: { people: [], unions: [], sources: {} },
    setData: mockSetData,
    showToast: mockShowToast,
    // Bundle mode functions
    updatePersonDb: mockUpdatePersonDb,
    createUnion: mockCreateUnion,
    updateUnion: mockUpdateUnion,
    deleteUnion: mockDeleteUnion,
    addChild: mockAddChild,
    removeChild: mockRemoveChild,
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
    upsertBirthEvent: mockUpsertBirthEvent,
    upsertDeathEvent: mockUpsertDeathEvent,
    upsertMarriageEvent: mockUpsertMarriageEvent,
    getBirthEvent: mockGetBirthEvent,
    getDeathEvent: mockGetDeathEvent,
    getEventsForPerson: mockGetEventsForPerson,
    getUnionsForPerson: mockGetUnionsForPerson,
    getParentUnionForPerson: mockGetParentUnionForPerson,
    findOrCreateUnion: mockFindOrCreateUnion,
    fetchAllUnions: mockFetchAllUnions,
    triggerRefresh: mockTriggerRefresh,
    setLoadedBirthEvent: mockSetLoadedBirthEvent,
    setLoadedDeathEvent: mockSetLoadedDeathEvent,
    setLoadedOtherEvents: mockSetLoadedOtherEvents,
    setLoadedUnions: mockSetLoadedUnions,
    setLoadedParentUnion: mockSetLoadedParentUnion,
    loadedUnions: [],
    loadedOtherEvents: [],
  };

  describe('onSave', () => {
    it('exists and is callable', () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      expect(typeof result.current.onSave).toBe('function');
    });

    it('handles legacy mode save', async () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      const updatedData = { firstName: 'John', lastName: 'Doe' };

      await act(async () => {
        await result.current.onSave(updatedData);
      });

      expect(mockSetData).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Saved');
    });

    it('returns early if no selectedPersonId', async () => {
      const props = { ...defaultProps, selectedPersonId: null };
      const { result } = renderHook(() => usePersonOperations(props));

      await act(async () => {
        await result.current.onSave({ firstName: 'John' });
      });

      expect(mockSetData).not.toHaveBeenCalled();
    });
  });

  describe('onUnionsChange', () => {
    it('exists and is callable', () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      expect(typeof result.current.onUnionsChange).toBe('function');
    });

    it('handles legacy mode union changes', async () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      const updatedUnions = [
        { id: 'union-1', partner1Id: 'person-1', partner2Id: 'person-2' }
      ];

      await act(async () => {
        await result.current.onUnionsChange(updatedUnions);
      });

      expect(mockSetData).toHaveBeenCalled();
    });
  });

  describe('onParentsChange', () => {
    it('exists and is callable', () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      expect(typeof result.current.onParentsChange).toBe('function');
    });

    it('handles legacy mode parent changes', async () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));

      await act(async () => {
        await result.current.onParentsChange({
          personId: 'child-1',
          fatherId: 'father-1',
          motherId: 'mother-1'
        });
      });

      expect(mockSetData).toHaveBeenCalled();
    });

    it('handles removing all parents in legacy mode', async () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));

      await act(async () => {
        await result.current.onParentsChange({
          personId: 'child-1',
          fatherId: null,
          motherId: null
        });
      });

      expect(mockSetData).toHaveBeenCalled();
    });
  });

  describe('onRemoveChild', () => {
    it('exists and is callable', () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));
      expect(typeof result.current.onRemoveChild).toBe('function');
    });

    it('handles legacy mode child removal', async () => {
      const { result } = renderHook(() => usePersonOperations(defaultProps));

      await act(async () => {
        await result.current.onRemoveChild('union-1', 'child-1');
      });

      expect(mockSetData).toHaveBeenCalled();
    });
  });

  describe('Bundle mode operations', () => {
    it('calls database functions in bundle mode for onSave', async () => {
      mockCreateUnion.mockResolvedValue('union-1');

      const bundleProps = {
        ...defaultProps,
        storageMode: 'bundle',
      };

      const { result } = renderHook(() => usePersonOperations(bundleProps));
      const updatedData = {
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        notes: 'Test',
        birthDate: { type: 'unknown' },
        deathDate: { type: 'unknown' },
      };

      await act(async () => {
        await result.current.onSave(updatedData);
      });

      expect(mockUpdatePersonDb).toHaveBeenCalledWith('person-1', expect.objectContaining({
        given_names: 'John',
        surname: 'Doe',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Saved');
    });

    it('removes child in bundle mode', async () => {
      const bundleProps = {
        ...defaultProps,
        storageMode: 'bundle',
      };

      const { result } = renderHook(() => usePersonOperations(bundleProps));

      await act(async () => {
        await result.current.onRemoveChild('union-1', 'child-1');
      });

      expect(mockRemoveChild).toHaveBeenCalledWith('union-1', 'child-1');
      expect(mockFetchAllUnions).toHaveBeenCalled();
    });
  });
});
