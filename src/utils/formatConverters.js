/**
 * formatConverters.js
 * Utilities for converting between database format and PersonView/legacy formats
 */

// Helper to convert database event to PersonView date format
export function dbEventToDateFormat(event) {
  if (!event || !event.date) {
    return { type: 'unknown' };
  }

  // Parse the date string (expected format: YYYY-MM-DD or YYYY-MM or YYYY)
  const dateParts = event.date.split('-');
  const year = dateParts[0] || '';
  const month = dateParts[1] || '';
  const day = dateParts[2] || '';

  // Handle qualifiers
  if (event.date_qualifier === 'about') {
    return {
      type: 'approximate',
      year,
      variance: 5,
      display: `c. ${year}`,
    };
  }

  // Build display string
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  let display = '';
  if (day && month && year) {
    display = `${parseInt(day)} ${MONTHS[parseInt(month) - 1]?.substring(0, 3)} ${year}`;
  } else if (month && year) {
    display = `${MONTHS[parseInt(month) - 1]} ${year}`;
  } else if (year) {
    display = year;
  }

  return {
    type: 'exact',
    year,
    month,
    day,
    display,
  };
}

// Helper to convert PersonView date format to database event format
export function dateFormatToDbEvent(dateObj) {
  if (!dateObj || dateObj.type === 'unknown') {
    return { date: null, date_qualifier: 'exact' };
  }

  if (dateObj.type === 'alive') {
    return { date: null, date_qualifier: 'exact', is_living: true };
  }

  // Build date string
  let dateStr = '';
  if (dateObj.year) {
    dateStr = dateObj.year;
    if (dateObj.month) {
      dateStr += `-${dateObj.month.padStart(2, '0')}`;
      if (dateObj.day) {
        dateStr += `-${dateObj.day.padStart(2, '0')}`;
      }
    }
  }

  // Handle approximate dates
  if (dateObj.type === 'approximate') {
    return { date: dateStr || null, date_qualifier: 'about' };
  }

  return { date: dateStr || null, date_qualifier: 'exact' };
}

// Helper to convert database union to PersonView union format
export function dbUnionToPersonViewFormat(dbUnion, currentPersonId) {
  const partnerId = dbUnion.person1_id === currentPersonId
    ? dbUnion.person2_id
    : dbUnion.person1_id;

  // Map prior status based on which person is current
  // prior_status_1 is for person1, prior_status_2 is for person2
  const isCurrentPerson1 = dbUnion.person1_id === currentPersonId;
  const priorStatus1 = isCurrentPerson1 ? (dbUnion.prior_status_1 || '') : (dbUnion.prior_status_2 || '');
  const priorStatus2 = isCurrentPerson1 ? (dbUnion.prior_status_2 || '') : (dbUnion.prior_status_1 || '');

  return {
    id: dbUnion.id,
    partner1Id: currentPersonId,
    partner2Id: partnerId,
    partnerId: partnerId,
    type: dbUnion.type || 'marriage',
    startDate: dbUnion.marriageEvent ? dbEventToDateFormat(dbUnion.marriageEvent) : { type: 'unknown' },
    startPlace: dbUnion.marriageEvent?.place_detail || dbUnion.marriageEvent?.place_name || '',
    startPlaceId: dbUnion.marriageEvent?.place_id || null,
    endDate: null,
    endReason: dbUnion.status || '',
    priorStatus1: priorStatus1,
    priorStatus2: priorStatus2,
    childIds: (dbUnion.children || []).map(c => c.id),
    sources: [],
    isExisting: true,
  };
}

// Helper to convert database date to legacy format
export function dbDateToLegacy(dateStr, qualifier, isLiving) {
  if (isLiving) return { type: 'alive' };
  if (!dateStr) return { type: 'unknown' };

  const parts = dateStr.split('-');
  const year = parts[0] || '';
  const month = parts[1] || '';
  const day = parts[2] || '';

  if (qualifier === 'about') {
    return { type: 'approximate', year, variance: 5, display: `c. ${year}` };
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let display = year;
  if (month && day) {
    display = `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
  } else if (month) {
    display = `${MONTHS[parseInt(month) - 1]} ${year}`;
  }

  return { type: 'exact', year, month, day, display };
}

// Helper to convert database event to legacy format
export function dbEventToLegacy(event) {
  return {
    id: event.id,
    type: event.type,
    date: dbDateToLegacy(event.date, event.date_qualifier, false),
    place: event.place_detail || event.place_name || '',
    description: event.description || '',
  };
}
