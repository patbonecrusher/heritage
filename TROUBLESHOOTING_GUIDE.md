# Attach GQ Event - Troubleshooting Guide

## Common Issues and Solutions

### 1. Component Won't Import

**Error:** `Cannot find module '@/components/AttachGQEventDialog/AttachGQEventDialog'`

**Solutions:**
1. Check file path - make sure all 9 files exist:
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

2. Check import path - should be:
   ```javascript
   import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
   ```

3. Check alias - `@` should resolve to `src` in your webpack/vite config

4. Run `npm install` - ensure all dependencies are installed

---

### 2. Hook Won't Import

**Error:** `Cannot find module '@/hooks/useAttachGQEvent'`

**Solutions:**
1. Check file exists: `src/hooks/useAttachGQEvent.js`
2. Check hook is exported:
   ```javascript
   export function useAttachGQEvent(...) {
   ```
3. Verify import in AttachGQEventDialog.jsx:
   ```javascript
   import { useAttachGQEvent } from '@/hooks/useAttachGQEvent';
   ```

---

### 3. Dialog Opens but is Empty

**Symptom:** Dialog box appears but no content is shown

**Solutions:**
1. Check browser console for errors
2. Verify `isOpen={true}` is being passed
3. Verify `person` prop has required fields:
   ```javascript
   person: {
     id: string,      // Must exist
     firstName: string,
     lastName: string,
   }
   ```
4. Check CSS is loading - look for `.attach-gq-dialog` styles in DevTools
5. Add temporary background color to debug:
   ```css
   .attach-gq-dialog {
     background: pink; /* Temporary - should be visible */
   }
   ```

---

### 4. Photos Won't Upload

**Symptom:** Drag-drop area not responding or photos don't appear

**Solutions:**

#### Drag-Drop Not Working
1. Check browser console for drag errors
2. Verify `dragover`, `dragleave`, `drop` handlers are firing:
   ```javascript
   handleDragEnter() {
     console.log('Drag enter'); // Should see in console
   }
   ```
3. Check file permissions - ensure drop target has `pointer-events: auto`
4. Try file browser button as workaround (if drag-drop broken)

#### Photos Not Appearing in Gallery
1. Check `addPhotos` is being called:
   ```javascript
   const handleAddPhotos = (files) => {
     console.log('Adding photos:', files);
     // Then call hook method
   };
   ```
2. Verify hook returns photos array:
   ```javascript
   const { photos } = useAttachGQEvent(...);
   console.log('Photos in state:', photos); // Should show array
   ```
3. Check thumbnail rendering code - ensure it's iterating over photos correctly

#### Photo Preview Not Showing
1. Check image `src` is valid File URL:
   ```javascript
   // Correct:
   src={mainPhoto ? URL.createObjectURL(mainPhoto.file) : undefined}

   // Wrong:
   src={mainPhoto.file} // Can't directly show File
   ```
2. Verify image element has width/height
3. Check image format is supported (JPG, PNG, WebP, PDF)

---

### 5. Form Validation Not Working

**Symptom:** Save button stays disabled even with data filled

**Solutions:**
1. Check form fields are updating state:
   ```javascript
   const handleDateChange = (e) => {
     console.log('Date changed:', e.target.value);
     updateFormField('date', e.target.value); // Must call this
   };
   ```
2. Verify form values are in state:
   ```javascript
   const { formData } = useAttachGQEvent(...);
   console.log('Form data:', formData); // Check values are there
   ```
3. Check validation logic - at least date OR place required:
   ```javascript
   const isValid = (formData.date || formData.place) && formData.confidence;
   // Date or place must be non-empty, confidence must be selected
   ```
4. For event-type specific fields:
   - Birth/Baptism: need date and/or place
   - Marriage: need spouse (optional), date and/or place
   - Death: need date and/or place (cause optional)

---

### 6. Date Parsing Not Working

**Symptom:** Date field shows error or doesn't parse correctly

**Solutions:**
1. Check parseGQDate function from dataMapper:
   ```javascript
   import { parseGQDate } from '@/integrations/genealogieQuebec/dataMapper';

   const result = parseGQDate('15/05/1850');
   console.log('Parsed date:', result); // Should show {year, month, day, type}
   ```

2. Supported formats:
   - ✅ 15/05/1850 (DD/MM/YYYY)
   - ✅ 15-5-1850 (DD-MM-YYYY)
   - ✅ May 15 1850 (English)
   - ✅ mai 1850 (French month)
   - ✅ 1850 (Year only)
   - ❌ Invalid formats show error message

