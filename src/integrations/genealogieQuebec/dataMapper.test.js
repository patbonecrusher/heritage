import { describe, it, expect } from 'vitest';
import {
  parseGQDate,
  normalizeQCPlace,
  gqRecordToHeritagePerson,
  gqRecordToHeritageEvent,
  gqRecordToCitation,
  gqSearchResultsToHeritagePersons,
  mergeGQDataIntoPerson,
} from './dataMapper';

describe('GénéalogieQuébec Data Mapper', () => {
  describe('parseGQDate', () => {
    it('parses ISO format dates (YYYY-MM-DD)', () => {
      const result = parseGQDate('1850-05-15');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('05');
      expect(result.day).toBe('15');
    });

    it('parses European format dates (DD/MM/YYYY)', () => {
      const result = parseGQDate('15/05/1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('05');
      expect(result.day).toBe('15');
    });

    it('parses European format with dashes (DD-MM-YYYY)', () => {
      const result = parseGQDate('15-05-1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('05');
      expect(result.day).toBe('15');
    });

    it('parses year-only dates', () => {
      const result = parseGQDate('1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('');
      expect(result.day).toBe('');
    });

    it('parses English month names with year', () => {
      const result = parseGQDate('May 1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('05');
    });

    it('parses French month names with year (janvier)', () => {
      const result = parseGQDate('janvier 1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('01');
    });

    it('parses French month names with year (février)', () => {
      const result = parseGQDate('février 1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('02');
    });

    it('handles single-digit day and month with dashes', () => {
      const result = parseGQDate('5-3-1850');

      expect(result.type).toBe('exact');
      expect(result.year).toBe('1850');
      expect(result.month).toBe('03');
      expect(result.day).toBe('05');
    });

    it('returns unknown for unparseable dates', () => {
      const result = parseGQDate('not-a-date');

      expect(result.type).toBe('unknown');
    });

    it('returns unknown for null or empty date', () => {
      expect(parseGQDate(null).type).toBe('unknown');
      expect(parseGQDate('').type).toBe('unknown');
    });

    it('handles abbreviated month names', () => {
      const result = parseGQDate('Jan 1850');

      expect(result.month).toBe('01');
    });

    it('handles case-insensitive month names', () => {
      const result = parseGQDate('JANUARY 1850');

      expect(result.month).toBe('01');
    });
  });

  describe('normalizeQCPlace', () => {
    it('returns null for empty or null place', () => {
      expect(normalizeQCPlace(null)).toBeNull();
      expect(normalizeQCPlace('')).toBeNull();
    });

    it('normalizes Montreal variations', () => {
      expect(normalizeQCPlace('Montréal')).toBe('Montreal');
      expect(normalizeQCPlace('Montréale')).toBe('Montreal');
      expect(normalizeQCPlace('Mont-Royal')).toBe('Montreal');
    });

    it('normalizes Three Rivers', () => {
      expect(normalizeQCPlace('Trois-Rivières')).toBe('Three Rivers');
    });

    it('normalizes Quebec City', () => {
      expect(normalizeQCPlace('Ville de Québec')).toBe('Quebec City');
    });

    it('handles case-insensitive matching', () => {
      expect(normalizeQCPlace('MONTREAL')).toBe('Montreal');
      expect(normalizeQCPlace('montréal')).toBe('Montreal');
    });

    it('removes accents for matching', () => {
      expect(normalizeQCPlace('Quebec')).toBe('Quebec');
      expect(normalizeQCPlace('Québec')).toBe('Quebec');
    });

    it('returns original place if no mapping found', () => {
      const originalPlace = 'Somewhere Else';
      expect(normalizeQCPlace(originalPlace)).toBe(originalPlace);
    });

    it('trims whitespace', () => {
      expect(normalizeQCPlace('  Montreal  ')).toBe('Montreal');
    });
  });

  describe('gqRecordToHeritagePerson', () => {
    it('converts basic GQ record to Heritage person', () => {
      const gqRecord = {
        recordId: 'gq-123',
        givenNames: 'Jean-Marie',
        surname: 'Dupont',
        gender: 'Male',
        birthDate: '1850-05-15',
        birthPlace: 'Montréal',
        deathDate: '1920-03-22',
        deathPlace: 'Trois-Rivières',
        collectionName: 'Drouin Records',
        recordUrl: 'https://genealogiequebec.com/record/123',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result.firstName).toBe('Jean-Marie');
      expect(result.lastName).toBe('Dupont');
      expect(result.gender).toBe('male');
      expect(result.birthDate.type).toBe('exact');
      expect(result.birthPlace).toBe('Montreal');
      expect(result.deathDate.type).toBe('exact');
      expect(result.deathPlace).toBe('Three Rivers');
      expect(result._gqMetadata.recordId).toBe('gq-123');
    });

    it('extracts middle names', () => {
      const gqRecord = {
        givenNames: 'Jean-Marie Joseph',
        surname: 'Dupont',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result.firstName).toBe('Jean-Marie Joseph');
      expect(result.middleName).toBe('Joseph');
    });

    it('handles missing fields gracefully', () => {
      const gqRecord = {
        givenNames: 'John',
        surname: 'Doe',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.gender).toBe('unknown');
      expect(result.birthPlace).toBe('');
    });

    it('maps gender correctly', () => {
      expect(gqRecordToHeritagePerson({ givenNames: 'Jane', surname: 'Doe', gender: 'Female' }).gender).toBe('female');
      expect(gqRecordToHeritagePerson({ givenNames: 'John', surname: 'Doe', gender: 'Male' }).gender).toBe('male');
      expect(gqRecordToHeritagePerson({ givenNames: 'Unknown', surname: 'Person', gender: null }).gender).toBe('unknown');
    });

    it('includes GQ metadata for reference', () => {
      const gqRecord = {
        recordId: 'gq-123',
        collectionId: 'coll-456',
        collectionName: 'Drouin Records',
        recordType: 'birth',
        recordUrl: 'https://genealogiequebec.com/record/123',
        confidence: 'probable',
        lastModified: '2024-01-01',
        givenNames: 'John',
        surname: 'Doe',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result._gqMetadata.recordId).toBe('gq-123');
      expect(result._gqMetadata.collectionName).toBe('Drouin Records');
      expect(result._gqMetadata.recordUrl).toBe('https://genealogiequebec.com/record/123');
    });

    it('handles dit names (maiden names)', () => {
      const gqRecord = {
        givenNames: 'Marie',
        surname: 'Smith',
        ditNames: 'dit Beaumont',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result.maidenName).toBe('dit Beaumont');
    });

    it('builds notes from GQ metadata', () => {
      const gqRecord = {
        givenNames: 'John',
        surname: 'Doe',
        notes: 'Custom notes',
        occupation: 'Blacksmith',
        collectionName: 'Drouin Records',
      };

      const result = gqRecordToHeritagePerson(gqRecord);

      expect(result.notes).toContain('Custom notes');
      expect(result.notes).toContain('Occupation: Blacksmith');
      expect(result.notes).toContain('Drouin Records');
    });

    it('returns null for null input', () => {
      expect(gqRecordToHeritagePerson(null)).toBeNull();
    });
  });

  describe('gqRecordToHeritageEvent', () => {
    it('converts GQ record to Heritage event', () => {
      const gqRecord = {
        recordId: 'gq-123',
        recordType: 'birth',
        birthDate: '1850-05-15',
        birthPlace: 'Montréal',
      };

      const result = gqRecordToHeritageEvent(gqRecord, 'person-1');

      expect(result.person_id).toBe('person-1');
      expect(result.type).toBe('birth');
      expect(result.date.type).toBe('exact');
      expect(result.place_name).toBe('Montreal');
    });

    it('maps record types correctly', () => {
      const testCases = [
        ['birth', 'birth'],
        ['death', 'death'],
        ['marriage', 'marriage'],
        ['census', 'census'],
        ['immigration', 'immigration'],
        ['church', 'baptism'],
        ['military', 'military'],
        ['land', 'property'],
        ['passenger', 'immigration'],
      ];

      for (const [gqType, expectedType] of testCases) {
        const result = gqRecordToHeritageEvent(
          { recordType: gqType, birthDate: '1850' },
          'person-1'
        );
        expect(result.type).toBe(expectedType);
      }
    });

    it('handles missing data fields', () => {
      const gqRecord = {
        recordType: 'unknown',
      };

      const result = gqRecordToHeritageEvent(gqRecord, 'person-1');

      expect(result.type).toBe('other');
      expect(result.place_name).toBe('');
    });

    it('returns null for null input', () => {
      expect(gqRecordToHeritageEvent(null, 'person-1')).toBeNull();
    });
  });

  describe('gqRecordToCitation', () => {
    it('converts GQ record to Heritage citation', () => {
      const gqRecord = {
        recordId: 'gq-123',
        recordUrl: 'https://genealogiequebec.com/record/123',
        collectionName: 'Drouin Records',
        pageNumber: 42,
        entryNumber: 'entry-001',
        confidence: 'probable',
      };

      const result = gqRecordToCitation(gqRecord, 'person', 'person-1');

      expect(result.person_id).toBe('person-1');
      expect(result.url).toBe('https://genealogiequebec.com/record/123');
      expect(result.page).toBe(42);
      expect(result.entry_number).toBe('entry-001');
      expect(result.confidence).toBe('probable');
      expect(result.notes).toContain('Drouin Records');
    });

    it('supports different entity types', () => {
      const gqRecord = { recordId: 'gq-1', collectionName: 'Test' };

      const personCitation = gqRecordToCitation(gqRecord, 'person', 'p-1');
      expect(personCitation.person_id).toBe('p-1');

      const eventCitation = gqRecordToCitation(gqRecord, 'event', 'e-1');
      expect(eventCitation.event_id).toBe('e-1');

      const unionCitation = gqRecordToCitation(gqRecord, 'union', 'u-1');
      expect(unionCitation.union_id).toBe('u-1');
    });

    it('sets accessed_date to now', () => {
      const before = new Date();
      const result = gqRecordToCitation({ recordId: 'gq-1' }, 'person', 'p-1');
      const after = new Date();

      const citationDate = new Date(result.accessed_date);
      expect(citationDate >= before).toBe(true);
      expect(citationDate <= after).toBe(true);
    });

    it('defaults confidence to probable if not provided', () => {
      const result = gqRecordToCitation({ recordId: 'gq-1' }, 'person', 'p-1');

      expect(result.confidence).toBe('probable');
    });

    it('returns null for null input', () => {
      expect(gqRecordToCitation(null, 'person', 'p-1')).toBeNull();
    });
  });

  describe('gqSearchResultsToHeritagePersons', () => {
    it('converts array of GQ records to Heritage persons', () => {
      const results = [
        {
          givenNames: 'John',
          surname: 'Doe',
          birthDate: '1850',
          recordId: 'gq-1',
        },
        {
          givenNames: 'Jane',
          surname: 'Doe',
          birthDate: '1855',
          recordId: 'gq-2',
        },
      ];

      const converted = gqSearchResultsToHeritagePersons(results);

      expect(converted).toHaveLength(2);
      expect(converted[0].firstName).toBe('John');
      expect(converted[1].firstName).toBe('Jane');
    });

    it('filters out null results', () => {
      const results = [
        { givenNames: 'John', surname: 'Doe' },
        null,
        { givenNames: 'Jane', surname: 'Doe' },
      ];

      const converted = gqSearchResultsToHeritagePersons(results);

      expect(converted).toHaveLength(2);
    });

    it('returns empty array for non-array input', () => {
      expect(gqSearchResultsToHeritagePersons(null)).toEqual([]);
      expect(gqSearchResultsToHeritagePersons(undefined)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
      expect(gqSearchResultsToHeritagePersons([])).toEqual([]);
    });
  });

  describe('mergeGQDataIntoPerson', () => {
    it('merges GQ data into existing Heritage person', () => {
      const gqRecord = {
        givenNames: 'Jean-Marie',
        surname: 'Dupont',
        birthDate: '1850-05-15',
        birthPlace: 'Montréal',
        recordId: 'gq-123',
        collectionName: 'Drouin Records',
      };

      const result = mergeGQDataIntoPerson('person-1', gqRecord);

      expect(result.id).toBe('person-1');
      expect(result.firstName).toBe('Jean-Marie');
      expect(result.lastName).toBe('Dupont');
      expect(result._gqMetadata).toBeDefined();
    });

    it('appends GQ notes instead of replacing', () => {
      const gqRecord = {
        givenNames: 'John',
        surname: 'Doe',
        notes: 'Additional information',
        occupation: 'Farmer',
        collectionName: 'Test Collection',
      };

      const result = mergeGQDataIntoPerson('person-1', gqRecord);

      expect(result.notesAppendix).toContain('Additional information');
      expect(result.notesAppendix).toContain('Farmer');
    });

    it('returns null for null GQ record', () => {
      expect(mergeGQDataIntoPerson('person-1', null)).toBeNull();
    });
  });
});
