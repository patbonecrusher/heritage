/**
 * dateParser - Multi-format date parsing utility
 *
 * Supports:
 * - DD/MM/YYYY or DD-MM-YYYY (numeric dates)
 * - DD Month YYYY (English or French)
 * - Month DD YYYY (US format)
 * - Month YYYY (month and year only)
 * - YYYY (year only)
 * - c. YYYY or circa YYYY (approximate dates)
 * - Year±variance (e.g., 1850±5)
 * - Special: "?", "unknown", "alive", "living"
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Parse a flexible date string and return structured date data
 * @param {string} input - The date string to parse
 * @returns {Object} - { type, display, year?, month?, day?, variance? }
 */
export function parseDateString(input) {
  if (!input || input.trim() === '') {
    return { type: 'unknown', display: 'Unknown' };
  }

  const strLower = input.trim().toLowerCase();

  // Check for special cases
  if (strLower === '?' || strLower === 'unknown' || strLower === 'unk') {
    return { type: 'unknown_acknowledged', display: 'Unknown' };
  }

  if (strLower === 'alive' || strLower === 'living' || strLower === 'still alive') {
    return { type: 'alive', display: 'Living' };
  }

  const str = input.trim();

  // Approximate date with variance: "c. 1850 ±5" or "1850±5"
  const approxMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)?(\d{4})\s*(?:\+-|±)\s*(\d+)$/i);
  if (approxMatch) {
    return {
      type: 'approximate',
      year: approxMatch[1],
      variance: parseInt(approxMatch[2]),
      display: `c. ${approxMatch[1]} (±${approxMatch[2]} years)`
    };
  }

  // Circa/approximate: "c. 1850" or "circa 1850"
  const circaMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)(\d{4})$/i);
  if (circaMatch) {
    return {
      type: 'approximate',
      year: circaMatch[1],
      variance: 5,
      display: `c. ${circaMatch[1]} (±5 years)`
    };
  }

  // Year only: "1850"
  const yearOnlyMatch = str.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return {
      type: 'exact',
      year: yearOnlyMatch[1],
      month: '',
      day: '',
      display: yearOnlyMatch[1]
    };
  }

  // Month and year (text): "February 1850" or "Février 1850"
  const monthYearMatch = str.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthIdx = findMonthIndex(monthYearMatch[1]);
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: monthYearMatch[2],
        month: String(monthIdx + 1),
        day: '',
        display: `${MONTHS[monthIdx]} ${monthYearMatch[2]}`
      };
    }
  }

  // Month and year (numeric): "2/1850" or "02/1850"
  const numMonthYearMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (numMonthYearMatch) {
    const monthNum = parseInt(numMonthYearMatch[1]);
    if (monthNum >= 1 && monthNum <= 12) {
      return {
        type: 'exact',
        year: numMonthYearMatch[2],
        month: String(monthNum),
        day: '',
        display: `${MONTHS[monthNum - 1]} ${numMonthYearMatch[2]}`
      };
    }
  }

  // Full date (text): "3 February 1850" or "3 février 1850"
  const fullDateMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (fullDateMatch) {
    const monthIdx = findMonthIndex(fullDateMatch[2]);
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: fullDateMatch[3],
        month: String(monthIdx + 1),
        day: fullDateMatch[1],
        display: `${fullDateMatch[1]} ${MONTHS[monthIdx]} ${fullDateMatch[3]}`
      };
    }
  }

  // US format: "February 3, 1850" or "February 3 1850"
  const usDateMatch = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (usDateMatch) {
    const monthIdx = findMonthIndex(usDateMatch[1]);
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: usDateMatch[3],
        month: String(monthIdx + 1),
        day: usDateMatch[2],
        display: `${usDateMatch[2]} ${MONTHS[monthIdx]} ${usDateMatch[3]}`
      };
    }
  }

  // Numeric date: "3/2/1850" or "03/02/1850"
  const numFullDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numFullDateMatch) {
    const day = parseInt(numFullDateMatch[1]);
    const monthNum = parseInt(numFullDateMatch[2]);
    if (day >= 1 && day <= 31 && monthNum >= 1 && monthNum <= 12) {
      return {
        type: 'exact',
        year: numFullDateMatch[3],
        month: String(monthNum),
        day: String(day),
        display: `${day} ${MONTHS[monthNum - 1]} ${numFullDateMatch[3]}`
      };
    }
  }

  // Couldn't parse
  return { type: 'unknown', display: `? (couldn't parse "${str}")` };
}

/**
 * Find month index from month name (English or French)
 * @param {string} monthName - The month name to find
 * @returns {number} - Index (0-11) or -1 if not found
 */
function findMonthIndex(monthName) {
  const lower = monthName.toLowerCase();

  // Check English months
  let idx = MONTHS.findIndex(m => m.toLowerCase().startsWith(lower));
  if (idx !== -1) return idx;

  // Check French months
  idx = FRENCH_MONTHS.findIndex(m => m.toLowerCase().startsWith(lower));
  if (idx !== -1) return idx;

  return -1;
}

/**
 * Convert date object back to input string
 * @param {Object} date - The date object with year, month, day
 * @returns {string} - The formatted date string
 */
export function dateToInputString(date) {
  if (!date || date.type === 'unknown') return '';
  if (date.type === 'approximate') {
    return `${date.year}±${date.variance || 5}`;
  }
  const parts = [];
  if (date.day) parts.push(date.day);
  if (date.month) parts.push(MONTHS[parseInt(date.month) - 1]?.substring(0, 3));
  if (date.year) parts.push(date.year);
  return parts.join(' ');
}
