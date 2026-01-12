# Attach GénéalogieQuébec Event Implementation

## Overview

Complete implementation of the photo-first "Attach GQ Event" workflow for Heritage. This allows users to attach GénéalogieQuébec records to existing persons' events through a guided photo + form interface.

## Files Created

### Hooks
- **src/hooks/useAttachGQEvent.js** (350 lines)
  - Manages all state and logic for photo/form/witness management
  - Handles validation, metadata, and save operations
  - Integrates with existing hooks for database operations

### Components
- **src/components/AttachGQEventDialog/AttachGQEventDialog.jsx** (140 lines)
  - Main dialog component
  - Split-panel layout (photos left, form right)
  - Integrates hook and sub-components

- **src/components/AttachGQEventDialog/PhotoGalleryPanel.jsx** (280 lines)
  - Drag-drop photo upload
  - Main photo display with zoom controls (50%-300%)
  - Thumbnail strip with metadata editing
  - Auto-detection of photo types from filenames

- **src/components/AttachGQEventDialog/EventDetailsPanel.jsx** (400 lines)
  - Context-aware form fields by event type
  - Birth/Baptism: Date, place, godparents
  - Marriage: Spouse, date, place, witnesses
  - Death/Burial: Date, place, cause, witnesses
  - Date field with multi-format support
  - Confidence level selector (certain/probable/possible/uncertain)
  - Photo reference checkboxes
  - Notes/transcription field

- **src/components/AttachGQEventDialog/WitnessManager.jsx** (200 lines)
  - Add/remove/update witnesses and godparents
  - Event-type specific labels and roles
  - Link witnesses to existing persons
  - Create new person option for unlisted witnesses

### Styling
- **src/components/AttachGQEventDialog/AttachGQEventDialog.css** (320 lines)
  - Main dialog layout and responsive design
  - Header, footer, buttons
  - Mobile-responsive stacking

- **src/components/AttachGQEventDialog/PhotoGalleryPanel.css** (400 lines)
  - Photo gallery styling
  - Zoom controls
  - Metadata edit overlay
  - Scrollbar styling

- **src/components/AttachGQEventDialog/EventDetailsPanel.css** (380 lines)
  - Form fields and validation states
  - Confidence option styling
  - Date help box
  - Error alert styling

- **src/components/AttachGQEventDialog/WitnessManager.css** (280 lines)
  - Witness list styling
  - Add form styling
  - Link-to-person selector
  - Remove witness button

## Feature Checklist

### Photo Management
- ✅ Drag-drop upload with visual feedback
- ✅ File browser upload button
- ✅ Thumbnail strip with click-to-view
- ✅ Auto-detect photo type (GQ screenshot, Drouin, full scan, etc.)
- ✅ Metadata editing (document type, page range)
- ✅ Photo removal with confirmation
- ✅ Main photo display with zoom (50%-300%)
- ✅ Zoom in/out/fit buttons
- ✅ Photo counter showing "X of Y"

### Event Details Form
- ✅ Birth: Date, place
- ✅ Baptism: Date, place, godparents
- ✅ Marriage: Spouse, date, place, witnesses
- ✅ Death: Date, place, cause of death
- ✅ Burial: Date, place, witnesses
- ✅ Date field with multi-format support (DD/MM/YYYY, French month names, year-only)
- ✅ Place field with autocomplete
- ✅ Confidence level selector
- ✅ Photo reference checkboxes
- ✅ Notes/transcription textarea

### Witness/Godparent Management
- ✅ Event-specific labels (Godparent for baptism, Witness for marriage/death)
- ✅ Event-specific roles (Godfather/Godmother, Best Man/Bridesmaid, Pallbearer)
- ✅ Add new witness form
- ✅ Link witness to existing person
- ✅ Create new person as witness
- ✅ Remove witness
- ✅ Update witness details
- ✅ Witness count display

### UI/UX
- ✅ Split-panel layout (photos 40%, form 60%)
- ✅ Header with event type and person name
- ✅ Footer with photo count and save/cancel buttons
- ✅ Save button disabled until form valid
- ✅ Loading state during save
- ✅ Error display and handling
- ✅ Mobile responsive (stacks on small screens)
- ✅ Accessibility (proper labels, keyboard navigation)

### Validation
- ✅ Required field validation (at least date or place)
- ✅ Date format validation with helpful error messages
- ✅ Form state validation before save
- ✅ Photo metadata validation

## How to Use in PersonView

### 1. Import the Component

```javascript
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
```

### 2. Add State to Track Dialog

```javascript
const [attachGQDialogState, setAttachGQDialogState] = useState({
  isOpen: false,
  eventType: null,
  existingEventId: null,
});
```

### 3. Add Button to Each Event

In the event list rendering:

