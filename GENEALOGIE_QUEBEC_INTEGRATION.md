# GénéalogieQuébec Integration for Heritage

## Project Overview

This document outlines the strategy for integrating Heritage with GénéalogieQuébec.com to provide users with searchable access to Quebec genealogical records directly within the Heritage application.

## Current Status

**Platform:** GénéalogieQuébec.com
**Contact:** Institut généalogique Drouin (contact@institutdrouin.com, 514-400-3961)
**API Status:** ❌ NO PUBLIC API AVAILABLE
**Current Integration:** Placeholder in Heritage (credentials storage, common source listing)

⚠️ **IMPORTANT:** See [GQ_INTEGRATION_NO_API.md](GQ_INTEGRATION_NO_API.md) for recommended alternative approach

### What Exists in Heritage
- Credentials storage in secure Electron store (email/password)
- GénéalogieQuébec listed as COMMON_SOURCE
- Preferences dialog with credentials tab (already supports genealogieQuebec)
- Source citation system that can reference GénéalogieQuébec records

## Integration Strategy

### Phase 1: Research & API Discovery (Current Phase)

**Objectives:**
1. Contact Institut généalogique Drouin for API access
2. Document available endpoints and data formats
3. Determine authentication method (OAuth, API key, username/password)
4. Identify rate limiting and quota policies

**Key Questions for API Contact:**
- Do you provide a REST API or web service for record searching?
- What authentication method do you support? (OAuth 2.0, API keys, HTTP Basic Auth, etc.)
- What data can be retrieved? (Person records, vital events, document images)
- What are the rate limits and daily quotas?
- Is GEDCOM or JSON export supported?
- Are there usage terms/conditions for API integrations?
- What support do you offer for third-party developers?

### Phase 2: Authentication Implementation (Proposed)

**Approach:** Use stored credentials from PreferencesDialog

**Implementation Path:**
```javascript
// src/integrations/genealogieQuebec/auth.js
export async function authenticateGQ(credentials) {
  // Make login request using stored email/password
  // Get and store session token/API key
  // Return authenticated client
}

// src/integrations/genealogieQuebec/client.js
export class GenealogieQuebecClient {
  constructor(credentials) {
    this.authToken = null;
    this.credentials = credentials;
  }

  async connect() {
    // Authenticate and setup client
  }

  async search(query) {
    // Search for people by name
  }

  async getRecord(recordId) {
    // Get full record details
  }
}
```

**Secure Storage:**
- Credentials already stored in Electron secure store
- Can be retrieved when user initiates search
- Optional: Implement token caching with expiration

### Phase 3: Search Integration (Proposed)

**UI Components:**

1. **GénéalogieQuébec Search Modal**
   - Text input for person name search
   - Results list with vital dates
   - "Import" button to add matches to Heritage

2. **Search Results Display**
   ```
   Person Name: Jean-Marie Dupont
   Birth: 1850-05-15 in Montréal, QC
   Death: 1925-03-22 in Trois-Rivières, QC
   Source: GénéalogieQuébec (record #12345)
   [Import to Heritage] [View Online] [Copy URL]
   ```

3. **Integration Points**
   - New menu item: "Research" → "Search GénéalogieQuébec"
   - Button in Person view: "Find in GénéalogieQuébec"
   - Citation dialog: Quick-add from GénéalogieQuébec results

**Implementation:**
```javascript
// src/components/GenealogieQuebecSearchModal.jsx
export function GenealogieQuebecSearchModal({ isOpen, onClose, onImport }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      checkCredentials();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!hasCredentials) {
      // Prompt user to enter credentials
      return;
    }

    setLoading(true);
    try {
      const client = await createGQClient();
      const searchResults = await client.search(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (result) => {
    // Convert GQ result to Heritage person record
    const heritageRecord = {
      firstName: result.givenNames,
      lastName: result.surname,
      birthDate: parseDate(result.birthDate),
      birthPlace: result.birthPlace,
      deathDate: parseDate(result.deathDate),
      deathPlace: result.deathPlace,
      sources: [{
        name: 'GénéalogieQuébec',
        url: `https://genealogiequebec.com/record/${result.recordId}`,
        type: 'website'
      }]
    };

    onImport(heritageRecord);
  };

  // ... render search UI
}
```

### Phase 4: Data Mapping (Proposed)

**GénéalogieQuébec Record → Heritage Person**

| GQ Field | Heritage Field | Notes |
|----------|----------------|-------|
| givenNames | person.given_names | Map French diacritics |
| surname | person.surname | Handle dit names |
| birthDate | event (birth) | Parse various date formats |
| birthPlace | event.place_name | Standardize place names |
| deathDate | event (death) | Handle incomplete dates |
| deathPlace | event.place_name | Map to Heritage places |
| occupation | event (occupation) | Create custom event |
| spouse | union.person2_id | Link to existing/new person |
| children | union.childIds | Link to child records |
| recordId | citation.entry_number | Track source reference |
| recordUrl | citation.url | Store link to online source |

### Phase 5: Citation Integration (Proposed)

**Auto-Generate Citations**

When importing from GénéalogieQuébec:
```javascript
const citation = {
  source_id: gqSourceId,
  person_id: importedPersonId,
  entry_number: record.recordId,
  url: record.recordUrl,
  page: record.page,
  accessed_date: new Date().toISOString(),
  confidence: 'probable', // User can adjust
  notes: `Imported from GénéalogieQuébec ${record.collectionName}`
};

