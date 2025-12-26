-- Heritage Genealogy Database Schema
-- Version: 1.0
--
-- Design principles:
-- - UUIDs for all primary keys (TEXT type)
-- - Soft deletes via deleted_at column
-- - Full audit trail via change_log table
-- - Places as separate entities with historical mapping
-- - Sources separate from citations (base source vs specific reference)
-- - Media support for local files and external URLs
-- - Face tagging for group photos

PRAGMA foreign_keys = ON;

-- ============================================
-- METADATA
-- ============================================
CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ============================================
-- PLACES
-- ============================================
-- Places can map to other places (for historical names that no longer exist)
CREATE TABLE place (
    id TEXT PRIMARY KEY,  -- UUID
    name TEXT NOT NULL,
    type TEXT,  -- 'parish', 'town', 'city', 'county', 'province', 'country'
    parent_id TEXT REFERENCES place(id),  -- hierarchical (e.g., parish -> county -> province)
    mapped_to_id TEXT REFERENCES place(id),  -- if this place no longer exists, points to current equivalent
    latitude REAL,
    longitude REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT  -- soft delete
);

CREATE INDEX idx_place_name ON place(name);
CREATE INDEX idx_place_parent ON place(parent_id);
CREATE INDEX idx_place_mapped_to ON place(mapped_to_id);