```javascript
{person.events.map(event => (
  <div key={event.id} className="event-item">
    <h4>{event.type}</h4>
    <p>{event.date?.year || '?'} in {event.place}</p>
    <button onClick={() => setAttachGQDialogState({
      isOpen: true,
      eventType: event.type,
      existingEventId: event.id,
    })}>
      📎 Attach GQ Record
    </button>
  </div>
))}
```

### 4. Render the Dialog

```javascript
<AttachGQEventDialog
  isOpen={attachGQDialogState.isOpen}
  onClose={() => setAttachGQDialogState({ ...attachGQDialogState, isOpen: false })}
  person={person}
  eventType={attachGQDialogState.eventType}
  existingEventData={existingEvent}
  allPeople={allPeople}
  onSave={async (eventData) => {
    // Handle save: create event, attach photos, generate citations
    await createEvent(eventData);
    setAttachGQDialogState({ isOpen: false });
    // Refresh person data
    await refreshPerson(person.id);
  }}
/>
```

### 5. Implement onSave Handler

The `onSave` callback receives:

```javascript
{
  personId,           // The person being edited
  eventType,          // 'birth', 'baptism', 'marriage', 'death', 'burial'
  eventData: {
    date,             // Parsed date object {year, month, day, raw}
    place,            // Place string
    confidence,       // 'certain', 'probable', 'possible', 'uncertain'
    notes,            // Optional notes/transcription
    cause,            // For death events
    spouse_name,      // For marriage events
    spouse_id,        // For marriage events (if linked)
  },
  photoData: [
    {
      file,           // File object
      label,          // Auto-detected type
      pageRange,      // Optional page range
    }
  ],
  witnesses: [
    {
      id,
      name,
      role,
      personId,       // null if new person
      isNewPerson,    // true if should create new person
    }
  ],
  citationMetadata: {
    recordId,         // GQ record ID if provided
    recordUrl,        // GQ record URL if provided
    collectionName,   // GQ collection name
    recordType,       // Event type from GQ
  }
}
```

## Integration Example

Here's a complete example integration in PersonView:

```javascript
import React, { useState } from 'react';
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';

export function PersonView({ person, allPeople, onSavePerson }) {
  const [attachGQDialog, setAttachGQDialog] = useState({
    isOpen: false,
    eventType: null,
  });

  const handleAttachGQEvent = async (eventData) => {
    try {
      // 1. Create the event
      const event = await createEvent(person.id, {
        type: eventData.eventType,
        date: eventData.eventData.date,
        place: eventData.eventData.place,
        notes: eventData.eventData.notes,
      });

      // 2. Upload and attach photos
      for (const photo of eventData.photoData) {
        await attachPhotoToEvent(event.id, photo);
      }

      // 3. Create witnesses/godparents
      for (const witness of eventData.witnesses) {
        let witnessPersonId = witness.personId;

        if (witness.isNewPerson && !witnessPersonId) {
          // Create new person for this witness
          const newPerson = await createPerson({
            firstName: witness.name.split(' ')[0],
            lastName: witness.name.split(' ').slice(1).join(' '),
          });
          witnessPersonId = newPerson.id;
        }

        // Link witness to event
        if (witnessPersonId) {
          await linkWitnessToEvent(event.id, witnessPersonId, witness.role);
        }
      }

      // 4. Create citation with GQ metadata
      await createCitation({
        personId: person.id,
        eventId: event.id,
        source: 'GénéalogieQuébec',
        recordId: eventData.citationMetadata.recordId,
        recordUrl: eventData.citationMetadata.recordUrl,
        confidence: eventData.eventData.confidence,
        notes: `${eventData.citationMetadata.collectionName}`,
      });

      // 5. Close dialog and refresh
      setAttachGQDialog({ isOpen: false });
      await onSavePerson(person);
    } catch (error) {
      console.error('Failed to attach GQ event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  return (
    <div className="person-view">
      {/* ... existing person view ... */}

      {/* Events Section */}
      <div className="events-section">
        <h3>Events</h3>
        {person.events?.map(event => (
          <div key={event.id} className="event-item">
            <h4>{event.type}</h4>
            <p>{event.date?.year || '?'} in {event.place}</p>
            <button
              className="btn btn-secondary"
              onClick={() => setAttachGQDialog({
                isOpen: true,
                eventType: event.type,
              })}
            >
              📎 Attach GQ Record
            </button>
          </div>
        ))}
      </div>

      {/* Dialog */}
      <AttachGQEventDialog
        isOpen={attachGQDialog.isOpen}
        onClose={() => setAttachGQDialog({ isOpen: false })}
        person={person}
        eventType={attachGQDialog.eventType}
        allPeople={allPeople}
        onSave={handleAttachGQEvent}
      />
    </div>
  );
}
```

## Component Props

### AttachGQEventDialog

