/**
 * Data Mapper: GénéalogieQuébec → Heritage Format
 * Converts GQ records into Heritage data structures
 */

import { GQ_CONFIDENCE_LEVELS, GQ_DATE_PATTERNS, GQ_PLACE_MAPPING, GQ_RECORD_TYPES } from './constants';

/**
 * Parse date string in various Quebec record formats
 * Handles: ISO, European (DD/MM/YYYY), year-only, month-year
 */
export function parseGQDate(dateString) {
  if (!dateString) {
    return { type: 'unknown' };
  }

  const trimmed = dateString.trim();

  // ISO format: YYYY-MM-DD
  if (GQ_DATE_PATTERNS.ISO.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return {
      type: 'exact',
      year,
      month,
      day,
    };
  }

  // European format: DD/MM/YYYY or DD-MM-YYYY
  const europeanMatch = trimmed.match(GQ_DATE_PATTERNS.EUROPEAN);
  if (europeanMatch) {
    const [, day, month, year] = europeanMatch;
    return {
      type: 'exact',
      year,
      month: month.padStart(2, '0'),
      day: day.padStart(2, '0'),
    };
  }

  // Year only: YYYY
  if (GQ_DATE_PATTERNS.YEAR_ONLY.test(trimmed)) {
    return {
      type: 'exact',
      year: trimmed,
      month: '',
      day: '',
    };
  }

  // Month and year: "January 1850" or "Janvier 1850" or "février 1850"
  // More permissive pattern to match non-ASCII characters
  const monthYearMatch = trimmed.match(/^([a-zA-Z\u00C0-\u00FF]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const monthNum = parseQuebecMonth(monthName);
    if (monthNum) {
      return {
        type: 'exact',
        year,
        month: monthNum.toString().padStart(2, '0'),
        day: '',
      };
    }
  }

  // If we can't parse it, return unknown
  return { type: 'unknown' };
}

/**
 * Parse Quebec month names (English and French)
 */
function parseQuebecMonth(monthName) {
  const normalized = monthName.toLowerCase();

  // Remove accents for matching
  const normalizedNoAccents = normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  const englishMonths = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const frenchMonths = {
    janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
    janv: 1, fevr: 2, févr: 2, avr: 4, sept: 9, oct: 10, nov: 11, dec: 12, déc: 12,
  };

  return englishMonths[normalized] || englishMonths[normalizedNoAccents] || frenchMonths[normalized] || frenchMonths[normalizedNoAccents] || null;
}

/**
 * Normalize place name from Quebec records
 * Handles historical place name variations and aliases
 */
export function normalizeQCPlace(placeName) {
  if (!placeName) return null;

  const original = placeName.trim();
  const normalized = original
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  // Check against mapping for standardization
  for (const [standard, aliases] of Object.entries(GQ_PLACE_MAPPING)) {
    for (const alias of aliases) {
      const aliasNormalized = alias
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalized.toLowerCase() === aliasNormalized.toLowerCase()) {
        return standard;
      }
    }
  }

  // If no mapping found, return original (preserves diacritics)
  return original;
}

/**
 * Convert GénéalogieQuébec record to Heritage Person format
 */
export function gqRecordToHeritagePerson(gqRecord) {
  if (!gqRecord) return null;

  const birthDate = parseGQDate(gqRecord.birthDate);
  const deathDate = parseGQDate(gqRecord.deathDate);

  return {
    id: generateTempId(), // Will be replaced with real ID on save
    firstName: gqRecord.givenNames || '',
    lastName: gqRecord.surname || '',
    middleName: extractMiddleNames(gqRecord.givenNames) || '',
    maidenName: gqRecord.ditNames || '',
    nickname: extractNickname(gqRecord.aliases) || '',
    gender: mapGQGender(gqRecord.gender) || 'unknown',
    birthDate: birthDate,
    birthPlace: normalizeQCPlace(gqRecord.birthPlace) || gqRecord.birthPlaceDetail || '',
    deathDate: deathDate,
    deathPlace: normalizeQCPlace(gqRecord.deathPlace) || gqRecord.deathPlaceDetail || '',
    notes: buildPersonNotes(gqRecord),
    image: gqRecord.recordImage || '',
    // Keep original GQ data for reference
    _gqMetadata: {
      recordId: gqRecord.recordId,
      collectionId: gqRecord.collectionId,
      collectionName: gqRecord.collectionName,
      recordType: gqRecord.recordType,
      recordUrl: gqRecord.recordUrl,
      confidence: gqRecord.confidence,
      lastModified: gqRecord.lastModified,
    },
  };
}

