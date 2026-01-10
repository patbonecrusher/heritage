import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePersonForView } from '../../hooks/usePersonForView';
import { createMockPerson, createMockUnion } from '../testUtils';

describe('usePersonForView', () => {
  describe('Legacy mode', () => {
    it('returns person as-is in legacy mode', () => {
      const mockPerson = createMockPerson();
      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'legacy',
          selectedPersonId: mockPerson.id,
          selectedPerson: mockPerson,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: null,
          persons: [],
          vitalEvents: {},
          data: {
            people: [mockPerson],
            unions: [createMockUnion()],
          },
        })
      );

      expect(result.current.personForView).toEqual(mockPerson);
    });

    it('filters unions for selected person in legacy mode', () => {
      const mockPerson = createMockPerson({ id: 'person-1' });
      const mockUnion = createMockUnion({
        partner1Id: 'person-1',
        partner2Id: 'person-2',
      });
      const otherUnion = createMockUnion({
        id: 'union-2',
        partner1Id: 'person-3',
        partner2Id: 'person-4',
      });

      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'legacy',
          selectedPersonId: 'person-1',
          selectedPerson: mockPerson,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: null,
          persons: [],
          vitalEvents: {},
          data: {
            people: [mockPerson],
            unions: [mockUnion, otherUnion],
          },
        })
      );

      expect(result.current.unionsForView).toHaveLength(1);
      expect(result.current.unionsForView[0].id).toBe('union-1');
    });
  });

  describe('Bundle mode', () => {
    it('returns null when selectedPerson is null', () => {
      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'bundle',
          selectedPersonId: 'person-1',
          selectedPerson: null,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: null,
          persons: [],
          vitalEvents: {},
          data: {},
        })
      );

      expect(result.current.personForView).toBeNull();
    });

    it('converts bundle person to view format', () => {
      const mockPerson = {
        id: 'person-1',
        given_names: 'John',
        surname: 'Doe',
        surname_at_birth: 'Smith',
        gender: 'male',
        notes: 'Test notes',
        is_living: false,
      };

      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'bundle',
          selectedPersonId: 'person-1',
          selectedPerson: mockPerson,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: 'person-1',
          persons: [mockPerson],
          vitalEvents: {},
          data: {},
        })
      );

      expect(result.current.personForView.firstName).toBe('John');
      expect(result.current.personForView.lastName).toBe('Doe');
      expect(result.current.personForView.maidenName).toBe('Smith');
      expect(result.current.personForView.gender).toBe('male');
      expect(result.current.personForView.notes).toBe('Test notes');
    });

    it('marks living person as alive', () => {
      const mockPerson = {
        id: 'person-1',
        given_names: 'John',
        surname: 'Doe',
        is_living: true,
      };

      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'bundle',
          selectedPersonId: 'person-1',
          selectedPerson: mockPerson,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: 'person-1',
          persons: [mockPerson],
          vitalEvents: {},
          data: {},
        })
      );

      expect(result.current.personForView.deathDate).toEqual({
        type: 'alive',
        display: 'Living',
      });
    });
  });

  describe('allPeople transformation', () => {
    it('maps legacy people for PersonPicker', () => {
      const mockPerson = createMockPerson();

      const { result } = renderHook(() =>
        usePersonForView({
          storageMode: 'legacy',
          selectedPersonId: mockPerson.id,
          selectedPerson: mockPerson,
          loadedBirthEvent: null,
          loadedDeathEvent: null,
          loadedOtherEvents: [],
          loadedUnions: [],
          loadedParentUnion: null,
          loadedDataForPersonId: null,
          persons: [],
          vitalEvents: {},
          data: {
            people: [mockPerson],
            unions: [],
          },
        })
      );

      expect(result.current.allPeople).toHaveLength(1);
      expect(result.current.allPeople[0]).toHaveProperty('firstName', 'John');
      expect(result.current.allPeople[0]).toHaveProperty('lastName', 'Doe');
    });
  });
});
