# GénéalogieQuébec "Attach Event" Workflow

## Core Concept

Instead of a batch import dialog, add a button in the **Person View** to attach GQ records for a specific event:

```
PersonView (Jean-Marie Dupont)
├─ Person card
├─ Family section
├─ Events section
│  ├─ Birth
│  │  └─ [Attach GQ Records] ← NEW BUTTON
│  ├─ Baptism
│  │  └─ [Attach GQ Records] ← NEW BUTTON
│  ├─ Marriage
│  └─ [+ Add Event]
└─ Sources & Citations
```

---

## Workflow: User Perspective

### Scenario: You already have Jean-Marie Dupont in Heritage

**Current:**
- You have event "Baptism" (maybe just a note)
- You found GQ records with photos
- Manual process: copy data, attach photos separately

**With Attach Event workflow:**

```
Step 1: Open Jean-Marie Dupont
Step 2: Scroll to Events → Baptism → Click [Attach GQ Records]

         ↓

Step 3: Dialog opens with 2 sections
        Left: Photo gallery for THIS event
        Right: Quick form for THIS event

Step 4: Drag-drop 3-4 photos

Step 5: Form pre-fills based on dialog context:
        - Event type: "Baptism" (already known)
        - Person: "Jean-Marie Dupont" (already known)
        - Fields needed: Date, Place, Parents (if missing)

Step 6: Fill in date, place, confidence

Step 7: Click [Save] → Single action creates:
        - Event with details (if didn't exist)
        - Updates event with new data
        - Attaches all 4 photos to event
        - Creates GQ citation with photo reference

Done in 1-2 minutes!
```

---

## UI Design

### Entry Point: In PersonView Events Section

```
Events
──────────────────────────────────────────────
Birth:        1850-05-15, Montréal
              [Attach GQ Records] [Edit] [Delete]

Baptism:      15/05/1850, Montréal, from GQ
              [Attach GQ Records] [Edit] [Delete]

Marriage:     (No record yet)
              [+ Add Event] [Attach GQ Records]

Death:        1920-03-22, Quebec City
              [Attach GQ Records] [Edit] [Delete]

──────────────────────────────────────────────
[+ Add Event]
```

### The Attach Dialog