```typescript
interface AttachGQEventDialogProps {
  isOpen: boolean;                    // Show/hide dialog
  onClose: () => void;                // Close handler
  person: {                           // Selected person
    id: string;
    firstName: string;
    lastName: string;
  };
  eventType: string;                  // 'birth', 'baptism', 'marriage', 'death', 'burial'
  existingEventData?: object;         // Optional existing event to edit
  allPeople?: Array;                  // List of people for witness linking
  onSave: (eventData) => Promise;     // Save callback
}
```

### useAttachGQEvent Hook

```typescript
const {
  // State
  photos,                             // Array of uploaded photos
  formData,                           // Form field values
  witnesses,                          // Array of witnesses
  mainPhoto,                          // Current main photo object
  mainPhotoIndex,                     // Index of main photo
  isSaving,                           // Save in progress
  error,                              // Error message if any
  isValid,                            // Form is valid
  photoPageRanges,                    // Combined page ranges string

  // Methods
  addPhotos,                          // Add photos from files
  removePhoto,                        // Remove photo by ID
  updatePhotoMetadata,                // Update photo label/pageRange
  setMainPhoto,                       // Change main display photo
  updateFormField,                    // Update form field
  addWitness,                         // Add witness
  removeWitness,                      // Remove witness
  updateWitness,                      // Update witness
  saveEvent,                          // Execute save
} = useAttachGQEvent({
  personId,                           // ID of person
  eventType,                          // Event type
  existingEventData,                  // Existing event (optional)
  onSave,                             // Save callback
  onRequestClose,                     // Close callback
});
```

## Validation Rules

### Form Validation
- At least date OR place required
- Date must be parseable (any supported format)
- Place should be non-empty string
- Confidence level must be selected

### Photo Validation
- At least 1 photo recommended (optional)
- Photo file size < 50MB
- Supported formats: JPG, PNG, WebP, PDF

### Witness Validation
- Witness name required
- Role required
- Can be linked to existing person or create new

## Styling Customization

All components use CSS custom properties for easy theming:

```css
/* In your root CSS */
:root {
  --color-primary: #3b82f6;           /* Blue */
  --color-primary-dark: #2563eb;      /* Darker blue */
  --color-secondary: #6b7280;         /* Gray */
  --color-error: #ef4444;             /* Red */
  --color-success: #059669;           /* Green */
  --color-background: #f9fafb;        /* Light gray */
  --color-border: #e5e7eb;            /* Light border */
}
```

## Event Capture Workflow

The typical user workflow:

1. **Open Person View** - Find person in Heritage
2. **Navigate to Events** - See person's events
3. **Click [Attach GQ Record]** - Next to event of interest
4. **Upload Photos**
   - Drag 2-5 photos from GQ into gallery
   - System auto-detects type (GQ screenshot, Drouin closeup, full scan)
   - Photos appear as thumbnails
5. **Fill Form** - Reference photos while entering data
   - Event date (multi-format: 15/05/1850 or May 15 1850)
   - Event place (Montréal, Quebec)
   - Confidence level (Certain/Probable/Possible/Uncertain)
   - Transcription notes
6. **Add Witnesses** - For baptism/marriage/death
   - Click [+ Add Godparent/Witness]
   - Enter name and role
   - Link to existing person or mark as new
7. **Save Event**
   - Click [Save]
   - System validates all required fields
   - Creates event, attaches photos, creates witnesses, generates citation
   - Dialog closes, PersonView refreshes

## Testing

See `src/components/AttachGQEventDialog/AttachGQEventDialog.test.js` for comprehensive unit tests covering:

- Hook state management
- Photo upload and metadata
- Form field updates
- Witness management
- Validation
- Save workflow
- Error handling

## Performance Considerations

- Photos are validated before save (not during upload)
- Large photos (>10MB) should be compressed before upload
- Form saves asynchronously to prevent UI blocking
- Photo metadata is stored locally until save

## Accessibility

- All form inputs have proper labels
- Error messages are displayed to screen readers
- Keyboard navigation supported (Tab, Enter, Escape)
- Button focus states visible
- Color not sole indicator of state (icons + text)
- Photo counter provides context

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires: ES2020+, File API, Drag & Drop, localStorage
- Not supported: IE 11

## Known Limitations

- GQ records require manual photo upload (no API integration)
- Date formats limited to common Quebec variations
- Batch import not yet supported (one event at a time)
- Photo size limit 50MB per file
- Maximum 10 photos per event
- Witness search limited to existing people in database

## Future Enhancements

Phase 3+:
- Batch event import
- Automatic witness name extraction from photos via OCR
- Photo annotation and highlighting
- Date picker calendar widget
- Place name suggestions from Heritage database
- Duplicate detection for witnesses
- Export event summary with photos as PDF
- Multiple spouse support for marriage events

---

**Implementation Status:** Complete ✅
**Branch:** feature/genealogie-quebec-integration
**Ready for:** PersonView integration and testing

