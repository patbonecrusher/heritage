# Heritage vs MacFamilyTree: Comprehensive Feature Comparison

## Executive Summary

Heritage is a sophisticated open-source genealogy application with a modern Electron-based UI, SQLite database backend, and extensive support for complex family relationships, media management, and source citations. MacFamilyTree 11 is a commercial macOS/iOS genealogy application focused on ease of use, visual tree displays, and AI-powered media tools.

**Target Users:**
- **Heritage**: Advanced genealogists, researchers, data-intensive projects, developers
- **MacFamilyTree**: Casual to intermediate family tree builders, Apple ecosystem users

---

## Feature Matrix: Detailed Comparison

### 1. CORE GENEALOGY DATA MANAGEMENT

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Person Records** | ✅ Full | ✅ Full | Both support comprehensive person data |
| Multiple Names | ✅ Yes (maiden, nicknames, dit names, aliases) | ✅ Yes | Heritage more granular with variant tracking |
| **Marriage/Unions** | ✅ Yes (4 types) | ✅ Yes (marriage, civil union, partnership) | Heritage supports common law, more flexibility |
| Union Dates & Places | ✅ Yes | ✅ Yes | Both track start/end dates and locations |
| **Event System** | ✅ 20+ types | ✅ Yes (standard events) | Heritage has far more event types (military service, immigration, census, burial, etc.) |
| Custom Events | ✅ Yes | ✅ Yes | Both allow user-defined events |
| Flexible Dates | ✅ Yes (exact, about, before, after, between, calculated) | ✅ Yes | Heritage more sophisticated date handling |
| Partial Dates | ✅ Yes (year only, year-month) | ✅ Yes | Both support incomplete dates |
| Notes | ✅ Yes (any entity) | ✅ Yes | Heritage supports notes on any data type |
| Living Status | ✅ Yes (is_living flag) | ✅ Yes | Both track living/deceased status |
| Gender | ✅ Yes (multiple options) | ✅ Yes | Standard feature |

---

### 2. FAMILY RELATIONSHIPS & TREE STRUCTURE

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Parent-Child** | ✅ Yes | ✅ Yes | Core genealogy feature |
| Relationship Types | ✅ Biological, adopted, foster, step | ✅ Yes | Heritage explicitly tracks relationship types in schema |
| **Multiple Spouses** | ✅ Yes | ✅ Yes | Both support multiple marriages |
| Sibling Tracking | ✅ Yes (computed via unions) | ✅ Yes | Both automatically derive sibling relationships |
| Extended Family | ✅ Yes (full tree traversal) | ✅ Yes | Both support viewing distant relatives |
| **Prior Marital Status** | ✅ Yes (single, widowed, divorced) | ✅ Yes (end reasons: divorce, annulment, death) | Heritage more detailed |
| Union Status | ✅ Yes (married, divorced, annulled, widowed, separated) | ✅ Yes | Both track relationship status |
| **Circular Relationship Prevention** | ✅ Yes (validation) | ✅ Yes (implicit) | Heritage explicitly prevents paradoxes |
| View Navigation | ✅ Yes (click to navigate persons) | ✅ Yes | Both support tree navigation |
| **Back/Forward Navigation** | ✅ Yes (history stack) | ✅ Yes (implicit in UI) | Heritage explicit with clearable history |

---

### 3. VISUALIZATION & TREE DISPLAYS

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Pedigree View** | ✅ Yes (4-generation ancestor tree) | ✅ Yes (standard pedigree) | Heritage uses ReactFlow, MacFamilyTree native rendering |
| **Descendant View** | ✅ Yes (multi-generational) | ✅ Yes | Both show descendants |
| **Virtual Tree 3D** | ❌ No | ✅ Yes (major MacFamilyTree feature) | **Gap: No 3D visualization** |
| **Canvas/Interactive View** | ✅ Yes (full ReactFlow with zoom/pan/drag) | ❌ No (tree-based UI only) | **Heritage advantage: More flexible visualization** |
| **Automatic Layout** | ✅ Yes (pedigree & descendants algorithms) | ✅ Yes | Both compute optimal positioning |
| Zoom & Pan | ✅ Yes (scroll, pan, fit) | ✅ Yes | Both support navigation |
| Photo Display | ✅ Yes (person nodes show photos) | ✅ Yes | Both show avatars/primary photo |
| Node Styling | ✅ Yes (colors, themes) | ✅ Yes (MacFamilyTree more visual polish) | MacFamilyTree likely more aesthetically refined |
| **MiniMap** | ✅ Yes (ReactFlow component) | ✅ Likely (standard genealogy feature) | Both support navigation aids |
| Timeline View | ❌ No | ✅ Yes (Global timeline visualization) | **Gap: No timeline view** |
| **Location Mapping** | ✅ Yes (Leaflet interactive maps) | ✅ Yes (Global location visualization) | Heritage explicit, MacFamilyTree integrated |