```
┌──────────────────────────────────────────────────────┐
│ Attach GénéalogieQuébec Records to Baptism of Jean- │ [X]
│ Marie Dupont                                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────┬──────────────────────┐   │
│  │                      │                      │   │
│  │  PHOTO GALLERY       │  EVENT DETAILS       │   │
│  │  (Left: 40%)         │  (Right: 60%)        │   │
│  │                      │                      │   │
│  │ ┌──────────────────┐ │ Event: Baptism       │   │
│  │ │                  │ │ Person: Jean-Marie   │   │
│  │ │  [Main Photo]    │ │         Dupont       │   │
│  │ │   (Large)        │ │                      │   │
│  │ │                  │ │ Date:                │   │
│  │ │                  │ │ [15/05/1850       ]  │   │
│  │ └──────────────────┘ │ Format: DD/MM/YYYY   │   │
│  │                      │                      │   │
│  │ ┌───┐ ┌───┐ ┌───┐   │ Place:               │   │
│  │ │ 1 │ │ 2 │ │ 3 │   │ [Montréal, QC     ▼] │   │
│  │ └───┘ └───┘ └───┘   │                      │   │
│  │ Thumbnails           │ Confidence:          │   │
│  │                      │ ◉ Certain            │   │
│  │ [+ Add Photos]       │ ◯ Probable           │   │
│  │ (Drag here)          │ ◯ Possible           │   │
│  │                      │ ◯ Uncertain          │   │
│  │ Photos: 3 added      │                      │   │
│  │ Page ranges:         │ Photo References:    │   │
│  │ • GQ Screenshot      │ ☑ Photo 1 (p.3)     │   │
│  │ • Drouin p.21        │ ☑ Photo 2 (p.21)    │   │
│  │ • Full Scan          │ ☑ Photo 3 (Scan)    │   │
│  │                      │                      │   │
│  │                      │ Notes/Transcription: │   │
│  │                      │ ┌────────────────┐   │   │
│  │                      │ │ Born to Pierre │   │   │
│  │                      │ │ Dupont & Anne  │   │   │
│  │                      │ │ Tremblay       │   │   │
│  │                      │ │ Godparents: ... │   │   │
│  │                      │ └────────────────┘   │   │
│  │                      │                      │   │
│  └──────────────────────┴──────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ [Cancel]              [Save] [Save & More] │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Component Design

### Where It Lives

In `PersonView.jsx`, the Events section gets a new button:

```javascript
// In PersonView Events Card
{event.type === 'baptism' && (
  <button
    onClick={() => openAttachGQDialog('baptism')}
    className="btn-attach-gq"
  >
    [Attach GQ Records]
  </button>
)}
```

### New Component: AttachGQEventDialog

```
src/components/
├── AttachGQEventDialog.jsx (Main container)
│   ├── PhotoGalleryPanel.jsx (Photo upload + display)
│   ├── EventDetailsPanel.jsx (Form for event data)
│   └── ActionButtons.jsx (Save options)
```

### New Hook: useAttachGQEvent

```javascript
export function useAttachGQEvent({
  personId,
  eventType,
  existingEvent = null,
  onSave = async () => {},
}) {
  const [photos, setPhotos] = useState([])
  const [formData, setFormData] = useState({
    date: existingEvent?.date || '',
    place: existingEvent?.place || '',
    confidence: 'probable',
    notes: existingEvent?.notes || '',
  })

  // Methods
  const addPhotos = (files) => { /* ... */ }
  const removePhoto = (photoId) => { /* ... */ }
  const updateForm = (field, value) => { /* ... */ }
  const saveEvent = async () => {
    // 1. Create/update event
    // 2. Attach photos to event
    // 3. Create GQ citation
    // 4. Call onSave callback
  }

  return {
    photos,
    formData,
    addPhotos,
    removePhoto,
    updateForm,
    saveEvent,
  }
}
```

---

## Implementation Details

### Form Fields (Context-Aware)

Different event types show different fields:

#### For Baptism:
```
Date: [15/05/1850]
Place: [Montréal, QC ▼]
Parents: (optional, read-only from person record)
Godparents: (optional, can add)
Confidence: [Probable ▼]
Notes: [Transcription]
```

#### For Birth:
```
Date: [15/05/1850]
Place: [Montréal, QC ▼]
Confidence: [Probable ▼]
Notes: [Transcription]
```

#### For Death/Burial:
```
Date: [22/03/1920]
Place: [Quebec City, QC ▼]
Cause: (optional)
Age: (auto-calculated from birth date)
Confidence: [Probable ▼]
Notes: [Transcription]
```

#### For Marriage:
```
Spouse: [Marie Leblanc ▼] (if not yet linked)
Date: [15/06/1875]
Place: [Montréal, QC ▼]
Witnesses: (can add multiple)
Confidence: [Probable ▼]
Notes: [Transcription]
```

### Photo Management

```javascript
// When photos added:
photos = [
  {
    id: 'photo-1',
    file: File,
    label: 'GQ Screenshot',
    pageRange: '3',
    type: 'screenshot'
  },
  {
    id: 'photo-2',
    file: File,
    label: 'Drouin Original',
    pageRange: '21',
    type: 'church_record'
  },
  {
    id: 'photo-3',
    file: File,
    label: 'Full Scan',
    pageRange: '21-22',
    type: 'full_scan'
  }
]

// User can edit labels in modal:
[Edit Photo Metadata]
  Document Type: [GQ Screenshot ▼]
  Page Range: [3]
  Notes: (optional)
```

---

## Save Process

### What Happens When User Clicks [Save]

```
1. Create/update event for this person
   └─ personId: Jean-Marie
   └─ type: baptism
   └─ date: 15/05/1850
   └─ place: Montréal
   └─ notes: transcription

