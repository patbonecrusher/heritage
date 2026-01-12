# GénéalogieQuébec Photo-Based Workflow Design

## Your Current Workflow Analysis

### Input Documents per Event
```
Event Type: Baptism/Birth, Burial/Death, Wedding, etc.

Document Set 1: GQ Screenshot
  └─ Screenshot of GénéalogieQuébec record page
     (overview, sometimes partial)

Document Set 2: Drouin Record Closeup(s)
  ├─ Closeup of actual church record
  ├─ May be split across 2 pages (p.21-22 = 1 image, p.23-24 = 1 image)
  └─ Details: dates, names, witnesses, location

Document Set 3: Full Scanned Images
  ├─ Full page scan 1 (p.21-22)
  └─ Full page scan 2 (p.23-24)
     (for reference and OCR/archive)

Data to Extract:
├─ Event date (from Drouin or GQ)
├─ Event location/place
├─ Primary person (baptized, buried, married)
├─ Parents/spouse (varies by event type)
├─ Witnesses (if listed)
└─ Confidence level (based on record clarity)
```

### Pain Points in Current Flow
1. **Multiple Images to Manage** - 3-5 images per event, needs organization
2. **Data Scattered** - Dates/names/places across multiple documents
3. **Manual Entry** - Currently copying data from screenshots to form
4. **No Context Linking** - Each event import disconnected from images
5. **Witness Tracking** - Witnesses need to be added as separate people/citations
6. **Page References** - Need to track which page the data came from

---

## Proposed Solution: Photo-First Import Workflow

### Core Concept
**Photo Gallery + Smart Form** - Show images alongside fields, one event at a time

Instead of generic import dialog, create a **sequential, media-centric interface** that:
1. Shows the photos prominently
2. Guides data extraction event-by-event
3. Preserves image-to-data relationships
4. Makes witness tracking natural
5. Stores media with proper citations

---

## UI Architecture

### Main Component: GenealogieQuebecPhotoImporter

```
┌─────────────────────────────────────────────────────────┐
│ Import from GénéalogieQuébec - Photo Workflow          │ [X]
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────┬───────────────────────────┐  │
│  │                       │                           │  │
│  │   PHOTO GALLERY       │     EVENT FORM            │  │
│  │   (Left: 50%)         │     (Right: 50%)          │  │
│  │                       │                           │  │
│  │  ┌─────────────────┐  │  Event Type: [Baptism  ▼]│  │
│  │  │                 │  │                           │  │
│  │  │  [Main Image]   │  │  Primary Person:          │  │
│  │  │    (Large)      │  │  First: [Jean       ]     │  │
│  │  │                 │  │  Last:  [Dupont     ]     │  │
│  │  └─────────────────┘  │                           │  │
│  │                       │  Event Date:              │  │
│  │  ┌──┐ ┌──┐ ┌──┐      │  [15/05/1850      ]       │  │
│  │  │1 │ │2 │ │3 │      │                           │  │
│  │  └──┘ └──┘ └──┘      │  Place:                   │  │
│  │   Thumbnail strip     │  [Montréal, Quebec ▼]    │  │
│  │                       │                           │  │
│  │  [+ Add Photo]        │  Confidence: [Probable ▼] │  │
│  │                       │                           │  │
│  │                       │  ┌─────────────────────┐  │  │
│  │                       │  │ + Add Witness       │  │  │
│  │                       │  └─────────────────────┘  │  │
│  │                       │                           │  │
│  │                       │  Notes:                   │  │
│  │                       │  ┌────────────────────┐   │  │
│  │                       │  │ Record from Drouin │   │  │
│  │                       │  │ p. 21-22           │   │  │
│  │                       │  └────────────────────┘   │  │
│  └───────────────────────┴───────────────────────────┘  │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [Prev Event] [Save & Next Event] [Save & Close]    │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Photo Gallery Panel (Left 50%)

#### Main Display
```
┌─────────────────────────┐
│                         │
│   [Full Resolution]     │  Features:
│   Screenshot/Photo      │  • Click to enlarge modal
│                         │  • Zoom controls (100%, fit)
│                         │  • Annotation overlay (optional)
│                         │  • Page indicator if multi-page
│                         │  • "Found on: p.21-22"
│                         │
└─────────────────────────┘
```

#### Thumbnail Strip
```
┌──┐ ┌──┐ ┌──┐ ┌──┐
│1 │ │2 │ │3 │ │4 │  Click to switch main display
└──┘ └──┘ └──┘ └──┘  Highlight = currently viewing
  ↑
  Drouin closeup

