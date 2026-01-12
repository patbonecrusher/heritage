# AttachGQEventDialog Component

Photo-first workflow for attaching GénéalogieQuébec genealogical records to existing persons' events.

## Files

### Components
- **AttachGQEventDialog.jsx** - Main dialog container
- **PhotoGalleryPanel.jsx** - Photo upload and display
- **EventDetailsPanel.jsx** - Event-specific form fields
- **WitnessManager.jsx** - Witness/godparent management

### Styling
- **AttachGQEventDialog.css** - Dialog layout
- **PhotoGalleryPanel.css** - Photo gallery styles
- **EventDetailsPanel.css** - Form field styles
- **WitnessManager.css** - Witness list styles

### Testing
- **AttachGQEventDialog.test.js** - 50+ test cases

## Quick Start

### Import
```javascript
import { AttachGQEventDialog } from '@/components/AttachGQEventDialog/AttachGQEventDialog';
```

### Use in Component
```javascript
<AttachGQEventDialog
  isOpen={isOpen}
  onClose={handleClose}
  person={person}
  eventType="birth"
  allPeople={allPeople}
  onSave={handleSave}
/>
```

### Props
```typescript
interface AttachGQEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  person: {id: string, firstName: string, lastName: string};
  eventType: 'birth' | 'baptism' | 'marriage' | 'death' | 'burial';
  allPeople?: Person[];
  onSave: (eventData: EventData) => Promise<void>;
}
```

### Handle Save
```javascript
const handleSave = async (eventData) => {
  // eventData includes:
  // - eventType
  // - eventData (date, place, confidence, notes, event-specific fields)
  // - photoData (files, labels, page ranges)
  // - witnesses (names, roles, person links)
};
```

## Features

### Photos
- Drag-drop upload with visual feedback
- Zoom controls (50%-300%)
- Thumbnail strip navigation
- Metadata editing (document type, page range)
- Auto-detection of photo type from filename

### Forms
- Birth: date, place
- Baptism: date, place, godparents
- Marriage: spouse, date, place, witnesses
- Death: date, place, cause, witnesses
- Burial: date, place, witnesses
- Multi-format date support
- Confidence level selector (4 options)
- Photo reference checkboxes
- Notes/transcription field

### Witnesses
- Add/remove/update witnesses
- Event-type specific roles
- Link to existing persons
- Create new person option

### UI
- Split-panel layout (photos 40%, form 60%)
- Header with event type and person name
- Footer with photo count and page ranges
- Mobile responsive
- WCAG 2.1 Level A accessible
- Keyboard navigation support

## Hook

The underlying state management is in `src/hooks/useAttachGQEvent.js`

### Usage
```javascript
const {
  photos,
  formData,
  witnesses,
  isSaving,
  error,
  isValid,
  addPhotos,
  removePhoto,
  updateFormField,
  addWitness,
  saveEvent,
} = useAttachGQEvent({
  personId: person.id,
  eventType: 'birth',
  onSave: handleSave,
  onRequestClose: handleClose,
});
```

## Integration

See PERSONVIEW_INTEGRATION_QUICK_START.md for step-by-step integration instructions.

Basic steps:
1. Import component
2. Add state for dialog
3. Add button to event list
4. Render dialog
5. Implement save handler

Estimated time: 1-2 hours

## Testing

Run tests:
```bash
npm test -- AttachGQEventDialog.test.js
```

Includes:
- Hook state management (15+ tests)
- Photo management (10+ tests)
- Form validation (10+ tests)
- Witness management (10+ tests)
- Save workflow (5+ tests)

## Documentation

- **PERSONVIEW_INTEGRATION_QUICK_START.md** - 5-step integration
- **ATTACH_GQ_EVENT_IMPLEMENTATION.md** - Comprehensive guide
- **TROUBLESHOOTING_GUIDE.md** - Common issues and solutions
- **IMPLEMENTATION_CHECKLIST.md** - Detailed checklist

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Bundle size: ~8KB (dialog code)
- CSS: 1.4KB (minified)
- Photos stored as File objects (efficient)
- Zoom uses CSS transforms (smooth)
- No external dependencies needed

## Accessibility

- ✅ WCAG 2.1 Level A
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support
- ✅ Focus indicators visible
- ✅ Color not sole indicator
- ✅ Proper label associations

## Mobile

- Responsive layout (stacks on <768px)
- Touch-friendly buttons (44px+ tall)
- Readable text (14px+)
- Handles portrait/landscape
- Smooth scroll on long lists

## Common Issues

### Dialog doesn't open
- Check `isOpen={true}`
- Check person has required fields
- Check CSS is loaded

### Photos won't upload
- Check browser console for errors
- Check file size < 50MB
- Supported formats: JPG, PNG, WebP, PDF

### Save fails
- Check save handler is implemented
- Check error handling in handler
- Check console for error stack

See TROUBLESHOOTING_GUIDE.md for detailed troubleshooting.

## Examples

See PersonView.AttachGQEvent.example.jsx for a complete working example of integration into PersonView.

## Next Steps

1. Read PERSONVIEW_INTEGRATION_QUICK_START.md
2. Copy integration code from PersonView.AttachGQEvent.example.jsx
3. Implement save handler for your data layer
4. Test with real person and events
5. Deploy and monitor

## License

Same as Heritage project

## Support

For integration help: See PERSONVIEW_INTEGRATION_QUICK_START.md
For troubleshooting: See TROUBLESHOOTING_GUIDE.md
For implementation details: See ATTACH_GQ_EVENT_IMPLEMENTATION.md
