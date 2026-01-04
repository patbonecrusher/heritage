import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import MediaGallery from './MediaGallery';
import PersonPhoto from './PersonPhoto';
import PersonTooltip from './PersonTooltip';
import PlacePicker from './PlacePicker';
import PersonPicker from './PersonPicker';
import { PlaceDropZone, MediaDropZone } from './DropZone';
import EventMedia from './EventMedia';
import CitationList from './CitationList';
import CitationDialog from './CitationDialog';
import PhotoViewer from './PhotoViewer';
import NotesSection from './NotesSection';
import { getParentIds, getChildrenIds } from '../utils/dataModel';
import { useDatabase } from '../data/DatabaseContext';
import './PersonViewNew.css';

// Event icons mapping
const EVENT_ICONS = {
  birth: '★',
  baptism: '~',
  marriage: '⚭',
  death: '†',
  burial: '⚰',
  census: '🏠',
  immigration: '→',
  emigration: '←',
  service: '⚔',
};

// Get all descendants of a person (to prevent circular relationships)
function getAllDescendantIds(data, personId, visited = new Set()) {
  if (visited.has(personId)) return [];
  visited.add(personId);

  const childIds = getChildrenIds(data, personId);
  const allDescendants = [...childIds];

  for (const childId of childIds) {
    const grandchildren = getAllDescendantIds(data, childId, visited);
    allDescendants.push(...grandchildren);
  }

  return allDescendants;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_TYPES = [
  { value: 'baptism', label: 'Baptism', requires: 'birth' },
  { value: 'service', label: 'Military Service', requires: 'birth' },
  { value: 'immigration', label: 'Immigration', requires: 'birth' },
  { value: 'emigration', label: 'Emigration', requires: 'birth' },
  { value: 'burial', label: 'Burial', requires: 'death' },
];

const UNION_TYPES = [
  { value: 'marriage', label: 'Marriage' },
  { value: 'civil_union', label: 'Civil Union' },
  { value: 'common_law', label: 'Common Law' },
  { value: 'partnership', label: 'Partnership' },
];

const END_REASONS = [
  { value: '', label: 'Still together' },
  { value: 'divorce', label: 'Divorce' },
  { value: 'separation', label: 'Separation' },
  { value: 'annulment', label: 'Annulment' },
  { value: 'death', label: 'Death of spouse' },
];

function KeyHint({ children }) {
  return <span className="key-hint">{children}</span>;
}

function ToggleGroup({ options, value, onChange, name }) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    } else if (e.key >= '1' && e.key <= '9') {
      const numIndex = parseInt(e.key) - 1;
      if (numIndex < options.length) {
        onChange(options[numIndex].value);
      }
    }
  };

  return (
    <div className="toggle-group" role="radiogroup">
      {options.map((opt, index) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`toggle-btn ${value === opt.value ? 'active' : ''} ${opt.className || ''}`}
          onClick={() => onChange(opt.value)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          tabIndex={value === opt.value ? 0 : -1}
        >
          <KeyHint>{index + 1}</KeyHint> {opt.label}
        </button>
      ))}
    </div>
  );
}

// Parse a flexible date string and return structured data
function parseDateString(input) {
  if (!input || input.trim() === '') {
    return { type: 'unknown', display: 'Unknown' };
  }

  const strLower = input.trim().toLowerCase();

  if (strLower === '?' || strLower === 'unknown' || strLower === 'unk') {
    return { type: 'unknown_acknowledged', display: 'Unknown' };
  }

  if (strLower === 'alive' || strLower === 'living' || strLower === 'still alive') {
    return { type: 'alive', display: 'Living' };
  }

  const str = input.trim();

  const approxMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)?(\d{4})\s*(?:\+-|±)\s*(\d+)$/i);
  if (approxMatch) {
    return {
      type: 'approximate',
      year: approxMatch[1],
      variance: parseInt(approxMatch[2]),
      display: `c. ${approxMatch[1]} (±${approxMatch[2]} years)`
    };
  }

  const circaMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)(\d{4})$/i);
  if (circaMatch) {
    return {
      type: 'approximate',
      year: circaMatch[1],
      variance: 5,
      display: `c. ${circaMatch[1]} (±5 years)`
    };
  }

  const yearOnlyMatch = str.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return {
      type: 'exact',
      year: yearOnlyMatch[1],
      month: '',
      day: '',
      display: yearOnlyMatch[1]
    };
  }

  const monthYearMatch = str.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase().startsWith(monthYearMatch[1].toLowerCase()));
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: monthYearMatch[2],
        month: String(monthIdx + 1),
        day: '',
        display: `${MONTHS[monthIdx]} ${monthYearMatch[2]}`
      };
    }
  }

  const numMonthYearMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (numMonthYearMatch) {
    const monthNum = parseInt(numMonthYearMatch[1]);
    if (monthNum >= 1 && monthNum <= 12) {
      return {
        type: 'exact',
        year: numMonthYearMatch[2],
        month: String(monthNum),
        day: '',
        display: `${MONTHS[monthNum - 1]} ${numMonthYearMatch[2]}`
      };
    }
  }

  const fullDateMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (fullDateMatch) {
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase().startsWith(fullDateMatch[2].toLowerCase()));
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: fullDateMatch[3],
        month: String(monthIdx + 1),
        day: fullDateMatch[1],
        display: `${fullDateMatch[1]} ${MONTHS[monthIdx]} ${fullDateMatch[3]}`
      };
    }
  }

  const usDateMatch = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (usDateMatch) {
    const monthIdx = MONTHS.findIndex(m => m.toLowerCase().startsWith(usDateMatch[1].toLowerCase()));
    if (monthIdx !== -1) {
      return {
        type: 'exact',
        year: usDateMatch[3],
        month: String(monthIdx + 1),
        day: usDateMatch[2],
        display: `${usDateMatch[2]} ${MONTHS[monthIdx]} ${usDateMatch[3]}`
      };
    }
  }

  const numFullDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numFullDateMatch) {
    const day = parseInt(numFullDateMatch[1]);
    const monthNum = parseInt(numFullDateMatch[2]);
    if (day >= 1 && day <= 31 && monthNum >= 1 && monthNum <= 12) {
      return {
        type: 'exact',
        year: numFullDateMatch[3],
        month: String(monthNum),
        day: String(day),
        display: `${day} ${MONTHS[monthNum - 1]} ${numFullDateMatch[3]}`
      };
    }
  }

  return { type: 'unknown', display: `? (couldn't parse "${str}")` };
}

function dateToInputString(date) {
  if (!date || date.type === 'unknown') return '';
  if (date.type === 'approximate') {
    return `${date.year}+-${date.variance || 5}`;
  }
  const parts = [];
  if (date.day) parts.push(date.day);
  if (date.month) parts.push(MONTHS[parseInt(date.month) - 1]?.substring(0, 3));
  if (date.year) parts.push(date.year);
  return parts.join(' ');
}

function DateInput({ label, value, onChange }) {
  const [inputText, setInputText] = useState(() => dateToInputString(value));
  const [parsed, setParsed] = useState(() => parseDateString(dateToInputString(value)));
  const isEditing = useRef(false);

  useEffect(() => {
    if (!isEditing.current) {
      const text = dateToInputString(value);
      setInputText(text);
      setParsed(parseDateString(text));
    }
  }, [value]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    const result = parseDateString(text);
    setParsed(result);
    onChange(result);
  };

  return (
    <div className="date-input-group">
      <label className="field-label">{label}</label>
      <div className="smart-date-row">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => isEditing.current = true}
          onBlur={() => isEditing.current = false}
          className="text-input smart-date-input"
          placeholder="1850, Mar 1850, 15 Mar 1850, 1850+-5, c.1850"
        />
        <span className={`date-preview ${parsed.type === 'unknown' && inputText ? 'error' : ''}`}>
          {parsed.display || 'Unknown'}
        </span>
      </div>
    </div>
  );
}