---

### 4. MEDIA & PHOTO MANAGEMENT

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Photo Import** | ✅ Yes (local folders, drag-drop) | ✅ Yes | Both support photo import |
| **External URLs** | ✅ Yes (Ancestry, FamilySearch, FindAGrave, etc.) | ✅ Yes | Both support online sources |
| Media Types | ✅ Photos, docs, certificates, headstones, newspapers, audio, video | ✅ Photos, documents, media | Heritage more granular |
| **Face Detection** | ✅ Yes (automatic via face-api.js SSD MobileNet) | ❌ No explicit face detection | **Heritage advantage** |
| **Face Tagging** | ✅ Yes (interactive, confidence levels, person assignment) | ❌ No | **Heritage feature (unique)** |
| **AI Photo Tools** | ❌ No | ✅ Yes (colorization, restoration, super-resolution, background removal) | **MacFamilyTree advantage: AI enhancements** |
| Primary Photo | ✅ Yes | ✅ Yes | Standard feature |
| Photo Organization | ✅ Yes (library, search, filter) | ✅ Yes | Both organize media |
| Metadata Tracking | ✅ Yes (title, description, date, photographer, size, dimensions) | ✅ Yes | Heritage more detailed |
| **Page References** | ✅ Yes (for multi-page documents) | ✅ Yes (document pages) | Both support document sections |
| Thumbnail Caching | ✅ Yes | ✅ Yes (likely) | Performance optimization |
| Soft Deletion | ✅ Yes (optional file deletion) | ✅ Yes | Both preserve data integrity |
| **Media-Event Links** | ✅ Yes (attach to events) | ✅ Yes | Both associate media with records |
| Photo Viewer | ✅ Yes (with zoom, pan, face boxes) | ✅ Yes | Both provide detailed photo views |

---

### 5. SOURCES, CITATIONS & RESEARCH DOCUMENTATION

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Source Management** | ✅ Yes (10+ source types) | ✅ Yes | Both track sources |
| Source Types | ✅ Website, book, document, certificate, photo, oral history, archive, newspaper, church, government, other | ✅ Likely standard types | Heritage granular |
| **Citation System** | ✅ Yes (attach to persons, events, unions, media, names) | ✅ Yes | Both support citations |
| Citation Details | ✅ Yes (page, volume, entry, film, item, certificate numbers) | ✅ Yes | Both track references |
| **Confidence Levels** | ✅ Yes (certain, probable, possible, uncertain) | ✅ Yes | Both support research assessment |
| **Quick Sources** | ✅ Yes (FamilySearch, Ancestry, GénéalogieQuébec, BAnQ, FindAGrave, MyHeritage) | ✅ Yes (integration with major sources) | Both provide source shortcuts |
| Transcription Fields | ✅ Yes (transcription, translation, abstract) | ✅ Yes | Both support detailed documentation |
| Citation Notes | ✅ Yes | ✅ Yes | Standard feature |
| URL Tracking | ✅ Yes | ✅ Yes | Both track online sources |
| **Research Tasks** | ❌ No explicit task tracking | ✅ Yes (research goal tracking) | **Gap: No research task system** |
| Citation Count | ✅ Yes (computed) | ✅ Yes | Both track documentation level |

---

### 6. PLACES & GEOGRAPHIC DATA

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Place Library** | ✅ Yes (hierarchical) | ✅ Yes | Both organize places |
| Hierarchical Structure | ✅ Yes (parish → county → province → country) | ✅ Yes | Both support place hierarchies |
| Place Types | ✅ Parish, town, city, county, province, country | ✅ Yes | Standard |
| **Coordinates** | ✅ Yes (lat/long, geocoding integration) | ✅ Yes (implicit in mapping) | Both support geographic positioning |
| Historical Mapping | ✅ Yes (old name → current equivalent) | ✅ Yes (likely) | Both handle place name evolution |
| **Interactive Map** | ✅ Yes (Leaflet with markers, zoom, pan) | ✅ Yes (Global location visualization) | Heritage explicit implementation, MacFamilyTree integrated |
| Place Search | ✅ Yes (searchable autocomplete) | ✅ Yes | Standard feature |
| Create Places On-the-Fly | ✅ Yes (picker create option) | ✅ Yes | Both allow dynamic place creation |
| Geocoding | ✅ Yes (coordinate lookup) | ✅ Yes | Both support automatic positioning |

---