2. For each photo:
   ├─ Save photo file to media library
   ├─ Link photo to person record
   ├─ Link photo to event record
   └─ Store page reference in metadata

3. Create citation
   ├─ source: GénéalogieQuébec
   ├─ event_id: this baptism event
   ├─ entry_number: GQ record ID (if available)
   ├─ url: GQ record URL (if available)
   ├─ accessed_date: today
   ├─ confidence: user's selection
   ├─ abstract: "Baptism record, p.21 in Drouin"
   └─ notes: "Page references: photo 2 (p.21), photo 3 (p.21-22)"

4. Show toast: "✓ Event saved with 3 photos"

5. Close dialog, refresh PersonView to show:
   Baptism: 15/05/1850, Montréal
   [3 photos attached] [Attach GQ Records] [Edit]
```

### Optional: [Save & More]

```
[Save & More] button lets user:
- Save this event
- Keep dialog open
- Clear form
- Ready to attach ANOTHER event for same person

Example:
  Jean-Marie Dupont
  Step 1: Attach Baptism records → Save & More
  Step 2: Attach Marriage records → Save & More
  Step 3: Attach Death records → Save
```

---

## Integration Points

### 1. PersonView Events Card

```javascript
function EventCard({ event, person, onAttachGQ, onEdit, onDelete }) {
  return (
    <div className="event-card">
      <div className="event-header">
        {event.type}: {formatDate(event.date)}, {event.place}
      </div>

      <div className="event-actions">
        <button onClick={() => onAttachGQ(event.type)}>
          [Attach GQ Records]
        </button>
        <button onClick={() => onEdit(event)}>
          [Edit]
        </button>
        <button onClick={() => onDelete(event.id)}>
          [Delete]
        </button>
      </div>

      {event.media && event.media.length > 0 && (
        <div className="event-media">
          <span className="badge">{event.media.length} photos</span>
        </div>
      )}
    </div>
  )
}
```

### 2. PersonView Hook Integration

```javascript
// In usePersonForView or similar hook
const handleAttachGQEvent = (eventType) => {
  setDialogState({
    isOpen: true,
    dialogType: 'attachGQ',
    eventType: eventType,
    person: selectedPerson,
    existingEvent: person.events[eventType]
  })
}

const handleSaveGQEvent = async (eventData, photos) => {
  // 1. Update person event (or create if doesn't exist)
  await onSave({
    ...personData,
    events: {
      ...personData.events,
      [eventType]: eventData
    }
  })

  // 2. Attach photos
  for (const photo of photos) {
    await mediaLibrary.addMedia({
      file: photo.file,
      linkedTo: { personId, eventId: event.id }
    })
  }

  // 3. Create citation
  await createCitation({
    source_id: gqSourceId,
    event_id: event.id,
    ...citationData
  })

  // 4. Close dialog
  setDialogState({ isOpen: false })
}
```

### 3. Menu Integration

Option 1: Right-click person in sidebar
```
[Context Menu]
├─ View
├─ Edit
├─ Attach GQ Records
│   ├─ Baptism
│   ├─ Marriage
│   ├─ Death
│   └─ Other Event
└─ Delete
```

Option 2: Button in PersonView header
```
[PersonView Header]
Name: Jean-Marie Dupont
Born: 1850-05-15
[Edit] [Attach GQ Records ▼] [More]
```

---

## Workflow Examples

### Example 1: Person Already Exists with No Birth Record

```
1. Open Jean-Marie Dupont (existing person)
2. See: "Birth: (No record)"
3. Click [Attach GQ Records]
4. Dialog: "Attach Birth Record to Jean-Marie Dupont"
5. Drag 3 photos (GQ + Drouin + scan)
6. Fill: Date: 15/05/1850, Place: Montréal
7. Click [Save]
8. Results:
   └─ Birth event created with date/place
   └─ 3 photos attached to person
   └─ Citation created: "GQ, Drouin p.21-22"