function EventEntry({ event, onChange, onRemove, sources, onAddSource, parentDate, places, citations = [], onAddCitation, onEditCitation, onDeleteCitation }) {
  const [dateText, setDateText] = useState(() => {
    if (event.dateOffset) return event.dateOffset;
    return dateToInputString(event.date);
  });
  const isEditing = useRef(false);

  const hasData = (event.date && event.date.type !== 'unknown') || event.place;
  const [isExpanded, setIsExpanded] = useState(!hasData);

  useEffect(() => {
    if (!isEditing.current) {
      if (event.dateOffset) {
        setDateText(event.dateOffset);
      } else {
        setDateText(dateToInputString(event.date));
      }
    }
  }, [event.date, event.dateOffset]);

  const calculateDateFromOffset = (offsetStr, baseDate) => {
    if (!baseDate || !['exact', 'approximate', 'unknown_acknowledged'].includes(baseDate.type)) {
      return null;
    }
    const match = offsetStr.match(/^\+(\d+)([dwmy]?)$/i);
    if (!match) return null;

    const num = parseInt(match[1]);
    const unit = (match[2] || 'd').toLowerCase();

    const baseYear = parseInt(baseDate.year);
    const baseMonth = baseDate.month ? parseInt(baseDate.month) - 1 : 0;
    const baseDay = baseDate.day ? parseInt(baseDate.day) : 1;

    const date = new Date(baseYear, baseMonth, baseDay);

    switch (unit) {
      case 'd': date.setDate(date.getDate() + num); break;
      case 'w': date.setDate(date.getDate() + num * 7); break;
      case 'm': date.setMonth(date.getMonth() + num); break;
      case 'y': date.setFullYear(date.getFullYear() + num); break;
    }

    return {
      type: 'exact',
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1),
      day: String(date.getDate()),
      display: `${date.getDate()} ${MONTHS[date.getMonth()].substring(0, 3)} ${date.getFullYear()}`
    };
  };

  const handleDateChange = (e) => {
    const text = e.target.value;
    setDateText(text);

    if (text.startsWith('+')) {
      const calculated = calculateDateFromOffset(text, parentDate);
      onChange({
        ...event,
        dateOffset: text,
        date: calculated || { type: 'unknown', display: 'Unknown' }
      });
    } else {
      const parsed = parseDateString(text);
      onChange({ ...event, dateOffset: null, date: parsed });
    }
  };

  const getDateDisplay = () => {
    if (dateText.startsWith('+')) {
      const calculated = calculateDateFromOffset(dateText, parentDate);
      if (calculated) {
        return { display: calculated.display, isError: false };
      }
      return { display: parentDate ? 'Invalid offset' : 'Need parent date', isError: true };
    }
    const parsed = parseDateString(dateText);
    return {
      display: parsed.display || 'Unknown',
      isError: parsed.type === 'unknown' && dateText
    };
  };

  const eventType = EVENT_TYPES.find(t => t.value === event.type);
  const eventLabel = eventType?.label || event.type;
  const dateDisplay = getDateDisplay();
  const placeholder = eventType?.requires === 'birth' ? '+4d, 15 Mar 1850' :
                      eventType?.requires === 'death' ? '+2d, 15 Mar 1920' : 'Date';

  const summaryParts = [];
  if (event.date && event.date.type !== 'unknown') {
    summaryParts.push(dateDisplay.display);
  }
  if (event.place) {
    summaryParts.push(event.place);
  }
  const sourceCount = event.sources?.length || 0;
  const summaryText = summaryParts.join(' · ') || 'No details';

  return (
    <div className={`event-entry ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="event-header"
        onClick={() => hasData && setIsExpanded(!isExpanded)}
        style={{ cursor: hasData ? 'pointer' : 'default' }}
      >
        <div className="event-header-left">
          {hasData && (
            <span className="event-chevron">{isExpanded ? '▼' : '▶'}</span>
          )}
          <span className="event-type-label">{eventLabel}</span>
          {!isExpanded && hasData && (
            <span className="event-summary">{summaryText}</span>
          )}
          {!isExpanded && sourceCount > 0 && (
            <span className="event-source-count" title={`${sourceCount} source${sourceCount > 1 ? 's' : ''}`}>
              [{sourceCount}]
            </span>
          )}
        </div>
        <button
          type="button"
          className="event-remove-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove event"
        >
          ×
        </button>
      </div>
      {isExpanded && (
        <div className="event-fields">
          <div className="smart-date-row">
            <input
              type="text"
              value={dateText}
              onChange={handleDateChange}
              onFocus={() => isEditing.current = true}
              onBlur={() => isEditing.current = false}
              className="text-input smart-date-input"
              placeholder={placeholder}
            />
            <span className={`date-preview ${dateDisplay.isError ? 'error' : ''}`}>
              {dateDisplay.display}
            </span>
          </div>
          <PlaceDropZone
            value={event.place || ''}
            placeId={event.placeId}
            places={places}
            onChange={({ place, placeId }) => onChange({ ...event, place, placeId })}
            placeholder="Place"
          />
          <CitationList
            citations={citations}
            onAdd={onAddCitation}
            onEdit={onEditCitation}
            onDelete={onDeleteCitation}
            isEditing={true}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}

function UnionEntry({ union, onChange, onRemove, allPeople, currentPersonId, sources, onAddSource, citations = [], onAddCitation, onEditCitation, onDeleteCitation }) {
  const [dateText, setDateText] = useState(() => dateToInputString(union.startDate));
  const [endDateText, setEndDateText] = useState(() => dateToInputString(union.endDate));
  const isEditing = useRef(false);
  const isEditingEnd = useRef(false);

  const hasData = union.partnerId || (union.startDate && union.startDate.type !== 'unknown') || union.startPlace;
  const [isExpanded, setIsExpanded] = useState(!hasData || !union.partnerId);

  useEffect(() => {
    if (!isEditing.current) {
      setDateText(dateToInputString(union.startDate));
    }
  }, [union.startDate]);

  useEffect(() => {
    if (!isEditingEnd.current) {
      setEndDateText(dateToInputString(union.endDate));
    }
  }, [union.endDate]);

  const handleDateChange = (e) => {
    const text = e.target.value;
    setDateText(text);
    const parsed = parseDateString(text);
    onChange({ ...union, startDate: parsed });
  };

  const handleEndDateChange = (e) => {
    const text = e.target.value;
    setEndDateText(text);
    const parsed = parseDateString(text);
    onChange({ ...union, endDate: parsed });
  };

  // Get partner info
  const partner = allPeople.find(p => p.id === union.partnerId);
  const partnerName = partner ? [partner.firstName, partner.lastName].filter(Boolean).join(' ') : 'Select partner';
  const unionType = UNION_TYPES.find(t => t.value === union.type)?.label || 'Marriage';

  // Available partners (exclude current person and already-partnered people for this union)
  const availablePartners = allPeople.filter(p => p.id !== currentPersonId);

  // Build summary
  const summaryParts = [];
  summaryParts.push(partnerName);
  if (union.startDate && union.startDate.type !== 'unknown') {
    const dateStr = union.startDate.display || union.startDate.year;
    summaryParts.push(dateStr);
  }
  if (union.startPlace) {
    summaryParts.push(union.startPlace);
  }
  const summaryText = summaryParts.join(' · ');

  return (
    <div className={`union-entry ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="event-header"
        onClick={() => hasData && union.partnerId && setIsExpanded(!isExpanded)}
        style={{ cursor: hasData && union.partnerId ? 'pointer' : 'default' }}
      >
        <div className="event-header-left">
          {hasData && union.partnerId && (
            <span className="event-chevron">{isExpanded ? '▼' : '▶'}</span>
          )}
          <span className="event-type-label">{unionType}</span>
          {!isExpanded && hasData && (
            <span className="event-summary">{summaryText}</span>
          )}
        </div>
        <button
          type="button"
          className="event-remove-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove union"
        >
          ×
        </button>
      </div>
      {isExpanded && (
        <div className="event-fields">
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="field-label">Partner</label>
            <select
              value={union.partnerId || ''}
              onChange={(e) => onChange({ ...union, partnerId: e.target.value })}
              className="text-input"
            >
              <option value="">Select partner...</option>
              {availablePartners.map(p => (
                <option key={p.id} value={p.id}>
                  {[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="field-label">Type</label>
            <select
              value={union.type || 'marriage'}
              onChange={(e) => onChange({ ...union, type: e.target.value })}
              className="text-input"
            >
              {UNION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="field-label">Start Date</label>
            <div className="smart-date-row">
              <input
                type="text"
                value={dateText}
                onChange={handleDateChange}
                onFocus={() => isEditing.current = true}
                onBlur={() => isEditing.current = false}
                className="text-input smart-date-input"
                placeholder="15 Mar 1850, c.1850"
              />
              <span className="date-preview">
                {union.startDate?.display || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="field-label">Place</label>
            <input
              type="text"
              value={union.startPlace || ''}
              onChange={(e) => onChange({ ...union, startPlace: e.target.value })}
              className="text-input"
              placeholder="City, Country"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="field-label">End Reason</label>
            <select
              value={union.endReason || ''}
              onChange={(e) => onChange({ ...union, endReason: e.target.value })}
              className="text-input"
            >
              {END_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {union.endReason && (
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="field-label">End Date</label>
              <div className="smart-date-row">
                <input
                  type="text"
                  value={endDateText}
                  onChange={handleEndDateChange}
                  onFocus={() => isEditingEnd.current = true}
                  onBlur={() => isEditingEnd.current = false}
                  className="text-input smart-date-input"
                  placeholder="15 Mar 1880"
                />
                <span className="date-preview">
                  {union.endDate?.display || 'Unknown'}
                </span>
              </div>
            </div>
          )}
          <CitationList
            citations={citations}
            onAdd={onAddCitation}
            onEdit={onEditCitation}
            onDelete={onDeleteCitation}
            isEditing={true}
            compact={true}
          />
          <div className="union-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '4px 12px' }}
              onClick={onRemove}
            >
              {union.isNew ? 'Cancel' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PersonView({
  person, onSave, onCancel, sources = {}, onAddSource, allPeople = [], existingUnions = [],
  onUnionsChange, onSelectPerson, onParentsChange, onCreatePerson, onNavigateBack, canNavigateBack,
  onNavigateForward, canNavigateForward, places = [],
  // Citation props
  personCitations = [], birthCitations = [], deathCitations = [], eventCitations = {}, unionCitations = {},
  mediaCitations = {},
  onCreateCitation, onUpdateCitation, onDeleteCitation, dbSources = []
}) {
  const { theme } = useTheme();
  const { triggerRefresh } = useDatabase();
  const firstInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState({ type: 'exact' });
  const [deathDate, setDeathDate] = useState({ type: 'unknown' });
  const [birthPlace, setBirthPlace] = useState('');
  const [birthPlaceId, setBirthPlaceId] = useState(null);
  const [birthEventId, setBirthEventId] = useState(null);
  const [deathPlace, setDeathPlace] = useState('');
  const [deathPlaceId, setDeathPlaceId] = useState(null);
  const [deathEventId, setDeathEventId] = useState(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [personSources, setPersonSources] = useState([]);
  const [birthSources, setBirthSources] = useState([]);
  const [deathSources, setDeathSources] = useState([]);
  const [events, setEvents] = useState([]);
  const [unions, setUnions] = useState([]);
  const [birthExpanded, setBirthExpanded] = useState(true);
  const [deathExpanded, setDeathExpanded] = useState(true);
  const [noteAddTrigger, setNoteAddTrigger] = useState(false);
  const [selectedFatherId, setSelectedFatherId] = useState('');
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [showNewParentDialog, setShowNewParentDialog] = useState(null);
  const [newParentFirstName, setNewParentFirstName] = useState('');
  const [newParentLastName, setNewParentLastName] = useState('');
  const [showFamilyPanel, setShowFamilyPanel] = useState(true);
  const [showNewFamilyDialog, setShowNewFamilyDialog] = useState(null); // { type: 'child', unionId } or { type: 'partner' }
  const [newFamilyFirstName, setNewFamilyFirstName] = useState('');
  const [newFamilyLastName, setNewFamilyLastName] = useState('');
  const [newFamilyGender, setNewFamilyGender] = useState('');
  const [selectedExistingChildId, setSelectedExistingChildId] = useState(''); // For selecting existing person as child

  // Citation dialog state
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [editingCitation, setEditingCitation] = useState(null);
  const [citationTarget, setCitationTarget] = useState(null); // { type: 'birth'|'death'|'event', eventId: string }

  // Portrait photo viewer state
  const [portraitMedia, setPortraitMedia] = useState(null);

  // Swipe gesture handling (touch devices)
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null || isEditing) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger swipe if horizontal movement is significant and greater than vertical
    const minSwipeDistance = 80;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && canNavigateBack) {
        // Swipe right = go back
        onNavigateBack?.();
      } else if (deltaX < 0 && canNavigateForward) {
        // Swipe left = go forward
        onNavigateForward?.();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [isEditing, canNavigateBack, canNavigateForward, onNavigateBack, onNavigateForward]);

  // Trackpad swipe handling (macOS two-finger swipe)
  const wheelAccumulator = useRef({ x: 0, y: 0, timeout: null });

  const handleWheel = useCallback((e) => {
    if (isEditing) return;

    // Check if this is a horizontal swipe gesture (trackpad)
    // Trackpad swipes have wheelDeltaX and are typically larger values
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2 && Math.abs(e.deltaX) > 10) {
      wheelAccumulator.current.x += e.deltaX;

      // Clear any existing timeout
      if (wheelAccumulator.current.timeout) {
        clearTimeout(wheelAccumulator.current.timeout);
      }

      // Set a timeout to process the accumulated scroll
      wheelAccumulator.current.timeout = setTimeout(() => {
        const totalDeltaX = wheelAccumulator.current.x;

        // Threshold for triggering navigation (adjust as needed)
        const swipeThreshold = 100;

        if (totalDeltaX < -swipeThreshold && canNavigateBack) {
          // Swipe right = go back
          onNavigateBack?.();
        } else if (totalDeltaX > swipeThreshold && canNavigateForward) {
          // Swipe left = go forward
          onNavigateForward?.();
        }

        // Reset accumulator
        wheelAccumulator.current.x = 0;
      }, 100);
    }
  }, [isEditing, canNavigateBack, canNavigateForward, onNavigateBack, onNavigateForward]);

  // Reset to view mode and load data when person changes
  useEffect(() => {
    setIsEditing(false);
    if (person) {
      setTitle(person.title || '');
      setFirstName(person.firstName || '');
      setMiddleName(person.middleName || '');
      setLastName(person.lastName || '');
      setMaidenName(person.maidenName || '');
      setNickname(person.nickname || '');
      setGender(person.gender || '');
      setBirthDate(person.birthDate || { type: 'exact' });
      setDeathDate(person.deathDate || { type: 'unknown' });
      setBirthPlace(person.birthPlace || '');
      setBirthPlaceId(person.birthPlaceId || null);
      setBirthEventId(person.birthEventId || null);
      setDeathPlace(person.deathPlace || '');
      setDeathPlaceId(person.deathPlaceId || null);
      setDeathEventId(person.deathEventId || null);
      setColorIndex(person.colorIndex ?? 0);
      setPersonSources(person.sources || []);
      setBirthSources(person.birthSources || []);
      setDeathSources(person.deathSources || []);
      setEvents(person.events || []);

      // Load existing unions for this person
      const personUnions = existingUnions
        .filter(u => u.partner1Id === person.id || u.partner2Id === person.id)
        .map(u => ({
          ...u,
          // Normalize so partnerId is always the "other" person
          partnerId: u.partner1Id === person.id ? u.partner2Id : u.partner1Id,
          isExisting: true
        }));
      setUnions(personUnions);

      const hasBirthData = person.birthDate?.type !== 'unknown' || person.birthPlace;
      const hasDeathData = person.deathDate?.type !== 'unknown' || person.deathPlace;
      setBirthExpanded(!hasBirthData);
      setDeathExpanded(!hasDeathData);

      // Find and set parents
      const parentIds = getParentIds({ people: allPeople, unions: existingUnions }, person.id);
      const parentPeople = parentIds.map(id => allPeople.find(p => p.id === id)).filter(Boolean);
      const father = parentPeople.find(p => p.gender === 'male');
      const mother = parentPeople.find(p => p.gender === 'female');
      setSelectedFatherId(father?.id || '');
      setSelectedMotherId(mother?.id || '');
    }
  }, [person?.id, person?.events, person?.birthDate, person?.deathDate]); // Reset when person data changes

  // Update unions when existingUnions changes (but don't reset edit mode)
  useEffect(() => {
    if (person && !isEditing) {
      const personUnions = existingUnions
        .filter(u => u.partner1Id === person.id || u.partner2Id === person.id)
        .map(u => ({
          ...u,
          partnerId: u.partner1Id === person.id ? u.partner2Id : u.partner1Id,
          isExisting: true
        }));
      setUnions(personUnions);
    }
  }, [existingUnions, person?.id, isEditing]);

  // Focus first input when entering edit mode
  useEffect(() => {
    if (isEditing && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isEditing]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();

    const name = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const dates = formatDatesDisplay(birthDate, deathDate);

    // Convert unions back to proper format and notify parent
    if (onUnionsChange && person) {
      const updatedUnions = unions
        .filter(u => u.partnerId) // Only include unions with a partner selected
        .map(u => ({
          id: u.id || `union-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          partner1Id: person.id,
          partner2Id: u.partnerId,
          type: u.type || 'marriage',
          startDate: u.startDate,
          startPlace: u.startPlace || '',
          endDate: u.endDate,
          endReason: u.endReason || '',
          childIds: u.childIds || [],
          sources: u.sources || []
        }));
      onUnionsChange(updatedUnions);
    }

    // Notify about parent changes
    if (onParentsChange && person) {
      onParentsChange({
        personId: person.id,
        fatherId: selectedFatherId || null,
        motherId: selectedMotherId || null
      });
    }

    onSave({
      name,
      title,
      firstName,
      middleName,
      lastName,
      maidenName,
      nickname,
      gender,
      birthDate,
      deathDate,
      birthPlace,
      birthPlaceId,
      deathPlace,
      deathPlaceId,
      dates,
      colorIndex,
      sources: personSources,
      birthSources,
      deathSources,
      events,
    });

    setIsEditing(false);
  }, [title, firstName, middleName, lastName, maidenName, nickname, gender, birthDate, deathDate, birthPlace, birthPlaceId, deathPlace, deathPlaceId, colorIndex, personSources, birthSources, deathSources, events, unions, person, onSave, onUnionsChange, selectedFatherId, selectedMotherId, onParentsChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If new parent dialog is open, handle its shortcuts
      if (showNewParentDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowNewParentDialog(null);
        }
        if (e.key === 'Enter' && (newParentFirstName || newParentLastName)) {
          e.preventDefault();
          const gender = showNewParentDialog === 'father' ? 'male' : 'female';
          const newId = onCreatePerson?.({
            firstName: newParentFirstName,
            lastName: newParentLastName,
            gender
          });
          if (newId) {
            if (showNewParentDialog === 'father') {
              setSelectedFatherId(newId);
            } else {
              setSelectedMotherId(newId);
            }
          }
          setShowNewParentDialog(null);
        }
        return; // Don't process other shortcuts when dialog is open
      }

      // If new family member dialog is open, handle its shortcuts
      if (showNewFamilyDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowNewFamilyDialog(null);
        }
        if (e.key === 'Enter' && (newFamilyFirstName || newFamilyLastName)) {
          e.preventDefault();
          const newId = onCreatePerson?.({
            firstName: newFamilyFirstName,
            lastName: newFamilyLastName,
            gender: newFamilyGender || ''
          });
          if (newId && person) {
            let updatedUnions;
            if (showNewFamilyDialog.type === 'child') {
              const unionId = showNewFamilyDialog.unionId;
              updatedUnions = unions.map(u =>
                u.id === unionId
                  ? { ...u, childIds: [...(u.childIds || []), newId] }
                  : u
              );
            } else if (showNewFamilyDialog.type === 'partner') {
              const newUnion = {
                id: `union-new-${Date.now()}`,
                partnerId: newId,
                type: 'marriage',
                startDate: { type: 'unknown' },
                startPlace: '',
                endDate: null,
                endReason: '',
                childIds: [],
                sources: [],
                isNew: true
              };
              updatedUnions = [...unions, newUnion];
            }

            if (updatedUnions) {
              setUnions(updatedUnions);
              // Save immediately
              if (onUnionsChange) {
                const formattedUnions = updatedUnions
                  .filter(u => u.partnerId)
                  .map(u => ({
                    id: u.id || `union-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    partner1Id: person.id,
                    partner2Id: u.partnerId,
                    type: u.type || 'marriage',
                    startDate: u.startDate,
                    startPlace: u.startPlace || '',
                    endDate: u.endDate,
                    endReason: u.endReason || '',
                    childIds: u.childIds || [],
                    sources: u.sources || []
                  }));
                onUnionsChange(formattedUnions);
              }
            }
          }
          setShowNewFamilyDialog(null);
        }
        return; // Don't process other shortcuts when dialog is open
      }

      // Navigate back: Alt+Left or Cmd+[
      if (canNavigateBack && !isEditing) {
        if ((e.altKey && e.key === 'ArrowLeft') || ((e.ctrlKey || e.metaKey) && e.key === '[')) {
          e.preventDefault();
          onNavigateBack?.();
          return;
        }
      }

      // Cmd+E to toggle edit mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (isEditing) {
          handleSubmit(e);
        } else {
          setIsEditing(true);
        }
        return;
      }

      if (isEditing) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit(e);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditing(false);
          // Reload person data to discard changes
          if (person) {
            setTitle(person.title || '');
            setFirstName(person.firstName || '');
            setMiddleName(person.middleName || '');
            setLastName(person.lastName || '');
            setMaidenName(person.maidenName || '');
            setNickname(person.nickname || '');
            setGender(person.gender || '');
            setBirthDate(person.birthDate || { type: 'exact' });
            setDeathDate(person.deathDate || { type: 'unknown' });
            setBirthPlace(person.birthPlace || '');
            setBirthPlaceId(person.birthPlaceId || null);
            setDeathPlace(person.deathPlace || '');
            setDeathPlaceId(person.deathPlaceId || null);
            setColorIndex(person.colorIndex ?? 0);
            setPersonSources(person.sources || []);
            setBirthSources(person.birthSources || []);
            setDeathSources(person.deathSources || []);
            setEvents(person.events || []);
            const personUnions = existingUnions
              .filter(u => u.partner1Id === person.id || u.partner2Id === person.id)
              .map(u => ({
                ...u,
                partnerId: u.partner1Id === person.id ? u.partner2Id : u.partner1Id,
                isExisting: true
              }));
            setUnions(personUnions);
          }
        }
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const form = e.target.closest('form');
          if (form) {
            const focusable = Array.from(form.querySelectorAll('input, select, textarea, button'));
            const currentIndex = focusable.indexOf(e.target);
            if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
              focusable[currentIndex + 1].focus();
            }
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
          e.preventDefault();
          const genders = ['male', 'female', 'other'];
          setGender(genders[parseInt(e.key) - 1]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isEditing, person, existingUnions, showNewParentDialog, newParentFirstName, newParentLastName, onCreatePerson, showNewFamilyDialog, newFamilyFirstName, newFamilyLastName, newFamilyGender, unions, onUnionsChange, canNavigateBack, onNavigateBack]);

  const formatDatesDisplay = (birth, death) => {
    let birthStr = formatSingleDate(birth);
    let deathStr = formatSingleDate(death);

    if (birthStr && deathStr) {
      return `${birthStr} - ${deathStr}`;
    } else if (birthStr) {
      return `b. ${birthStr}`;
    } else if (deathStr) {
      return `d. ${deathStr}`;
    }
    return '';
  };

  const formatSingleDate = (date) => {
    if (!date || date.type === 'unknown') return '';
    if (date.type === 'alive') return '';
    if (date.type === 'unknown_acknowledged') return '?';
    if (date.type === 'approximate') {
      return `c. ${date.year}`;
    }
    const parts = [];
    if (date.day) parts.push(date.day);
    if (date.month) parts.push(MONTHS[parseInt(date.month) - 1]?.substring(0, 3));
    if (date.year) parts.push(date.year);
    return parts.join(' ');
  };

  if (!person) {
    return (
      <div className="person-view person-view-empty">
        <div className="person-view-placeholder">
          <p>Select a person to view</p>
        </div>
      </div>
    );
  }

  const displayName = [title, firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unknown';
  const fullDates = formatDatesDisplay(birthDate, deathDate);

  // Find parents
  const parents = useMemo(() => {
    if (!person) return { father: null, mother: null };
    // Need to pass both people and unions for getParentIds to work
    const parentIds = getParentIds({ people: allPeople, unions: existingUnions }, person.id);
    const parentPeople = parentIds.map(id => allPeople.find(p => p.id === id)).filter(Boolean);

    // Sort by gender: male (father) first, female (mother) second
    const father = parentPeople.find(p => p.gender === 'male');
    const mother = parentPeople.find(p => p.gender === 'female');

    // If genders aren't set, just use order
    if (!father && !mother && parentPeople.length >= 2) {
      return { father: parentPeople[0], mother: parentPeople[1] };
    }
    if (!father && !mother && parentPeople.length === 1) {
      return { father: parentPeople[0], mother: null };
    }

    return { father, mother };
  }, [person?.id, existingUnions, allPeople]);

  // Get all descendants to prevent circular parent relationships
  const descendantIds = useMemo(() => {
    if (!person) return new Set();
    const data = { people: allPeople, unions: existingUnions };
    return new Set(getAllDescendantIds(data, person.id));
  }, [person?.id, existingUnions, allPeople]);

  // Get family data (spouses and children)
  const familyData = useMemo(() => {
    if (!person) return [];

    // Find all unions involving this person
    const personUnions = existingUnions.filter(
      u => u.partner1Id === person.id || u.partner2Id === person.id
    );

    return personUnions.map(union => {
      const partnerId = union.partner1Id === person.id ? union.partner2Id : union.partner1Id;
      const partner = allPeople.find(p => p.id === partnerId);
      const children = (union.childIds || [])
        .map(id => allPeople.find(p => p.id === id))
        .filter(Boolean);

      return {
        union,
        partner,
        children
      };
    });
  }, [person?.id, existingUnions, allPeople]);

  // Helper to calculate age at event
  const calculateAge = (birthDateObj, eventDateObj) => {
    if (!birthDateObj?.year || !eventDateObj?.year) return null;
    const birthYear = parseInt(birthDateObj.year);
    const eventYear = parseInt(eventDateObj.year);
    const birthMonth = birthDateObj.month ? parseInt(birthDateObj.month) : 1;
    const eventMonth = eventDateObj.month ? parseInt(eventDateObj.month) : 1;
    const birthDay = birthDateObj.day ? parseInt(birthDateObj.day) : 1;
    const eventDay = eventDateObj.day ? parseInt(eventDateObj.day) : 1;

    let years = eventYear - birthYear;
    let months = eventMonth - birthMonth;
    let days = eventDay - birthDay;

    if (days < 0) {
      months--;
      days += 30;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0) {
      if (months === 0) return `${days}d`;
      return `${months}m ${days}d`;
    }
    if (years < 2) {
      return `${years}y ${months}m`;
    }
    return `${years}y`;
  };

  // Build unified event list for timeline
  const allEvents = useMemo(() => {
    const eventList = [];

    // Birth
    if (birthDate && birthDate.type !== 'unknown') {
      eventList.push({
        id: 'birth',
        type: 'birth',
        label: 'Birth',
        date: birthDate,
        place: birthPlace,
        eventId: birthEventId,
      });
    }

    // Other events (baptism, etc.)
    events.forEach(event => {
      const eventType = EVENT_TYPES.find(t => t.value === event.type);
      eventList.push({
        id: event.id,
        type: event.type,
        label: eventType?.label || event.type,
        date: event.date,
        place: event.place,
        eventId: event.id,
        age: calculateAge(birthDate, event.date),
      });
    });

    // Unions/Marriages
    unions.forEach(union => {
      const partner = allPeople.find(p => p.id === union.partnerId);
      eventList.push({
        id: union.id,
        type: 'marriage',
        label: UNION_TYPES.find(t => t.value === union.type)?.label || 'Union',
        date: union.startDate,
        place: union.startPlace,
        partner,
        age: calculateAge(birthDate, union.startDate),
      });
    });

    // Death
    if (deathDate && deathDate.type !== 'unknown' && deathDate.type !== 'alive') {
      eventList.push({
        id: 'death',
        type: 'death',
        label: 'Death',
        date: deathDate,
        place: deathPlace,
        eventId: deathEventId,
        age: calculateAge(birthDate, deathDate),
      });
    }

    // Sort by date
    return eventList.sort((a, b) => {
      if (!a.date?.year) return 1;
      if (!b.date?.year) return -1;
      const yearDiff = parseInt(a.date.year) - parseInt(b.date.year);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = (parseInt(a.date.month) || 0) - (parseInt(b.date.month) || 0);
      if (monthDiff !== 0) return monthDiff;
      return (parseInt(a.date.day) || 0) - (parseInt(b.date.day) || 0);
    });
  }, [birthDate, birthPlace, birthEventId, deathDate, deathPlace, deathEventId, events, unions, allPeople]);

  // Count total children
  const totalChildren = familyData.reduce((acc, f) => acc + f.children.length, 0);

  // Read-only summary view - NEW CARD-BASED LAYOUT
  if (!isEditing) {
    return (
      <div
        className="person-view-new"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Header */}
        <div className="pv-header">
          <div className="pv-header-inner">
            {/* Main Info: Photo + Name + Parents + Actions */}
            <div className="pv-main-info">
              {canNavigateBack && (
                <button
                  type="button"
                  className="btn-back"
                  onClick={onNavigateBack}
                  title="Go back"
                  style={{ marginRight: 8 }}
                >
                  ←
                </button>
              )}
              <PersonPhoto personId={person?.id} width={70} height={90} onClick={setPortraitMedia} />
              <div className="pv-name-section">
                <h1 className="pv-name">
                  {displayName}
                  {nickname && <span style={{ fontWeight: 400, fontSize: '0.7em', marginLeft: 12, color: 'var(--color-textMuted)' }}>"{nickname}"</span>}
                </h1>
                <div className="pv-dates">{fullDates}</div>
                {totalChildren > 0 && (
                  <div className="pv-children-count">{totalChildren} Children</div>
                )}
              </div>

              {/* Parents inline */}
              <div className="pv-parents-inline">
                {parents.father ? (
                  <button
                    type="button"
                    className="pv-parent-card father has-person-tooltip"
                    onClick={() => onSelectPerson?.(parents.father.id)}
                    title={[parents.father.firstName, parents.father.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  >
                    <PersonPhoto personId={parents.father.id} width={28} height={28} className="person-photo-round" />
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Father</span>
                      <span className="pv-parent-name">
                        {[parents.father.firstName, parents.father.lastName].filter(Boolean).join(' ') || 'Unknown'}
                      </span>
                    </div>
                    <PersonTooltip
                      person={parents.father}
                      spouses={parents.mother ? [parents.mother] : []}
                      position="below"
                    />
                  </button>
                ) : (
                  <div className="pv-parent-card father">
                    <div className="pv-parent-photo" />
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Father</span>
                      <span className="pv-parent-name">Unknown</span>
                    </div>
                  </div>
                )}

                {parents.mother ? (
                  <button
                    type="button"
                    className="pv-parent-card mother has-person-tooltip"
                    onClick={() => onSelectPerson?.(parents.mother.id)}
                    title={[parents.mother.firstName, parents.mother.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  >
                    <PersonPhoto personId={parents.mother.id} width={28} height={28} className="person-photo-round" />
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Mother</span>
                      <span className="pv-parent-name">
                        {[parents.mother.firstName, parents.mother.lastName].filter(Boolean).join(' ') || 'Unknown'}
                      </span>
                    </div>
                    <PersonTooltip
                      person={parents.mother}
                      spouses={parents.father ? [parents.father] : []}
                      position="below"
                    />
                  </button>
                ) : (
                  <div className="pv-parent-card mother">
                    <div className="pv-parent-photo" />
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Mother</span>
                      <span className="pv-parent-name">Unknown</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pv-header-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit <KeyHint>⌘E</KeyHint>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Column Grid */}
        <div className="pv-content">
          <div className="pv-content-inner">
            <div className="pv-grid">
              {/* Left Column - Events Timeline */}
              <div className="pv-column-left">
                <div className="pv-card">
                  <div className="pv-card-header">
                    <span className="pv-card-icon">★</span>
                    <span className="pv-card-title">Events</span>
                    <span className="pv-card-count">({allEvents.length})</span>
                  </div>
                  <div className="pv-card-body">
                    {allEvents.length > 0 ? (
                      <div className="pv-events-list">
                        {allEvents.map((event, index) => (
                          <div key={event.id} className="pv-event">
                            <div className={`pv-event-icon ${event.type}`}>
                              {EVENT_ICONS[event.type] || '●'}
                            </div>
                            <div className="pv-event-content">
                              <div className="pv-event-header">
                                <span className="pv-event-type">{event.label}</span>
                                {event.date && event.date.type !== 'unknown' && (
                                  <span className="pv-event-date">
                                    {event.date.display || formatSingleDate(event.date)}
                                  </span>
                                )}
                                {event.age && (
                                  <span className="pv-event-age">~{event.age}</span>
                                )}
                              </div>
                              {event.place && (
                                <div className="pv-event-place">
                                  <span className="pv-event-place-icon">📍</span>
                                  {event.place}
                                </div>
                              )}
                              {event.partner && (
                                <div className="pv-event-partner">
                                  <span className="pv-event-partner-photo" />
                                  {[event.partner.firstName, event.partner.lastName].filter(Boolean).join(' ')}
                                </div>
                              )}
                              {event.eventId && <EventMedia eventId={event.eventId} />}
                              {event.eventId && (
                                <div className="pv-event-notes">
                                  <NotesSection
                                    entityType="event"
                                    entityId={event.eventId}
                                    compact
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pv-empty">No events recorded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Column - Media & Family */}
              <div className="pv-column-center">
                {/* Media Cards (Photos, Documents, etc.) - accepts drops from library */}
                <MediaDropZone
                  personId={person?.id}
                  onMediaLinked={() => triggerRefresh?.()}
                  className="media-section-drop-zone"
                  label="Drop to link media"
                >
                  <MediaGallery
                    personId={person?.id}
                    mediaCitations={mediaCitations}
                    onAddCitation={(mediaId) => {
                      setCitationTarget({ type: 'media', mediaId });
                      setCitationDialogOpen(true);
                    }}
                    onEditCitation={(citation) => {
                      setEditingCitation(citation);
                      setCitationTarget({ type: 'media', mediaId: citation.media_id });
                      setCitationDialogOpen(true);
                    }}
                    onDeleteCitation={(citationId) => onDeleteCitation?.(citationId)}
                    dbSources={dbSources}
                  />
                </MediaDropZone>

                {/* Notes Card */}
                <div className="pv-card" style={{ marginTop: 20 }}>
                  <div className="pv-card-header">
                    <span className="pv-card-icon">📝</span>
                    <span className="pv-card-title">Notes</span>
                    <button
                      className="pv-card-add-btn"
                      onClick={() => setNoteAddTrigger(prev => !prev)}
                      title="Add Note"
                    >
                      +
                    </button>
                  </div>
                  <div className="pv-card-body">
                    <NotesSection
                      entityType="person"
                      entityId={person?.id}
                      showAddButton={false}
                      externalAddTrigger={noteAddTrigger}
                      onAddingChange={(adding) => {
                        if (!adding) setNoteAddTrigger(false);
                      }}
                    />
                  </div>
                </div>

                {/* Family Cards - One per union/spouse */}
                {familyData.map(({ union, partner, children }, idx) => {
                  const partnerName = partner
                    ? [partner.firstName, partner.lastName].filter(Boolean).join(' ')
                    : 'Unknown Partner';

                  return (
                    <div key={union.id} className="pv-card pv-family-card" style={{ marginTop: idx === 0 ? 20 : 12 }}>
                      <div
                        className={`pv-card-header pv-family-header has-person-tooltip ${partner?.gender || ''}`}
                        style={{ cursor: partner ? 'pointer' : 'default' }}
                      >
                        <div
                          className="pv-family-header-clickable"
                          onClick={() => partner && onSelectPerson?.(partner.id)}
                        >
                          {partner ? (
                            <PersonPhoto personId={partner.id} width={28} height={28} className="pv-family-header-photo" />
                          ) : (
                            <span className="pv-card-icon">💑</span>
                          )}
                          <span className="pv-card-title">{partnerName}</span>
                          <span className="pv-card-count">
                            {children.length > 0 && `${children.length} child${children.length > 1 ? 'ren' : ''}`}
                          </span>
                          {partner && (
                            <PersonTooltip person={partner} position="below" />
                          )}
                        </div>
                        <button
                          className="pv-card-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewFamilyFirstName('');
                            setNewFamilyLastName(lastName || '');
                            setNewFamilyGender('');
                            setSelectedExistingChildId('');
                            setShowNewFamilyDialog({ type: 'child', unionId: union.id });
                          }}
                          title="Add Child"
                        >
                          +
                        </button>
                      </div>
                      {children.length > 0 && (
                        <div className="pv-card-body pv-family-body">
                          {children.map(child => {
                            const childName = [child.firstName, child.lastName].filter(Boolean).join(' ');

                            return (
                              <div
                                key={child.id}
                                className={`pv-family-member pv-family-child has-person-tooltip ${child.gender || ''}`}
                                onClick={() => onSelectPerson?.(child.id)}
                              >
                                <PersonPhoto personId={child.id} width={32} height={32} className="pv-family-member-photo" />
                                <div className="pv-family-member-info">
                                  <span className="pv-family-member-name">{childName}</span>
                                  {(child.birthDate?.year || child.deathDate?.year) && (
                                    <span className="pv-family-member-dates">
                                      {child.birthDate?.year && `☆ ${child.birthDate.year}`}
                                      {child.deathDate?.year && ` † ${child.deathDate.year}`}
                                    </span>
                                  )}
                                </div>
                                <PersonTooltip person={child} position="below" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Union Notes */}
                      <div className="pv-family-notes">
                        <NotesSection
                          entityType="union"
                          entityId={union.id}
                          compact
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column - Sources */}
              <div className="pv-column-right">
                {/* Info Card */}
                <div className="pv-card">
                  <div className="pv-card-header">
                    <span className="pv-card-icon">ℹ️</span>
                    <span className="pv-card-title">Info</span>
                  </div>
                  <div className="pv-card-body">
                    <div className="pv-info-row">
                      <span className="pv-info-label">Gender</span>
                      <span className="pv-info-value">{gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown'}</span>
                    </div>
                    {maidenName && (
                      <div className="pv-info-row">
                        <span className="pv-info-label">Maiden Name</span>
                        <span className="pv-info-value">{maidenName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sources Card */}
                {personSources.length > 0 && (
                  <div className="pv-card" style={{ marginTop: 12 }}>
                    <div className="pv-card-header">
                      <span className="pv-card-icon">📚</span>
                      <span className="pv-card-title">Sources</span>
                      <span className="pv-card-count">({personSources.length})</span>
                    </div>
                    <div className="pv-card-body">
                      {personSources.map((source, idx) => (
                        <div key={idx} className="pv-source-item">
                          <div className="pv-source-title">{source.title || 'Untitled Source'}</div>
                          {source.page && <div className="pv-source-detail">Page: {source.page}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Family Bar */}
        {familyData.length > 0 && (
          <div className="pv-family-bar">
            <div className="pv-family-bar-inner">
              <div className="pv-family-bar-section">
                <span className="pv-family-bar-label">Children</span>
                <div className="pv-family-bar-members">
                  {familyData.flatMap(({ union, partner, children }) =>
                    children.map(child => (
                      <button
                        key={child.id}
                        type="button"
                        className={`pv-family-chip has-person-tooltip ${child.gender || ''}`}
                        onClick={() => onSelectPerson?.(child.id)}
                        title={[child.firstName, child.lastName].filter(Boolean).join(' ')}
                      >
                        <PersonPhoto personId={child.id} width={28} height={28} className="person-photo-round" />
                        <div className="pv-family-chip-info">
                          <span className="pv-family-chip-name">
                            {[child.firstName, child.lastName].filter(Boolean).join(' ')}
                          </span>
                          <span className="pv-family-chip-dates">
                            {child.birthDate?.year && `☆ ${child.birthDate.year}`}
                            {child.deathDate?.year && ` † ${child.deathDate.year}`}
                          </span>
                        </div>
                        <PersonTooltip person={child} position="above" />
                      </button>
                    ))
                  )}
                  {totalChildren === 0 && (
                    <span style={{ color: 'var(--color-textMuted)', fontSize: 13 }}>No children</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Citation Dialog - also needed in view mode for media citations */}
        <CitationDialog
          isOpen={citationDialogOpen}
          onClose={() => {
            setCitationDialogOpen(false);
            setEditingCitation(null);
            setCitationTarget(null);
          }}
          onSave={(citationData) => {
            if (editingCitation) {
              onUpdateCitation?.(editingCitation.id, citationData);
            } else {
              onCreateCitation?.({
                ...citationData,
                person_id: citationTarget?.personId,
                event_id: citationTarget?.eventId,
                union_id: citationTarget?.unionId,
                media_id: citationTarget?.mediaId
              });
            }
            setCitationDialogOpen(false);
            setEditingCitation(null);
            setCitationTarget(null);
          }}
          initialData={editingCitation}
          sources={dbSources}
          targetType={citationTarget?.type}
        />

        {portraitMedia && (
          <PhotoViewer
            mediaId={portraitMedia.id}
            imageSrc={portraitMedia.fullPath}
            mediaPath={portraitMedia.path}
            onClose={() => setPortraitMedia(null)}
          />
        )}

        {/* New Family Member Dialog (Child) - View Mode */}
        {showNewFamilyDialog && (
          <div className="dialog-overlay" onClick={() => setShowNewFamilyDialog(null)} onWheel={e => e.stopPropagation()}>
            <div className="dialog new-parent-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>Add Child</h3>
              </div>
              <div className="dialog-body">
                {/* Select existing person */}
                <div className="form-group">
                  <label className="field-label">Select Existing Person</label>
                  <PersonPicker
                    value={selectedExistingChildId}
                    people={allPeople}
                    onChange={(personId) => {
                      setSelectedExistingChildId(personId || '');
                      if (personId) {
                        setNewFamilyFirstName('');
                        setNewFamilyLastName('');
                        setNewFamilyGender('');
                      }
                    }}
                    placeholder="Search for existing person..."
                    excludeIds={[
                      person?.id,
                      ...(familyData.find(f => f.union.id === showNewFamilyDialog.unionId)?.children.map(c => c.id) || [])
                    ].filter(Boolean)}
                  />
                </div>

                {/* Divider */}
                {!selectedExistingChildId && (
                  <div style={{ textAlign: 'center', color: 'var(--color-textMuted)', margin: '12px 0', fontSize: '12px' }}>
                    — or create new person —
                  </div>
                )}

                {/* New person fields */}
                {!selectedExistingChildId && (
                  <>
                    <div className="form-group">
                      <label className="field-label">First Name</label>
                      <input
                        type="text"
                        value={newFamilyFirstName}
                        onChange={(e) => setNewFamilyFirstName(e.target.value)}
                        className="text-input"
                        placeholder="First name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="field-label">Last Name</label>
                      <input
                        type="text"
                        value={newFamilyLastName}
                        onChange={(e) => setNewFamilyLastName(e.target.value)}
                        className="text-input"
                        placeholder="Last name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="field-label">Gender</label>
                      <ToggleGroup
                        options={[
                          { value: 'male', label: 'Male', className: 'gender-male' },
                          { value: 'female', label: 'Female', className: 'gender-female' },
                          { value: 'other', label: 'Other' },
                        ]}
                        value={newFamilyGender}
                        onChange={setNewFamilyGender}
                        name="new-family-gender-view"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="dialog-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewFamilyDialog(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    let childIdToAdd = null;

                    if (selectedExistingChildId) {
                      childIdToAdd = selectedExistingChildId;
                    } else if (onCreatePerson && (newFamilyFirstName || newFamilyLastName)) {
                      childIdToAdd = onCreatePerson({
                        firstName: newFamilyFirstName,
                        lastName: newFamilyLastName,
                        gender: newFamilyGender || ''
                      });
                    }

                    if (childIdToAdd && person && showNewFamilyDialog.unionId) {
                      const unionId = showNewFamilyDialog.unionId;
                      const updatedUnions = unions.map(u =>
                        u.id === unionId
                          ? { ...u, childIds: [...(u.childIds || []), childIdToAdd] }
                          : u
                      );
                      setUnions(updatedUnions);
                      if (onUnionsChange) {
                        const formattedUnions = updatedUnions
                          .filter(u => u.partnerId)
                          .map(u => ({
                            id: u.id,
                            partner1Id: person.id,
                            partner2Id: u.partnerId,
                            type: u.type || 'marriage',
                            startDate: u.startDate,
                            startPlace: u.startPlace || '',
                            endDate: u.endDate,
                            endReason: u.endReason || '',
                            childIds: u.childIds || [],
                            sources: u.sources || []
                          }));
                        onUnionsChange(formattedUnions);
                      }
                    }
                    setShowNewFamilyDialog(null);
                  }}
                  disabled={!selectedExistingChildId && !newFamilyFirstName && !newFamilyLastName}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div
      className="person-view person-view-editing"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div className="person-view-header">
        <div className="person-view-header-left">
          {canNavigateBack && (
            <button
              type="button"
              className="btn-back"
              onClick={onNavigateBack}
              title="Go back"
            >
              ←
            </button>
          )}
          <h2>{displayName || 'New Person'}</h2>
        </div>
        <div className="person-view-shortcuts">
          <span><KeyHint>Esc</KeyHint> Cancel</span>
          <span><KeyHint>⌘↵</KeyHint> Save</span>
        </div>
      </div>

      <div className="person-view-parents person-view-parents-fixed person-view-parents-edit">
        <div className="parent-card-container">
          <div className="parent-card-edit">
            <span className="parent-label">Father</span>
            <div className="parent-picker-row">
              <PersonPicker
                value={selectedFatherId}
                people={allPeople}
                onChange={(personId) => setSelectedFatherId(personId || '')}
                placeholder="Search for father..."
                excludeIds={[person?.id, ...Array.from(descendantIds)].filter(Boolean)}
                filterFn={(p) => p.gender !== 'female'}
              />
              <button
                type="button"
                className="btn-create-parent"
                onClick={() => {
                  setNewParentFirstName('');
                  setNewParentLastName(lastName || '');
                  setShowNewParentDialog('father');
                }}
                title="Create new person"
              >
                +
              </button>
            </div>
          </div>

          <div className="parent-card-edit">
            <span className="parent-label">Mother</span>
            <div className="parent-picker-row">
              <PersonPicker
                value={selectedMotherId}
                people={allPeople}
                onChange={(personId) => setSelectedMotherId(personId || '')}
                placeholder="Search for mother..."
                excludeIds={[person?.id, ...Array.from(descendantIds)].filter(Boolean)}
                filterFn={(p) => p.gender !== 'male'}
              />
              <button
                type="button"
                className="btn-create-parent"
                onClick={() => {
                  setNewParentFirstName('');
                  setNewParentLastName('');
                  setShowNewParentDialog('mother');
                }}
                title="Create new person"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="person-view-form">
        <div className="edit-view-scrollable">
          <div className="edit-view-section">
            <h3 className="edit-view-section-title">Name</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">First Name</label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="text-input"
                  placeholder="First name"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-input"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="text-input"
                  placeholder="Middle name"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Maiden Name</label>
                <input
                  type="text"
                  value={maidenName}
                  onChange={(e) => setMaidenName(e.target.value)}
                  className="text-input"
                  placeholder="If applicable"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-input"
                  placeholder="Dr., Rev., Sir..."
                />
              </div>
              <div className="form-group">
                <label className="field-label">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="text-input"
                  placeholder="Known as..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Gender <span className="label-hint">(⌘1-3)</span></label>
                <ToggleGroup
                  options={[
                    { value: 'male', label: 'Male', className: 'gender-male' },
                    { value: 'female', label: 'Female', className: 'gender-female' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={gender}
                  onChange={setGender}
                  name="gender"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Card Color</label>
                <div className="color-picker" role="radiogroup">
                  {theme.colors.nodeColors.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={colorIndex === i}
                      aria-label={`Color ${i + 1}`}
                      className={`color-option ${colorIndex === i ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColorIndex(i)}
                      tabIndex={colorIndex === i ? 0 : -1}
                    >
                      {colorIndex === i && <span className="color-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Person Citations */}
            <div className="form-group person-sources-group">
              <label className="field-label">
                Citations
                {personCitations.length > 0 && ` [${personCitations.length}]`}
              </label>
              <CitationList
                citations={personCitations}
                onAdd={() => {
                  setCitationTarget({ type: 'person', personId: person?.id });
                  setEditingCitation(null);
                  setCitationDialogOpen(true);
                }}
                onEdit={(citation) => {
                  setCitationTarget({ type: 'person', personId: person?.id });
                  setEditingCitation(citation);
                  setCitationDialogOpen(true);
                }}
                onDelete={(citationId) => onDeleteCitation?.(citationId)}
                isEditing={true}
              />
            </div>
          </div>

          <MediaDropZone
            eventId={birthEventId}
            onMediaLinked={() => triggerRefresh?.()}
            className="section-drop-zone"
            label="Drop media to link to birth"
          >
            <div className="edit-view-section">
              <h3 className="edit-view-section-title">Birth</h3>
              <div className={`life-event-section ${birthExpanded ? 'expanded' : 'collapsed'}`}>
                <div
                  className="life-event-header"
                  onClick={() => {
                    const hasData = (birthDate && birthDate.type !== 'unknown') || birthPlace;
                    if (hasData) setBirthExpanded(!birthExpanded);
                  }}
                  style={{ cursor: (birthDate?.type !== 'unknown' || birthPlace) ? 'pointer' : 'default' }}
                >
                  <div className="life-event-header-left">
                    {(birthDate?.type !== 'unknown' || birthPlace) && (
                      <span className="event-chevron">{birthExpanded ? '▼' : '▶'}</span>
                    )}
                    {!birthExpanded && (
                      <span className="life-event-summary">
                        {[
                          birthDate?.type !== 'unknown' ? formatSingleDate(birthDate) : null,
                          birthPlace
                        ].filter(Boolean).join(' · ') || 'No details'}
                        {birthSources.length > 0 && ` [${birthSources.length}]`}
                      </span>
                    )}
                  </div>
                </div>
                {birthExpanded && (
                  <div className="life-event-fields">
                    <DateInput
                      label="Date"
                      value={birthDate}
                      onChange={setBirthDate}
                    />
                    <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                      <label className="field-label">Place</label>
                      <PlaceDropZone
                        value={birthPlace}
                        placeId={birthPlaceId}
                        places={places}
                        onChange={({ place, placeId }) => {
                          setBirthPlace(place);
                          setBirthPlaceId(placeId);
                        }}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                      <label className="field-label">Citations</label>
                      <CitationList
                        citations={birthCitations}
                        onAdd={() => {
                          setCitationTarget({ type: 'birth', eventId: birthEventId });
                          setEditingCitation(null);
                          setCitationDialogOpen(true);
                        }}
                        onEdit={(citation) => {
                          setCitationTarget({ type: 'birth', eventId: birthEventId });
                          setEditingCitation(citation);
                          setCitationDialogOpen(true);
                        }}
                        onDelete={(citationId) => onDeleteCitation?.(citationId)}
                        isEditing={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MediaDropZone>

          <MediaDropZone
            eventId={deathEventId}
            onMediaLinked={() => triggerRefresh?.()}
            className="section-drop-zone"
            label="Drop media to link to death"
          >
            <div className="edit-view-section">
              <h3 className="edit-view-section-title">{deathDate?.type === 'alive' ? 'Status' : 'Death'}</h3>
              <div className={`life-event-section ${deathExpanded ? 'expanded' : 'collapsed'}`}>
                <div
                  className="life-event-header"
                  onClick={() => {
                    const hasData = (deathDate && deathDate.type !== 'unknown') || deathPlace;
                    if (hasData) setDeathExpanded(!deathExpanded);
                  }}
                  style={{ cursor: (deathDate?.type !== 'unknown' || deathPlace) ? 'pointer' : 'default' }}
                >
                  <div className="life-event-header-left">
                    {(deathDate?.type !== 'unknown' || deathPlace) && (
                      <span className="event-chevron">{deathExpanded ? '▼' : '▶'}</span>
                    )}
                    {!deathExpanded && (
                      <span className="life-event-summary">
                        {deathDate?.type === 'alive'
                          ? 'Living'
                          : ([
                              deathDate?.type !== 'unknown' ? formatSingleDate(deathDate) : null,
                              deathPlace
                            ].filter(Boolean).join(' · ') || 'No details')
                        }
                        {deathSources.length > 0 && ` [${deathSources.length}]`}
                      </span>
                    )}
                  </div>
                </div>
                {deathExpanded && (
                  <div className="life-event-fields">
                    <DateInput
                      label="Date"
                      value={deathDate}
                      onChange={setDeathDate}
                    />
                    <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                      <label className="field-label">Place</label>
                      <PlaceDropZone
                        value={deathPlace}
                        placeId={deathPlaceId}
                        places={places}
                        onChange={({ place, placeId }) => {
                          setDeathPlace(place);
                          setDeathPlaceId(placeId);
                        }}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                      <label className="field-label">Citations</label>
                      <CitationList
                        citations={deathCitations}
                        onAdd={() => {
                          setCitationTarget({ type: 'death', eventId: deathEventId });
                          setEditingCitation(null);
                          setCitationDialogOpen(true);
                        }}
                        onEdit={(citation) => {
                          setCitationTarget({ type: 'death', eventId: deathEventId });
                          setEditingCitation(citation);
                          setCitationDialogOpen(true);
                        }}
                        onDelete={(citationId) => onDeleteCitation?.(citationId)}
                        isEditing={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MediaDropZone>

          <div className="edit-view-section">
            <h3 className="edit-view-section-title">Additional Events</h3>
            <div className="events-section">
              <div className="events-header">
                <div className="add-event-dropdown">
                  <select
                    className="add-event-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newEvent = {
                          id: Date.now().toString(),
                          type: e.target.value,
                          date: { type: 'unknown' },
                          place: '',
                          sources: [],
                        };
                        setEvents([...events, newEvent]);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Add Event...</option>
                    {EVENT_TYPES
                      .filter(type => {
                        const hasValidDate = (date) => date && date.type !== 'unknown';
                        const isDead = (date) => hasValidDate(date) && date.type !== 'alive';
                        if (type.requires === 'birth') {
                          return hasValidDate(birthDate);
                        }
                        if (type.requires === 'death') {
                          return isDead(deathDate);
                        }
                        return true;
                      })
                      .map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                  </select>
                </div>
              </div>
              {events.map((event, index) => {
                const eventType = EVENT_TYPES.find(t => t.value === event.type);
                const parentDate = eventType?.requires === 'birth' ? birthDate :
                                   eventType?.requires === 'death' ? deathDate : null;
                return (
                  <MediaDropZone
                    key={event.id}
                    eventId={event.id}
                    onMediaLinked={() => triggerRefresh?.()}
                    className="event-drop-zone"
                    label={`Drop media to link to ${eventType?.label || event.type}`}
                  >
                    <EventEntry
                      event={event}
                      parentDate={parentDate}
                      places={places}
                      onChange={(updated) => {
                        const newEvents = [...events];
                        newEvents[index] = updated;
                        setEvents(newEvents);
                      }}
                      onRemove={() => {
                        setEvents(events.filter((_, i) => i !== index));
                      }}
                      sources={sources}
                      onAddSource={onAddSource}
                      citations={eventCitations[event.id] || []}
                      onAddCitation={() => {
                        setCitationTarget({ type: 'event', eventId: event.id });
                        setEditingCitation(null);
                        setCitationDialogOpen(true);
                      }}
                      onEditCitation={(citation) => {
                        setCitationTarget({ type: 'event', eventId: event.id });
                        setEditingCitation(citation);
                        setCitationDialogOpen(true);
                      }}
                      onDeleteCitation={(citationId) => onDeleteCitation?.(citationId)}
                    />
                  </MediaDropZone>
                );
              })}
            </div>
          </div>

          <div className="edit-view-section">
            <h3 className="edit-view-section-title">Unions</h3>
            <div className="events-section">
              <div className="events-header">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                  onClick={() => {
                    const newUnion = {
                      id: `union-new-${Date.now()}`,
                      partnerId: '',
                      type: 'marriage',
                      startDate: { type: 'unknown' },
                      startPlace: '',
                      endDate: null,
                      endReason: '',
                      childIds: [],
                      sources: [],
                      isNew: true
                    };
                    setUnions([...unions, newUnion]);
                  }}
                >
                  + Add Union
                </button>
              </div>
              {unions.length === 0 && (
                <p style={{ color: 'var(--color-textMuted)', fontSize: '13px', marginTop: '8px' }}>
                  No unions recorded
                </p>
              )}
              {unions.map((union, index) => (
                <UnionEntry
                  key={union.id}
                  union={union}
                  allPeople={allPeople}
                  currentPersonId={person?.id}
                  sources={sources}
                  onAddSource={onAddSource}
                  onChange={(updated) => {
                    const newUnions = [...unions];
                    newUnions[index] = updated;
                    setUnions(newUnions);
                  }}
                  onRemove={() => {
                    setUnions(unions.filter((_, i) => i !== index));
                  }}
                  citations={unionCitations[union.id] || []}
                  onAddCitation={() => {
                    setCitationTarget({ type: 'union', unionId: union.id });
                    setEditingCitation(null);
                    setCitationDialogOpen(true);
                  }}
                  onEditCitation={(citation) => {
                    setCitationTarget({ type: 'union', unionId: union.id });
                    setEditingCitation(citation);
                    setCitationDialogOpen(true);
                  }}
                  onDeleteCitation={(citationId) => onDeleteCitation?.(citationId)}
                />
              ))}
            </div>
          </div>

        </div>

        <div className="person-view-footer">
          <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save <KeyHint>⌘↵</KeyHint>
          </button>
        </div>
      </form>

      {/* Family Panel - Spouses and Children (Edit Mode) */}
      <div className="family-panel">
        <button
          type="button"
          className="family-panel-toggle"
          onClick={() => setShowFamilyPanel(!showFamilyPanel)}
        >
          <span className="family-panel-toggle-icon">{showFamilyPanel ? '▼' : '▲'}</span>
          <span>Family ({familyData.reduce((acc, f) => acc + f.children.length, 0)} children)</span>
        </button>

        {showFamilyPanel && (
          <div className="family-panel-content">
            {familyData.map(({ union, partner, children }) => (
              <div key={union.id} className="family-row">
                <div className="family-partner">
                  {partner ? (
                    <button
                      type="button"
                      className={`family-person-card ${partner.gender === 'male' ? 'gender-male' : partner.gender === 'female' ? 'gender-female' : ''}`}
                      onClick={() => onSelectPerson?.(partner.id)}
                    >
                      {partner.image && (
                        <img src={partner.image} alt="" className="family-person-photo" />
                      )}
                      <div className="family-person-info">
                        <span className="family-person-name">
                          {[partner.firstName, partner.lastName].filter(Boolean).join(' ') || 'Unknown'}
                        </span>
                        <span className="family-person-dates">
                          {partner.birthDate?.year && `☆ ${partner.birthDate.year}`}
                          {partner.birthDate?.year && partner.deathDate?.year && ' '}
                          {partner.deathDate?.year && `† ${partner.deathDate.year}`}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="family-person-card family-person-unknown">
                      <span className="family-person-name">Unknown Partner</span>
                    </div>
                  )}
                  <span className="family-partner-label">Partner</span>
                </div>

                <div className="family-children-section">
                  <span className="family-children-label">Children</span>
                  <div className="family-children">
                    {children.map(child => (
                      <button
                        key={child.id}
                        type="button"
                        className={`family-person-card ${child.gender === 'male' ? 'gender-male' : child.gender === 'female' ? 'gender-female' : ''}`}
                        onClick={() => onSelectPerson?.(child.id)}
                      >
                        {child.image && (
                          <img src={child.image} alt="" className="family-person-photo" />
                        )}
                        <div className="family-person-info">
                          <span className="family-person-name">
                            {[child.firstName, child.lastName].filter(Boolean).join(' ') || 'Unknown'}
                          </span>
                          <span className="family-person-dates">
                            {child.birthDate?.year && `☆ ${child.birthDate.year}`}
                            {child.birthDate?.year && child.deathDate?.year && ' '}
                            {child.deathDate?.year && `† ${child.deathDate.year}`}
                          </span>
                        </div>
                      </button>
                    ))}
                    {/* Add Child button */}
                    <button
                      type="button"
                      className="family-person-card family-add-card"
                      onClick={() => {
                        setNewFamilyFirstName('');
                        setNewFamilyLastName(lastName || '');
                        setNewFamilyGender('');
                        setSelectedExistingChildId('');
                        setShowNewFamilyDialog({ type: 'child', unionId: union.id });
                      }}
                    >
                      <span className="family-add-icon">+</span>
                      <span className="family-add-label">Add Child</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Partner row */}
            <div className="family-row family-add-partner-row">
              <div className="family-partner">
                <button
                  type="button"
                  className="family-person-card family-add-card"
                  onClick={() => {
                    setNewFamilyFirstName('');
                    setNewFamilyLastName('');
                    setNewFamilyGender('');
                    setShowNewFamilyDialog({ type: 'partner' });
                  }}
                >
                  <span className="family-add-icon">+</span>
                  <span className="family-add-label">Add Partner</span>
                </button>
                <span className="family-partner-label">New Partner</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Parent Dialog */}
      {showNewParentDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewParentDialog(null)} onWheel={e => e.stopPropagation()}>
          <div className="dialog new-parent-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Add New {showNewParentDialog === 'father' ? 'Father' : 'Mother'}</h3>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="field-label">First Name</label>
                <input
                  type="text"
                  value={newParentFirstName}
                  onChange={(e) => setNewParentFirstName(e.target.value)}
                  className="text-input"
                  placeholder="First name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="field-label">Last Name</label>
                <input
                  type="text"
                  value={newParentLastName}
                  onChange={(e) => setNewParentLastName(e.target.value)}
                  className="text-input"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowNewParentDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (onCreatePerson && (newParentFirstName || newParentLastName)) {
                    const gender = showNewParentDialog === 'father' ? 'male' : 'female';
                    const newId = onCreatePerson({
                      firstName: newParentFirstName,
                      lastName: newParentLastName,
                      gender
                    });
                    if (newId) {
                      if (showNewParentDialog === 'father') {
                        setSelectedFatherId(newId);
                      } else {
                        setSelectedMotherId(newId);
                      }
                    }
                  }
                  setShowNewParentDialog(null);
                }}
                disabled={!newParentFirstName && !newParentLastName}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Family Member Dialog (Child or Partner) */}
      {showNewFamilyDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewFamilyDialog(null)} onWheel={e => e.stopPropagation()}>
          <div className="dialog new-parent-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Add {showNewFamilyDialog.type === 'child' ? 'Child' : 'Partner'}</h3>
            </div>
            <div className="dialog-body">
              {/* Select existing person (for child only) */}
              {showNewFamilyDialog.type === 'child' && (
                <div className="form-group">
                  <label className="field-label">Select Existing Person</label>
                  <PersonPicker
                    value={selectedExistingChildId}
                    people={allPeople}
                    onChange={(personId) => {
                      setSelectedExistingChildId(personId || '');
                      if (personId) {
                        // Clear the new person fields when selecting existing
                        setNewFamilyFirstName('');
                        setNewFamilyLastName('');
                        setNewFamilyGender('');
                      }
                    }}
                    placeholder="Search for existing person..."
                    excludeIds={[
                      person?.id,
                      ...(unions.find(u => u.id === showNewFamilyDialog.unionId)?.childIds || [])
                    ].filter(Boolean)}
                  />
                </div>
              )}

              {/* Divider when showing both options */}
              {showNewFamilyDialog.type === 'child' && !selectedExistingChildId && (
                <div style={{ textAlign: 'center', color: 'var(--color-textMuted)', margin: '12px 0', fontSize: '12px' }}>
                  — or create new person —
                </div>
              )}

              {/* New person fields (hidden when existing person selected for child) */}
              {(!selectedExistingChildId || showNewFamilyDialog.type !== 'child') && (
                <>
                  <div className="form-group">
                    <label className="field-label">First Name</label>
                    <input
                      type="text"
                      value={newFamilyFirstName}
                      onChange={(e) => setNewFamilyFirstName(e.target.value)}
                      className="text-input"
                      placeholder="First name"
                      autoFocus={showNewFamilyDialog.type !== 'child'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Last Name</label>
                    <input
                      type="text"
                      value={newFamilyLastName}
                      onChange={(e) => setNewFamilyLastName(e.target.value)}
                      className="text-input"
                      placeholder="Last name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Gender</label>
                    <ToggleGroup
                      options={[
                        { value: 'male', label: 'Male', className: 'gender-male' },
                        { value: 'female', label: 'Female', className: 'gender-female' },
                        { value: 'other', label: 'Other' },
                      ]}
                      value={newFamilyGender}
                      onChange={setNewFamilyGender}
                      name="new-family-gender"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowNewFamilyDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  let childIdToAdd = null;

                  // Check if we're adding an existing person as child
                  if (showNewFamilyDialog.type === 'child' && selectedExistingChildId) {
                    childIdToAdd = selectedExistingChildId;
                  } else if (onCreatePerson && (newFamilyFirstName || newFamilyLastName)) {
                    // Create new person
                    childIdToAdd = onCreatePerson({
                      firstName: newFamilyFirstName,
                      lastName: newFamilyLastName,
                      gender: newFamilyGender || ''
                    });
                  }

                  if (childIdToAdd && person) {
                    let updatedUnions;
                    if (showNewFamilyDialog.type === 'child') {
                      // Add child to the union
                      const unionId = showNewFamilyDialog.unionId;
                      updatedUnions = unions.map(u =>
                        u.id === unionId
                          ? { ...u, childIds: [...(u.childIds || []), childIdToAdd] }
                          : u
                      );
                    } else if (showNewFamilyDialog.type === 'partner') {
                      // Create a new union with this partner
                      const newUnion = {
                        id: `union-new-${Date.now()}`,
                        partnerId: childIdToAdd,
                        type: 'marriage',
                        startDate: { type: 'unknown' },
                        startPlace: '',
                        endDate: null,
                        endReason: '',
                        childIds: [],
                        sources: [],
                        isNew: true
                      };
                      updatedUnions = [...unions, newUnion];
                    }

                    if (updatedUnions) {
                      setUnions(updatedUnions);
                      // Save immediately
                      if (onUnionsChange) {
                        const formattedUnions = updatedUnions
                          .filter(u => u.partnerId)
                          .map(u => ({
                            id: u.id || `union-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            partner1Id: person.id,
                            partner2Id: u.partnerId,
                            type: u.type || 'marriage',
                            startDate: u.startDate,
                            startPlace: u.startPlace || '',
                            endDate: u.endDate,
                            endReason: u.endReason || '',
                            childIds: u.childIds || [],
                            sources: u.sources || []
                          }));
                        onUnionsChange(formattedUnions);
                      }
                    }
                  }
                  setShowNewFamilyDialog(null);
                }}
                disabled={!selectedExistingChildId && !newFamilyFirstName && !newFamilyLastName}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citation Dialog */}
      <CitationDialog
        isOpen={citationDialogOpen}
        onClose={() => {
          setCitationDialogOpen(false);
          setEditingCitation(null);
          setCitationTarget(null);
        }}
        onSave={(citationData) => {
          if (editingCitation) {
            onUpdateCitation?.(editingCitation.id, citationData);
          } else {
            onCreateCitation?.({
              ...citationData,
              person_id: citationTarget?.personId,
              event_id: citationTarget?.eventId,
              union_id: citationTarget?.unionId,
              media_id: citationTarget?.mediaId
            });
          }
          setCitationDialogOpen(false);
          setEditingCitation(null);
          setCitationTarget(null);
        }}
        initialData={editingCitation}
        sources={dbSources}
        targetType={citationTarget?.type}
      />

      {portraitMedia && (
        <PhotoViewer
          mediaId={portraitMedia.id}
          imageSrc={portraitMedia.fullPath}
          mediaPath={portraitMedia.path}
          onClose={() => setPortraitMedia(null)}
        />
      )}
    </div>
  );
}
