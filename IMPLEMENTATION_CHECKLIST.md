# Attach GQ Event - Implementation Checklist

Use this checklist to track your PersonView integration progress.

## Phase 1: Preparation (15 minutes)

- [ ] Read PERSONVIEW_INTEGRATION_QUICK_START.md
- [ ] Read ATTACH_GQ_EVENT_IMPLEMENTATION.md sections 1-3
- [ ] Review PersonView.AttachGQEvent.example.jsx
- [ ] Identify your data layer patterns (API calls, hooks, state management)
- [ ] Locate your PersonView component file

## Phase 2: Integration (30-45 minutes)

### 2.1 Add Imports
- [ ] Add `import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog'`
- [ ] Add any necessary hook imports for your data layer

### 2.2 Add State
- [ ] Add `attachGQDialog` state with `isOpen`, `eventType`, `selectedEvent`
- [ ] Verify state initialization is correct

### 2.3 Add Dialog Control Functions
- [ ] Add `handleOpenAttachGQDialog` function
- [ ] Add `handleCloseAttachGQDialog` function
- [ ] Test that functions are called when buttons are clicked

### 2.4 Add Button to Event List
- [ ] Locate event list rendering code
- [ ] Add "Attach GQ Record" button to each event
- [ ] Wire button to `handleOpenAttachGQDialog`
- [ ] Verify button appears and is clickable
- [ ] Verify dialog opens when button clicked

### 2.5 Render Dialog Component
- [ ] Add `<AttachGQEventDialog ... />` component
- [ ] Pass all required props:
  - [ ] `isOpen`
  - [ ] `onClose`
  - [ ] `person`
  - [ ] `eventType`
  - [ ] `allPeople`
  - [ ] `onSave`
- [ ] Verify dialog renders correctly
- [ ] Verify close button works
- [ ] Verify dialog disappears on close

### 2.6 Implement Save Handler
- [ ] Implement `handleAttachGQEvent` function
- [ ] Add photo upload logic (see below)
- [ ] Add event creation/update logic
- [ ] Add witness/godparent creation logic
- [ ] Add citation creation logic
- [ ] Add success/error handling
- [ ] Add UI feedback (toasts, notifications)

## Phase 3: Data Layer Implementation (45-60 minutes)

For each operation below, identify if you already have these or need to create them:

### Photo Operations
- [ ] `uploadPhoto(file, metadata)` - Upload file to storage
  - [ ] Returns photo object with ID
  - [ ] Stores metadata (label, pageRange)
- [ ] `attachPhotoToEvent(eventId, photoId, metadata)` - Link photo to event
  - [ ] Creates relationship in database
  - [ ] Stores page ranges and labels

### Event Operations
- [ ] `createEvent(personId, eventData)` - Create new event
  - [ ] Accepts: type, date, place, notes, confidence
  - [ ] Returns: event object with ID
- [ ] `updateEvent(eventId, eventData)` - Update existing event
  - [ ] Accepts: same fields as createEvent
  - [ ] Returns: updated event object

### Person Operations
- [ ] `createPerson(personData)` - Create new person
  - [ ] Accepts: firstName, lastName, is_living
  - [ ] Returns: person object with ID
- [ ] `refreshPerson(personId)` - Reload person from database
  - [ ] Updates component state with fresh data
  - [ ] Triggers UI refresh

### Witness/Relationship Operations
- [ ] `linkWitnessToEvent(eventId, personId, metadata)` - Link witness to event
  - [ ] Accepts: role, and other metadata
  - [ ] Creates relationship in database
- [ ] `linkSpouseToEvent(eventId, personId)` - Link spouse to marriage event
  - [ ] Creates special relationship type
  - [ ] Updates marriage event data

### Source/Citation Operations
- [ ] `getOrCreateSource(sourceData)` - Get or create GQ source
  - [ ] Checks if source exists first
  - [ ] Returns source ID