3. If date won't parse:
   - Check for typos
   - Try different format
   - Check French month names are correct (janvier, février, mars, etc.)

---

### 7. Save Button Not Working

**Symptom:** Click Save, nothing happens

**Solutions:**
1. Check button has onClick handler:
   ```javascript
   <button onClick={() => saveEvent()}>Save</button>
   // OR
   <button onClick={saveEvent}>Save</button>
   ```

2. Check Save button is not disabled:
   ```javascript
   <button disabled={isSaving || !isValid}>
     {isSaving ? 'Saving...' : 'Save'}
   </button>
   ```
   - If shows "Saving..." - wait for operation to complete
   - If button disabled - fill required fields

3. Check saveEvent function exists:
   ```javascript
   const { saveEvent } = useAttachGQEvent(...);
   console.log('saveEvent function:', saveEvent); // Should be function
   ```

4. Check onSave callback is passed:
   ```javascript
   const { saveEvent } = useAttachGQEvent({
     // ... other props
     onSave: async (eventData) => {
       console.log('Save handler called!', eventData);
       // Your handler here
     }
   });
   ```

---

### 8. Save Handler Not Called

**Symptom:** Click Save, nothing appears to happen

**Solutions:**
1. Add logging to saveEvent:
   ```javascript
   console.log('Save button clicked');
   ```

2. Check onSave prop is provided to hook:
   ```javascript
   const { saveEvent } = useAttachGQEvent({
     onSave: async (eventData) => {
       console.log('=== SAVE CALLED ===');
       console.log('Event data:', eventData);
       // Your code here
     }
   });
   ```

3. Check for JavaScript errors in console - might be silent failures

4. Add try-catch to handler:
   ```javascript
   const handleAttachGQEvent = async (eventData) => {
     try {
       console.log('Starting save...');
       // Your code
     } catch (error) {
       console.error('Save failed:', error);
       // Show error to user
     }
   };
   ```

---

### 9. Photos Not Saving

**Symptom:** Save succeeds but photos not attached to event

**Solutions:**
1. Check photos are in state before save:
   ```javascript
   const { photos } = useAttachGQEvent(...);
   console.log('Photos:', photos); // Should be non-empty array
   ```

2. Check uploadPhoto function:
   ```javascript
   const photo = await uploadPhoto(photoFile, metadata);
   console.log('Upload result:', photo); // Should have ID
   ```

3. Check photo metadata:
   ```javascript
   // Check label is detected
   photo.label // Should be like "GQ Screenshot"
   photo.pageRange // Might be undefined if not set
   ```

4. Check event-photo link:
   ```javascript
   await attachPhotoToEvent(event.id, photo.id, {
     pageRange: photo.pageRange,
   });
   console.log('Photo attached');
   ```

5. Verify in database:
   - Query photo table: should have record
   - Query event_photo table: should have relationship
   - Photo.path should point to uploaded file

---

### 10. Witnesses Not Saving

**Symptom:** Add witnesses, but they don't persist

**Solutions:**
1. Check witnesses in state:
   ```javascript
   const { witnesses } = useAttachGQEvent(...);
   console.log('Witnesses:', witnesses); // Should be non-empty
   ```

2. Check witness structure:
   ```javascript
   {
     id: 'witness-1',
     name: 'Jane Smith',
     role: 'Godmother',
     personId: null or 'person-id',
     isNewPerson: true or false
   }
   ```

3. Check person creation for new witnesses:
   ```javascript
   if (witness.isNewPerson && !witness.personId) {
     const person = await createPerson({
       firstName: 'Jane',
       lastName: 'Smith',
     });
     console.log('Created person:', person.id);
     witnessPersonId = person.id;
   }
   ```

4. Check witness linking:
   ```javascript
   await linkWitnessToEvent(event.id, witnessPersonId, {
     role: witness.role,
   });
   console.log('Witness linked');
   ```

5. Verify in database:
   - Query person table: new witness person should exist
   - Query witness/relationship table: should have records

---

### 11. Citation Not Creating

**Symptom:** Event saves but no citation created

**Solutions:**
1. Check GQ source exists:
   ```javascript
   const sourceId = await getOrCreateSource({
     name: 'GénéalogieQuébec',
     type: 'website',
     url: 'https://genealogiequebec.com',
   });
   console.log('Source ID:', sourceId); // Should be non-null
   ```