// Store reference to actual record for later viewing
citation.abstract = `Birth record: ${record.birthDate} in ${record.birthPlace}`;
```

### Phase 6: Advanced Features (Long-term)

**Batch Import**
- Import entire family branches from GQ
- Merge duplicate detection
- Relationship linking

**Sync & Updates**
- Monitor for record updates on GQ
- Flag changes when records are modified
- Maintain reference to original online record

**Photo/Document Extraction**
- Download document images from GQ
- Store in Heritage media library with citation
- OCR transcription support

**API Webhook Integration** (if supported)
- Receive notifications when linked records change
- Automatic sync of updates

## Technical Architecture

### File Structure

```
src/
  integrations/
    genealogieQuebec/
      client.js           # API client
      auth.js             # Authentication logic
      search.js           # Search utilities
      dataMapper.js       # Convert GQ → Heritage format
      constants.js        # API endpoints, date formats
      __tests__/
        client.test.js
        auth.test.js
        dataMapper.test.js

  components/
    GenealogieQuebecSearchModal.jsx
    GenealogieQuebecSearchResults.jsx
    GenealogieQuebecImportDialog.jsx

  data/
    useGenealogieQuebec.js  # React hook for GQ operations

  hooks/
    useGenealogieQuebecSearch.js  # Search hook with caching
```

### Dependencies Needed

- **axios** (if not present) - HTTP client for API calls
- **date-fns** - Date parsing and formatting
- Existing: electron-store (credentials), React, SQLite

### API Client Pattern

```javascript
// src/integrations/genealogieQuebec/client.js

export class GenealogieQuebecClient {
  constructor(credentials, options = {}) {
    this.baseUrl = 'https://api.genealogiequebec.com/v1';
    this.credentials = credentials;
    this.authToken = null;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
  }

  async authenticate() {
    // Implement based on API requirements
    // Store auth token for session
  }

  async search(query, filters = {}) {
    // Build search request
    // Handle pagination
    // Return normalized results
  }

  async getRecord(recordId) {
    // Fetch full record details
  }

  async getCollection(collectionId) {
    // Get metadata about record collection
  }

  async _request(method, endpoint, data = null) {
    // Centralized request handler
    // Add auth headers
    // Handle rate limiting
    // Retry on failure
  }
}
```

## Risk Assessment

### High Risk
- **API Availability**: GQ may not have public API
- **Authentication Changes**: Platform updates could break auth
- **Legal/Licensing**: Usage terms may restrict integration

### Medium Risk
- **Rate Limiting**: API quotas could limit search frequency
- **Data Format Changes**: API schema updates
- **URL Stability**: Record URLs might change

### Low Risk
- **Credential Storage**: Already implemented securely
- **Credential Compromise**: Should be covered by Electron security best practices

## Success Criteria

1. ✅ Successfully authenticate with GénéalogieQuébec
2. ✅ Execute searches for people by name
3. ✅ Retrieve full record details
4. ✅ Import records into Heritage as new persons
5. ✅ Auto-generate proper citations
6. ✅ Store links to original online records
7. ✅ No performance degradation in Heritage UI
8. ✅ Comprehensive error handling and user feedback
9. ✅ Unit tests for all integration components
10. ✅ Documentation for users on how to use feature

## Next Steps

### Immediate (This Week)
- [ ] Contact Institut généalogique Drouin for API access
- [ ] Investigate if public API exists
- [ ] Review any available technical documentation
- [ ] Determine authentication mechanism

### Short-term (If API exists)
- [ ] Create GenealogieQuebecClient class
- [ ] Implement authentication flow
- [ ] Write unit tests for API client
- [ ] Create search modal UI

### Medium-term
- [ ] Data mapping and transformation
- [ ] Citation generation
- [ ] Integration with person import workflow
- [ ] User documentation

### Long-term (Post-MVP)
- [ ] Batch import from search results
- [ ] Duplicate detection and merging
- [ ] Photo/document extraction
- [ ] Sync and update notifications

## Feasibility Assessment

### API Availability: ❌ NOT AVAILABLE

GénéalogieQuébec.com **does not provide a public API** for third-party integration.

**Alternative Approaches:**

| Option | Feasibility | Effort | Sustainability | Legal Risk |
|--------|------------|--------|-----------------|-----------|
| Partnership API | 🟡 Medium | 4-12 weeks | ✅ High | None |
| User Import | ✅ High | 2-3 weeks | ✅ High | None |
| Web Scraping | 🟡 Medium | 1-2 weeks | ❌ Low | ⚠️ High |
| FamilySearch API | ✅ High | 1-2 weeks | ✅ High | None |

**RECOMMENDED:** User-assisted import + Partnership outreach
- See [GQ_INTEGRATION_NO_API.md](GQ_INTEGRATION_NO_API.md) for detailed strategy

## References

- GénéalogieQuébec: https://genealogiequebec.com
- Institut généalogique Drouin: contact@institutdrouin.com, 514-400-3961
- FamilySearch API (similar genealogy integration): https://developers.familysearch.org/
- GEDCOM Standard: https://www.familysearch.org/developers/docs/api/resources/Family_Tree_GEDCOM