```

### Example 2: Person Exists with Basic Birth, Add Baptism Record

```
1. Open Jean-Marie Dupont
2. See: "Birth: 15/05/1850, Montréal"
3. See: "Baptism: (No record)"
4. Click Baptism → [Attach GQ Records]
5. Dialog: "Attach Baptism Record"
6. Drag 2 photos (Drouin + scan)
7. Fill: Date: 15/05/1850, Place: Montréal
8. Add Godparents: Jean-Baptiste Leblanc (create), Marie Tremblay (link)
9. Click [Save & More]
10. Form clears, ready for next event
11. (Optional) Attach Marriage records
12. Click [Save]
13. Done! All events linked to Jean-Marie with citations
```

### Example 3: New Person + Baptism + Marriage in One Session

```
1. Create new person: Jean-Marie Dupont (birth: 1850)
2. Click [Attach GQ Records]
3. Dialog: Baptism event
   └─ Add date, place, godparents
   └─ Click [Save & More]
4. Dialog: Marriage event (same person)
   └─ Select spouse: Marie Leblanc (existing person)
   └─ Add date, place, witnesses
   └─ Click [Save & More]
5. Dialog: Death event
   └─ Add date, place
   └─ Click [Save]
6. Three events fully documented in 3-5 minutes
```

---

## UI/UX Details

### Photo Labels in Modal

User can edit what each photo represents:

```
Photo 1:
[GQ Screenshot           ▼] p.3

Photo 2:
[Drouin Original         ▼] p.21

Photo 3:
[Full Scan               ▼] p.21-22

Options in dropdown:
- GQ Screenshot
- Drouin Original
- Full Scan
- Church Register
- Census Record
- Other Document
```

### Confidence Visual Guide

```
Confidence in this data:

◉ Certain
  └─ Photo is clear, all details visible

◯ Probable
  └─ Photo is mostly clear, minor interpretation

◯ Possible
  └─ Photo is blurry/unclear, some estimates

◯ Uncertain
  └─ Educated guess from context
```

### Date Format Helper

```
Date field shows:
[15/05/1850          ] (user types here)

Below: Format examples
✓ 15/05/1850  (DD/MM/YYYY)
✓ 15-5-1850   (DD-MM-YYYY)
✓ May 15 1850 (Month Day Year)
✓ 1850        (Year only)
✓ Mai 1850    (French month)

Parsed as: 15 May 1850
Confidence: Exact date
```

### Photo Selection Checkboxes

```
These photos contain data for this event:
☑ Photo 1 - GQ Screenshot (p.3)
☑ Photo 2 - Drouin p.21
☑ Photo 3 - Full Scan