### 7. FILE & DATA MANAGEMENT

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **File Formats** | ✅ .heritage (SQLite) + JSON legacy | ✅ MacFamilyTree native format | Heritage supports dual modes |
| **New File Creation** | ✅ Yes (bundles & legacy) | ✅ Yes | Both support new projects |
| **Open/Save** | ✅ Yes | ✅ Yes | Standard operations |
| **Save As** | ✅ Yes | ✅ Yes | Both support alternative paths |
| **Recent Files** | ✅ Yes (with timestamps, quick-open) | ✅ Yes | Both remember recent projects |
| **Legacy Format Support** | ✅ Yes (JSON with migration) | ⚠️ Partial (upgrade only) | Heritage more backward compatible |
| **Export Formats** | ✅ PNG (2x resolution), SVG | ✅ Yes (various formats likely) | Heritage explicit image export |
| **GEDCOM Export** | ❌ No | ✅ Yes (standard genealogy format) | **Gap: No GEDCOM support** |
| **Collaboration** | ❌ No (single-file) | ✅ Yes (CloudTree Sync&Share, real-time) | **MacFamilyTree advantage: Cloud sync** |
| **Backup & Restore** | ✅ Implicit (SQLite file) | ✅ Yes | Both support data preservation |

---

### 8. PREFERENCES & CUSTOMIZATION

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Theme Settings** | ✅ Yes (dark/light modes) | ✅ Yes | Both support theming |
| **Appearance Options** | ✅ Yes (theme context) | ✅ Yes (likely more extensive) | MacFamilyTree probably more visual polish |
| **Credentials Storage** | ✅ Yes (Genealogie Quebec, FamilySearch, etc.) | ✅ Yes (likely for integrations) | Both support authentication caching |
| **Keyboard Shortcuts** | ✅ Yes (Cmd+L, E, arrows, escape, numbers) | ✅ Yes (standard Mac shortcuts) | Both keyboard-friendly |

---

### 9. ACCESSIBILITY & USER EXPERIENCE

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Keyboard Navigation** | ✅ Yes (full support, toggles, dropdowns) | ✅ Yes (Mac standard) | Both keyboard-accessible |
| **Search Functionality** | ✅ Yes (person name search in sidebar) | ✅ Yes | Both provide filtering |
| **Dialog/Modal System** | ✅ Yes (union, citation, source, person picker, place picker) | ✅ Yes | Both use modals for data entry |
| **Inline Editing** | ✅ Yes (person, events, family, inline saving) | ✅ Yes | Both support rapid editing |
| **Confirmation Dialogs** | ✅ Yes (remove parents/children) | ✅ Yes | Both prevent accidental deletion |
| **Toast Notifications** | ✅ Yes (save confirmation) | ✅ Yes (likely) | Both provide feedback |
| **Error Handling** | ✅ Yes (validation in place pickers) | ✅ Yes | Both guide user input |
| **Responsive UI** | ✅ Yes (Electron, dual storage modes) | ✅ Yes (native macOS) | Both adapt to data |

---

### 10. ADVANCED FEATURES & UNIQUE CAPABILITIES

| Feature | Heritage | MacFamilyTree 11 | Notes |
|---------|----------|------------------|-------|
| **Automatic Face Detection** | ✅ Yes (ML-powered) | ❌ No | **Heritage unique advantage** |
| **Interactive Face Tagging** | ✅ Yes (drag, resize, confidence levels) | ❌ No | **Heritage unique advantage** |
| **3D Tree Visualization** | ❌ No | ✅ Yes (Virtual Tree 3D) | **MacFamilyTree unique advantage** |
| **Real-time Collaboration** | ❌ No | ✅ Yes (CloudTree Sync&Share) | **MacFamilyTree unique advantage** |
| **AI Media Enhancement** | ❌ No | ✅ Yes (colorization, restoration, 4x upscaling, bg removal) | **MacFamilyTree unique advantage** |
| **iOS/iPad Apps** | ❌ No | ✅ Yes (companion apps) | **MacFamilyTree unique advantage** |
| **Audit Trail** | ✅ Yes (change_log table in SQLite) | ❌ Unknown (unlikely) | **Heritage advantage: Full history** |
| **Soft Deletes** | ✅ Yes (deleted_at timestamps) | ❌ Unknown (likely hard delete) | **Heritage advantage: Data recovery** |
| **Canvas Mode** | ✅ Yes (full interactive tree) | ❌ No (fixed tree layouts only) | **Heritage advantage: More flexible visualization** |
| **Dual Storage Modes** | ✅ Yes (bundle & legacy) | ❌ No | **Heritage advantage: Flexibility** |
| **Cross-Platform** | ✅ Yes (Electron: Windows, macOS, Linux) | ⚠️ macOS/iOS only | **Heritage advantage: Universal** |
| **Open Source** | ✅ Yes (GitHub) | ❌ No (Commercial) | **Heritage advantage: Developer community** |
| **Database Transactions** | ✅ Yes (SQLite transactions) | ❌ Unknown | **Heritage advantage: Data integrity** |

---

## Gap Analysis: Features Missing from Heritage

