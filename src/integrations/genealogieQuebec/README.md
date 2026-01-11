# GénéalogieQuébec Integration

Integration framework for Heritage genealogy application to search and import records from GénéalogieQuébec.com (operated by Institut généalogique Drouin).

## Status

**Current Stage:** Foundation Implementation (Phase 1-3)
**API Status:** Awaiting official API documentation from Institut généalogique Drouin

## What's Implemented

### 1. Data Mapping (`dataMapper.js`)
- **parseGQDate()** - Parse Quebec record date formats
  - ISO: `1850-05-15`
  - European: `15/05/1850` or `15-05-1850`
  - Year only: `1850`
  - Month-Year: `May 1850` or `janvier 1850`
  - Returns Heritage-compatible date objects

- **normalizeQCPlace()** - Normalize Quebec place names
  - Handles French diacritics and accents
  - Normalizes place variations (Montréal → Montreal)
  - Historical place name mapping
  - Preserves unmapped place names

- **gqRecordToHeritagePerson()** - Convert GQ record to Heritage person
  - Maps all person fields
  - Extracts middle names and nicknames
  - Generates notes from metadata
  - Preserves GQ metadata for reference

- **gqRecordToHeritageEvent()** - Convert GQ record to Heritage event
  - Maps record types to Heritage event types
  - Parses dates and places
  - Handles occupation and notes

- **gqRecordToCitation()** - Generate Heritage citation
  - Auto-generates citation from GQ record
  - Includes URLs and record references
  - Sets confidence levels
  - Supports all entity types (person, event, union, media)

### 2. API Client (`client.js`)
- **GenealogieQuebecClient** class
  - Placeholder for authentication
  - Stub methods for search, getRecord, getCollection
  - Rate limiting support
  - Retry logic with exponential backoff
  - Session management

### 3. Constants (`constants.js`)
- API configuration (endpoints, timeout, retries)
- Record field mappings
- Record type definitions
- Confidence level mappings
- Quebec place name normalizations
- Common collections
- Error messages
- Rate limiting configuration

### 4. Unit Tests (`dataMapper.test.js`)
- 50+ test cases covering all data mapping functions
- Tests for date parsing in multiple formats
- Place name normalization tests
- Data conversion tests
- Batch import tests
- Edge cases and error handling

## Next Steps

### Phase 1: API Research (CURRENT)
- [ ] Contact Institut généalogique Drouin
  - Email: contact@institutdrouin.com
  - Phone: 514-400-3961
- [ ] Determine API availability
- [ ] Request API documentation
- [ ] Identify authentication method
- [ ] Document rate limits and quotas

**Key Questions for API Contact:**
```
Subject: GénéalogieQuébec API Integration for Heritage Genealogy App

Do you provide a REST API or web service for record searching?
What authentication methods do you support?
  - OAuth 2.0
  - API key
  - HTTP Basic Auth
  - Session tokens
  - Other?

What data can be retrieved?
  - Person records (names, dates, places)
  - Document images
  - Metadata (collection info, record types)
  - Other?

Are there rate limits or daily quotas?

Do you support GEDCOM or JSON export?

What are the licensing/usage terms for third-party integrations?

Is there technical documentation available for developers?

What support do you offer for integration partners?
```

### Phase 2: Authentication (After API Discovery)
```javascript
// Once API is confirmed, implement in client.js:
async authenticate() {
  // Use credentials from PreferencesDialog
  // Exchange for token/session
  // Store for reuse
  // Handle token expiration
}
```

### Phase 3: UI Components (After API Implementation)
- [ ] Create `GenealogieQuebecSearchModal.jsx`
- [ ] Create `GenealogieQuebecSearchResults.jsx`
- [ ] Create search results list with person preview
- [ ] Implement "Import" button integration
- [ ] Add to Research menu

### Phase 4: Import Workflow
- [ ] Wire up PersonOperations hook for import
- [ ] Handle duplicate detection
- [ ] Auto-generate citations
- [ ] Prompt user for any missing required fields
- [ ] Save to database

### Phase 5: Advanced Features
- [ ] Batch import of search results
- [ ] Photo/document downloads
- [ ] Relationship linking (spouse, children, parents)
- [ ] Citation verification
- [ ] Link tracking for updates

## Usage

### Current Usage (Data Mapping Only)

```javascript
import {
  parseGQDate,
  gqRecordToHeritagePerson,
  gqRecordToCitation,
} from '@/integrations/genealogieQuebec/dataMapper';

// Convert GQ search result to Heritage person
const gqRecord = {
  givenNames: 'Jean-Marie',
  surname: 'Dupont',
  birthDate: '15/05/1850',
  birthPlace: 'Montréal',
  recordId: 'gq-123',
  recordUrl: 'https://genealogiequebec.com/record/123',
};

const heritageRecord = gqRecordToHeritagePerson(gqRecord);
// { firstName: 'Jean-Marie', lastName: 'Dupont', ... }

const citation = gqRecordToCitation(gqRecord, 'person', personId);
// { entry_number: 'gq-123', url: '...', ... }
```