2. Check citation data:
   ```javascript
   const citation = {
     source_id: sourceId,
     person_id: person.id,
     event_id: event.id,
     entry_number: 'GQ-12345',
     url: 'https://genealogiequebec.com/record/12345',
     accessed_date: new Date().toISOString(),
     confidence: 'probable',
   };
   console.log('Citation data:', citation);
   ```

3. Check createCitation function:
   ```javascript
   const result = await createCitation(citation);
   console.log('Citation created:', result.id);
   ```

4. Verify in database:
   - Query citation table: should exist
   - source_id should match GQ source
   - person_id should match person
   - event_id should match event

---

### 12. CSS Not Loading

**Symptom:** Dialog appears unstyled or broken layout

**Solutions:**
1. Check all CSS files exist:
   ```
   AttachGQEventDialog.css ✓
   PhotoGalleryPanel.css ✓
   EventDetailsPanel.css ✓
   WitnessManager.css ✓
   ```

2. Check imports in components:
   ```javascript
   import './AttachGQEventDialog.css';
   import './PhotoGalleryPanel.css';
   import './EventDetailsPanel.css';
   import './WitnessManager.css';
   ```

3. Verify styles are loaded in DevTools:
   - Open DevTools
   - Find element with class `attach-gq-dialog`
   - Check Styles tab shows CSS rules
   - If nothing shows, CSS not loaded

4. Common class names to search for:
   - `.attach-gq-dialog`
   - `.attach-gq-dialog-overlay`
   - `.photo-gallery-panel`
   - `.event-details-panel`
   - `.witnesses-section`

5. If styles override incorrectly:
   - Check for CSS specificity issues
   - Add `!important` temporarily to debug
   - Check for conflicting global styles

---

### 13. Zoom Controls Not Working

**Symptom:** Zoom in/out buttons don't change photo size

**Solutions:**
1. Check zoom state updates:
   ```javascript
   const handleZoomIn = () => {
     console.log('Zoom in clicked');
     setZoomLevel(prev => prev + 25);
   };
   ```

2. Check zoom level is applied to image:
   ```javascript
   <img
     style={{
       transform: `scale(${zoomLevel / 100})`,
       transformOrigin: 'center',
     }}
   />
   ```

3. Check parent container has overflow handling:
   ```css
   .main-photo-container {
     overflow: auto;
     max-height: 500px;
     max-width: 500px;
   }
   ```

4. Verify zoom percentage display:
   ```javascript
   <span>{zoomLevel}%</span> // Should show 100, 125, 150, etc.
   ```

---

### 14. Witnesses/Godparents Not Showing

**Symptom:** WitnessManager component doesn't appear in form

**Solutions:**
1. Check event type is correct:
   ```javascript
   // Witnesses shown for these event types:
   // - baptism (shows Godparents)
   // - marriage (shows Witnesses)
   // - death (shows Witnesses)
   // - burial (shows Witnesses)

   console.log('Event type:', eventType); // Check this value
   ```

2. Check WitnessManager is imported:
   ```javascript
   import { WitnessManager } from './WitnessManager';
   ```

3. Check WitnessManager is rendered:
   ```javascript
   {eventType === 'baptism' && (
     <WitnessManager {...props} />
   )}
   ```

4. Check props passed to WitnessManager:
   ```javascript
   <WitnessManager
     eventType={eventType}
     witnesses={witnesses}
     onAddWitness={onAddWitness}
     onRemoveWitness={onRemoveWitness}
     onUpdateWitness={onUpdateWitness}
     allPeople={allPeople}
     disabled={disabled}
   />
   ```

---

### 15. Mobile Layout Broken

**Symptom:** Dialog doesn't stack on mobile or is cut off

**Solutions:**
1. Check viewport meta tag:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

2. Check media queries in CSS:
   ```css
   @media (max-width: 768px) {
     .attach-gq-dialog {
       flex-direction: column;
       max-width: 100%;
     }

     .content-panels {
       flex-direction: column;
     }

     .gallery-panel {
       width: 100%;
       height: 40%;
     }

     .form-panel {
       width: 100%;
       height: 60%;
     }
   }
   ```

3. Test on mobile device or DevTools:
   - Open DevTools
   - Toggle device toolbar
   - Test on various sizes (320px, 768px, 1024px)

4. Check touch events:
   - Buttons should be tappable (>44px tall)
   - Text should be readable (14px+)
   - Inputs should be large enough to tap