/**
 * Convert GQ record to Heritage Event
 */
export function gqRecordToHeritageEvent(gqRecord, personId) {
  if (!gqRecord) return null;

  const eventType = mapGQRecordType(gqRecord.recordType);
  const date = parseGQDate(gqRecord.eventDate || gqRecord.birthDate || gqRecord.deathDate);
  const place = gqRecord.eventPlace || gqRecord.birthPlace || gqRecord.deathPlace;

  return {
    id: generateTempId(),
    person_id: personId,
    type: eventType,
    date: date,
    place_name: place ? normalizeQCPlace(place) : '',
    place_detail: gqRecord.eventPlaceDetail || '',
    age: gqRecord.age || null,
    notes: gqRecord.eventNotes || '',
    occupationField: gqRecord.occupation || '',
    // Keep GQ reference
    _gqRecordId: gqRecord.recordId,
  };
}

/**
 * Create citation from GQ record
 */
export function gqRecordToCitation(gqRecord, entityType, entityId) {
  if (!gqRecord) return null;

  return {
    id: generateTempId(),
    source_id: null, // Will be set to GQ source ID
    [`${entityType}_id`]: entityId,
    url: gqRecord.recordUrl || '',
    page: gqRecord.pageNumber || null,
    entry_number: gqRecord.entryNumber || gqRecord.recordId,
    film_number: gqRecord.filmNumber || null,
    item_number: gqRecord.itemNumber || null,
    accessed_date: new Date().toISOString(),
    abstract: buildCitationAbstract(gqRecord),
    transcription: gqRecord.transcription || '',
    translation: gqRecord.translation || '',
    confidence: gqRecord.confidence ? mapGQConfidence(gqRecord.confidence) : 'probable',
    notes: `Imported from GénéalogieQuébec - ${gqRecord.collectionName || 'Collection'}`,
  };
}

/**
 * Map GQ gender to Heritage gender
 */
function mapGQGender(gqGender) {
  if (!gqGender) return null;

  const lower = gqGender.toLowerCase();
  if (lower === 'female' || lower === 'f') return 'female';
  if (lower === 'male' || lower === 'm') return 'male';
  return 'unknown';
}

/**
 * Map GQ record type to Heritage event type
 */
function mapGQRecordType(recordType) {
  if (!recordType) return 'other';

  const mapping = {
    [GQ_RECORD_TYPES.BIRTH]: 'birth',
    [GQ_RECORD_TYPES.DEATH]: 'death',
    [GQ_RECORD_TYPES.MARRIAGE]: 'marriage',
    [GQ_RECORD_TYPES.CENSUS]: 'census',
    [GQ_RECORD_TYPES.IMMIGRATION]: 'immigration',
    [GQ_RECORD_TYPES.CHURCH]: 'baptism', // Map church record to baptism
    [GQ_RECORD_TYPES.NOTARY]: 'other',
    [GQ_RECORD_TYPES.MILITARY]: 'military',
    [GQ_RECORD_TYPES.LAND]: 'property',
    [GQ_RECORD_TYPES.PASSENGER]: 'immigration',
    [GQ_RECORD_TYPES.OTHER]: 'other',
  };

  return mapping[recordType] || 'other';
}

/**
 * Map GQ confidence to Heritage confidence
 */
