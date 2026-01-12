# GénéalogieQuébec User-Assisted Import Workflow

## Overview

User-assisted import allows Heritage users to manually bring GénéalogieQuébec data into their database. Three methods supported:

1. **JSON File Upload** - User exports GQ search results as JSON
2. **Copy/Paste** - User copies GQ record data, pastes into Heritage
3. **Manual Entry** - User manually enters GQ record details

## User Flow Diagrams

### Flow 1: File Upload
```
User searches GQ → Exports/saves results →
Opens Heritage → Menu: Research → Import from GénéalogieQuébec →
Drag-drop or browse for JSON file →
Preview records → Resolve duplicates →
Confirm import → Records added with auto-citations
```

### Flow 2: Copy/Paste
```
User searches GQ → Selects record → Copies data →
Opens Heritage → Menu: Research → Import GQ Record →
Pastes data → Auto-parses fields →
Preview & edit → Confirm import → Record added
```

### Flow 3: Manual Entry (Fallback)
```
User remembers GQ details →
Opens Heritage → Menu: Research → Import GQ Record →
Manually enters: name, dates, places, record URL →
Auto-generates citation → Confirm → Record added
```

## Component Architecture

### New Components

#### 1. GenealogieQuebecImportDialog (Main Dialog)
**Location:** `src/components/GenealogieQuebecImportDialog.jsx`

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onImport: (records: Array) => Promise<void>,
  onCreatePerson: (personData) => Promise<string>,
  onCreateSource: (sourceData) => Promise<string>,
  onCreateCitation: (citationData) => Promise<void>,
  storageMode: 'bundle' | 'legacy'
}
```

**State:**
```javascript
{
  importMethod: 'file' | 'paste' | 'manual',
  rawData: string,
  parsedRecords: Array<GQRecord>,
  importQueue: Array<ImportItem>,
  selectedRecords: Map<index, boolean>,
  duplicateMatches: Map<gqId, { person_id, confidence }>,
  importProgress: { completed: number, total: number },
  errors: Array<ImportError>
}
```

**Tabs:**
- File Upload
- Copy/Paste
- Manual Entry
- Preview & Duplicates
- Progress

#### 2. GenealogieQuebecFileUpload (File Upload Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/FileUpload.jsx`

**Features:**
- Drag-drop zone for JSON files
- Browse file picker
- File type validation (JSON only)
- File size limit (10MB)
- Preview file contents before parsing

**Handlers:**
```javascript
handleDragDrop(files) // Extract JSON file
handleFilePick() // Open file browser
validateFileSize() // Check < 10MB
parseJsonFile(file) // Parse JSON → GQRecord[]
```

#### 3. GenealogieQuebecPasteData (Copy/Paste Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/PasteData.jsx`

**Features:**
- Large textarea for pasting data
- Support multiple formats:
  - JSON single record
  - JSON array of records
  - Tab-separated values (name, dates, places)
  - Plain text (parsed with heuristics)
- Real-time parsing with error feedback
- Character count and format indicator

**Handlers:**
```javascript
handlePasteChange(text) // Parse pasted data
detectFormat(text) // Determine input format
parseTabSeparated(text) // Handle TSV format
parseJsonString(text) // Validate JSON
parseFreetextRecord(text) // Heuristic parsing
```

#### 4. GenealogieQuebecManualEntry (Manual Entry Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/ManualEntry.jsx`

**Form Fields:**
```javascript
{
  // Identity
  givenNames: string,
  surname: string,
  gender: 'male' | 'female' | 'unknown',

  // Birth
  birthDate: string,
  birthPlace: string,

  // Death
  deathDate: string,
  deathPlace: string,

  // GQ Reference
  recordUrl: string,
  collectionName: string,
  recordType: 'birth' | 'death' | 'marriage' | etc,
}
```

**Features:**
- Form validation as user types
- Date format helper (accepts multiple formats)
- Place autocomplete (from existing places)
- Record type dropdown
- Preview generated person before save

#### 5. GenealogieQuebecPreview (Preview Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/Preview.jsx`

**Features:**
- Tabular preview of all records
- Columns: Name, Birth, Death, Record Type, Status
- Select/deselect records to import
- Filter by: status, type, date range
- Sortable columns

**Record Status:**
- 🟢 Ready - No matches, will create new person
- 🟡 Match Found - Potential duplicate, review suggested
- 🔴 Error - Invalid data, needs correction
- ⚪ Skipped - User deselected

#### 6. GenealogieQuebecDuplicateResolver (Duplicate Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/DuplicateResolver.jsx`