Context labels under each:
- "GQ Screenshot"
- "Drouin p.21"
- "Drouin p.22"
- "Full Scan"
```

#### Add More Photos
```
┌──────────────────────┐
│ [+ Add Photo]        │  • Drag-drop zone
│ (Drag photos here)   │  • Browse picker
└──────────────────────┘  • Paste from clipboard
```

#### Photo Metadata
```
┌──────────────────────┐
│ Image Details:       │
│ Page Range: 21-22    │  User can edit:
│ Document: Drouin     │  • Page references
│ Type: Church Record  │  • Document name
│ Confidence: High     │  • Event type label
└──────────────────────┘
```

### 2. Event Form Panel (Right 50%)

#### Event Type Selector
```
┌────────────────────────────┐
│ Event Type: [Baptism    ▼] │  Options vary by context:
└────────────────────────────┘  • Baptism
                                 • Birth
                                 • Burial
                                 • Death
                                 • Marriage
                                 • Wedding
                                 • Other

Form fields change based on event type:
- Baptism: Primary person, date, place, parents, godparents
- Marriage: Person 1, Person 2, date, place, witnesses
- Death: Primary person, date, place, parents, cause
```

#### Person Fields (Context-Aware)

**For Baptism:**
```
┌────────────────────────────┐
│ Baptized Child:            │
│ First: [Jean          ]    │  Smart features:
│ Last:  [Dupont        ]    │  • Auto-link if exists
│                            │  • Create if not
│ Parents:                   │  • Gender auto-filled
│ Father: [Pierre Dupont ▼]  │  • Birth date suggested
│ Mother: [Anne Tremblay ▼]  │  • Place auto-filled from photo
│                            │
└────────────────────────────┘
```

**For Marriage:**
```
┌────────────────────────────┐
│ Person 1:                  │
│ Name: [Jean Dupont      ]  │  • Full person picker
│                            │  • Create new option
│ Person 2:                  │
│ Name: [Marie Leblanc    ]  │  • Auto-detect gender
│                            │  • Suggest spouse
│ Married As: Person 1   ◉   │  (in case of name change)
│             Person 2       │
│             Other    ○     │
└────────────────────────────┘
```

#### Date Field with Format Help
```
┌────────────────────────────┐
│ Event Date:                │  Features:
│ [15/05/1850           ]    │  • Multi-format: DD/MM/YYYY
│                            │  • Help tooltip: "Date from
│ Format: DD/MM/YYYY         │    Drouin record?"
│ ℹ️ Examples:                │  • Date parser: flexible
│ • 15 mai 1850              │  • Confidence: Exact/Approx
│ • 15/5/1850                │
│ • May 15 1850              │
│ • 1850 (year only)         │
└────────────────────────────┘
```

#### Place with Autocomplete
```
┌────────────────────────────┐
│ Place:                     │  Features:
│ [Montréal, Quebec      ▼]  │  • Autocomplete existing places
│ _ _ _ _ _ _ _ _ _ _ _ _    │  • Or create new
│ Results:                   │  • Normalize accents
│ • Montreal (Qc)            │  • Suggest similar
│ • Montreal (Ontario)       │  • Link to GQ place if known
│ • Create new...            │
└────────────────────────────┘
```

#### Confidence Level
```
┌────────────────────────────┐
│ How confident are you?     │  Visual guide:
│ ◉ Certain                  │  ◉ Clear photo, all data visible
│ ◯ Probable                 │  ◯ Mostly clear, minor guesses
│ ◯ Possible                 │  ◯ Blurry/unclear, estimates
│ ◯ Uncertain                │  ◯ Guess based on context
└────────────────────────────┘
```

#### Photo References
```
┌────────────────────────────┐
│ Found on Photos:           │  • Shows which images
│ ☑ Photo 1 (Drouin p.21)   │    this data came from
│ ☑ Photo 2 (Full Scan)     │  • User can check/uncheck
│ ☐ Photo 3 (GQ Screenshot) │  • Auto-suggested
└────────────────────────────┘
```

#### Notes/Transcription
```
┌────────────────────────────┐
│ Notes:                     │  • Transcription space
│ ┌──────────────────────┐   │  • Names of witnesses
│ │ From Drouin, p.21:   │   │  • Occupations
│ │ Jean-Marie Dupont    │   │  • Additional context
│ │ Son of Pierre        │   │  • Links to other records
│ │ Godparents: ...      │   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

### 3. Witness Management

#### Add Witness Button
```
┌──────────────────────────┐
│ [+ Add Witness]          │  Opens sub-dialog:
│                          │  • Name (first/last)
│                          │  • Role (godparent, witness, etc)
│                          │  • Found on photo (checkbox)
└──────────────────────────┘  • Link to existing person
```

#### Witness List
```
Witnesses/Godparents:
┌─────────────────────────────┐
│ 1. Jean-Baptiste Leblanc    │
│    Role: Godfather          │  • Edit/Delete buttons
│    [From Photo 2]    [✓✗]   │  • Drag to reorder
│                             │  • Mark if need to follow up
├─────────────────────────────┤
│ 2. Marie Tremblay           │
│    Role: Godmother          │
│    [From Photo 2]    [✓✗]   │
└─────────────────────────────┘
```

