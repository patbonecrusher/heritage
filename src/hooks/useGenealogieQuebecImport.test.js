import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGenealogieQuebecImport } from './useGenealogieQuebecImport';

describe('useGenealogieQuebecImport', () => {
  const mockAllPeople = [
    {
      id: 'person-1',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: { year: '1850', month: '05', day: '15' },
      birthPlace: 'Montreal',
    },
    {
      id: 'person-2',
      firstName: 'Marie',
      lastName: 'Tremblay',
      birthDate: { year: '1875', month: '03', day: '22' },
      birthPlace: 'Quebec City',
    },
  ];

  const mockCallbacks = {
    onCreatePerson: vi.fn(async () => 'person-new'),
    onCreateEvent: vi.fn(async () => 'event-123'),
    onCreateSource: vi.fn(async () => 'source-gq'),
    onCreateCitation: vi.fn(async () => 'citation-123'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseJsonFile', () => {
    it('parses valid JSON file with single record', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const jsonData = {
        givenNames: 'Jean-Marie',
        surname: 'Dupont',
        birthDate: '15/05/1850',
        recordId: 'gq-123',
      };

      const file = new File([JSON.stringify(jsonData)], 'test.json', {
        type: 'application/json',
      });

      await act(async () => {
        await result.current.parseJsonFile(file);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(1);
      expect(result.current.importState.parsedRecords[0].givenNames).toBe('Jean-Marie');
      expect(result.current.importState.method).toBe('file');
    });

    it('parses JSON file with array of records', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const jsonData = [
        { givenNames: 'Jean', surname: 'Dupont', birthDate: '1850' },
        { givenNames: 'Marie', surname: 'Tremblay', birthDate: '1875' },
      ];

      const file = new File([JSON.stringify(jsonData)], 'test.json', {
        type: 'application/json',
      });

      await act(async () => {
        await result.current.parseJsonFile(file);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(2);
    });

    it('handles invalid JSON file', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const file = new File(['invalid json {'], 'test.json', {
        type: 'application/json',
      });

      await act(async () => {
        try {
          await result.current.parseJsonFile(file);
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.importState.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parsePastedData', () => {
    it('parses JSON pasted data', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const jsonData = JSON.stringify({
        givenNames: 'Jean-Marie',
        surname: 'Dupont',
        birthDate: '15/05/1850',
      });

      act(() => {
        result.current.parsePastedData(jsonData);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(1);
      expect(result.current.importState.method).toBe('paste');
    });

    it('parses tab-separated values', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const tsvData = 'Jean\tDupont\t1850\tMontreal\t1920\tQuebec\thttps://gq.com/123';

      act(() => {
        result.current.parsePastedData(tsvData);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(1);
      expect(result.current.importState.parsedRecords[0].givenNames).toBe('Jean');
      expect(result.current.importState.parsedRecords[0].surname).toBe('Dupont');
    });

    it('handles invalid JSON gracefully', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        try {
          result.current.parsePastedData('invalid json {');
        } catch (e) {
          // Expected
        }
      });

      // Should either parse as TSV or error
      expect(result.current.importState.errors.length > 0 || result.current.importState.parsedRecords.length > 0).toBe(
        true
      );
    });
  });

  describe('createManualRecord', () => {
    it('creates manual record with all fields', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const formData = {
        givenNames: 'Jean-Marie',
        surname: 'Dupont',
        birthDate: '15/05/1850',
        birthPlace: 'Montréal',
        deathDate: '22/03/1920',
        deathPlace: 'Trois-Rivières',
        recordUrl: 'https://gq.com/123',
      };

      act(() => {
        result.current.createManualRecord(formData);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(1);
      expect(result.current.importState.method).toBe('manual');
      expect(result.current.importState.parsedRecords[0].givenNames).toBe('Jean-Marie');
    });

    it('allows multiple manual entries', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const record1 = { givenNames: 'Jean', surname: 'Dupont' };
      const record2 = { givenNames: 'Marie', surname: 'Tremblay' };

      act(() => {
        result.current.createManualRecord(record1);
        result.current.createManualRecord(record2);
      });

      expect(result.current.importState.parsedRecords).toHaveLength(2);
    });
  });

  describe('findDuplicates', () => {
    it('finds exact name match', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const gqRecord = {
        givenNames: 'Jean',
        surname: 'Dupont',
        birthDate: { year: '1850' },
        birthPlace: 'Montreal',
      };

      const duplicates = result.current.findDuplicates(gqRecord);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].personId).toBe('person-1');
      expect(duplicates[0].confidenceScore).toBeGreaterThanOrEqual(40);
    });

    it('returns empty array for no matches', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      const gqRecord = {
        givenNames: 'Unknown',
        surname: 'Person',
        birthDate: { year: '2000' },
      };

      const duplicates = result.current.findDuplicates(gqRecord);

      expect(duplicates).toHaveLength(0);
    });

    it('sorts matches by confidence score descending', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: [
            ...mockAllPeople,
            {
              id: 'person-3',
              firstName: 'Jean',
              lastName: 'Dupont',
              birthDate: { year: '1849', month: '05', day: '15' },
              birthPlace: 'Montreal',
            },
          ],
          ...mockCallbacks,
        })
      );

      const gqRecord = {
        givenNames: 'Jean',
        surname: 'Dupont',
        birthDate: { year: '1850' },
        birthPlace: 'Montreal',
      };

      const duplicates = result.current.findDuplicates(gqRecord);

      // Should be sorted by confidence (higher first)
      for (let i = 0; i < duplicates.length - 1; i++) {
        expect(duplicates[i].confidenceScore).toBeGreaterThanOrEqual(duplicates[i + 1].confidenceScore);
      }
    });
  });

  describe('detectAllDuplicates', () => {
    it('detects duplicates for all records', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify([
            { givenNames: 'Jean', surname: 'Dupont', birthDate: '1850' },
            { givenNames: 'Marie', surname: 'Tremblay', birthDate: '1875' },
            { givenNames: 'Unknown', surname: 'Person', birthDate: '2000' },
          ])
        );
      });

      act(() => {
        result.current.detectAllDuplicates();
      });

      // Should detect matches for first two records
      expect(Object.keys(result.current.importState.duplicateMatches).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('setRecordAction', () => {
    it('sets action to create new person', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(JSON.stringify({ givenNames: 'John', surname: 'Doe' }));
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'create');
      });

      expect(result.current.importState.selectedActions[gqId]).toBe('create');
    });

    it('sets action to link existing person', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(JSON.stringify({ givenNames: 'Jean', surname: 'Dupont' }));
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'link', 'person-1');
      });

      expect(result.current.importState.selectedActions[gqId]).toBe('link');
      expect(result.current.importState.linkedPersonIds[gqId]).toBe('person-1');
    });

    it('sets action to skip record', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(JSON.stringify({ givenNames: 'John', surname: 'Doe' }));
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'skip');
      });

      expect(result.current.importState.selectedActions[gqId]).toBe('skip');
    });
  });

  describe('executeImport', () => {
    it('creates new person with events and citations', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify({
            givenNames: 'Jean-Marie',
            surname: 'Dupont',
            birthDate: '15/05/1850',
            birthPlace: 'Montréal',
            recordUrl: 'https://gq.com/123',
            collectionName: 'Drouin Records',
            recordType: 'birth',
          })
        );
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'create');
      });

      await act(async () => {
        await result.current.executeImport();
      });

      expect(mockCallbacks.onCreatePerson).toHaveBeenCalled();
      expect(mockCallbacks.onCreateEvent).toHaveBeenCalled();
      expect(mockCallbacks.onCreateSource).toHaveBeenCalled();
      expect(mockCallbacks.onCreateCitation).toHaveBeenCalled();
    });

    it('links to existing person instead of creating', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify({
            givenNames: 'Jean',
            surname: 'Dupont',
            birthDate: '1850',
          })
        );
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'link', 'person-1');
      });

      await act(async () => {
        await result.current.executeImport();
      });

      // Should NOT create new person
      expect(mockCallbacks.onCreatePerson).not.toHaveBeenCalled();
      // But should create citation
      expect(mockCallbacks.onCreateCitation).toHaveBeenCalled();
    });

    it('skips records marked as skip', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify({
            givenNames: 'John',
            surname: 'Doe',
          })
        );
      });

      const gqId = result.current.importState.parsedRecords[0].gqId;

      act(() => {
        result.current.setRecordAction(gqId, 'skip');
      });

      await act(async () => {
        await result.current.executeImport();
      });

      expect(mockCallbacks.onCreatePerson).not.toHaveBeenCalled();
      expect(mockCallbacks.onCreateEvent).not.toHaveBeenCalled();
    });

    it('updates progress during import', async () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify([
            { givenNames: 'Jean', surname: 'Dupont' },
            { givenNames: 'Marie', surname: 'Tremblay' },
          ])
        );
      });

      act(() => {
        result.current.importState.parsedRecords.forEach(record => {
          result.current.setRecordAction(record.gqId, 'create');
        });
      });

      await act(async () => {
        await result.current.executeImport();
      });

      expect(result.current.importState.importProgress.total).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all import state', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(JSON.stringify({ givenNames: 'John', surname: 'Doe' }));
      });

      expect(result.current.importState.parsedRecords).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.importState.parsedRecords).toHaveLength(0);
      expect(result.current.importState.method).toBeNull();
      expect(result.current.importState.selectedActions).toEqual({});
    });
  });

  describe('computed values', () => {
    it('readyToImport is false with no records', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      expect(result.current.readyToImport).toBe(false);
    });

    it('readyToImport is true when all records have actions', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify([
            { givenNames: 'Jean', surname: 'Dupont' },
            { givenNames: 'Marie', surname: 'Tremblay' },
          ])
        );
      });

      expect(result.current.readyToImport).toBe(false);

      const records = result.current.importState.parsedRecords;

      act(() => {
        records.forEach(record => {
          result.current.setRecordAction(record.gqId, 'create');
        });
      });

      expect(result.current.readyToImport).toBe(true);
    });

    it('summary shows correct counts', () => {
      const { result } = renderHook(() =>
        useGenealogieQuebecImport({
          allPeople: mockAllPeople,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.parsePastedData(
          JSON.stringify([
            { givenNames: 'Jean', surname: 'Dupont' },
            { givenNames: 'Marie', surname: 'Tremblay' },
            { givenNames: 'John', surname: 'Doe' },
          ])
        );
      });

      const records = result.current.importState.parsedRecords;

      act(() => {
        result.current.setRecordAction(records[0].gqId, 'create');
        result.current.setRecordAction(records[1].gqId, 'link');
        result.current.setRecordAction(records[2].gqId, 'skip');
      });

      expect(result.current.summary.total).toBe(3);
      expect(result.current.summary.toCreate).toBe(1);
      expect(result.current.summary.toLink).toBe(1);
      expect(result.current.summary.toSkip).toBe(1);
    });
  });
});
