# Photo Media Integration - Implementation Summary

## Problem Statement
When users saved GénéalogieQuébec events with photos via the AttachGQEventDialog, the photos were not being added to the media library. The events were created and saved, but the actual photo files were never processed or stored, preventing them from appearing in the media library.

## Root Cause
The initial save handler implementation in PersonView.jsx created event records with photo IDs but never:
1. Converted File objects (from drag-drop) to a format that could be sent to Electron
2. Saved the photo files to the bundle storage system
3. Created media database records in the `media` table
4. Linked the media to both the event and person in the `media_link` table

## Solution Overview

### 1. Added Electron IPC Handler: `bundle-add-media-base64`

**File:** `electron/main.js` (lines 711-770)

Added a new IPC handler that accepts base64-encoded file data and saves it to the bundle:

```javascript
ipcMain.handle('bundle-add-media-base64', async (event, data) => {
  // Accepts: { base64Data, filename, mimeType, type }
  // Decodes base64 to buffer
  // Writes file to Media/ directory in bundle
  // Generates thumbnail for images
  // Returns: { success, id, path, thumbnailPath, filename, mimeType }
})
```

**Capabilities:**
- Accepts base64-encoded image data from the browser
- Automatically handles file extensions based on MIME type
- Generates thumbnails for common image formats
- Preserves filenames while generating UUIDs
- Returns metadata needed for database record creation

### 2. Exposed API in Preload Script

**File:** `electron/preload.js` (line 69)

Added new API method to the electronAPI bundle object:
```javascript
addMediaFromBase64: (data) => ipcRenderer.invoke('bundle-add-media-base64', data),
```

### 3. Implemented Complete Save Handler

**File:** `src/components/PersonView.jsx` (lines 2953-3081)

Enhanced the `onSave` handler for AttachGQEventDialog to:

1. **Create Event Record** - Creates a new event object with all details from the dialog
2. **Process Photos** - For each photo:
   - Converts File object to base64 using FileReader API
   - Sends base64 data to Electron for file storage via IPC
   - Receives bundle path and metadata back
3. **Create Media Database Records** - Uses `run()` from useDatabase to:
   - Insert into `media` table with file metadata
   - Set title from photo label or filename
   - Store file path, thumbnail path, MIME type
4. **Link Media to Event** - Creates `media_link` records:
   - Links media to the created event
   - Parses and stores page range information
   - Links media to the person for their media library
5. **Error Handling** - Continues processing remaining photos if one fails
6. **Cleanup** - Closes dialog and triggers refresh to update UI

### 4. Updated Imports in PersonView

**File:** `src/components/PersonView.jsx` (line 719)

Added database functions to the useDatabase hook import:
```javascript
const { triggerRefresh, run, query, generateId } = useDatabase();
```

## Data Flow

```
AttachGQEventDialog (PhotoGalleryPanel)
    ↓
User drops photos and clicks Save
    ↓
useAttachGQEvent collects photos as File objects
    ↓
PersonView.onSave handler receives gqEventData with photoData
    ↓
For each photo:
    1. Convert File → base64
    2. Send to Electron via window.electronAPI.bundle.addMediaFromBase64()
    3. Electron saves file to bundle/Media/ and generates thumbnail
    4. PersonView creates media database record
    5. PersonView creates media_link record (event + person)
    ↓
Event saved with photoIds array
    ↓
triggerRefresh() updates UI
    ↓
Photos now visible in media library and linked to event
```

## Database Schema Usage

### media table
```sql
INSERT INTO media (
  id, path, thumbnail_path, filename, type, mime_type,
  title, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### media_link table
```sql
INSERT INTO media_link (
  id, media_id, event_id, page_range_start, page_range_end, created_at
) VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO media_link (
  id, media_id, person_id, created_at
) VALUES (?, ?, ?, ?)
```

## File Organization

### Modified Files
1. **electron/preload.js** - Added API method
2. **electron/main.js** - Added IPC handler
3. **src/components/PersonView.jsx** - Implemented complete save handler

### No New Files Created
The implementation reuses existing infrastructure without requiring new components or utilities.

## Features Enabled

✅ **Photo Upload** - Users can drag-drop or browse for photos in the dialog

✅ **Photo Storage** - Files are saved to the bundle's Media/ directory with generated thumbnails

✅ **Database Integration** - Media records created with proper metadata

✅ **Event-Photo Linking** - Photos are linked to both the event and person

✅ **Media Library Integration** - Photos appear in the media library and EventMedia component

✅ **Photo Metadata** - Document type (label) and page range are preserved

✅ **Error Handling** - Continues on individual photo errors

## Testing Considerations

The implementation should be tested with:
1. Single photo upload
2. Multiple photos in one event
3. Different image formats (JPG, PNG, GIF, WebP)
4. Large files
5. Photos with special characters in filenames
6. Page range parsing (e.g., "21-22" or "21")
7. Event media display in EventMedia component
8. Photo appearance in MediaLibrary after save

## Known Limitations

1. **Page Range Parsing** - Currently splits on "-" character; may need enhancement for complex ranges
2. **Photo Ordering** - Photos are not reordered in media_link; depends on insertion order
3. **Concurrent Uploads** - Photos are processed sequentially; could be parallelized if needed
4. **Legacy Mode** - Implementation assumes bundle mode (database); JSON mode not supported
5. **Witness/Godparent Photos** - Not yet integrated; could be future enhancement

## Related Components

- **AttachGQEventDialog** - Dialog for capturing photos and event details
- **PhotoGalleryPanel** - Handles photo upload UI with zoom/pan
- **EventMedia** - Displays media linked to events
- **MediaLibrary** - Shows all media in the bundle
- **useImageZoom** - Provides zoom/pan for photo preview
- **useAttachGQEvent** - Manages form state and photo collection

## Future Enhancements

1. Batch photo processing with progress indication
2. Photo cropping/rotation before saving
3. Automatic EXIF metadata extraction
4. Smart page range detection from OCR
5. Citation creation from photo metadata
6. Witness tagging from face recognition