- [ ] `createCitation(citationData)` - Create citation
  - [ ] Accepts: source_id, person_id, event_id, url, confidence, notes
  - [ ] Returns: citation object with ID

### UI Notification Operations
- [ ] `showSuccessNotification(message)` - Show success toast
- [ ] `showErrorNotification(message)` - Show error toast

## Phase 4: Testing (30-45 minutes)

### 4.1 Visual Testing
- [ ] Open PersonView for any person with events
- [ ] Verify "Attach GQ Record" button appears
- [ ] Click button, verify dialog opens
- [ ] Dialog header shows correct event type
- [ ] Dialog shows correct person name

### 4.2 Photo Upload Testing
- [ ] Drag photo into gallery
  - [ ] Photo appears in thumbnail strip
  - [ ] Photo type auto-detects correctly
  - [ ] Metadata editor works
- [ ] Click thumbnail
  - [ ] Main photo switches
  - [ ] Photo counter updates
- [ ] Test zoom controls
  - [ ] Zoom in/out buttons work
  - [ ] Zoom percentage changes
  - [ ] Fit button resets zoom
- [ ] Remove photo
  - [ ] Photo removed from gallery
  - [ ] Counter updates
  - [ ] Main photo switches if removed

### 4.3 Form Validation Testing
- [ ] Fill date field (various formats)
  - [ ] DD/MM/YYYY format works
  - [ ] French month names work
  - [ ] Year-only works
- [ ] Fill place field
- [ ] Select confidence level
- [ ] Fill notes
- [ ] Verify Save button enables when required fields filled
- [ ] Verify Save button disabled when empty

### 4.4 Event-Type Specific Testing
- [ ] Test Birth event
  - [ ] Shows date, place fields
  - [ ] No spouse field
- [ ] Test Baptism event
  - [ ] Shows godparent manager
  - [ ] Can add godparents
- [ ] Test Marriage event
  - [ ] Shows spouse field
  - [ ] Shows witness manager
  - [ ] Can add witnesses
- [ ] Test Death event
  - [ ] Shows cause of death field
  - [ ] Shows witness manager
  - [ ] Can add witnesses

### 4.5 Witness Testing
- [ ] Add witness
  - [ ] Form appears
  - [ ] Can enter name
  - [ ] Can select role
  - [ ] Can link to existing person
  - [ ] Save creates witness
- [ ] Remove witness
  - [ ] Witness disappears from list
  - [ ] Counter updates
- [ ] Link witness to existing person
  - [ ] Dropdown shows people
  - [ ] Selection works
  - [ ] "Linked to person" indicator shows

### 4.6 Save Testing
- [ ] Fill complete form
- [ ] Upload 2-3 photos
- [ ] Add 1-2 witnesses
- [ ] Click Save
  - [ ] Dialog shows loading state
  - [ ] Save button disabled during save
  - [ ] Success notification appears
  - [ ] Dialog closes
  - [ ] PersonView refreshes
  - [ ] Event now shows GQ data
  - [ ] Photos appear in event
  - [ ] Witnesses linked

### 4.7 Error Testing
- [ ] Try to save with empty form
  - [ ] Save button stays disabled
- [ ] Simulate photo upload error
  - [ ] Error message shows
  - [ ] Dialog stays open
  - [ ] Can retry
- [ ] Simulate event creation error
  - [ ] Error notification shows
  - [ ] Dialog stays open
  - [ ] Can try again

### 4.8 Edge Cases
- [ ] Large photo file (>5MB)
  - [ ] Uploads successfully
  - [ ] No memory issues
- [ ] Many witnesses (5+)
  - [ ] All added successfully
  - [ ] UI remains responsive
- [ ] Special characters in notes
  - [ ] Saves without corruption
- [ ] Non-ASCII characters (Montréal, Québec)
  - [ ] Preserved correctly

## Phase 5: Data Verification (15-30 minutes)