**Features:**
- Show GQ record vs existing person side-by-side
- Similarity score (0-100%)
- Three options per match:
  1. **Create new person** (ignore match)
  2. **Link to existing person** (merge data)
  3. **Skip this record** (don't import)

**Duplicate Detection:**
```javascript
findDuplicates(gqRecord) {
  // Search by: name similarity, birth year, birthplace
  // Return matches sorted by confidence
  // Score factors:
  // - Name match: 40%
  // - Birth year match: 30%
  // - Birth place match: 20%
  // - Death date match: 10%
}
```

#### 7. GenealogieQuebecProgress (Progress Tab)
**Location:** `src/components/GenealogieQuebecImportDialog/Progress.jsx`

**Features:**
- Progress bar showing: X of Y records imported
- Per-record status: ⟳ (importing), ✓ (done), ✗ (error)
- Real-time log of actions taken
- Error summary with recovery options
- Cancel import button

**Real-time Updates:**
```javascript
importQueue.forEach(async (item) => {
  updateProgress(item.index, 'importing')
  try {
    await importRecord(item)
    updateProgress(item.index, 'done')
  } catch (error) {
    updateProgress(item.index, 'error', error.message)
  }
})
```

## Import Process Flow

### Step 1: Data Input
```
User provides data via one of three methods:
- File: GenealogieQuebecFileUpload reads JSON
- Paste: GenealogieQuebecPasteData parses text
- Manual: GenealogieQuebecManualEntry creates record

↓ (All methods produce)
Array<GQRecord> with fields:
{
  givenNames, surname, gender,
  birthDate, birthPlace,
  deathDate, deathPlace,
  recordId, recordUrl, collectionName, recordType,
  // ... more metadata
}
```

### Step 2: Parsing & Validation
```
Use dataMapper functions:
- parseGQDate() → Standardize all date formats
- normalizeQCPlace() → Normalize place names
- Validate required fields (name, at least one date)

Result: ParsedRecord[]
{
  gqId: string,
  givenNames: string,
  surname: string,
  birthDate: { type: 'exact', year, month, day },
  deathDate: { type: 'exact', year, month, day },
  birthPlace: string,
  deathPlace: string,
  recordType: string,
  recordUrl: string,
  collectionName: string,
  original: GQRecord (preserved for reference)
}
```

### Step 3: Duplicate Detection
```
For each record:
findDuplicates(parsedRecord)
  → searchPeopleByName(surname, givenNames)
  → filterByBirthDate(±5 years)
  → filterByBirthPlace (if provided)
  → Sort by match confidence
  → Return top 3 matches

User action options:
1. Create new person (no match confirmed)
2. Link to existing person (merge)
3. Skip record (don't import)
```

### Step 4: Preview & Confirmation
```
Display all records with:
- Status (New/Match Found/Error)
- Parse errors if any (fixable fields)
- Summary: X to create, Y to link, Z to skip
- Total estimated citations to create

User can:
- Edit individual fields
- Fix parse errors
- Change duplicate resolutions
- Deselect records
- Confirm to proceed
```

### Step 5: Import Execution
```
For each selected record:
1. If linking to existing person:
   - Merge birth event data (prefer new if better)
   - Merge death event data
   - Add event citations with GQ source

2. If creating new person:
   - createPerson(gqRecordToHeritagePerson(record))
   - createEvent(type: 'birth', from parsed dates)
   - createEvent(type: 'death', from parsed dates)
   - createSource(GénéalogieQuébec)
   - createCitation(person, birthEvent, source)
   - createCitation(person, deathEvent, source)

3. Track progress with real-time feedback
4. Handle errors individually (skip, retry, abort)
5. Summary on completion
```

### Step 6: Post-Import
```
After import completes:
- Show summary: X new people, Y linked, Z skipped
- Show any errors that occurred
- Auto-reload person list sidebar
- Offer to open first imported person
- Clear import dialog
```

## Data Structures

### ImportRecord (Internal)
```javascript
{
  // Parsed data
  gqId: string,
  givenNames: string,
  surname: string,
  gender: 'male' | 'female' | 'unknown',
  birthDate: DateObject,
  birthPlace: string,
  deathDate: DateObject,
  deathPlace: string,

  // GQ Metadata
  recordId: string,
  recordUrl: string,
  collectionName: string,
  recordType: string,
  confidence: 'certain' | 'probable' | 'possible',

  // Import State
  status: 'ready' | 'duplicate-found' | 'error' | 'skipped',
  duplicateMatches: Array<{
    personId: string,
    firstName: string,
    lastName: string,
    birthDate: string,
    confidenceScore: number (0-100)
  }>,
  selectedAction: 'create' | 'link' | 'skip',
  linkedPersonId: string | null,
  errors: Array<string>,
  heritagePersonId: string | null, // Set after creation
}
```

### ImportError
```javascript
{
  recordIndex: number,
  gqId: string,
  type: 'parse' | 'validation' | 'import' | 'citation',
  message: string,
  recoverable: boolean,
  field: string | null,
}
```

## JSON File Format (Export from GQ)

Users can export this format from GénéalogieQuébec or use our template:

```json
[
  {
    "recordId": "gq-12345",
    "recordUrl": "https://genealogiequebec.com/record/12345",
    "collectionName": "Drouin Institute Records",
    "recordType": "birth",
    "confidence": "probable",
    "givenNames": "Jean-Marie",
    "surname": "Dupont",
    "gender": "male",
    "birthDate": "15/05/1850",
    "birthPlace": "Montréal, Quebec",
    "deathDate": "22/03/1920",
    "deathPlace": "Trois-Rivières, Quebec",
    "occupation": "Blacksmith",
    "notes": "Found in church records"
  }
]
```

## Integration with Existing Hooks

### usePersonOperations
```javascript
// Create new person from GQ record
const personId = await createPerson({
  given_names: record.givenNames,
  surname: record.surname,
  gender: mapGQGender(record.gender),
  notes: buildPersonNotes(record),
  is_living: calculateLivingStatus(record.deathDate)
})
```

### useSources
```javascript
// Find or create GQ source
const gqSourceId = await findOrCreateCommonSource('GénéalogieQuébec')
// Or create with custom collection info
const sourceId = await createSource({
  name: 'GénéalogieQuébec',
  type: 'website',
  url: 'https://genealogiequebec.com',
  notes: `Collection: ${record.collectionName}`
})
```

### useCitationManager
```javascript
// Auto-create citation for imported record
await createCitation({
  source_id: gqSourceId,
  person_id: personId,
  entry_number: record.recordId,
  url: record.recordUrl,
  accessed_date: new Date().toISOString(),
  confidence: mapGQConfidence(record.confidence),
  abstract: `${record.recordType} record: ${record.birthDate} in ${record.birthPlace}`,
  notes: `Imported from GénéalogieQuébec - ${record.collectionName}`
})
```

### useEvents
```javascript
// Create birth and death events from record
const birthEventId = await createEvent({
  person_id: personId,
  type: 'birth',
  date: record.birthDate,
  place_name: record.birthPlace,
  notes: 'From GénéalogieQuébec import'
})

// Create death event if date provided
if (record.deathDate) {
  const deathEventId = await createEvent({
    person_id: personId,
    type: 'death',
    date: record.deathDate,
    place_name: record.deathPlace,
    notes: 'From GénéalogieQuébec import'
  })

  // Add citation to death event
  await createCitation({
    source_id: gqSourceId,
    event_id: deathEventId,
    entry_number: record.recordId,
    url: record.recordUrl,
    ...citationFields
  })
}
```

## UI/UX Considerations

### Dialog Sizing & Layout
```javascript
// Main dialog
<dialog className="import-dialog">
  {/* Header */}
  <h2>Import from GénéalogieQuébec</h2>

  {/* Tabs */}
  <div className="tabs">
    <button>File Upload</button>
    <button>Copy/Paste</button>
    <button>Manual Entry</button>
    <button>Preview</button> {/* Only active after data loaded */}
    <button>Progress</button> {/* Only active during import */}
  </div>

  {/* Content */}
  <div className="tab-content">
    {/* Variable height based on tab */}
    {/* File: 300px textarea + drop zone */}
    {/* Paste: 400px textarea */}
    {/* Manual: 600px form */}
    {/* Preview: 500px table */}
  </div>

  {/* Footer with actions */}
  <div className="dialog-footer">
    <button>Cancel</button>
    <button disabled={!canProceed}>Next / Import</button>
  </div>
</dialog>
```

### Error Handling & Recovery
```javascript
// Display errors inline
<div className="error-message">
  ❌ Could not parse birthDate: "invalid format"
  <button>Help: Date Format Guide</button>
</div>

// Recoverable errors allow fixing
<div className="recoverable-error">
  ⚠️ Place "Monteal" not recognized
  <input defaultValue="Montreal" />
  <button>Use Suggested</button>
</div>

// Skip option for non-critical
<div className="skip-offer">
  Some fields missing: occupation
  <button>Continue anyway</button>
</div>
```

### Performance Considerations
```javascript
// For large imports:
- Virtualize preview table (show 50 at a time)
- Batch process imports (create 10 people, pause)
- Show progress bar with ETA
- Allow pause/resume
- Cache duplicate detection results
```

## Duplicate Detection Algorithm

```javascript
function calculateMatchConfidence(gqRecord, heritageRecord) {
  let score = 0;
  const factors = {
    nameExact: 0,
    namePartial: 0,
    birthYearMatch: 0,
    birthPlaceMatch: 0,
    deathYearMatch: 0,
    deathPlaceMatch: 0,
  };

  // Name matching (40%)
  if (gqRecord.surname === heritageRecord.lastName) {
    factors.nameExact += 25;
  } else if (levenshteinDistance(gqRecord.surname, heritageRecord.lastName) <= 2) {
    factors.namePartial += 15;
  }

  if (gqRecord.givenNames === heritageRecord.firstName) {
    factors.nameExact += 15;
  } else if (gqRecord.givenNames.includes(heritageRecord.firstName.split(' ')[0])) {
    factors.namePartial += 10;
  }

  // Birth year (30%)
  if (gqRecord.birthDate?.year === heritageRecord.birthDate?.year) {
    factors.birthYearMatch = 25;
  } else if (Math.abs(gqRecord.birthDate?.year - heritageRecord.birthDate?.year) <= 2) {
    factors.birthYearMatch = 15;
  }

  // Birth place (20%)
  if (normalizePlace(gqRecord.birthPlace) === normalizePlace(heritageRecord.birthPlace)) {
    factors.birthPlaceMatch = 20;
  }

  // Death year (10%)
  if (gqRecord.deathDate?.year === heritageRecord.deathDate?.year) {
    factors.deathYearMatch = 10;
  }

  score = Object.values(factors).reduce((a, b) => a + b, 0);
  return {
    score: Math.min(100, score),
    factors,
    recommendation: score >= 75 ? 'likely match' : score >= 50 ? 'possible match' : 'probably different'
  };
}
```

## Test Cases

```javascript
// File upload
- Valid JSON file with 1 record
- Valid JSON file with 100+ records
- Invalid JSON (shows parse error)
- Non-JSON file (rejected with message)
- File > 10MB (rejected with size warning)

// Copy/paste
- Valid JSON single record
- Valid JSON array
- Tab-separated values
- Plain text (heuristic parsing)
- Invalid format (shows error with format guide)

// Manual entry
- All fields filled
- Only name + birth year
- Invalid date format (shows suggestions)
- Missing required fields (button disabled)

// Duplicates
- Exact match (100% confidence)
- Close match (80% confidence)
- No match (create new)
- Multiple matches (user picks best)

// Import
- Successful creation of person + events + citations
- Link to existing person (merge events)
- Error during import (skip with error message)
- Batch import with mixed results
- Cancel during import (rollback)

// Edge cases
- Empty/whitespace fields
- Special characters in names (ç, é, etc.)
- Future birth dates (warning)
- Death before birth (error)
- Missing place records (create new)
- Duplicate surnames (differentiate in import)
```

## Menu Integration

Add to App.jsx or main menu:

```javascript
// Main menu
<Menu>
  <Item label="Research" submenu>
    <Item label="Find in GénéalogieQuébec" onClick={openGQSearch} />
    <Item label="Import from GénéalogieQuébec" onClick={openGQImport} />
    <Item label="Export to GEDCOM" onClick={openGedcomExport} />
  </Item>
</Menu>

// Right-click person context menu
<ContextMenu>
  <Item label="Find related records in GQ" onClick={searchGQByPerson} />
</ContextMenu>

// Keyboard shortcut
// Ctrl+Shift+G (Cmd+Shift+G on Mac) to open import dialog
```

## Success Metrics

After implementation, measure:
- Number of imports initiated
- Average records imported per session
- Duplicate detection accuracy
- User satisfaction (did they find what they wanted?)
- Retention (do they come back?)
- Citation usage (how many GQ records cited?)

---

## Next Steps

### Phase 1: Build Components (Estimated 3-4 weeks)
- [ ] GenealogieQuebecImportDialog (main container)
- [ ] FileUpload tab component
- [ ] PasteData tab component
- [ ] ManualEntry tab component
- [ ] Preview tab component
- [ ] DuplicateResolver tab component
- [ ] Progress tab component

### Phase 2: Integration (1-2 weeks)
- [ ] Wire up to usePersonOperations
- [ ] Integrate with useSources
- [ ] Integrate with useCitationManager
- [ ] Add menu items
- [ ] Test with real GQ data

### Phase 3: Polish & Launch (1 week)
- [ ] User testing
- [ ] Error message refinement
- [ ] Performance optimization
- [ ] Documentation for users
- [ ] Keyboard shortcuts

