# GénéalogieQuébec User-Assisted Import - Design Summary

## Overview

Since GénéalogieQuébec doesn't provide a public API, we've designed a **user-assisted import workflow** that allows Heritage users to manually import Quebec genealogical records through three flexible methods.

## What Was Designed

### 1. Three Import Methods

#### Method 1: JSON File Upload
- User exports GQ search results as JSON (or uses our JSON template)
- Drags/drops or browses file in Heritage
- Heritage parses and displays preview
- User confirms duplicate resolutions
- Records imported with auto-citations

**Best for:** Bulk imports, exporting multiple records from GQ

#### Method 2: Copy/Paste
- User finds record in GQ browser
- Copies data (native GQ format or our template)
- Pastes into Heritage import dialog
- Auto-detects format (JSON, tab-separated, freetext)
- Parses and imports

**Best for:** Single records, quick imports, mobile users

#### Method 3: Manual Entry
- User manually fills out form with GQ record details
- Form validates as user types
- Auto-completes place names from existing database
- Generates citation with GQ URL
- Creates person with events

**Best for:** Manual record entry, when user remembers details

### 2. Complete Component Architecture

```
GenealogieQuebecImportDialog (Main Dialog)
├── FileUpload Tab
│   ├── Drag-drop zone
│   ├── File browser button
│   └── File type/size validation
├── PasteData Tab
│   ├── Large textarea for input
│   ├── Format auto-detection
│   └── Format guide with examples
├── ManualEntry Tab
│   ├── Person form
│   │   ├── Given names
│   │   ├── Surname
│   │   └── Gender
│   ├── Birth section
│   │   ├── Date (with format helper)
│   │   └── Place (autocomplete)
│   ├── Death section
│   │   ├── Date
│   │   └── Place
│   └── GQ Reference section
│       ├── Record URL
│       ├── Collection name
│       └── Record type
├── Preview Tab (After data loaded)
│   ├── Sortable table of records
│   ├── Status indicators (new/match/error)
│   ├── Bulk select/deselect
│   └── Summary statistics
└── Progress Tab (During import)
    ├── Progress bar
    ├── Per-record status
    ├── Real-time action log
    └── Error summary with recovery options
```

### 3. Smart Duplicate Detection

**Algorithm:**
```
Score =
  Name match (40%):
    - Exact surname match: 25 points
    - Given name in first name: 15 points
  Birth year match (30%):
    - Exact year: 25 points
    - Within 2 years: 15 points
  Birth place match (20%):
    - Exact normalized place: 20 points
  Death year match (10%):
    - Exact year: 10 points
```

**Result:**
- **75-100%:** Likely match (recommend linking)
- **50-75%:** Possible match (review suggested)
- **Below 50%:** Probably different (create new)

### 4. Three Actions Per Record

1. **Create New** - Add as new person in Heritage
2. **Link to Existing** - Merge with existing person (add events/citations)
3. **Skip** - Don't import this record

### 5. Automatic Citation Generation

For every imported record:
- ✅ Creates/links GénéalogieQuébec as source
- ✅ Auto-generates citation with:
  - Record ID and URL
  - Access date (import time)
  - Confidence level (certain/probable/possible/uncertain)
  - Collection name
  - Record type (birth/death/marriage/etc)
- ✅ Links citation to person and event

### 6. Data Format Support

#### JSON Format (Recommended)
```json
{
  "recordId": "gq-12345",
  "recordUrl": "https://genealogiequebec.com/record/12345",
  "collectionName": "Drouin Institute Records",
  "recordType": "birth",
  "givenNames": "Jean-Marie",
  "surname": "Dupont",
  "gender": "male",
  "birthDate": "15/05/1850",
  "birthPlace": "Montréal, Quebec",
  "deathDate": "22/03/1920",
  "deathPlace": "Trois-Rivières, Quebec",
  "confidence": "probable"
}
```

#### Tab-Separated Values
```
Jean    Dupont    1850    Montreal    1920    Quebec    https://gq.com/123
```

#### Plain Text (Heuristic Parsing)
```
Jean Dupont, born 15 May 1850 in Montreal, died 1920 in Quebec
```

## Implementation: useGenealogieQuebecImport Hook

**Location:** `src/hooks/useGenealogieQuebecImport.js`

### Main Methods