---

## Workflow Steps

### Step 1: Photo Upload
```
1. Click "Import from GénéalogieQuébec"
2. User selects "Photo-Based Workflow"
3. Drag-drop or browse all event photos
   • GQ screenshot
   • Drouin closeups (1-2)
   • Full scan (1-2)
   • Total: 3-5 photos
4. Heritage displays all photos in gallery
```

### Step 2: Event Creation Loop
```
FOR EACH event (baptism, marriage, burial):
  1. Show photos in left panel
  2. Show form on right
  3. User fills form, referencing photos
  4. User adds witnesses/related people
  5. User marks which photos the data came from
  6. Click "Save & Next" → Load next event
  7. Repeat until all events done
```

### Step 3: Save & Link
```
After last event:
  1. Summary shows: X people created, Y events created
  2. All photos automatically attached to events
  3. All photos attached to person records
  4. Citations auto-generated from GQ source
  5. Page references stored in citations
```

---

## Key Features for Your Workflow

### 1. Multi-Event Per Session
**Current:** Import one event at a time
**Proposed:** Load one event set (3-5 photos), create multiple events from same photos

```
Example: Wedding record contains:
  • Marriage event (Jean + Marie)
  • Can also create notes: witnesses
  • Can create note: ceremony details
  • All from same 5 photos
```

### 2. Photo-to-Data Linking
**Track where each data point came from:**
```
Event: Baptism of Jean-Marie
├─ Date: 15 May 1850
│  └─ Source: Photo 2 (Drouin p.21)
├─ Place: Montréal
│  └─ Source: Photos 2 & 3
├─ Parents: Pierre & Anne
│  └─ Source: Photo 1 (GQ Screenshot)
└─ Godparents: Jean-Baptiste & Marie
   └─ Source: Photo 2 (Drouin p.21)
```

**In Heritage:**
- Citation includes photo page reference
- Can hover to see which photo data came from
- Can revisit photo from person record

### 3. Witness Auto-Linking
**When creating event with witnesses:**
```
Witness: "Jean-Baptiste Leblanc"
  ↓
Heritage checks:
  • Exists as person? → Link
  • Might be new person? → Offer creation
  • Create relationship:
    - He attended THIS baptism
    - He's godfather of Jean-Marie
    - Create note linking families
```

### 4. Smart Page References
**For multi-page records:**
```
Photos 1-2: "Page 21-22 (single image of both pages)"
Photos 3-4: "Page 23-24 (another image)"

When entering data:
[Baptism, p.21-22]  [Marriage, p.23-24]

Citation stores: "GQ Record, p.21-22"
```

### 5. Quick Context Metadata
**Under each photo thumbnail:**
```
┌──┐
│1 │
└──┘
GQ Screenshot
Showing: p.3

┌──┐
│2 │
└──┘
Drouin Original
p. 21

┌──┐
│3 │
└──┘
Drouin Original
p. 22
```

User can edit these labels to track:
- Which document?
- Which page range?
- What type of record?
- What event does it contain?

---

## Implementation Path

### Phase 1: Photo Gallery Component (1 week)
```
- Photo display with zoom/pan
- Thumbnail strip navigation
- Drag-drop photo upload
- Photo metadata editor
- Annotation overlay (optional)
```

### Phase 2: Event Form Component (1 week)
```
- Event type selector with field variations
- Context-aware person pickers
- Date field with multi-format support
- Place autocomplete
- Confidence level selector
```

### Phase 3: Witness Management (3-4 days)
```
- Witness list component
- Add/edit/delete witnesses
- Link to existing people
- Drag-to-reorder
```

### Phase 4: Integration (3-4 days)
```
- Photo-event linking
- Save workflow
- Create persons, events, citations
- Attach photos to records
- Generate page references
```

### Phase 5: Polish (3-4 days)
```
- Keyboard shortcuts
- Undo/redo
- Save draft
- Progress indicator
- Mobile responsiveness
```

**Total: 3-4 weeks for full implementation**

---

## Code Structure

### New Components