-- ============================================
-- SOURCES (base repository table)
-- ============================================
-- Base sources: FamilySearch, GenealogieQuebec, a specific book, etc.
CREATE TABLE source (
    id TEXT PRIMARY KEY,  -- UUID
    type TEXT NOT NULL,  -- 'website', 'book', 'document', 'certificate', 'photo', 'oral', 'archive'
    name TEXT NOT NULL,  -- e.g., "FamilySearch", "BAnQ", "Parish Records of St-Roch"
    url TEXT,  -- base URL for websites
    author TEXT,
    publisher TEXT,
    publication_date TEXT,
    repository TEXT,  -- where the source is held (e.g., "BAnQ Vieux-Montréal")
    call_number TEXT,  -- library/archive call number
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_source_name ON source(name);
CREATE INDEX idx_source_type ON source(type);

-- ============================================
-- PERSONS
-- ============================================
CREATE TABLE person (
    id TEXT PRIMARY KEY,  -- UUID
    given_names TEXT,
    surname TEXT,
    surname_at_birth TEXT,  -- maiden name
    gender TEXT,  -- 'male', 'female', 'unknown'
    is_living INTEGER DEFAULT 0,  -- 1 if person is still alive
    primary_photo_id TEXT,  -- references media(id), defined later
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Add foreign key constraint after media table is created
-- (handled via trigger or application logic since SQLite doesn't support deferred FK creation)

CREATE INDEX idx_person_surname ON person(surname);
CREATE INDEX idx_person_given_names ON person(given_names);
CREATE INDEX idx_person_surname_at_birth ON person(surname_at_birth);
CREATE INDEX idx_person_primary_photo ON person(primary_photo_id);

-- Alternate names (dit names, spelling variations, aliases)
CREATE TABLE person_name (
    id TEXT PRIMARY KEY,  -- UUID
    person_id TEXT NOT NULL REFERENCES person(id),
    type TEXT NOT NULL,  -- 'dit', 'alias', 'spelling', 'nickname', 'married', 'religious'
    given_names TEXT,
    surname TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_person_name_person ON person_name(person_id);
CREATE INDEX idx_person_name_surname ON person_name(surname);

-- ============================================
-- UNIONS (marriages, partnerships)
-- ============================================
CREATE TABLE union_ (
    id TEXT PRIMARY KEY,  -- UUID
    person1_id TEXT NOT NULL REFERENCES person(id),
    person2_id TEXT REFERENCES person(id),  -- nullable for unknown spouse
    type TEXT DEFAULT 'marriage',  -- 'marriage', 'partnership', 'common_law', 'unknown'
    status TEXT,  -- 'married', 'divorced', 'annulled', 'widowed', 'separated'
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_union_person1 ON union_(person1_id);
CREATE INDEX idx_union_person2 ON union_(person2_id);

-- Children belong to unions
CREATE TABLE union_child (
    id TEXT PRIMARY KEY,  -- UUID
    union_id TEXT NOT NULL REFERENCES union_(id),
    person_id TEXT NOT NULL REFERENCES person(id),
    birth_order INTEGER,  -- for sorting siblings
    relationship TEXT DEFAULT 'biological',  -- 'biological', 'adopted', 'foster', 'step'
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    UNIQUE(union_id, person_id)
);

CREATE INDEX idx_union_child_union ON union_child(union_id);
CREATE INDEX idx_union_child_person ON union_child(person_id);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE event (
    id TEXT PRIMARY KEY,  -- UUID
    person_id TEXT REFERENCES person(id),  -- person event
    union_id TEXT REFERENCES union_(id),   -- union event (marriage, divorce)
    type TEXT NOT NULL,  -- see below
    custom_type TEXT,  -- for type='custom'

    -- Date handling (flexible for partial dates)
    date TEXT,  -- ISO date or partial: '1850', '1850-03', '1850-03-15'
    date_qualifier TEXT,  -- 'exact', 'about', 'before', 'after', 'between', 'calculated'
    date_end TEXT,  -- for 'between' qualifier or date ranges

    -- Place
    place_id TEXT REFERENCES place(id),
    place_detail TEXT,  -- additional detail like street address, hospital name

    -- Event details
    description TEXT,
    age_at_event INTEGER,  -- age in years if known
    occupation TEXT,  -- for events where occupation is recorded
    cause TEXT,  -- cause of death, reason for immigration, etc.
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,

    CHECK (person_id IS NOT NULL OR union_id IS NOT NULL)
);

-- Event types:
-- Person events: birth, death, baptism, burial, cremation, christening, confirmation,
--                bar_mitzvah, bat_mitzvah, first_communion, blessing, adoption,
--                immigration, emigration, naturalization, census, residence,
--                occupation, education, graduation, military, retirement,
--                medical, will, probate, custom
-- Union events: marriage, divorce, annulment, engagement, separation, custom

CREATE INDEX idx_event_person ON event(person_id);
CREATE INDEX idx_event_union ON event(union_id);
CREATE INDEX idx_event_type ON event(type);
CREATE INDEX idx_event_place ON event(place_id);
CREATE INDEX idx_event_date ON event(date);

-- ============================================
-- CITATIONS (specific source references)
-- ============================================
-- Citations link sources to specific entities with context
-- e.g., FamilySearch (source) -> specific record URL (citation)
CREATE TABLE citation (
    id TEXT PRIMARY KEY,  -- UUID
    source_id TEXT NOT NULL REFERENCES source(id),

    -- What this citation is for (exactly one should be set)
    person_id TEXT REFERENCES person(id),
    event_id TEXT REFERENCES event(id),
    union_id TEXT REFERENCES union_(id),
    person_name_id TEXT REFERENCES person_name(id),

    -- Citation-specific details
    url TEXT,  -- specific URL (e.g., FamilySearch record link)
    page TEXT,  -- page number for books
    volume TEXT,
    entry_number TEXT,  -- record number
    film_number TEXT,  -- microfilm number
    item_number TEXT,  -- item on microfilm
    certificate_number TEXT,
    accessed_date TEXT,  -- when online source was accessed

    -- What the source says
    transcription TEXT,  -- exact text from source
    translation TEXT,  -- if transcription is in another language
    abstract TEXT,  -- summary of relevant info

    -- Quality assessment
    confidence TEXT,  -- 'certain', 'probable', 'possible', 'uncertain'
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_citation_source ON citation(source_id);
CREATE INDEX idx_citation_person ON citation(person_id);
CREATE INDEX idx_citation_event ON citation(event_id);
CREATE INDEX idx_citation_union ON citation(union_id);
CREATE INDEX idx_citation_person_name ON citation(person_name_id);

-- ============================================
-- MEDIA
-- ============================================
CREATE TABLE media (
    id TEXT PRIMARY KEY,  -- UUID

    -- Storage: local file OR external URL (one or the other)
    path TEXT,  -- relative path for local files (e.g., "photos/abc123.jpg")
    external_url TEXT,  -- for Ancestry, FamilySearch, etc.
    thumbnail_path TEXT,  -- local thumbnail for quick display

    filename TEXT,  -- original filename (local) or derived from URL
    type TEXT NOT NULL,  -- 'photo', 'document', 'certificate', 'headstone', 'newspaper', 'map', 'audio', 'video', 'other'
    mime_type TEXT,  -- 'image/jpeg', 'application/pdf', etc.
    file_size INTEGER,  -- bytes (null for external)
    width INTEGER,  -- for images/video
    height INTEGER,
    duration INTEGER,  -- seconds, for audio/video
    page_count INTEGER,  -- for PDFs

    -- Metadata
    title TEXT,
    description TEXT,
    date_taken TEXT,  -- when photo was taken or document created
    date_digitized TEXT,  -- when scanned/photographed
    photographer TEXT,

    -- For scanned records, link to source
    source_id TEXT REFERENCES source(id),

    -- For external URLs
    external_source TEXT,  -- 'ancestry', 'familysearch', 'findagrave', 'banq', 'genquebec', 'other'
    requires_auth BOOLEAN DEFAULT FALSE,  -- needs login to view

    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,

    CHECK (path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX idx_media_type ON media(type);
CREATE INDEX idx_media_source ON media(source_id);
CREATE INDEX idx_media_external_source ON media(external_source);
CREATE INDEX idx_media_date_taken ON media(date_taken);

-- ============================================
-- MEDIA LINKS (many-to-many)
-- ============================================
-- Links media to entities (a photo can show multiple people)
CREATE TABLE media_link (
    id TEXT PRIMARY KEY,  -- UUID
    media_id TEXT NOT NULL REFERENCES media(id),

    -- What this media is linked to (exactly one should be set)
    person_id TEXT REFERENCES person(id),
    event_id TEXT REFERENCES event(id),
    union_id TEXT REFERENCES union_(id),
    place_id TEXT REFERENCES place(id),
    citation_id TEXT REFERENCES citation(id),

    -- Link metadata
    is_primary BOOLEAN DEFAULT FALSE,  -- primary photo for a person
    sort_order INTEGER,  -- for ordering multiple media
    notes TEXT,

    -- PDF page reference
    page_number INTEGER,  -- specific page in multi-page document
    page_range_start INTEGER,  -- or a range of pages
    page_range_end INTEGER,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_media_link_media ON media_link(media_id);
CREATE INDEX idx_media_link_person ON media_link(person_id);
CREATE INDEX idx_media_link_event ON media_link(event_id);
CREATE INDEX idx_media_link_union ON media_link(union_id);
CREATE INDEX idx_media_link_place ON media_link(place_id);

-- ============================================
-- FACE TAGS (regions in photos)
-- ============================================
CREATE TABLE face_tag (
    id TEXT PRIMARY KEY,  -- UUID
    media_id TEXT NOT NULL REFERENCES media(id),
    person_id TEXT REFERENCES person(id),  -- null if unidentified

    -- Region coordinates (percentage-based for resolution independence)
    x REAL NOT NULL,  -- left edge (0-100%)
    y REAL NOT NULL,  -- top edge (0-100%)
    width REAL NOT NULL,  -- width (0-100%)
    height REAL NOT NULL,  -- height (0-100%)

    -- Optional: for non-rectangular regions or precise outlines
    polygon TEXT,  -- JSON array of points [{"x":10,"y":20},...]

    -- Metadata
    label TEXT,  -- "Unknown man", "Possibly Jean", etc. (useful when person_id is null)
    confidence TEXT,  -- 'certain', 'probable', 'possible', 'unknown'
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_face_tag_media ON face_tag(media_id);
CREATE INDEX idx_face_tag_person ON face_tag(person_id);

-- ============================================
-- CHANGE LOG (audit trail)
-- ============================================
CREATE TABLE change_log (
    id TEXT PRIMARY KEY,  -- UUID
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'restore', 'merge'
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    field_name TEXT,  -- null for create/delete, specific field for update
    old_value TEXT,  -- JSON for complex values
    new_value TEXT,  -- JSON for complex values
    user_id TEXT,  -- for future multi-user support
    session_id TEXT,  -- group related changes
    notes TEXT
);

CREATE INDEX idx_change_log_timestamp ON change_log(timestamp);
CREATE INDEX idx_change_log_table ON change_log(table_name);
CREATE INDEX idx_change_log_record ON change_log(record_id);
CREATE INDEX idx_change_log_session ON change_log(session_id);

-- ============================================
-- RESEARCH TASKS (optional - for tracking research)
-- ============================================
CREATE TABLE research_task (
    id TEXT PRIMARY KEY,  -- UUID
    person_id TEXT REFERENCES person(id),
    event_id TEXT REFERENCES event(id),

    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'blocked'
    priority TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'

    -- What to search
    suggested_sources TEXT,  -- JSON array of source names/types to check
    search_location TEXT,
    date_range_start TEXT,
    date_range_end TEXT,

    -- Results
    result_notes TEXT,
    completed_at TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_research_task_person ON research_task(person_id);
CREATE INDEX idx_research_task_status ON research_task(status);

-- ============================================
-- INITIALIZE METADATA
-- ============================================
INSERT INTO metadata (key, value) VALUES ('schema_version', '1.0');
INSERT INTO metadata (key, value) VALUES ('created_at', datetime('now'));
INSERT INTO metadata (key, value) VALUES ('app_name', 'Heritage');
