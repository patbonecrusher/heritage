# Heritage Bundle Specification

The `.heritage` file format is a macOS bundle (directory package) containing a complete family tree with all associated media.

## Bundle Structure

```
MyFamily.heritage/
├── Info.plist              # Bundle metadata
├── database.sqlite         # SQLite database (schema.sql)
├── Media/
│   ├── photos/             # Personal photos, portraits
│   ├── documents/          # Scanned records, certificates
│   ├── headstones/         # Cemetery photos
│   └── thumbnails/         # Auto-generated thumbnails
└── .heritage-version       # Format version for migrations
```

## Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.heritage.familytree</string>
    <key>CFBundleName</key>
    <string>Heritage Family Tree</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>HeritageFormatVersion</key>
    <string>1</string>
    <key>HeritageCreatedAt</key>
    <string></string>
    <key>HeritageLastModified</key>
    <string></string>
</dict>
</plist>
```

## File Paths

All paths in the database are relative to the bundle root:

- `media.path` = `Media/photos/abc123.jpg`
- `media.thumbnail_path` = `Media/thumbnails/abc123_thumb.jpg`

The app resolves full paths as: `bundlePath + '/' + media.path`

## Media Organization

When importing media:
1. Generate UUID for filename (preserves extension)
2. Copy to appropriate subfolder based on `media.type`
3. Generate thumbnail if image
4. Store relative path in database

```
Original: ~/Downloads/grandpa-1950.jpg
Stored as: Media/photos/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
Thumbnail: Media/thumbnails/a1b2c3d4-e5f6-7890-abcd-ef1234567890_thumb.jpg
```

## Cross-Platform Compatibility

- **macOS**: Finder shows as single file (bundle)
- **Windows/Linux**: Shows as folder (still fully functional)
- App handles both cases transparently

## Version Migration

The `.heritage-version` file contains a single integer (e.g., `1`).

On open:
1. Read version
2. If older than current, run migrations
3. Update version file

## UTI Registration

The app registers the UTI `com.heritage.familytree` to:
- Associate `.heritage` extension with the app
- Enable double-click to open
- Show custom icon in Finder
- Enable Quick Look preview (future)
