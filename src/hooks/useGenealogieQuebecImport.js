/**
 * useGenealogieQuebecImport - Hook for managing GQ import workflow
 *
 * Handles:
 * - Data parsing (file, paste, manual)
 * - Duplicate detection
 * - Import execution
 * - Progress tracking
 * - Error recovery
 */

import { useState, useCallback, useMemo } from 'react';
import {
  gqRecordToHeritagePerson,
  gqRecordToHeritageEvent,
  gqRecordToCitation,
  parseGQDate,
  normalizeQCPlace,
} from '@/integrations/genealogieQuebec/dataMapper';

// Duplicate detection helper
function calculateMatchConfidence(gqRecord, heritageRecord) {
  let score = 0;

  // Name matching (40%)
  if (gqRecord.surname?.toLowerCase() === heritageRecord.lastName?.toLowerCase()) {
    score += 25;
  }
  if (gqRecord.givenNames?.toLowerCase().includes(heritageRecord.firstName?.toLowerCase())) {
    score += 15;
  }

  // Birth year (30%)
  const gqBirthYear = gqRecord.birthDate?.year;
  const heritBirthYear = heritageRecord.birthDate?.year;
  if (gqBirthYear && heritBirthYear) {
    if (gqBirthYear === heritBirthYear) {
      score += 25;
    } else if (Math.abs(parseInt(gqBirthYear) - parseInt(heritBirthYear)) <= 2) {
      score += 15;
    }
  }

  // Birth place (20%)
  const gqBirthPlace = normalizeQCPlace(gqRecord.birthPlace);
  const heritBirthPlace = heritageRecord.birthPlace;
  if (gqBirthPlace && heritBirthPlace && gqBirthPlace.toLowerCase() === heritBirthPlace.toLowerCase()) {
    score += 20;
  }

  // Death year (10%)
  const gqDeathYear = gqRecord.deathDate?.year;
  const heritDeathYear = heritageRecord.deathDate?.year;
  if (gqDeathYear && heritDeathYear && gqDeathYear === heritDeathYear) {
    score += 10;
  }

  return Math.min(100, score);
}