(Citation will reference: "p.21-22")
```

---

## Code Implementation Structure

### Hook: useAttachGQEvent.js

```javascript
export function useAttachGQEvent({
  personId,
  eventType,
  existingEventData = null,
  onSave,
  onRequestClose,
}) {
  // State
  const [photos, setPhotos] = useState([])
  const [formData, setFormData] = useState({
    date: existingEventData?.date || '',
    place: existingEventData?.place || '',
    confidence: 'probable',
    notes: existingEventData?.notes || '',
    // Event-specific fields
    ...getFieldsForEventType(eventType)
  })

  // Methods
  const addPhotos = useCallback((files) => {
    const newPhotos = files.map(file => ({
      id: generateId(),
      file,
      label: detectPhotoType(file.name),
      pageRange: '',
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }, [])

  const removePhoto = useCallback((photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [])

  const updatePhotoLabel = useCallback((photoId, label, pageRange) => {
    setPhotos(prev =>
      prev.map(p =>
        p.id === photoId
          ? { ...p, label, pageRange }
          : p
      )
    )
  }, [])

  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const saveEvent = useCallback(async () => {
    try {
      // 1. Prepare event data
      const eventData = {
        type: eventType,
        date: parseDate(formData.date),
        place: normalizePlace(formData.place),
        confidence: formData.confidence,
        notes: formData.notes,
      }

      // 2. Call parent save handler
      const result = await onSave(eventData, photos)

      // 3. Close dialog
      onRequestClose()

      return result
    } catch (error) {
      console.error('Failed to save event:', error)
      throw error
    }
  }, [formData, photos, eventType, onSave, onRequestClose])

  const getFieldsForEventType = (type) => {
    switch (type) {
      case 'baptism':
      case 'birth':
        return {
          godparents: [],
          parents: [],
        }
      case 'marriage':
        return {
          spouse_id: null,
          witnesses: [],
        }
      case 'death':
      case 'burial':
        return {
          cause: '',
          age: null,
        }
      default:
        return {}
    }
  }

  return {
    photos,
    formData,
    addPhotos,
    removePhoto,
    updatePhotoLabel,
    updateFormField,
    saveEvent,
  }
}
```

### Component: AttachGQEventDialog.jsx

```javascript
export function AttachGQEventDialog({
  isOpen,
  onClose,
  person,
  eventType,
  onSave,
}) {
  const {
    photos,
    formData,
    addPhotos,
    removePhoto,
    updatePhotoLabel,
    updateFormField,
    saveEvent,
  } = useAttachGQEvent({
    personId: person.id,
    eventType,
    onSave,
    onRequestClose: onClose,
  })

  if (!isOpen) return null

  const eventTypeLabel = {
    birth: 'Birth',
    baptism: 'Baptism',
    marriage: 'Marriage',
    death: 'Death',
    burial: 'Burial',
  }[eventType]

  return (
    <dialog className="attach-gq-dialog" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <h2>
          Attach GénéalogieQuébec Records to {eventTypeLabel} of{' '}
          {person.firstName} {person.lastName}
        </h2>

        <div className="dialog-body">
          <div className="photos-panel">
            <PhotoGalleryPanel
              photos={photos}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              onUpdateLabel={updatePhotoLabel}
            />
          </div>

          <div className="form-panel">
            <EventDetailsPanel
              eventType={eventType}
              person={person}
              formData={formData}
              photos={photos}
              onUpdateField={updateFormField}
            />
          </div>
        </div>

        <div className="dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={saveEvent}>Save</button>
        </div>
      </div>
    </dialog>
  )
}
```

---

## Advantages of This Approach

| Aspect | Benefit |
|--------|---------|
| **Simplicity** | Person already exists; just attach records |
| **Focus** | One event type at a time |
| **Speed** | 1-2 minutes per event |
| **Context** | Form fields match event type |
| **Reusability** | Same person, multiple events |
| **Natural** | Fits into PersonView workflow |
| **Photos** | Always visible during data entry |
| **Citations** | Auto-generated with context |

---

## Optional: Quick Add Buttons

In PersonView, could add quick buttons for common actions:

```
Events
──────────────────────────────────────────────
Birth:        1850-05-15, Montréal
              [Attach GQ ▼] [Edit] [Delete]

Baptism:      (No record)
              [Attach GQ ▼] [+ Add] [Edit]

Marriage:     (No record)
              [Attach GQ ▼] [+ Add] [Edit]

Death:        (No record)
              [Attach GQ ▼] [+ Add] [Edit]
```

The dropdown [Attach GQ ▼] opens this attach dialog directly.

---

## Optional: Witnesses/Godparents Management

For baptism/marriage events, could add inline witness management:

```
Godparents/Witnesses:

[+ Add Godparent]
  ├─ Jean-Baptiste Leblanc (existing person)
  ├─ Marie Tremblay (create new)
  └─ [Remove]

[+ Add Witness]
  ├─ Pierre Dupont
  ├─ Anne Leblanc
  └─ [Remove]
```

Each can be:
- Linked to existing person
- Created as new person
- Just recorded as name (no linking)

---

## Summary

**Instead of:**
- Batch import dialog
- Generic form
- Multiple events at once

**You get:**
- Button in PersonView Events section
- Simple photo + form interface
- One event type at a time
- Photos always visible
- Auto-citations with page references
- Takes 1-2 minutes per event

**Perfect for your workflow:**
- You have the person (Jean-Marie Dupont)
- You have the GQ photos
- You need to attach the records (birth, baptism, marriage, death)
- Create event with data + photos + citation in one action