---

### 16. Console Shows Many Errors

**Symptom:** Many error messages in console

**Solutions:**
1. Take note of first error - fix that first
2. Common first errors:
   - Import errors (check file paths)
   - Missing props (check prop names)
   - Hook not called correctly (must be in component body)
   - State updates in wrong order

3. Check console for patterns:
   - `Cannot read property 'x' of undefined` → object is null, add null check
   - `Missing prop 'x'` → add required prop
   - `Warning: Hooks can only be called inside...` → move hook out of conditionals

4. Fix one error at a time
5. Refresh page after each fix

---

### 17. PersonView Doesn't Refresh After Save

**Symptom:** Event saved but doesn't appear or shows old data

**Solutions:**
1. Check refreshPerson is called:
   ```javascript
   await refreshPerson(person.id);
   console.log('Refreshing person data...');
   ```

2. Check state update after refresh:
   ```javascript
   // If using useState:
   const [person, setPerson] = useState();

   const refreshPerson = async (id) => {
     const updated = await fetchPerson(id);
     setPerson(updated); // This must be called
   };

   // If using Redux:
   dispatch(refreshPerson(id)); // Must dispatch action
   ```

3. Verify fetched person has new events:
   ```javascript
   const updated = await fetchPerson(id);
   console.log('Updated person:', updated);
   console.log('Events:', updated.events); // Should include new event
   ```

4. Check component re-renders:
   - Person state changes → component re-renders
   - New event should appear in JSX

---

### 18. Performance Issues (Slow Save)

**Symptom:** Save takes 30+ seconds or UI freezes

**Solutions:**
1. Check for blocking operations:
   ```javascript
   // Slow: waiting for operations sequentially
   for (const photo of photos) {
     await uploadPhoto(photo); // Waits for each
   }

   // Fast: parallel uploads
   await Promise.all(
     photos.map(photo => uploadPhoto(photo))
   );
   ```

2. Check network requests:
   - Open Network tab in DevTools
   - Look for slow API calls
   - Check file upload sizes (photos should be <10MB)

3. Check for memory leaks:
   - File objects stored in state take memory
   - Use URL.createObjectURL only when needed
   - Revoke URLs when done: `URL.revokeObjectURL(url)`

4. Add timeouts to slow operations:
   ```javascript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error('Timeout')), 30000)
   );

   await Promise.race([uploadPhoto(...), timeoutPromise]);
   ```

---

## Debug Checklist

When something breaks, go through this in order:

1. **Check Browser Console**
   - [ ] Any error messages?
   - [ ] Any warnings?
   - [ ] Copy full error stack

2. **Check Network Tab**
   - [ ] Are API calls being made?
   - [ ] Do they get responses?
   - [ ] Check response status (200 = good, 4xx/5xx = bad)
   - [ ] Check response body for error message

3. **Add Logging**
   ```javascript
   console.log('=== CHECKPOINT 1 ==='); // Add at each step
   console.log('Data:', data);
   console.log('State:', state);
   ```

4. **Use Debugger**
   ```javascript
   debugger; // Pause execution here
   // Step through code with F10/F11
   ```

5. **Check Data Types**
   ```javascript
   console.log('Type:', typeof value);
   console.log('Is array:', Array.isArray(value));
   console.log('Value:', value); // Show actual value
   ```

6. **Check for Async Issues**
   ```javascript
   // Missing await?
   const result = await asyncFunction(); // Correct
   const result = asyncFunction(); // Wrong - returns Promise
   ```

---

## Getting More Help

1. **For component issues:**
   - Check AttachGQEventDialog.jsx source code
   - Check component JSDoc comments
   - Check PhotoGalleryPanel, EventDetailsPanel, WitnessManager files

2. **For hook issues:**
   - Check useAttachGQEvent.js source code
   - Check test file (AttachGQEventDialog.test.js) for usage examples

3. **For integration issues:**
   - Check PERSONVIEW_INTEGRATION_QUICK_START.md
   - Check PersonView.AttachGQEvent.example.jsx
   - Check ATTACH_GQ_EVENT_IMPLEMENTATION.md

4. **For data layer issues:**
   - Check your API endpoints
   - Check database schema
   - Check error responses from server

---

**Remember:** Most issues are either:
1. Missing imports
2. Wrong prop names/types
3. API endpoint not working
4. Null/undefined values

Check these first, you'll find 90% of issues!
