/**
 * GénéalogieQuébec Integration Constants
 * API endpoints, configuration, and data mappings
 */

// API Configuration
export const GQ_CONFIG = {
  baseUrl: 'https://genealogiequebec.com',
  apiUrl: 'https://api.genealogiequebec.com', // To be confirmed with API contact
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Common GénéalogieQuébec Record Fields
export const GQ_RECORD_FIELDS = {
  // Identity
  givenNames: 'givenNames',
  surname: 'surname',
  ditNames: 'ditNames',
  aliases: 'aliases',
  gender: 'gender',

  // Birth
  birthDate: 'birthDate',
  birthPlace: 'birthPlace',
  birthPlaceDetail: 'birthPlaceDetail',
  birthRecord: 'birthRecord',

  // Death
  deathDate: 'deathDate',
  deathPlace: 'deathPlace',
  deathPlaceDetail: 'deathPlaceDetail',
  deathRecord: 'deathRecord',

  // Family
  fatherId: 'fatherId',
  fatherName: 'fatherName',
  motherId: 'motherId',
  motherName: 'motherName',
  spouseId: 'spouseId',
  spouseName: 'spouseName',
  childIds: 'childIds',

  // Records
  recordId: 'recordId',
  collectionId: 'collectionId',
  collectionName: 'collectionName',
  recordType: 'recordType',
  pageNumber: 'pageNumber',
  entryNumber: 'entryNumber',

  // Metadata
  recordUrl: 'recordUrl',
  recordImage: 'recordImage',
  dateAdded: 'dateAdded',
  lastModified: 'lastModified',
  confidence: 'confidence',
};

// Record Type Mappings
export const GQ_RECORD_TYPES = {
  BIRTH: 'birth',
  DEATH: 'death',
  MARRIAGE: 'marriage',
  CENSUS: 'census',
  IMMIGRATION: 'immigration',
  CHURCH: 'church',
  NOTARY: 'notary',
  MILITARY: 'military',
  LAND: 'land',
  PASSENGER: 'passenger',
  OTHER: 'other',
};

// Confidence Levels
export const GQ_CONFIDENCE_LEVELS = {
  CERTAIN: 'certain',
  PROBABLE: 'probable',
  POSSIBLE: 'possible',
  UNCERTAIN: 'uncertain',
};

// Date Format Patterns (Quebec records use various formats)
export const GQ_DATE_PATTERNS = {
  // YYYY-MM-DD
  ISO: /^\d{4}-\d{2}-\d{2}$/,
  // DD/MM/YYYY or DD-MM-YYYY
  EUROPEAN: /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/,
  // YYYY only
  YEAR_ONLY: /^\d{4}$/,
  // Month Year
  MONTH_YEAR: /^(\w+)\s+(\d{4})$/i,
};

// Quebec Geography Normalization
export const GQ_PLACE_MAPPING = {
  // Modern → Historical place names
  'Quebec': ['Québec', 'QC', 'P.Q.', 'P.E.'],
  'Montreal': ['Montréal', 'Montréale', 'Mont-Royal'],
  'Quebec City': ['Ville de Québec', 'Cité de Québec'],
  'Three Rivers': ['Trois-Rivières', 'Three-Rivers'],
  // Map historical subdivisions
  'Beauce': ['Beauce-Sartigan'],
  'Beauharnois': ['Beauharnois-Salaberry'],
  'Compton': ['Coaticook'],
};

// Search Filters
export const GQ_SEARCH_FILTERS = {
  name: 'name',
  givenName: 'givenName',
  surname: 'surname',
  birthYear: 'birthYear',
  birthPlace: 'birthPlace',
  deathYear: 'deathYear',
  deathPlace: 'deathPlace',
  marriageYear: 'marriageYear',
  marriagePlace: 'marriagePlace',
  collectionId: 'collectionId',
  recordType: 'recordType',
  dateRange: 'dateRange',
};

// Pagination
export const GQ_PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
  maxResults: 1000,
};

// Error Messages
export const GQ_ERRORS = {
  NOT_AUTHENTICATED: 'Not authenticated with GénéalogieQuébec',
  INVALID_CREDENTIALS: 'Invalid username or password',
  API_UNREACHABLE: 'Unable to reach GénéalogieQuébec API',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait before searching again.',
  INVALID_SEARCH_QUERY: 'Invalid search query. Please provide at least a name.',
  NO_RESULTS: 'No records found matching your search criteria.',
  UNKNOWN_ERROR: 'An unknown error occurred while searching.',
};

// Rate Limiting
export const GQ_RATE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  searchesPerDay: 500,
};

// Common Collections in GénéalogieQuébec
export const GQ_COMMON_COLLECTIONS = {
  DROUIN_INSTITUTE: {
    id: 'drouin',
    name: 'Drouin Institute Records',
    description: 'Parish registers and vital records from Quebec and French Canada',
    recordTypes: ['birth', 'death', 'marriage', 'church'],
  },
  CENSUS: {
    id: 'census',
    name: 'Census Records',
    description: 'Census records for Quebec and Canada',
    recordTypes: ['census'],
  },
  IMMIGRATION: {
    id: 'immigration',
    name: 'Immigration Records',
    description: 'Passenger lists and immigration documents',
    recordTypes: ['immigration', 'passenger'],
  },
  NOTARY: {
    id: 'notary',
    name: 'Notary Records',
    description: 'Notarial documents and transactions',
    recordTypes: ['notary', 'land'],
  },
  MILITARY: {
    id: 'military',
    name: 'Military Records',
    description: 'Military service and casualty records',
    recordTypes: ['military'],
  },
};
