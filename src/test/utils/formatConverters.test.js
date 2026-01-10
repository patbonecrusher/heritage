import { describe, it, expect } from 'vitest';
import {
  dbEventToDateFormat,
  dateFormatToDbEvent,
  dbUnionToPersonViewFormat,
} from '../../utils/formatConverters';

describe('formatConverters', () => {
  describe('dbEventToDateFormat', () => {
    it('converts null event to unknown date', () => {
      const result = dbEventToDateFormat(null);
      expect(result).toEqual({ type: 'unknown' });
    });

    it('converts event with exact date', () => {
      const event = {
        date: '1990-05-15',
      };
      const result = dbEventToDateFormat(event);
      expect(result.type).toBe('exact');
      expect(result.year).toBe('1990');
      expect(result.month).toBe('05');
      expect(result.day).toBe('15');
    });

    it('converts event with year-only date', () => {
      const event = {
        date: '1990',
      };
      const result = dbEventToDateFormat(event);
      expect(result.type).toBe('exact');
      expect(result.year).toBe('1990');
      expect(result.month).toBe('');
      expect(result.day).toBe('');
    });

    it('converts event with approximate date', () => {
      const event = {
        date: '1990-05-15',
        date_qualifier: 'about',
      };
      const result = dbEventToDateFormat(event);
      expect(result.type).toBe('approximate');
      expect(result.variance).toBe(5);
    });

    it('returns unknown for event without date', () => {
      const event = {
        date: null,
      };
      const result = dbEventToDateFormat(event);
      expect(result.type).toBe('unknown');
    });

    it('generates display string for full date', () => {
      const event = {
        date: '1990-05-15',
      };
      const result = dbEventToDateFormat(event);
      expect(result.display).toBeDefined();
      expect(result.display).toMatch(/15.*May.*1990/);
    });
  });

  describe('dateFormatToDbEvent', () => {
    it('converts legacy unknown date to db format', () => {
      const dateFormat = { type: 'unknown' };
      const result = dateFormatToDbEvent(dateFormat);
      expect(result.date).toBeNull();
      expect(result.date_qualifier).toBe('exact');
    });

    it('converts legacy exact date to db format', () => {
      const dateFormat = {
        type: 'exact',
        year: '1990',
        month: '05',
        day: '15',
      };
      const result = dateFormatToDbEvent(dateFormat);
      expect(result.date).toBe('1990-05-15');
      expect(result.date_qualifier).toBe('exact');
    });

    it('converts legacy year-only date to db format', () => {
      const dateFormat = {
        type: 'exact',
        year: '1990',
      };
      const result = dateFormatToDbEvent(dateFormat);
      expect(result.date).toBe('1990');
      expect(result.date_qualifier).toBe('exact');
    });

    it('converts legacy approximate date to db format', () => {
      const dateFormat = {
        type: 'approximate',
        year: '1990',
      };
      const result = dateFormatToDbEvent(dateFormat);
      expect(result.date_qualifier).toBe('about');
    });

    it('handles alive status', () => {
      const dateFormat = {
        type: 'alive',
      };
      const result = dateFormatToDbEvent(dateFormat);
      expect(result.is_living).toBe(true);
      expect(result.date).toBeNull();
    });
  });

  describe('dbUnionToPersonViewFormat', () => {
    it('converts db union to person view format', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        type: 'marriage',
      };
      const selectedPersonId = 'person-1';

      const result = dbUnionToPersonViewFormat(dbUnion, selectedPersonId);

      expect(result.id).toBe('union-1');
      expect(result.partnerId).toBe('person-2');
      expect(result.type).toBe('marriage');
    });

    it('correctly identifies partner when person is person1', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        type: 'marriage',
      };
      const selectedPersonId = 'person-1';

      const result = dbUnionToPersonViewFormat(dbUnion, selectedPersonId);

      expect(result.partner1Id).toBe('person-1');
      expect(result.partner2Id).toBe('person-2');
      expect(result.partnerId).toBe('person-2');
    });

    it('correctly identifies partner when person is person2', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        type: 'marriage',
      };
      const selectedPersonId = 'person-2';

      const result = dbUnionToPersonViewFormat(dbUnion, selectedPersonId);

      expect(result.partner1Id).toBe('person-2');
      expect(result.partner2Id).toBe('person-1');
      expect(result.partnerId).toBe('person-1');
    });

    it('handles union with null partner2', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: null,
        type: 'marriage',
      };
      const selectedPersonId = 'person-1';

      const result = dbUnionToPersonViewFormat(dbUnion, selectedPersonId);

      expect(result.partnerId).toBeNull();
    });

    it('returns correct startDate and startPlace', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        type: 'marriage',
        marriageEvent: {
          date: '1990-05-15',
          place_name: 'Boston, MA',
          place_detail: 'Boston, Massachusetts, USA',
        },
      };
      const selectedPersonId = 'person-1';

      const result = dbUnionToPersonViewFormat(dbUnion, selectedPersonId);

      expect(result.startDate).toBeDefined();
      // place_detail takes precedence over place_name
      expect(result.startPlace).toBe('Boston, Massachusetts, USA');
      expect(result.startPlaceId).toBeNull();
    });
  });

  describe('prior status mapping', () => {
    it('maps prior statuses correctly when current person is person1', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        prior_status_1: 'single',
        prior_status_2: 'divorced',
        type: 'marriage',
      };

      const result = dbUnionToPersonViewFormat(dbUnion, 'person-1');

      expect(result.priorStatus1).toBe('single');
      expect(result.priorStatus2).toBe('divorced');
    });

    it('maps prior statuses correctly when current person is person2', () => {
      const dbUnion = {
        id: 'union-1',
        person1_id: 'person-1',
        person2_id: 'person-2',
        prior_status_1: 'single',
        prior_status_2: 'divorced',
        type: 'marriage',
      };

      const result = dbUnionToPersonViewFormat(dbUnion, 'person-2');

      expect(result.priorStatus1).toBe('divorced');
      expect(result.priorStatus2).toBe('single');
    });
  });
});
