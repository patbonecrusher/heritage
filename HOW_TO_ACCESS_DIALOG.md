# How to Access the AttachGQEventDialog

## Quick Answer

The dialog isn't automatically available yet - **you need to integrate it into PersonView first**.

Here's the fastest way to get it working:

---

## 5-Minute Quick Start

### 1. Open Your PersonView Component

Find your existing PersonView component (likely `src/components/PersonView/PersonView.jsx` or similar).

### 2. Copy This Code Block

```javascript
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
import { useState } from 'react';

// Inside your PersonView component function:
const [attachGQDialog, setAttachGQDialog] = useState({
  isOpen: false,
  eventType: null,
});

// Add this button to each event in your events list:
<button
  onClick={() => setAttachGQDialog({
    isOpen: true,
    eventType: event.type,
  })}
>
  📎 Attach GQ Record
</button>

// Add this dialog component before the closing tag:
<AttachGQEventDialog
  isOpen={attachGQDialog.isOpen}
  onClose={() => setAttachGQDialog({ isOpen: false })}
  person={person}
  eventType={attachGQDialog.eventType}
  allPeople={allPeople || []}
  onSave={async (eventData) => {
    console.log('Event data:', eventData);
    // TODO: Implement save logic here
    setAttachGQDialog({ isOpen: false });
  }}
/>
```

### 3. Done!

The dialog is now accessible via the button on each event.

---

## Where Exactly Do I Click?

### Step 1: Open Heritage App
### Step 2: Go to PersonView (view a person)
### Step 3: Scroll to "Events" section
### Step 4: Find an event (e.g., "Birth", "Marriage", "Death")
### Step 5: Click the new **"📎 Attach GQ Record"** button next to that event
### Step 6: Dialog opens!

---

## Complete Working Example

Here's exactly what your PersonView should look like:

```javascript
import React, { useState } from 'react';
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';

export function PersonView({ person, allPeople }) {
  const [attachGQDialog, setAttachGQDialog] = useState({
    isOpen: false,
    eventType: null,
  });

  return (
    <div className="person-view">
      <h2>{person.firstName} {person.lastName}</h2>

      {/* EVENTS SECTION */}
      <div className="events-section">
        <h3>Events</h3>

        {person.events?.map(event => (
          <div key={event.id} className="event-item">
            <h4>{event.type}</h4>
            <p>{event.date?.year || '?'} in {event.place}</p>

            {/* ADD THIS BUTTON */}
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

      {/* ADD THIS DIALOG */}
      <AttachGQEventDialog
        isOpen={attachGQDialog.isOpen}
        onClose={() => setAttachGQDialog({ isOpen: false })}
        person={person}
        eventType={attachGQDialog.eventType}
        allPeople={allPeople}
        onSave={async (eventData) => {
          console.log('Saving event:', eventData);
          // TODO: Implement your save logic
          setAttachGQDialog({ isOpen: false });
        }}
      />
    </div>
  );
}
```

---

## What Happens When You Click the Button?

1. **Click** "📎 Attach GQ Record" button next to any event
2. **Dialog opens** with:
   - Large photo upload area on the left (40% width)
   - Event form on the right (60% width)
   - Header showing event type and person name
   - Footer with Save/Cancel buttons
3. **Upload photos** - Drag-drop or browse
4. **Fill form** - Date, place, confidence, notes
5. **Add witnesses** - If applicable (baptism, marriage, death)
6. **Click Save** - Your save handler is called with all the data

---

## If You Get "Cannot find module" Error

Make sure all 9 component files exist:

```
src/components/AttachGQEventDialog/
├── AttachGQEventDialog.jsx ✓
├── AttachGQEventDialog.css ✓
├── PhotoGalleryPanel.jsx ✓
├── PhotoGalleryPanel.css ✓
├── EventDetailsPanel.jsx ✓
├── EventDetailsPanel.css ✓
├── WitnessManager.jsx ✓
├── WitnessManager.css ✓
└── AttachGQEventDialog.test.js ✓
```

And the hook:

```
src/hooks/
└── useAttachGQEvent.js ✓
```

---

## If the Dialog Opens But is Empty

1. Check browser console for errors (F12 → Console)
2. Make sure `person` prop has `id`, `firstName`, `lastName`
3. Make sure `isOpen={true}` is being passed
4. Check that CSS is loaded (look for `.attach-gq-dialog` in DevTools Styles)

---

## Next Step: Implement Save

Once the dialog opens and you can fill it out, implement the `onSave` handler:

```javascript
onSave={async (eventData) => {
  try {
    // 1. Create event
    const event = await createEvent(person.id, {
      type: eventData.eventType,
      date: eventData.eventData.date,
      place: eventData.eventData.place,
      notes: eventData.eventData.notes,
    });

    // 2. Upload photos
    for (const photoFile of eventData.photoData) {
      await uploadPhoto(event.id, photoFile.file);
    }

    // 3. Create witnesses (if any)
    for (const witness of eventData.witnesses) {
      await createWitness(event.id, witness);
    }

    // 4. Close dialog
    setAttachGQDialog({ isOpen: false });

    // 5. Refresh person
    await refreshPerson(person.id);

    // 6. Show success message
    alert('Event saved successfully!');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}}
```

See `PersonView.AttachGQEvent.example.jsx` for the complete implementation.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Button doesn't appear | Check event list rendering, verify button code is in loop |
| Dialog doesn't open | Check `onClick` handler, check state update |
| Dialog is blank | Check console for errors, verify `person` prop |
| Photos won't upload | Check browser console, check file size |
| Save doesn't work | Check `onSave` callback is implemented |

---

## Summary

1. ✅ Copy the button code into your event list
2. ✅ Copy the dialog component at the bottom of PersonView
3. ✅ Click the button to open the dialog
4. ✅ Implement the `onSave` handler for your database

That's it! You're done.

For detailed integration steps, see **PERSONVIEW_INTEGRATION_QUICK_START.md**
