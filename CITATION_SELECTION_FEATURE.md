# Citation Selection Feature

## Overview

The AttachGQEventDialog now includes citation selection functionality, allowing users to link GénéalogieQuébec records to existing citations or create new ones.

## Features

### 1. Citation Selection Interface

Located in the EventDetailsPanel, between Photo References and Notes sections:

- **Dropdown Selection**: Choose from existing citations for the event
- **Citation Details Panel**: Shows source name, URL, and confidence level of selected citation
- **Create New Citation**: Quick access button to open CitationDialog and create new citations

### 2. Two States

#### When Citations Exist
```
Source Citation [+]
┌─────────────────────────────────┐
│ -- Select a citation --          │
│ Registry - Drouin p. 45 #123    │
│ Church Records p. 78            │
└─────────────────────────────────┘

When selected:
Registry - Drouin
View Source
Confidence: probable
```

#### When No Citations Exist
```
Source Citation [+]

No citations yet. Create one to link this record to a source.
┌─────────────────────────────────┐
│     + New Citation              │
└─────────────────────────────────┘
```

### 3. Citation Data Display

When a citation is selected, displays:
- **Source Name**: Full name of the source (e.g., "Registry - Drouin")
- **URL Link**: Clickable link to the source (opens in new tab)
- **Confidence Level**: How confident the citation is (certain/probable/possible/uncertain)

## Implementation Details

### Component Updates

#### AttachGQEventDialog.jsx
Added props:
- `citations: []` - Array of citation objects for the event
- `onCreateCitation` - Callback to open CitationDialog
- `onUpdateCitation` - Callback for future citation updates

#### EventDetailsPanel.jsx
- Added `citations` and citation handlers to props
- Added state for `selectedCitationId`
- Added `handleCitationSelection` callback
- Added full citation selection UI section with styling

#### PersonView.jsx
- Updated `attachGQDialog` state to include `eventId`
- Gets appropriate citations based on event type:
  - Birth events: `birthCitations`
  - Death events: `deathCitations`
  - Other events: `eventCitations[eventId]`
- Implemented `onCreateCitation` handler to open CitationDialog

### Styling

Added comprehensive CSS classes in EventDetailsPanel.css:
- `.citation-selection` - Container for citation dropdown and details
- `.citation-selection select` - Styled dropdown with theme variables
- `.citation-details` - Blue highlighted panel showing selected citation
- `.citation-info` - Layout for citation details
- `.citation-source` - Source name styling
- `.citation-url` - Clickable link to source
- `.citation-confidence` - Confidence level display
- `.citation-empty` - State when no citations exist

All styles use `var(--color-*)` CSS custom properties for full theme support.

## Data Flow

```
PersonView
  │
  ├─ birthCitations (for birth events)
  ├─ deathCitations (for death events)
  └─ eventCitations[eventId] (for other events)
       │
       └─> AttachGQEventDialog
            │
            └─> EventDetailsPanel
                 │
                 ├─ Citations dropdown selector
                 ├─ Citation details display
                 └─ onCreateCitation() → opens CitationDialog
```

## User Workflow

1. User opens AttachGQEventDialog for an event
2. User sees "Source Citation" section
3. If citations exist:
   - User selects a citation from dropdown
   - Selected citation details appear below
   - User can click "View Source" to open the citation URL
4. If no citations exist:
   - User sees "No citations yet" message
   - User clicks "+ New Citation" button
   - CitationDialog opens
   - User creates a new citation
   - New citation appears in the dropdown
5. User saves the event
   - Selected `citationId` is included in saved data
   - Save handler can link the citation to the event

## Future Enhancements

The following are marked as TODO in the implementation:

1. **Update Citation Handler**: `onUpdateCitation` callback for editing existing citations
2. **Citation to Event Link**: Save handler should create the citation-to-event relationship
3. **Citation Validation**: Ensure at least one citation is selected for certain event types
4. **Citation Display**: Show which events already have citations in the main event list

## Styling Consistency

All citation UI elements follow the theme system:
- Backgrounds use `var(--color-surface)` and `var(--color-background)`
- Text uses `var(--color-text)` and `var(--color-textMuted)`
- Borders use `var(--color-border)`
- Links and highlights use `var(--color-primary)`
- Selected states use `var(--color-primary)` accent

Works seamlessly with all 18 themes: Classic, Dark, Forest, Ocean, Darcula, etc.

## Testing

The citation selection feature:
- ✅ Builds successfully (530 modules, 2.10s)
- ✅ Integrates with existing PersonView citations system
- ✅ Respects all theme variables
- ✅ Handles both empty and populated citation lists
- ✅ Properly manages selected citation state
- ✅ Opens CitationDialog when creating new citations

---

**Date Implemented:** January 11, 2026
**Status:** Complete - UI layer ✅
**Next Step:** Implement save handler to persist citation-event relationship