function mapGQConfidence(gqConfidence) {
  if (!gqConfidence) return 'probable';

  const lower = gqConfidence.toLowerCase();
  if (lower === GQ_CONFIDENCE_LEVELS.CERTAIN) return 'certain';
  if (lower === GQ_CONFIDENCE_LEVELS.PROBABLE) return 'probable';
  if (lower === GQ_CONFIDENCE_LEVELS.POSSIBLE) return 'possible';
  if (lower === GQ_CONFIDENCE_LEVELS.UNCERTAIN) return 'uncertain';

  return 'probable';
}

/**
 * Extract middle names from full given names
 * Assumes format: "FirstName MiddleNames..."
 */
function extractMiddleNames(givenNames) {
  if (!givenNames) return '';

  const parts = givenNames.trim().split(/\s+/);
  if (parts.length <= 1) return '';

  return parts.slice(1).join(' ');
}

/**
 * Extract first nickname from aliases
 */
function extractNickname(aliases) {
  if (!aliases) return '';

  // Handle string or array
  if (typeof aliases === 'string') {
    return aliases.split(',')[0].trim();
  }

  if (Array.isArray(aliases) && aliases.length > 0) {
    return aliases[0];
  }

  return '';
}

/**
 * Build notes from GQ metadata
 */
function buildPersonNotes(gqRecord) {
  const notes = [];

  if (gqRecord.notes) {
    notes.push(gqRecord.notes);
  }

  if (gqRecord.occupation) {
    notes.push(`Occupation: ${gqRecord.occupation}`);
  }

  if (gqRecord.aliases && gqRecord.aliases.length > 0) {
    const aliasStr = Array.isArray(gqRecord.aliases)
      ? gqRecord.aliases.join(', ')
      : gqRecord.aliases;
    notes.push(`Also known as: ${aliasStr}`);
  }

  if (gqRecord.collectionName) {
    notes.push(`Found in GénéalogieQuébec - ${gqRecord.collectionName}`);
  }

  return notes.join('\n\n');
}

/**
 * Build citation abstract
 */
function buildCitationAbstract(gqRecord) {
  const parts = [];

  if (gqRecord.recordType) {
    parts.push(`${gqRecord.recordType} record`);
  }

  if (gqRecord.eventDate || gqRecord.birthDate || gqRecord.deathDate) {
    const date = gqRecord.eventDate || gqRecord.birthDate || gqRecord.deathDate;
    parts.push(`dated ${date}`);
  }

  if (gqRecord.eventPlace || gqRecord.birthPlace || gqRecord.deathPlace) {
    const place = gqRecord.eventPlace || gqRecord.birthPlace || gqRecord.deathPlace;
    parts.push(`in ${place}`);
  }

  return parts.length > 0 ? parts.join(' ') : `GénéalogieQuébec record ${gqRecord.recordId}`;
}

/**
 * Generate temporary ID for new records
 * Real ID will be assigned when saved to database
 */
function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Batch convert GQ results to Heritage persons
 */
export function gqSearchResultsToHeritagePersons(results) {
  if (!Array.isArray(results)) return [];

  return results
    .map(result => gqRecordToHeritagePerson(result))
    .filter(person => person !== null);
}

/**
 * Merge GQ data into existing Heritage person
 * Updates person with GQ data, preserving existing Heritage data
 */
export function mergeGQDataIntoPerson(heritagePersonId, gqRecord) {
  if (!gqRecord) return null;

  const gqPerson = gqRecordToHeritagePerson(gqRecord);

  return {
    id: heritagePersonId,
    // Update with GQ data, but preserve existing Heritage values
    firstName: gqPerson.firstName || '',
    lastName: gqPerson.lastName || '',
    // Only update middle/maiden names if Heritage doesn't have them
    middleName: gqPerson.middleName || '',
    maidenName: gqPerson.maidenName || '',
    birthDate: gqPerson.birthDate,
    birthPlace: gqPerson.birthPlace || '',
    deathDate: gqPerson.deathDate,
    deathPlace: gqPerson.deathPlace || '',
    // Append notes instead of replacing
    notesAppendix: gqPerson.notes,
    _gqMetadata: gqPerson._gqMetadata,
  };
}