After testing, verify data was saved correctly:

- [ ] Event created in database with correct data
- [ ] Photos uploaded and linked
- [ ] Photo metadata saved (label, pageRange)
- [ ] Witnesses created/linked in database
- [ ] Witness roles saved correctly
- [ ] Citation created with GQ metadata
- [ ] Citation URL saved
- [ ] Confidence level saved
- [ ] Notes saved correctly

## Phase 6: Production Ready (10-15 minutes)

- [ ] No console errors
- [ ] No console warnings
- [ ] All tests pass
- [ ] Performance acceptable (no lag)
- [ ] Mobile responsive (test on small screen)
- [ ] Accessibility works (keyboard nav, screen reader)
- [ ] Error messages user-friendly
- [ ] Code follows your project style
- [ ] Comments added where needed

## Rollback Plan (if needed)

If something goes wrong:

1. Keep backup of original PersonView component
2. If compile errors: Check imports and syntax
3. If runtime errors: Check data layer function calls
4. If save fails: Check backend endpoints and auth
5. If tests fail: Check test setup and mocks

## Quick Reference: Data Flow

```
User clicks "Attach GQ Record"
↓
Dialog opens
↓
User uploads photos → Photos displayed with zoom
↓
User fills form → Form validates in real-time
↓
User adds witnesses → Witnesses display with roles
↓
User clicks Save → handleAttachGQEvent called
↓
1. createEvent() → returns event.id
2. uploadPhoto() → returns photo.id (for each photo)
3. attachPhotoToEvent() → links photo to event
4. createPerson() → returns person.id (for new witnesses)
5. linkWitnessToEvent() → creates witness relationship
6. getOrCreateSource() → returns source.id
7. createCitation() → creates citation with all metadata
↓
refreshPerson() → reloads PersonView with new data
↓
Dialog closes
↓
Success notification shows
↓
Event displays GQ data, photos, witnesses
```

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Dialog opens/closes correctly
✅ Photos upload and display
✅ Forms validate
✅ Save works end-to-end
✅ Data persists in database
✅ PersonView refreshes with new data
✅ User sees success message
✅ Mobile responsive
✅ Accessible via keyboard

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Dialog doesn't open | Check `handleOpenAttachGQDialog` is called, check state management |
| Photos don't upload | Check `uploadPhoto` function, check file size limits, check server endpoint |
| Save fails silently | Check console errors, add error logging, verify all operations have try-catch |
| Witnesses don't save | Check `linkWitnessToEvent` function, verify person.id is valid |
| Citation doesn't create | Check source exists first, verify all required fields |
| PersonView doesn't refresh | Check `refreshPerson` implementation, verify state updates |
| Form doesn't validate | Check field values, verify validation logic in hook |

## Timeline Estimate

- Phase 1 (Preparation): 15 min
- Phase 2 (Integration): 30-45 min
- Phase 3 (Data Layer): 45-60 min
- Phase 4 (Testing): 30-45 min
- Phase 5 (Verification): 15-30 min
- Phase 6 (Polish): 10-15 min

**Total: 2-4 hours depending on existing data layer**

If you already have API endpoints for all operations: 1-2 hours
If you need to create new endpoints: 3-4 hours

## Getting Help

1. Check PERSONVIEW_INTEGRATION_QUICK_START.md for overview
2. Check PersonView.AttachGQEvent.example.jsx for code patterns
3. Check ATTACH_GQ_EVENT_IMPLEMENTATION.md for detailed flow
4. Check component source files for JSDoc comments
5. Check test file for usage examples

## After Integration

Once working:
- [ ] Commit to feature branch
- [ ] Create pull request
- [ ] Get code review
- [ ] Test with team
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Test with real data
- [ ] Deploy to production
- [ ] Monitor for issues

---

**Remember:** The components are complete and tested. This checklist is just for integrating them into PersonView. Take it step by step!
