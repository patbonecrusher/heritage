import { describe, it, expect } from 'vitest';
import {
  createEmptyData,
  addPerson,
  updatePerson,
  findPersonById,
  findPersonByName,
  getUnionsForPerson,
  getParentIds,
  getChildrenIds,
  getSiblingIds,
} from '../../utils/dataModel';

describe('dataModel utilities', () => {
  describe('createEmptyData', () => {
    it('creates empty data structure', () => {
      const data = createEmptyData();

      expect(data).toHaveProperty('people');
      expect(data).toHaveProperty('unions');
      expect(data).toHaveProperty('sources');
      expect(Array.isArray(data.people)).toBe(true);
      expect(Array.isArray(data.unions)).toBe(true);
      expect(typeof data.sources).toBe('object');
    });

    it('initializes with empty arrays and objects', () => {
      const data = createEmptyData();

      expect(data.people).toHaveLength(0);
      expect(data.unions).toHaveLength(0);
      expect(Object.keys(data.sources)).toHaveLength(0);
    });
  });

  describe('addPerson', () => {
    it('adds person to data', () => {
      const data = createEmptyData();
      const newPerson = {
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
      };

      const result = addPerson(data, newPerson);

      expect(result.people).toHaveLength(1);
      expect(result.people[0]).toEqual(newPerson);
    });

    it('does not mutate original data', () => {
      const data = createEmptyData();
      const newPerson = {
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = addPerson(data, newPerson);

      expect(data.people).toHaveLength(0);
      expect(result.people).toHaveLength(1);
    });

    it('preserves existing people', () => {
      const existingPerson = {
        id: 'person-1',
        firstName: 'Jane',
        lastName: 'Doe',
      };
      const data = {
        people: [existingPerson],
        unions: [],
        sources: {},
      };

      const newPerson = {
        id: 'person-2',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = addPerson(data, newPerson);

      expect(result.people).toHaveLength(2);
      expect(result.people[0].id).toBe('person-1');
      expect(result.people[1].id).toBe('person-2');
    });
  });

  describe('updatePerson', () => {
    it('updates existing person', () => {
      const data = {
        people: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
            gender: 'male',
          },
        ],
        unions: [],
        sources: {},
      };

      const updatedPerson = {
        id: 'person-1',
        firstName: 'Jonathan',
        lastName: 'Doe',
        gender: 'male',
      };

      const result = updatePerson(data, 'person-1', updatedPerson);

      expect(result.people[0].firstName).toBe('Jonathan');
    });

    it('returns data unchanged if person not found', () => {
      const data = {
        people: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
          },
        ],
        unions: [],
        sources: {},
      };

      const updatedPerson = {
        id: 'person-999',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const result = updatePerson(data, 'person-999', updatedPerson);

      expect(result.people[0].firstName).toBe('John');
    });

    it('does not mutate original data', () => {
      const data = {
        people: [
          {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
          },
        ],
        unions: [],
        sources: {},
      };

      const updatedPerson = {
        id: 'person-1',
        firstName: 'Jonathan',
        lastName: 'Doe',
      };

      const result = updatePerson(data, 'person-1', updatedPerson);

      expect(data.people[0].firstName).toBe('John');
      expect(result.people[0].firstName).toBe('Jonathan');
    });
  });

  describe('findPersonById', () => {
    it('finds person by id', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Doe' },
        ],
        unions: [],
        sources: {},
      };

      const result = findPersonById(data, 'person-2');

      expect(result).toEqual({
        id: 'person-2',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });

    it('returns null if person not found', () => {
      const data = {
        people: [{ id: 'person-1', firstName: 'John', lastName: 'Doe' }],
        unions: [],
        sources: {},
      };

      const result = findPersonById(data, 'person-999');

      expect(result).toBeNull();
    });

    it('handles empty people array', () => {
      const data = {
        people: [],
        unions: [],
        sources: {},
      };

      const result = findPersonById(data, 'person-1');

      expect(result).toBeNull();
    });
  });

  describe('findPersonByName', () => {
    it('finds person by first name', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Doe' },
        ],
        unions: [],
        sources: {},
      };

      const result = findPersonByName(data, 'John');

      expect(result).toBeDefined();
      expect(result[0].firstName).toBe('John');
    });

    it('finds person by last name', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Smith' },
        ],
        unions: [],
        sources: {},
      };

      const result = findPersonByName(data, 'Doe');

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    it('returns empty array if no matches', () => {
      const data = {
        people: [{ id: 'person-1', firstName: 'John', lastName: 'Doe' }],
        unions: [],
        sources: {},
      };

      const result = findPersonByName(data, 'Unknown');

      expect(result).toEqual([]);
    });
  });

  describe('family relationships', () => {
    it('gets unions for a person', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Doe' },
          { id: 'person-3', firstName: 'Bob', lastName: 'Smith' },
        ],
        unions: [
          {
            id: 'union-1',
            partner1Id: 'person-1',
            partner2Id: 'person-2',
            childIds: [],
          },
        ],
        sources: {},
      };

      const result = getUnionsForPerson(data, 'person-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('union-1');
    });

    it('gets parent ids for a person', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'John', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Jane', lastName: 'Doe' },
          { id: 'person-3', firstName: 'Child', lastName: 'Doe' },
        ],
        unions: [
          {
            id: 'union-1',
            partner1Id: 'person-1',
            partner2Id: 'person-2',
            childIds: ['person-3'],
          },
        ],
        sources: {},
      };

      const result = getParentIds(data, 'person-3');

      expect(result).toContain('person-1');
      expect(result).toContain('person-2');
    });

    it('gets children ids for a person', () => {
      const data = {
        people: [
          { id: 'person-1', firstName: 'Parent', lastName: 'Doe' },
          { id: 'person-2', firstName: 'Spouse', lastName: 'Doe' },
          { id: 'person-3', firstName: 'Child', lastName: 'Doe' },
        ],
        unions: [
          {
            id: 'union-1',
            partner1Id: 'person-1',
            partner2Id: 'person-2',
            childIds: ['person-3'],
          },
        ],
        sources: {},
      };

      const result = getChildrenIds(data, 'person-1');

      expect(result).toContain('person-3');
    });
  });
});