### Future Usage (After API Implementation)

```javascript
import { createGenealogieQuebecClient } from '@/integrations/genealogieQuebec/client';

// Get credentials from secure store
const credentials = await electronAPI.getCredentials('genealogieQuebec');

// Create authenticated client
const client = await createGenealogieQuebecClient(credentials);

// Search for person
const results = await client.search({
  name: 'Jean Dupont',
  birthYear: '1850',
  birthPlace: 'Montreal',
  pageSize: 20,
});

// Get full record details
const fullRecord = await client.getRecord(results[0].recordId);

// Convert to Heritage format
const heritageRecord = gqRecordToHeritagePerson(fullRecord);
```

## Testing

Run tests with:
```bash
npm run test:run -- src/integrations/genealogieQuebec/dataMapper.test.js
```

Or watch mode:
```bash
npm run test -- src/integrations/genealogieQuebec/dataMapper.test.js
```

All 50+ tests should pass, covering:
- Date parsing in all formats
- Place name normalization
- Data format conversion
- Citation generation
- Batch operations

## Architecture

### File Structure
```
src/integrations/genealogieQuebec/
├── README.md              # This file
├── constants.js           # API config, mappings, error messages
├── client.js              # API client (stub, awaiting API docs)
├── dataMapper.js          # Convert GQ ↔ Heritage formats
├── dataMapper.test.js     # Comprehensive tests
└── __future__/
    ├── auth.js            # Authentication helpers
    ├── search.js          # Search utilities
    └── useGenealogieQuebec.js  # React hook
```

### Design Patterns

1. **Client Stub Pattern** - `client.js` is a complete stub with proper structure, ready to implement once API is known
2. **Data Mapper Pattern** - Pure functions for format conversion, fully testable
3. **Factory Pattern** - `createGenealogieQuebecClient()` for easy client creation
4. **Strategy Pattern** - Pluggable authentication methods (auth.js will contain multiple strategies)

### Dependencies

**Current:**
- React (for hooks)
- vitest (for testing)
- electron-store (for secure credential storage)

**Will be needed:**
- axios or fetch API (for HTTP requests)
- date-fns (for date parsing) - optional, currently using regex patterns

## Integration Points with Heritage

1. **PreferencesDialog** - Already stores GénéalogieQuébec credentials
2. **useSources** hook - GénéalogieQuébec listed as COMMON_SOURCE
3. **usePersonOperations** - Will handle import of people from GQ
4. **PersonView** - Will add "Find in GénéalogieQuébec" button
5. **Citation system** - Auto-generates citations from GQ records

## Credentials Storage

Credentials are stored securely using Electron's secure store:
- Location: `~/.config/heritage-app/heritage-secure-store.json` (encrypted)
- Encryption: AES-256 (via electron-store)
- Access: Via `window.electronAPI.getCredentials('genealogieQuebec')`

Never store or log plain credentials in the app.

## Error Handling

All methods include proper error handling with descriptive messages:
```javascript
try {
  const person = gqRecordToHeritagePerson(record);
} catch (error) {
  console.error('Failed to convert record:', error);
  showToast('Invalid GQ record format');
}
```

## Performance Considerations

- **Date Parsing:** Uses regex patterns (fast, no external deps)
- **Place Normalization:** Lookup table (O(1) average)
- **Batch Operations:** Process arrays efficiently, filter nulls
- **Rate Limiting:** 100ms minimum between API requests
- **Caching:** Session tokens reused until expiration

## Known Limitations

1. **No Public API Yet** - Awaiting confirmation from Institut généalogique Drouin
2. **Web Scraping Not Implemented** - Not recommended due to ToS
3. **No Image Processing** - Future enhancement
4. **No Duplicate Detection** - User responsibility
5. **No Sync Support** - One-time import only (for now)

## Legal & Licensing

- **GénéalogieQuébec:** Subscription service, proprietary data
- **Heritage:** Open source (MIT)
- **Integration:** Requires approval and licensing agreement with Institut généalogique Drouin
- **User Data:** Imported records belong to Heritage user's database

## Contact & Support

- **Institut généalogique Drouin:**
  - Email: contact@institutdrouin.com
  - Phone: 514-400-3961
  - Website: https://genealogiequebec.com

- **Heritage Project:**
  - GitHub: https://github.com/patricklaplante/heritage
  - Issues: Report via GitHub

## Future Enhancements

- [ ] OAuth 2.0 integration for secure auth
- [ ] Batch import from search results
- [ ] Duplicate person detection
- [ ] Automatic relationship linking (spouses, children)
- [ ] Document image extraction and storage
- [ ] Subscription status checking
- [ ] Sync updates from GQ
- [ ] GEDCOM export support

---

**Status:** Pre-Alpha (Foundation Phase)
**Last Updated:** 2026-01-11
**Maintainer:** Heritage Project
