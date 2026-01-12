# PersonView Integration - Quick Start Guide

## The Ask
Integrate the newly-built `AttachGQEventDialog` into PersonView so users can attach GénéalogieQuébec records to existing persons' events.

## What You Need to Know

### 1. The Component is Ready
- Location: `src/components/AttachGQEventDialog/AttachGQEventDialog.jsx`
- Status: Fully implemented, tested, documented
- No additional development needed - just integration

### 2. What It Does
- Opens a dialog for attaching GQ records to an event
- User can upload 2-5 photos from their computer
- Form fields adjust based on event type (birth, marriage, death, etc.)
- Supports witnesses/godparents
- Returns complete data to parent component via `onSave` callback

### 3. How to Integrate (5 Steps)

#### Step 1: Import Component
```javascript
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
```

#### Step 2: Add State to PersonView
```javascript
const [attachGQDialog, setAttachGQDialog] = useState({
  isOpen: false,
  eventType: null,
});
```

#### Step 3: Add Button to Event List
```javascript
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
```

#### Step 4: Render Dialog
```javascript
<AttachGQEventDialog
  isOpen={attachGQDialog.isOpen}
  onClose={() => setAttachGQDialog({ isOpen: false })}
  person={person}
  eventType={attachGQDialog.eventType}
  allPeople={allPeople}  // Pass list of all people for witness linking
  onSave={handleAttachGQEvent}
/>
```

#### Step 5: Implement Save Handler
```javascript
const handleAttachGQEvent = async (eventData) => {
  try {
    // 1. Create the event
    const event = await createEvent(person.id, {
      type: eventData.eventType,
      date: eventData.eventData.date,
      place: eventData.eventData.place,
      notes: eventData.eventData.notes,
    });

    // 2. Attach photos
    for (const photo of eventData.photoData) {
      await attachPhotoToEvent(event.id, photo.file);
    }

    // 3. Create witnesses if any
    for (const witness of eventData.witnesses) {
      // Handle witness creation/linking
      // (See full example in ATTACH_GQ_EVENT_IMPLEMENTATION.md)
    }

    // 4. Create citation
    await createCitation({
      personId: person.id,
      eventId: event.id,
      source: 'GénéalogieQuébec',
      confidence: eventData.eventData.confidence,
    });

    // 5. Close and refresh
    setAttachGQDialog({ isOpen: false });
    await refreshPerson(person.id);
  } catch (error) {
    console.error('Failed to save:', error);
    alert('Failed to save event');
  }
};
```

## What the Dialog Expects (Props)

```typescript
{
  isOpen: boolean,              // Dialog visibility
  onClose: () => void,          // Close callback
  person: {
    id: string,
    firstName: string,
    lastName: string,
  },
  eventType: string,            // 'birth', 'baptism', 'marriage', 'death', 'burial'
  allPeople?: Array,            // Optional list of people for witness linking
  onSave: (eventData) => void,  // Save callback with event data
}
```

## What the Dialog Returns (onSave)

```javascript
{
  eventType: 'baptism',        // Event type
  eventData: {
    date: '15/05/1850',        // Date string
    place: 'Montréal',         // Place string
    confidence: 'probable',    // One of: certain, probable, possible, uncertain
    notes: '...',              // Optional notes/transcription
    cause: '...',              // For death only
    spouse_name: '...',        // For marriage only
  },
  photoData: [
    {
      file: File,              // File object to upload
      label: 'GQ Screenshot',   // Auto-detected label
      pageRange: '12-14',      // Optional page range
    },
    // ... more photos
  ],
  witnesses: [
    {
      id: 'witness-1',
      name: 'Jane Smith',
      role: 'Godmother',
      personId: null,          // null if new person
      isNewPerson: true,       // true if should create new
    },
    // ... more witnesses
  ],
}
```

## File Structure

All files are already created and ready:

```
src/
  hooks/
    useAttachGQEvent.js          ✅ Ready
  components/
    AttachGQEventDialog/
      AttachGQEventDialog.jsx    ✅ Ready
      AttachGQEventDialog.css    ✅ Ready
      PhotoGalleryPanel.jsx      ✅ Ready
      PhotoGalleryPanel.css      ✅ Ready
      EventDetailsPanel.jsx      ✅ Ready
      EventDetailsPanel.css      ✅ Ready
      WitnessManager.jsx         ✅ Ready
      WitnessManager.css         ✅ Ready
      AttachGQEventDialog.test.js ✅ Ready
```

## Testing the Integration

1. **Visual Test**
   - Open PersonView for any person
   - Find an event
   - Click [Attach GQ Record] button
   - Dialog should open

2. **Upload Test**
   - Drag a photo into the gallery
   - Photo should appear in thumbnail strip
   - Can click to zoom

3. **Form Test**
   - Fill date and place fields
   - Form should validate (enable Save button)
   - Select confidence level

4. **Save Test**
   - Click Save
   - Ensure onSave callback is called with all data
   - Dialog closes
   - PersonView refreshes

## Complete Example Code

See `ATTACH_GQ_EVENT_IMPLEMENTATION.md` for a complete working example of PersonView integration including:
- All imports
- Full state management
- Event list rendering
- Dialog integration
- Save handler with photo upload
- Witness creation/linking
- Citation generation
- Error handling

## Key Notes

### ✅ DO:
- Pass real `person` object with ID
- Pass `allPeople` array for witness linking
- Call `onClose` to dismiss dialog
- Call `onSave` to handle data
- Handle errors in save handler
- Refresh PersonView after save

### ❌ DON'T:
- Don't try to modify dialog internals
- Don't pass fake person data
- Don't forget to handle witness creation
- Don't forget to generate citation
- Don't forget to upload photos
- Don't ignore errors

## Troubleshooting

### Dialog doesn't open
- Check `isOpen` is true
- Check PersonView is rendering AttachGQEventDialog component
- Check button click handler is setting state correctly

### Photos won't upload
- Check file size < 50MB
- Check file format is supported (JPG, PNG, WebP, PDF)
- Check browser console for error messages

### Form doesn't validate
- At least date OR place required
- Can't save with empty form
- Check error message in dialog

### Save fails
- Check onSave callback is implemented
- Check error handling in save handler
- Check database/state update functions work
- Check console for error stack trace

## Performance Tips

- Load `allPeople` once at PersonView level, pass to dialog
- Don't re-render dialog on every parent update
- Use `useCallback` for event handlers
- Consider virtualizing event list if >100 events

## Accessibility Checklist

Dialog is already accessible, but verify in PersonView:
- [ ] Button has descriptive text (not just icon)
- [ ] Button text changes based on state
- [ ] Focus visible on button
- [ ] Dialog focuses when opened (first form field)
- [ ] Escape key closes dialog

## Next Steps

1. **Copy integration code** from ATTACH_GQ_EVENT_IMPLEMENTATION.md
2. **Paste into PersonView** component
3. **Implement save handler** for your database
4. **Test with real data** (real person, real event)
5. **Commit and push** to feature branch
6. **Create pull request** with notes:
   - What the feature does
   - How to test it
   - Screenshots of UI (if possible)
   - Any remaining TODOs

## Questions?

Refer to:
1. **ATTACH_GQ_EVENT_IMPLEMENTATION.md** - Complete integration guide
2. **ATTACH_GQ_EVENT_SUMMARY.md** - Architecture and design decisions
3. **Component source files** - Code has detailed comments
4. **Test file** - Examples of how to use the hook

---

**Total Integration Time:** ~30-60 minutes
**Complexity:** Medium (straightforward integration, main work is in save handler)
**Risk:** Low (dialog is isolated, doesn't affect other components)