export function useGenealogieQuebecImport({
  allPeople = [],
  onCreatePerson = async () => null,
  onCreateEvent = async () => null,
  onCreateSource = async () => null,
  onCreateCitation = async () => null,
}) {
  const [importState, setImportState] = useState({
    method: null, // 'file' | 'paste' | 'manual'
    rawData: '',
    parsedRecords: [],
    importQueue: [],
    duplicateMatches: {}, // Map of gqId -> [matches]
    selectedActions: {}, // Map of gqId -> 'create' | 'link' | 'skip'
    linkedPersonIds: {}, // Map of gqId -> personId
    importProgress: { current: 0, total: 0 },
    errors: [],
    isImporting: false,
  });

  /**
   * Parse file upload
   */
  const parseJsonFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const records = Array.isArray(data) ? data : [data];

      const parsed = records.map((record, idx) => ({
        gqId: record.recordId || `gq-${idx}`,
        ...record,
        _index: idx,
        _errors: validateRecord(record),
      }));

      setImportState(prev => ({
        ...prev,
        method: 'file',
        parsedRecords: parsed,
        rawData: file.name,
      }));

      return parsed;
    } catch (error) {
      const errorMsg = `Failed to parse file: ${error.message}`;
      setImportState(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'file', message: errorMsg }],
      }));
      throw error;
    }
  }, []);

  /**
   * Parse pasted text data
   */
  const parsePastedData = useCallback((text) => {
    try {
      // Try JSON first
      try {
        const data = JSON.parse(text);
        const records = Array.isArray(data) ? data : [data];
        const parsed = records.map((record, idx) => ({
          gqId: record.recordId || `gq-${idx}`,
          ...record,
          _index: idx,
          _errors: validateRecord(record),
        }));

        setImportState(prev => ({
          ...prev,
          method: 'paste',
          parsedRecords: parsed,
          rawData: text,
        }));

        return parsed;
      } catch {
        // Try tab-separated
        const lines = text.trim().split('\n');
        if (lines.length > 0) {
          const records = lines.map((line, idx) => {
            const [givenNames, surname, birthDate, birthPlace, deathDate, deathPlace, recordUrl] =
              line.split('\t').map(s => s.trim());

            return {
              gqId: recordUrl || `pasted-${idx}`,
              givenNames,
              surname,
              birthDate: parseGQDate(birthDate),
              birthPlace,
              deathDate: deathDate ? parseGQDate(deathDate) : null,
              deathPlace,
              recordUrl,
              _index: idx,
              _errors: validateRecord({
                givenNames,
                surname,
                birthDate,
              }),
            };
          });

          setImportState(prev => ({
            ...prev,
            method: 'paste',
            parsedRecords: records,
            rawData: text,
          }));

          return records;
        }
      }
    } catch (error) {
      const errorMsg = `Failed to parse pasted data: ${error.message}`;
      setImportState(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'parse', message: errorMsg }],
      }));
      throw error;
    }
  }, []);

  /**
   * Create manual entry record
   */
  const createManualRecord = useCallback((formData) => {
    const record = {
      gqId: `manual-${Date.now()}`,
      givenNames: formData.givenNames || '',
      surname: formData.surname || '',
      gender: formData.gender || 'unknown',
      birthDate: parseGQDate(formData.birthDate || ''),
      birthPlace: formData.birthPlace || '',
      deathDate: formData.deathDate ? parseGQDate(formData.deathDate) : null,
      deathPlace: formData.deathPlace || '',
      recordUrl: formData.recordUrl || '',
      collectionName: formData.collectionName || 'GénéalogieQuébec',
      recordType: formData.recordType || 'other',
      confidence: formData.confidence || 'probable',
      _index: importState.parsedRecords.length,
      _errors: validateRecord(formData),
    };

    const newRecords = [...importState.parsedRecords, record];
    setImportState(prev => ({
      ...prev,
      method: 'manual',
      parsedRecords: newRecords,
    }));

    return record;
  }, [importState.parsedRecords.length]);

  /**
   * Validate a record for required fields
   */
  function validateRecord(record) {
    const errors = [];

    if (!record.givenNames && !record.surname) {
      errors.push('At least one name field (given or surname) is required');
    }

    if (!record.birthDate) {
      errors.push('Birth date is recommended');
    }

    if (record.birthDate && record.birthDate.type === 'unknown') {
      errors.push('Birth date format not recognized');
    }

    return errors;
  }

  /**
   * Find duplicate matches for a record
   */
  const findDuplicates = useCallback((gqRecord) => {
    const matches = allPeople
      .map(person => ({
        personId: person.id,
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        birthDate: person.birthDate || {},
        birthPlace: person.birthPlace || '',
        confidenceScore: calculateMatchConfidence(gqRecord, person),
      }))
      .filter(m => m.confidenceScore > 40) // Only show potential matches
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5); // Top 5 matches

    return matches;
  }, [allPeople]);

  /**
   * Detect all duplicates
   */
  const detectAllDuplicates = useCallback(() => {
    const matches = {};

    importState.parsedRecords.forEach(record => {
      const found = findDuplicates(record);
      if (found.length > 0) {
        matches[record.gqId] = found;
      }
    });

    setImportState(prev => ({
      ...prev,
      duplicateMatches: matches,
    }));

    return matches;
  }, [importState.parsedRecords, findDuplicates]);

  /**
   * Set action for a record
   */
  const setRecordAction = useCallback((gqId, action, linkedPersonId = null) => {
    setImportState(prev => ({
      ...prev,
      selectedActions: { ...prev.selectedActions, [gqId]: action },
      linkedPersonIds: linkedPersonId ? { ...prev.linkedPersonIds, [gqId]: linkedPersonId } : prev.linkedPersonIds,
    }));
  }, []);

  /**
   * Import a single record
   */
  const importSingleRecord = useCallback(
    async (gqRecord) => {
      const action = importState.selectedActions[gqRecord.gqId];

      // If skipped, do nothing
      if (action === 'skip') {
        return { status: 'skipped', gqId: gqRecord.gqId };
      }

      try {
        // Create GQ source (once per import)
        let sourceId;
        try {
          sourceId = await onCreateSource({
            name: 'GénéalogieQuébec',
            type: 'website',
            url: 'https://genealogiequebec.com',
            notes: gqRecord.collectionName || 'GénéalogieQuébec records',
          });
        } catch (err) {
          // Source might already exist, that's ok
          sourceId = null;
        }

        let personId;

        if (action === 'link') {
          // Link to existing person
          personId = importState.linkedPersonIds[gqRecord.gqId];

          // Add events if not present
          if (gqRecord.birthDate) {
            await onCreateEvent({
              person_id: personId,
              type: 'birth',
              date: gqRecord.birthDate,
              place_name: normalizeQCPlace(gqRecord.birthPlace) || '',
              notes: `GQ Import: ${gqRecord.collectionName}`,
            });
          }

          if (gqRecord.deathDate) {
            await onCreateEvent({
              person_id: personId,
              type: 'death',
              date: gqRecord.deathDate,
              place_name: normalizeQCPlace(gqRecord.deathPlace) || '',
              notes: `GQ Import: ${gqRecord.collectionName}`,
            });
          }
        } else {
          // Create new person (action === 'create')
          personId = await onCreatePerson({
            given_names: gqRecord.givenNames || '',
            surname: gqRecord.surname || '',
            gender: gqRecord.gender || 'unknown',
            notes: `Imported from GénéalogieQuébec\nCollection: ${gqRecord.collectionName}`,
            is_living: gqRecord.deathDate ? 0 : 1,
          });

          // Create birth event
          if (gqRecord.birthDate) {
            await onCreateEvent({
              person_id: personId,
              type: 'birth',
              date: gqRecord.birthDate,
              place_name: normalizeQCPlace(gqRecord.birthPlace) || '',
              notes: `GQ Import: ${gqRecord.collectionName}`,
            });
          }

          // Create death event
          if (gqRecord.deathDate) {
            await onCreateEvent({
              person_id: personId,
              type: 'death',
              date: gqRecord.deathDate,
              place_name: normalizeQCPlace(gqRecord.deathPlace) || '',
              notes: `GQ Import: ${gqRecord.collectionName}`,
            });
          }
        }

        // Create citation
        if (sourceId && personId) {
          await onCreateCitation({
            source_id: sourceId,
            person_id: personId,
            entry_number: gqRecord.recordId || gqRecord.gqId,
            url: gqRecord.recordUrl || '',
            accessed_date: new Date().toISOString(),
            confidence: gqRecord.confidence || 'probable',
            abstract: `${gqRecord.recordType} record: ${gqRecord.birthDate?.year || '?'} ${gqRecord.birthPlace || ''}`,
            notes: `GénéalogieQuébec ${gqRecord.collectionName || 'Record'}`,
          });
        }

        return {
          status: 'success',
          gqId: gqRecord.gqId,
          personId,
          action,
        };
      } catch (error) {
        return {
          status: 'error',
          gqId: gqRecord.gqId,
          error: error.message,
          action,
        };
      }
    },
    [importState.selectedActions, importState.linkedPersonIds, onCreatePerson, onCreateEvent, onCreateSource, onCreateCitation]
  );

  /**
   * Execute full import
   */
  const executeImport = useCallback(async () => {
    setImportState(prev => ({
      ...prev,
      isImporting: true,
      importProgress: { current: 0, total: prev.parsedRecords.length },
      errors: [],
    }));

    const results = [];

    for (const record of importState.parsedRecords) {
      if (importState.selectedActions[record.gqId] !== 'skip') {
        try {
          const result = await importSingleRecord(record);
          results.push(result);

          setImportState(prev => ({
            ...prev,
            importProgress: {
              current: prev.importProgress.current + 1,
              total: prev.importProgress.total,
            },
          }));
        } catch (error) {
          setImportState(prev => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                type: 'import',
                gqId: record.gqId,
                message: error.message,
              },
            ],
          }));
        }
      }
    }

    const summary = {
      total: importState.parsedRecords.length,
      created: results.filter(r => r.status === 'success' && r.action === 'create').length,
      linked: results.filter(r => r.status === 'success' && r.action === 'link').length,
      skipped: importState.parsedRecords.filter(r => importState.selectedActions[r.gqId] === 'skip').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    setImportState(prev => ({
      ...prev,
      isImporting: false,
    }));

    return { summary, results };
  }, [importState, importSingleRecord]);

  /**
   * Reset import state
   */
  const reset = useCallback(() => {
    setImportState({
      method: null,
      rawData: '',
      parsedRecords: [],
      importQueue: [],
      duplicateMatches: {},
      selectedActions: {},
      linkedPersonIds: {},
      importProgress: { current: 0, total: 0 },
      errors: [],
      isImporting: false,
    });
  }, []);

  // Computed values
  const readyToImport = useMemo(() => {
    return (
      importState.parsedRecords.length > 0 &&
      Object.keys(importState.selectedActions).length === importState.parsedRecords.length
    );
  }, [importState.parsedRecords, importState.selectedActions]);

  const summary = useMemo(() => {
    return {
      total: importState.parsedRecords.length,
      toCreate: importState.parsedRecords.filter(r => importState.selectedActions[r.gqId] === 'create').length,
      toLink: importState.parsedRecords.filter(r => importState.selectedActions[r.gqId] === 'link').length,
      toSkip: importState.parsedRecords.filter(r => importState.selectedActions[r.gqId] === 'skip').length,
      withErrors: importState.parsedRecords.filter(r => r._errors?.length > 0).length,
    };
  }, [importState.parsedRecords, importState.selectedActions]);

  return {
    // State
    importState,

    // Methods
    parseJsonFile,
    parsePastedData,
    createManualRecord,
    findDuplicates,
    detectAllDuplicates,
    setRecordAction,
    executeImport,
    reset,

    // Computed
    readyToImport,
    summary,
  };
}