### High Priority (Commonly Expected)
1. **GEDCOM Export** - Standard genealogy interchange format
   - Impact: Can't share with other genealogy software
   - Effort: Medium (complex format, but well-documented)
   - Recommendation: Add as Phase 9 feature

2. **Research Task Tracking** - Document research goals and progress
   - Impact: Advanced genealogists miss this
   - Effort: Low (simple CRUD, status tracking)
   - Recommendation: Quick win feature

3. **Timeline View** - Visual timeline of all events
   - Impact: Useful for context and overview
   - Effort: Medium (requires timeline library)
   - Recommendation: Could integrate with existing visualization

4. **Cloud Sync/Collaboration** - Real-time collaborative editing
   - Impact: Family tree as shared project
   - Effort: High (requires backend infrastructure)
   - Recommendation: Post-1.0 feature

### Medium Priority
5. **AI Photo Enhancement** - Colorize, restore, enhance photos
   - Impact: Nice-to-have, luxury feature
   - Effort: High (ML models, processing)
   - Recommendation: Third-party integration or future phase

6. **3D Tree Visualization** - Virtual Tree 3D equivalent
   - Impact: Impressive visual, less practical
   - Effort: Very High (3D rendering, layout algorithms)
   - Recommendation: Low ROI compared to other features

7. **Mobile Companion Apps** - iOS/iPad access
   - Impact: Edit on-the-go
   - Effort: Very High (new platform, different UX)
   - Recommendation: Post-1.0 if at all

### Low Priority (Nice-to-Have)
8. **Advanced Place Timeline** - Historical mapping with time travel
   - Impact: Research tool for place history
   - Effort: Medium
   - Recommendation: Future enhancement

---

## Gap Analysis: Heritage Unique Advantages

Heritage has several features that MacFamilyTree lacks:

### Technical Strengths
1. **Face Detection & Tagging** - ML-powered person identification in photos
2. **Audit Trail** - Complete change history for data integrity
3. **Soft Deletes** - Data recovery capability
4. **Interactive Canvas** - More flexible tree visualization
5. **Dual Storage** - Both database and JSON compatibility
6. **Cross-Platform** - Windows, macOS, Linux support
7. **Open Source** - Community-driven development

### Data Integrity
- Transaction support
- Foreign key constraints
- Explicit relationship types (biological, adopted, foster, step)
- Flexible date handling (calculated dates, ranges)

---

## Market Positioning

### When to Choose Heritage
- ✅ Complex family trees with many relationships
- ✅ Windows/Linux users
- ✅ Advanced researchers who need audit trails
- ✅ Teams wanting open-source customization
- ✅ Photo-heavy genealogy with face recognition needs
- ✅ Desktop users wanting full tree visualization

### When to Choose MacFamilyTree 11
- ✅ macOS/iOS exclusive environment
- ✅ Users wanting 3D visualizations
- ✅ Collaborative family tree projects
- ✅ Photo enhancement as primary use case
- ✅ Users preferring cloud synchronization
- ✅ Casual genealogists wanting ease-of-use

---

## Feature Roadmap Recommendations for Heritage

### Phase 9: Research Documentation
- [ ] Research Task tracking (goals, status, priority)
- [ ] Task filtering and search
- [ ] Task completion tracking

### Phase 10: Import/Export
- [ ] GEDCOM export (full format support)
- [ ] GEDCOM import (parse and merge)
- [ ] CSV export for spreadsheet analysis

### Phase 11: Advanced Visualization (Optional)
- [ ] Timeline view of events
- [ ] Statistical charts (age distribution, event counts, etc.)
- [ ] Place timeline (events by location)

### Phase 12: Collaboration (Future)
- [ ] Multi-user editing (with conflict resolution)
- [ ] Cloud backup (Dropbox, iCloud, etc.)
- [ ] Change notifications for collaborators

### Phase 13: Intelligence Features (Long-term)
- [ ] Automatic duplicate detection (same person, similar names)
- [ ] Relationship inference (missing links)
- [ ] Data quality analysis (missing fields, inconsistencies)

---

## Conclusion

**Heritage** is a technically sophisticated genealogy application with modern architecture, excellent data integrity features, and unique face recognition capabilities. Its main gaps are industry-standard features like GEDCOM support and collaboration.

**MacFamilyTree 11** is a polished, commercial application with strong visual presentation, cloud collaboration, and AI-powered media tools, but lacks Heritage's flexibility, cross-platform support, and data forensics capabilities.

For serious genealogical research and complex family trees, Heritage's technical foundation is superior. For casual users in the Apple ecosystem wanting visual polish, MacFamilyTree 11 is the better choice.

**Heritage's competitive advantage:** Open-source, cross-platform, advanced relationship modeling, face recognition, and audit trails.
**Heritage's competitive gap:** GEDCOM support, cloud collaboration, 3D visualization, mobile apps.