```
src/components/GenealogieQuebecPhotoImporter/
├── GenealogieQuebecPhotoImporter.jsx (Main container)
├── PhotoGalleryPanel.jsx (Left panel - 50%)
│   ├── PhotoDisplay.jsx (Main image viewer)
│   ├── PhotoThumbnails.jsx (Strip of thumbnails)
│   ├── PhotoUploadZone.jsx (Drag-drop)
│   └── PhotoMetadata.jsx (Page refs, document type)
├── EventFormPanel.jsx (Right panel - 50%)
│   ├── EventTypeSelector.jsx (Dropdown)
│   ├── PersonFields.jsx (Context-aware form fields)
│   ├── DateField.jsx (Multi-format date input)
│   ├── PlaceField.jsx (Autocomplete)
│   ├── ConfidenceLevel.jsx (Radio buttons)
│   ├── PhotoReferences.jsx (Which photos used)
│   └── NotesField.jsx (Transcription)
├── WitnessManager.jsx (Side panel or modal)
│   ├── WitnessList.jsx
│   ├── AddWitnessForm.jsx
│   └── WitnessItem.jsx
└── EventNavigator.jsx (Bottom nav - prev/next events)

src/hooks/
├── usePhotoImportWorkflow.js (Main orchestration)
├── usePhotoGallery.js (Photo management)
├── useEventForm.js (Form state)
└── useWitnessManager.js (Witness state)
```

### New Hook: usePhotoImportWorkflow

```javascript
export function usePhotoImportWorkflow() {
  // State
  const [photos, setPhotos] = useState([])
  const [events, setEvents] = useState([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [formData, setFormData] = useState({})

  // Methods
  const addPhotos = (files) => { /* ... */ }
  const updatePhotometadata = (photoId, metadata) => { /* ... */ }

  const createEvent = (eventData) => { /* Create person + event + citations */ }
  const updateEvent = (eventIndex, data) => { /* ... */ }
  const deleteEvent = (eventIndex) => { /* ... */ }

  const goToNextEvent = () => { /* Validate & save, load next */ }
  const goToPreviousEvent = () => { /* Save current, load prev */ }

  const saveAll = () => { /* Bulk create all events */ }

  return {
    photos,
    events,
    currentEvent: events[currentEventIndex],
    formData,
    addPhotos,
    updatePhotometadata,
    createEvent,
    updateEvent,
    goToNextEvent,
    goToPreviousEvent,
    saveAll,
  }
}
```

---

## User Journey Example

### Scenario: Importing Baptism Records

**You have:**
- GQ screenshot showing list of records
- Drouin closeup of record p.21 (baptism of Jean-Marie)
- Drouin closeup of record p.22 (baptism of Pierre)
- Full page scan of p.21-22

**What you do:**

```
1. Click: Research → Import from GénéalogieQuébec → Photo Workflow
2. Drag-drop 4 photos into upload zone
   └─ Heritage displays all in gallery
3. Form loads with "Event 1 of 2"
   └─ Shows: "Baptism | Jean-Marie Dupont | 15 May 1850 | Montréal"
   └─ Photos visible on left, you can reference while filling form
4. You notice photo 2 also has godparents visible
   └─ Click: [+ Add Witness]
   └─ Type: "Jean-Baptiste Leblanc" → Heritage finds existing person
   └─ Role: "Godfather"
5. Click: [Save & Next Event]
   └─ Form clears, shows "Event 2 of 2"
   └─ Automatically shows same photos (still visible)
6. Fill in: Pierre's baptism details
7. Click: [Save & Close]
   └─ Heritage creates:
      • Jean-Marie Dupont (person)
      • Baptism event (Jean-Marie)
      • Godparent relationship (Jean-Baptiste)
      • Pierre Dupont (person)
      • Baptism event (Pierre)
   └─ All photos attached to person records
   └─ All events cited from GQ with page refs
   └─ Entire session took ~3 minutes
```

---

## Benefits Over Generic Import

| Feature | Generic Import | Photo Workflow |
|---------|---|---|
| **Context** | Data entry, no reference | Photos always visible |
| **Speed** | Copy-paste from photos | Direct visual reference |
| **Accuracy** | Prone to typos | Verify against images |
| **Related People** | One at a time | Multiple from same photos |
| **Witnesses** | Separate workflow | Integrated, natural |
| **Page Refs** | Manual entry | Auto-tracked |
| **Image Storage** | Separate | Linked to records |
| **Photo Context** | Lost after import | Preserved with data |

---

## Keyboard Shortcuts

```
Ctrl+N          - New photo upload
Ctrl+Z          - Undo
Ctrl+Shift+Z    - Redo
Ctrl+S          - Save current event
Ctrl+Enter      - Save & Next
Shift+Enter     - Save & Prev
Delete          - Remove selected photo
?               - Show help
```

---

## Optional Advanced Features

### Photo Annotation
```
• Highlight important parts
• Add arrows/boxes to data
• Write notes directly on photo
• Save annotations with photo
```

### OCR Integration
```
• Auto-extract text from photos
• Pre-fill form fields from OCR
• Let user verify/correct
• Build OCR confidence over time
```

### AI-Assisted Fields
```
• Based on OCR: suggest name parsing
• Date patterns: suggest formatting
• Place matching: suggest normalization
• Gender detection from names
```

### Batch Import Template
```
• Save event template (baptism with godparents)
• Reuse for similar records
• Faster data entry for similar events
```