```javascript
// Parsing
parseJsonFile(file)           // Parse uploaded JSON file
parsePastedData(text)         // Auto-detect format and parse
createManualRecord(formData)  // Create from form submission

// Duplicate Detection
findDuplicates(gqRecord)      // Find matches for one record
detectAllDuplicates()         // Find matches for all records

// Import Control
setRecordAction(gqId, action, linkedPersonId)  // Set create/link/skip
executeImport()               // Run full import with progress

// Utilities
reset()                       // Clear all state

// Computed
readyToImport                 // Can proceed to import?
summary                       // Counts: total, toCreate, toLink, toSkip
```

### Integration with Existing Hooks

```javascript
// Uses these hooks for actual operations:
- usePersonOperations.onCreatePerson()   // Create person
- usePersonOperations.onCreateEvent()    // Create birth/death events
- useSources.createSource()              // Create GQ source (once)
- useCitationManager.createCitation()    // Create citations
```

### State Management

```javascript
{
  // Input
  method: 'file' | 'paste' | 'manual',
  rawData: string,

  // Parsed data
  parsedRecords: Array<ImportRecord>,

  // User decisions
  selectedActions: Map<gqId, 'create'|'link'|'skip'>,
  linkedPersonIds: Map<gqId, personId>,
  duplicateMatches: Map<gqId, matches[]>,

  // Progress
  isImporting: boolean,
  importProgress: { current: number, total: number },

  // Errors
  errors: Array<ImportError>
}
```

## Test Coverage

**20+ comprehensive tests covering:**

✅ File upload (JSON single & array)
✅ Paste parsing (JSON, TSV, freetext)
✅ Manual entry (single & multiple)
✅ Duplicate detection (name, year, place matching)
✅ Action setting (create, link, skip)
✅ Import execution with progress
✅ Error handling & recovery
✅ State reset & cleanup

**Example test:**
```javascript
it('creates new person with events and citations', async () => {
  // 1. Parse data
  // 2. Set action to 'create'
  // 3. Execute import
  // 4. Verify: person created, events created, citations created
  expect(mockCallbacks.onCreatePerson).toHaveBeenCalled()
  expect(mockCallbacks.onCreateEvent).toHaveBeenCalled()
  expect(mockCallbacks.onCreateCitation).toHaveBeenCalled()
})
```

## JSON Export Template for Users

Heritage users can use this template when exporting from GQ:

```json
[
  {
    "recordId": "unique-identifier",
    "recordUrl": "https://genealogiequebec.com/record/...",
    "collectionName": "Drouin Institute Records",
    "recordType": "birth|death|marriage|census|immigration",
    "confidence": "certain|probable|possible|uncertain",
    "givenNames": "Given names",
    "surname": "Family name",
    "gender": "male|female|unknown",
    "birthDate": "YYYY-MM-DD or DD/MM/YYYY or year only",
    "birthPlace": "Place name",
    "deathDate": "YYYY-MM-DD or DD/MM/YYYY",
    "deathPlace": "Place name",
    "occupation": "optional",
    "notes": "optional"
  }
]
```

## UI Patterns Used

All following existing Heritage patterns:

- **Tabs:** Like PreferencesDialog (appearance/credentials)
- **Form validation:** Like SourceDialog (type-specific fields)
- **Dialog callbacks:** Like CitationDialog (return data to parent)
- **Progress feedback:** Like file operations (toast + progress bar)
- **Error handling:** Like database operations (try-catch + user feedback)
- **Storage mode support:** Works with both bundle and legacy modes

## Key Features

### ✅ Three Input Methods
- File upload with validation
- Copy/paste with auto-format detection
- Manual form entry with validation

### ✅ Smart Duplicate Detection
- Confidence-based scoring
- Names, birth dates, places
- User can override with simple clicks

### ✅ Batch Processing
- Import 1 or 100+ records
- Progress tracking with ETA
- Skip individual records
- Error recovery per-record

### ✅ Auto-Citation Generation
- Creates proper Heritage citations
- Preserves GQ record URLs
- Stores record IDs and collection info
- Sets confidence levels

### ✅ Data Mapping
- Uses existing dataMapper module
- Handles 5 date formats
- Normalizes French place names
- Supports multiple gender formats

### ✅ Error Recovery
- Graceful format detection
- Per-field validation
- Recoverable vs fatal errors
- Skip option for non-critical fields

## User Experience

### Step-by-Step Workflow

**1. Open Import Dialog**
```
User opens: Research Menu → Import from GénéalogieQuébec
Dialog shows: Choose input method (File/Paste/Manual)
```

**2. Provide Data**
```
File:   Drag-drop JSON file with records
Paste:  Copy data from GQ, paste into text area
Manual: Fill out form with record details
```

**3. Preview & Resolve Duplicates**
```
Dialog shows: Table of parsed records
             Status: New / Match Found / Error
User picks:  Create / Link / Skip for each record
```

**4. Confirm & Import**
```
Dialog shows: Summary (X new, Y linked, Z skipped)
User clicks: "Import Now"
Dialog shows: Progress bar, per-record status
Result:      Records added to Heritage with citations
```

### Estimated Time per Method

| Method | Single Record | 10 Records | 100+ Records |
|--------|---------------|-----------|-------------|
| File   | 2 min setup + import | 3 min | 5-10 min |
| Paste  | 1 min copy + paste | 10 min | N/A (tedious) |
| Manual | 2-3 min per record | 20-30 min | N/A (too slow) |

## What's NOT Included (Could Be Phase 3+)

❌ Automatic search in GQ (requires API or web scraping)
❌ Direct GQ login from Heritage (no API for auth)
❌ Real-time sync (would need API)
❌ Photo extraction from GQ (would need API)
❌ Batch relationship linking (merge spouses, children)

## How It Works with Storage Modes

### Bundle Mode (.heritage files)
```
Import Dialog
    ↓
useGenealogieQuebecImport hook
    ↓
usePersonOperations (creates person in database)
useEvents (creates birth/death events)
useSources (creates GQ source)
useCitationManager (creates citations)
    ↓
SQLite database updated
    ↓
UI auto-reloads from database
```

### Legacy Mode (JSON files)
```
Import Dialog
    ↓
useGenealogieQuebecImport hook
    ↓
usePersonOperations (updates data state object)
useEvents (updates unions/events in state)
useSources (adds source to state)
useCitationManager (adds citations to state)
    ↓
JSON state object updated
    ↓
Save to file required manually
```

## Files Created

```
📄 GQ_USER_IMPORT_WORKFLOW.md               (14KB, detailed design)
📄 src/hooks/useGenealogieQuebecImport.js   (380 lines, implementation)
📄 src/hooks/useGenealogieQuebecImport.test.js (320 lines, 20+ tests)
```

## Next Steps for Implementation

### Phase 2a: UI Components (3-4 weeks)
1. GenealogieQuebecImportDialog container
2. FileUpload component with drag-drop
3. PasteData component with format detection
4. ManualEntry form component
5. Preview table with sorting/filtering
6. DuplicateResolver with confidence scoring
7. Progress tracker with real-time updates

### Phase 2b: Integration (1-2 weeks)
1. Wire hook to App.jsx
2. Add menu items (Research → Import GQ)
3. Test with real GQ data
4. User testing & feedback
5. Keyboard shortcuts

### Phase 2c: Polish (1 week)
1. Error message refinement
2. Performance optimization (virtualize large imports)
3. Accessibility review
4. User documentation

## Success Criteria

✅ Users can import GQ records without API
✅ Duplicate detection works reliably (75%+ accuracy)
✅ Process takes < 5 minutes for batch import
✅ All imported records have proper citations
✅ No data loss or corruption
✅ Error recovery for invalid/partial records
✅ Works with both bundle and legacy modes
✅ Zero external dependencies needed
✅ Complies with GQ terms of service

## Benefits of This Approach

| Aspect | Advantage |
|--------|-----------|
| **Legal** | ✅ No scraping, no API abuse, complies with ToS |
| **Sustainable** | ✅ Works forever (no API dependency) |
| **User Control** | ✅ Users decide what data to import |
| **Data Quality** | ✅ Users can verify and fix before import |
| **Partnership** | ✅ Sets foundation for future official API |
| **Performance** | ✅ Local processing, no rate limiting |
| **Privacy** | ✅ No third-party access to user's genealogy |

## Conclusion

This user-assisted import workflow is a **pragmatic solution** to GénéalogieQuébec integration without a public API. It provides immediate value to users while maintaining ethical standards and setting the stage for future API partnerships.

The hook-based implementation is ready to be wrapped in UI components, following Heritage's established patterns for dialogs, forms, and state management.

---

**Status:** Design Complete, Ready for Component Implementation
**Estimated Effort Phase 2a:** 3-4 weeks
**Estimated Effort Phase 2b:** 1-2 weeks
**Total Timeline:** 4-6 weeks to full implementation
**Current Branch:** `feature/genealogie-quebec-integration`
