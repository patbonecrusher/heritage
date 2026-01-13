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
import Dialog from './Dialog/Dialog';
import { AttachGQEventDialog } from './AttachGQEventDialog/AttachGQEventDialog';
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

const PRIOR_STATUS = [
  { value: '', label: 'Unknown' },
  { value: 'single', label: 'Single' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
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

function DateInput({ label, value, onChange, parentDate, parentLabel = 'birth' }) {
  const [inputText, setInputText] = useState(() => value?.dateOffset || dateToInputString(value));
  const [parsed, setParsed] = useState(() => parseDateString(dateToInputString(value)));
  const isEditing = useRef(false);

  // Calculate date from offset string (e.g., +4d, +1w, +2m, +1y)
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

  useEffect(() => {
    if (!isEditing.current) {
      const text = value?.dateOffset || dateToInputString(value);
      setInputText(text);
      setParsed(parseDateString(dateToInputString(value)));
    }
  }, [value]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (text.startsWith('+') && parentDate) {
      const calculated = calculateDateFromOffset(text, parentDate);
      if (calculated) {
        setParsed(calculated);
        onChange({ ...calculated, dateOffset: text });
      } else {
        setParsed({ type: 'unknown', display: 'Invalid offset' });
        onChange({ type: 'unknown', dateOffset: text });
      }
    } else {
      const result = parseDateString(text);
      setParsed(result);
      onChange(result);
    }
  };

  const placeholder = parentDate
    ? `1850, Mar 1850, +4d (${parentLabel}+4 days)`
    : "1850, Mar 1850, 15 Mar 1850, 1850+-5, c.1850";

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
          placeholder={placeholder}
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
  onUnionsChange, onSelectPerson, onParentsChange, onCreatePerson, onRemoveChild, onNavigateBack, canNavigateBack,
  onNavigateForward, canNavigateForward, places = [], onCreatePlace,
  // Citation props
  personCitations = [], birthCitations = [], deathCitations = [], eventCitations = {}, unionCitations = {},
  mediaCitations = {},
  onCreateCitation, onUpdateCitation, onDeleteCitation, dbSources = [], onDelete
}) {
  const { theme } = useTheme();
  const { triggerRefresh, run, query, generateId } = useDatabase();

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
  const [birthCause, setBirthCause] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [deathPlaceId, setDeathPlaceId] = useState(null);
  const [deathEventId, setDeathEventId] = useState(null);
  const [deathCause, setDeathCause] = useState('');
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
  const [selectedExistingParentId, setSelectedExistingParentId] = useState(''); // For selecting existing person as parent
  const [showFamilyPanel, setShowFamilyPanel] = useState(true);
  const [showNewFamilyDialog, setShowNewFamilyDialog] = useState(null); // { type: 'child', unionId } or { type: 'partner' }
  const [newFamilyFirstName, setNewFamilyFirstName] = useState('');
  const [newFamilyLastName, setNewFamilyLastName] = useState('');
  const [newFamilyGender, setNewFamilyGender] = useState('');
  const [selectedExistingChildId, setSelectedExistingChildId] = useState(''); // For selecting existing person as child
  const [confirmRemove, setConfirmRemove] = useState(null); // { type: 'parent'|'child', name, onConfirm }
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Citation dialog state
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [editingCitation, setEditingCitation] = useState(null);
  const [citationTarget, setCitationTarget] = useState(null); // { type: 'birth'|'death'|'event', eventId: string }

  // Attach GQ Event dialog state
  const [attachGQDialog, setAttachGQDialog] = useState({
    isOpen: false,
    eventType: null,
    eventId: null,
  });

  // Portrait photo viewer state
  const [portraitMedia, setPortraitMedia] = useState(null);

  // Inline editing state for Name & Gender card
  const [isEditingNameGender, setIsEditingNameGender] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMaidenName, setEditMaidenName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('');

  // Inline editing state for Events card (per-event editing)
  const [editingEventId, setEditingEventId] = useState(null); // 'birth', 'death', or event.id
  const [editEventDate, setEditEventDate] = useState({ type: 'unknown' });
  const [editEventPlace, setEditEventPlace] = useState('');
  const [editEventPlaceId, setEditEventPlaceId] = useState(null);
  const [editEventCause, setEditEventCause] = useState('');
  const [editUnionEndReason, setEditUnionEndReason] = useState('');
  const [editUnionPartnerId, setEditUnionPartnerId] = useState(''); // Partner for union
  const [editUnionPriorStatus1, setEditUnionPriorStatus1] = useState(''); // Current person's status at marriage
  const [editUnionPriorStatus2, setEditUnionPriorStatus2] = useState(''); // Partner's status at marriage
  const [editEventType, setEditEventType] = useState(null); // For new events
  const [addEventDropdownOpen, setAddEventDropdownOpen] = useState(false);
  const [isAddingNewEvent, setIsAddingNewEvent] = useState(false);
  const addEventDropdownRef = useRef(null);

  // Close add event dropdown when clicking outside
  useEffect(() => {
    if (!addEventDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (addEventDropdownRef.current && !addEventDropdownRef.current.contains(e.target)) {
        setAddEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addEventDropdownOpen]);

  // Swipe gesture handling (touch devices)
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;

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
  }, [canNavigateBack, canNavigateForward, onNavigateBack, onNavigateForward]);

  // Trackpad swipe handling (macOS two-finger swipe)
  const wheelAccumulator = useRef({ x: 0, y: 0, timeout: null });

  const handleWheel = useCallback((e) => {
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
  }, [canNavigateBack, canNavigateForward, onNavigateBack, onNavigateForward]);

  // Start inline editing for Name & Gender card
  const startEditingNameGender = useCallback(() => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditMaidenName(maidenName);
    setEditNickname(nickname);
    setEditGender(gender);
    setIsEditingNameGender(true);
  }, [firstName, lastName, maidenName, nickname, gender]);

  // Save inline Name & Gender edit
  const saveNameGenderEdit = useCallback(() => {
    // Update the main state
    setFirstName(editFirstName);
    setLastName(editLastName);
    setMaidenName(editMaidenName);
    setNickname(editNickname);
    setGender(editGender);
    setIsEditingNameGender(false);

    // Trigger save to persist changes
    if (onSave && person) {
      onSave({
        ...person,
        firstName: editFirstName,
        lastName: editLastName,
        maidenName: editMaidenName,
        nickname: editNickname,
        gender: editGender,
      });
    }
  }, [editFirstName, editLastName, editMaidenName, editNickname, editGender, onSave, person]);

  // Cancel inline Name & Gender edit
  const cancelNameGenderEdit = useCallback(() => {
    setIsEditingNameGender(false);
  }, []);

  // Start editing a specific event (or union)
  const startEditingEvent = useCallback((eventId) => {
    if (eventId === 'birth') {
      setEditEventDate(birthDate || { type: 'unknown' });
      setEditEventPlace(birthPlace || '');
      setEditEventPlaceId(birthPlaceId || null);
      setEditEventCause(birthCause || '');
    } else if (eventId === 'death') {
      setEditEventDate(deathDate || { type: 'unknown' });
      setEditEventPlace(deathPlace || '');
      setEditEventPlaceId(deathPlaceId || null);
      setEditEventCause(deathCause || '');
    } else {
      // Check if it's a union first
      const union = unions.find(u => u.id === eventId);
      if (union) {
        setEditEventDate(union.startDate || { type: 'unknown' });
        setEditEventPlace(union.startPlace || '');
        setEditEventPlaceId(union.startPlaceId || null);
        setEditEventCause(''); // Unions don't have cause
        setEditUnionPartnerId(union.partnerId || '');
        setEditUnionEndReason(union.endReason || '');
        setEditUnionPriorStatus1(union.priorStatus1 || '');
        setEditUnionPriorStatus2(union.priorStatus2 || '');
      } else {
        const event = events.find(e => e.id === eventId);
        if (event) {
          // Include dateOffset in the date object for DateInput
          const dateWithOffset = event.dateOffset
            ? { ...(event.date || { type: 'unknown' }), dateOffset: event.dateOffset }
            : (event.date || { type: 'unknown' });
          setEditEventDate(dateWithOffset);
          setEditEventPlace(event.place || '');
          setEditEventPlaceId(event.placeId || null);
          setEditEventCause(event.cause || '');
        }
      }
    }
    setEditingEventId(eventId);
    setIsAddingNewEvent(false);
  }, [birthDate, birthPlace, birthPlaceId, birthCause, deathDate, deathPlace, deathPlaceId, deathCause, events, unions]);

  // Save the currently edited event
  const saveEventEdit = useCallback(() => {
    if (!editingEventId) return;

    if (editingEventId === 'birth') {
      setBirthDate(editEventDate);
      setBirthPlace(editEventPlace);
      setBirthPlaceId(editEventPlaceId);
      setBirthCause(editEventCause);
      if (onSave && person) {
        onSave({
          ...person,
          birthDate: editEventDate,
          birthPlace: editEventPlace,
          birthPlaceId: editEventPlaceId,
          birthCause: editEventCause,
        });
      }
    } else if (editingEventId === 'death') {
      setDeathDate(editEventDate);
      setDeathPlace(editEventPlace);
      setDeathPlaceId(editEventPlaceId);
      setDeathCause(editEventCause);
      if (onSave && person) {
        onSave({
          ...person,
          deathDate: editEventDate,
          deathPlace: editEventPlace,
          deathPlaceId: editEventPlaceId,
          deathCause: editEventCause,
        });
      }
    } else if (isAddingNewEvent) {
      // Adding a new event
      const { dateOffset, ...dateWithoutOffset } = editEventDate || {};
      const newEvent = {
        id: `new-${Date.now()}`,
        type: editEventType,
        date: dateWithoutOffset,
        dateOffset: dateOffset || null,
        place: editEventPlace,
        placeId: editEventPlaceId,
        cause: editEventCause,
      };
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      if (onSave && person) {
        onSave({
          ...person,
          events: updatedEvents,
        });
      }
    } else {
      // Check if it's a union
      const unionIndex = unions.findIndex(u => u.id === editingEventId);
      if (unionIndex !== -1) {
        // Editing a union
        const updatedUnions = unions.map(u =>
          u.id === editingEventId
            ? { ...u, partnerId: editUnionPartnerId, startDate: editEventDate, startPlace: editEventPlace, startPlaceId: editEventPlaceId, endReason: editUnionEndReason, priorStatus1: editUnionPriorStatus1, priorStatus2: editUnionPriorStatus2 }
            : u
        );
        setUnions(updatedUnions);
        if (onUnionsChange) {
          const formattedUnions = updatedUnions
            .filter(u => u.partnerId)
            .map(u => ({
              id: u.id || undefined,
              partner1Id: person.id,
              partner2Id: u.partnerId,
              type: u.type || 'marriage',
              startDate: u.startDate,
              startPlace: u.startPlace || '',
              startPlaceId: u.startPlaceId,
              endDate: u.endDate,
              endReason: u.endReason || '',
              priorStatus1: u.priorStatus1 || '',
              priorStatus2: u.priorStatus2 || '',
              childIds: u.childIds || [],
              sources: u.sources || []
            }));
          onUnionsChange(formattedUnions);
        }
      } else {
        // Editing an existing event
        const { dateOffset, ...dateWithoutOffset } = editEventDate || {};
        const updatedEvents = events.map(e =>
          e.id === editingEventId
            ? { ...e, date: dateWithoutOffset, dateOffset: dateOffset || null, place: editEventPlace, placeId: editEventPlaceId, cause: editEventCause }
            : e
        );
        setEvents(updatedEvents);
        if (onSave && person) {
          onSave({
            ...person,
            events: updatedEvents,
          });
        }
      }
    }
    setEditingEventId(null);
    setIsAddingNewEvent(false);
    setEditEventType(null);
  }, [editingEventId, editEventDate, editEventPlace, editEventPlaceId, editEventCause, editUnionPartnerId, editUnionEndReason, editUnionPriorStatus1, editUnionPriorStatus2, editEventType, isAddingNewEvent, events, unions, onSave, onUnionsChange, person]);

  // Cancel editing an event
  const cancelEventEdit = useCallback(() => {
    setEditingEventId(null);
    setIsAddingNewEvent(false);
    setEditEventType(null);
  }, []);

  // Start adding a new event of specific type
  const startAddingEvent = useCallback((type) => {
    setEditEventType(type);
    setEditEventDate({ type: 'unknown' });
    setEditEventPlace('');
    setEditEventPlaceId(null);
    setEditEventCause('');
    setEditingEventId(`new-${type}`);
    setIsAddingNewEvent(true);
    setAddEventDropdownOpen(false);
  }, []);

  // Start adding a new union/marriage
  const startAddingUnion = useCallback(() => {
    const newUnionId = `union-new-${Date.now()}`;
    const newUnion = {
      id: newUnionId,
      partnerId: '',
      type: 'marriage',
      startDate: { type: 'unknown' },
      startPlace: '',
      endReason: '',
      priorStatus1: '',
      priorStatus2: '',
    };
    setUnions(prev => [...prev, newUnion]);
    setEditingEventId(newUnionId);
    setEditEventDate({ type: 'unknown' });
    setEditEventPlace('');
    setEditEventPlaceId(null);
    setEditUnionPartnerId('');
    setEditUnionEndReason('');
    setEditUnionPriorStatus1('');
    setEditUnionPriorStatus2('');
    setAddEventDropdownOpen(false);
  }, []);

  // Delete an event
  const deleteEvent = useCallback((eventId) => {
    const updatedEvents = events.filter(e => e.id !== eventId);
    setEvents(updatedEvents);
    if (onSave && person) {
      onSave({
        ...person,
        events: updatedEvents,
      });
    }
  }, [events, onSave, person]);

  // Delete a union
  const deleteUnion = useCallback((unionId) => {
    const updatedUnions = unions.filter(u => u.id !== unionId);
    setUnions(updatedUnions);
    if (onUnionsChange) {
      onUnionsChange(updatedUnions);
    }
  }, [unions, onUnionsChange]);

  // Load data when person changes
  useEffect(() => {
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
      setBirthCause(person.birthCause || '');
      setDeathPlace(person.deathPlace || '');
      setDeathPlaceId(person.deathPlaceId || null);
      setDeathEventId(person.deathEventId || null);
      setDeathCause(person.deathCause || '');
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

  // Update unions when existingUnions changes
  useEffect(() => {
    if (person) {
      const personUnions = existingUnions
        .filter(u => u.partner1Id === person.id || u.partner2Id === person.id)
        .map(u => ({
          ...u,
          partnerId: u.partner1Id === person.id ? u.partner2Id : u.partner1Id,
          isExisting: true
        }));
      setUnions(personUnions);
    }
  }, [existingUnions, person?.id]);

  // Find parents (needed by keyboard shortcuts)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If confirmation dialog is open, handle Escape
      if (confirmRemove) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmRemove(null);
        }
        return;
      }

      // If new parent dialog is open, handle its shortcuts
      if (showNewParentDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowNewParentDialog(null);
        }
        if (e.key === 'Enter' && (selectedExistingParentId || newParentFirstName || newParentLastName)) {
          e.preventDefault();
          let parentIdToAdd = null;

          if (selectedExistingParentId) {
            parentIdToAdd = selectedExistingParentId;
          } else if (newParentFirstName || newParentLastName) {
            const gender = showNewParentDialog === 'father' ? 'male' : 'female';
            parentIdToAdd = onCreatePerson?.({
              firstName: newParentFirstName,
              lastName: newParentLastName,
              gender
            });
          }

          if (parentIdToAdd) {
            const newFatherId = showNewParentDialog === 'father' ? parentIdToAdd : (selectedFatherId || parents.father?.id || null);
            const newMotherId = showNewParentDialog === 'mother' ? parentIdToAdd : (selectedMotherId || parents.mother?.id || null);

            if (showNewParentDialog === 'father') {
              setSelectedFatherId(parentIdToAdd);
            } else {
              setSelectedMotherId(parentIdToAdd);
            }

            // Immediately save the parent change
            if (onParentsChange && person) {
              onParentsChange({
                personId: person.id,
                fatherId: newFatherId,
                motherId: newMotherId
              });
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
      if (canNavigateBack) {
        if ((e.altKey && e.key === 'ArrowLeft') || ((e.ctrlKey || e.metaKey) && e.key === '[')) {
          e.preventDefault();
          onNavigateBack?.();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmRemove, showNewParentDialog, newParentFirstName, newParentLastName, selectedExistingParentId, selectedFatherId, selectedMotherId, parents, onParentsChange, person, onCreatePerson, showNewFamilyDialog, newFamilyFirstName, newFamilyLastName, newFamilyGender, unions, onUnionsChange, canNavigateBack, onNavigateBack]);

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

  // Build unified event list for timeline (always includes birth/death for editing)
  const allEvents = useMemo(() => {
    const eventList = [];

    // Birth - always include
    eventList.push({
      id: 'birth',
      type: 'birth',
      label: 'Birth',
      date: birthDate,
      place: birthPlace,
      placeId: birthPlaceId,
      cause: birthCause,
      eventId: birthEventId,
      hasData: birthDate?.type !== 'unknown' || birthPlace,
    });

    // Other events (baptism, etc.)
    events.forEach(event => {
      const eventType = EVENT_TYPES.find(t => t.value === event.type);
      eventList.push({
        id: event.id,
        type: event.type,
        label: eventType?.label || event.type,
        date: event.date,
        place: event.place,
        placeId: event.placeId,
        cause: event.cause,
        eventId: event.id,
        age: calculateAge(birthDate, event.date),
        hasData: true,
      });
    });

    // Unions/Marriages
    unions.forEach(union => {
      const partner = allPeople.find(p => p.id === union.partnerId);
      const endReasonLabel = END_REASONS.find(r => r.value === union.endReason)?.label;
      const priorStatus1Label = PRIOR_STATUS.find(s => s.value === union.priorStatus1)?.label;
      const priorStatus2Label = PRIOR_STATUS.find(s => s.value === union.priorStatus2)?.label;
      eventList.push({
        id: union.id,
        type: 'marriage',
        label: UNION_TYPES.find(t => t.value === union.type)?.label || 'Union',
        date: union.startDate,
        place: union.startPlace,
        partner,
        age: calculateAge(birthDate, union.startDate),
        hasData: true,
        isUnion: true,
        endReason: union.endReason,
        endReasonLabel: endReasonLabel && union.endReason ? endReasonLabel : null,
        priorStatus1: union.priorStatus1,
        priorStatus2: union.priorStatus2,
        priorStatus1Label: priorStatus1Label && union.priorStatus1 ? priorStatus1Label : null,
        priorStatus2Label: priorStatus2Label && union.priorStatus2 ? priorStatus2Label : null,
      });
    });

    // Death - always include
    eventList.push({
      id: 'death',
      type: 'death',
      label: 'Death',
      date: deathDate,
      place: deathPlace,
      placeId: deathPlaceId,
      cause: deathCause,
      eventId: deathEventId,
      age: calculateAge(birthDate, deathDate),
      hasData: deathDate?.type !== 'unknown' && deathDate?.type !== 'alive' || deathPlace,
      isAlive: deathDate?.type === 'alive',
    });

    // Helper to extract year/month/day from various date formats
    const getDateParts = (date) => {
      if (!date) return { year: null, month: null, day: null };
      // Handle object format: { year: '1850', month: '3', day: '15' }
      if (date.year) return { year: parseInt(date.year), month: parseInt(date.month) || 0, day: parseInt(date.day) || 0 };
      // Handle ISO string format: "1850-03-15" or "1850-03" or "1850"
      if (typeof date === 'string') {
        const parts = date.split('-');
        return { year: parseInt(parts[0]) || null, month: parseInt(parts[1]) || 0, day: parseInt(parts[2]) || 0 };
      }
      return { year: null, month: null, day: null };
    };

    // Sort by date (birth first, then chronologically, undated events at end)
    return eventList.sort((a, b) => {
      // Birth always first
      if (a.id === 'birth') return -1;
      if (b.id === 'birth') return 1;

      // Sort by date chronologically
      const aDate = getDateParts(a.date);
      const bDate = getDateParts(b.date);

      // Events without dates go to end (death without date goes last)
      if (!aDate.year && !bDate.year) {
        // Both undated: death goes last
        if (a.id === 'death') return 1;
        if (b.id === 'death') return -1;
        return 0;
      }
      if (!aDate.year) return 1;
      if (!bDate.year) return -1;

      const yearDiff = aDate.year - bDate.year;
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = aDate.month - bDate.month;
      if (monthDiff !== 0) return monthDiff;
      return aDate.day - bDate.day;
    });
  }, [birthDate, birthPlace, birthPlaceId, birthCause, birthEventId, deathDate, deathPlace, deathPlaceId, deathCause, deathEventId, events, unions, allPeople]);

  // Count total children
  const totalChildren = familyData.reduce((acc, f) => acc + f.children.length, 0);

  // Card-based view layout
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
                <button
                  type="button"
                  className="pv-delete-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete this person"
                >
                  Delete Person
                </button>
              </div>

              {/* Parents inline */}
              <div className="pv-parents-inline">
                {parents.father ? (
                  <div className="pv-parent-card father has-person-tooltip">
                    <button
                      type="button"
                      className="pv-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fatherName = [parents.father.firstName, parents.father.lastName].filter(Boolean).join(' ') || 'Unknown';
                        setConfirmRemove({
                          type: 'parent',
                          name: fatherName,
                          onConfirm: () => {
                            onParentsChange?.({
                              personId: person.id,
                              fatherId: null,
                              motherId: parents.mother?.id || null
                            });
                          }
                        });
                      }}
                      title="Remove father"
                    >
                      ×
                    </button>
                    <PersonPhoto
                      personId={parents.father.id}
                      width={28}
                      height={28}
                      className="person-photo-round"
                      onClick={() => onSelectPerson?.(parents.father.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div
                      className="pv-parent-info"
                      onClick={() => onSelectPerson?.(parents.father.id)}
                      style={{ cursor: 'pointer' }}
                    >
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
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pv-parent-card father pv-parent-add"
                    onClick={() => {
                      setSelectedExistingParentId('');
                      setNewParentFirstName('');
                      setNewParentLastName(lastName || '');
                      setShowNewParentDialog('father');
                    }}
                    title="Add father"
                  >
                    <div className="pv-parent-photo pv-parent-photo-add">+</div>
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Father</span>
                      <span className="pv-parent-name">Add...</span>
                    </div>
                  </button>
                )}

                {parents.mother ? (
                  <div className="pv-parent-card mother has-person-tooltip">
                    <button
                      type="button"
                      className="pv-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const motherName = [parents.mother.firstName, parents.mother.lastName].filter(Boolean).join(' ') || 'Unknown';
                        setConfirmRemove({
                          type: 'parent',
                          name: motherName,
                          onConfirm: () => {
                            onParentsChange?.({
                              personId: person.id,
                              fatherId: parents.father?.id || null,
                              motherId: null
                            });
                          }
                        });
                      }}
                      title="Remove mother"
                    >
                      ×
                    </button>
                    <PersonPhoto
                      personId={parents.mother.id}
                      width={28}
                      height={28}
                      className="person-photo-round"
                      onClick={() => onSelectPerson?.(parents.mother.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div
                      className="pv-parent-info"
                      onClick={() => onSelectPerson?.(parents.mother.id)}
                      style={{ cursor: 'pointer' }}
                    >
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
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pv-parent-card mother pv-parent-add"
                    onClick={() => {
                      setSelectedExistingParentId('');
                      setNewParentFirstName('');
                      setNewParentLastName('');
                      setShowNewParentDialog('mother');
                    }}
                    title="Add mother"
                  >
                    <div className="pv-parent-photo pv-parent-photo-add">+</div>
                    <div className="pv-parent-info">
                      <span className="pv-parent-label">Mother</span>
                      <span className="pv-parent-name">Add...</span>
                    </div>
                  </button>
                )}
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
                {/* Name & Gender Card */}
                <div className={`pv-card ${isEditingNameGender ? 'editing' : ''}`}>
                  <div className="pv-card-header">
                    <span className="pv-card-icon">👤</span>
                    <span className="pv-card-title">Name & Gender</span>
                    {!isEditingNameGender && (
                      <button
                        className="pv-card-edit-btn"
                        onClick={startEditingNameGender}
                        title="Edit name & gender"
                      >
                        ✎
                      </button>
                    )}
                  </div>
                  <div className="pv-card-body">
                    {isEditingNameGender ? (
                      <>
                        <div className="pv-inline-edit-row">
                          <label className="pv-inline-edit-label">First Name</label>
                          <input
                            type="text"
                            className="pv-inline-edit-input"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="pv-inline-edit-row">
                          <label className="pv-inline-edit-label">Last Name</label>
                          <input
                            type="text"
                            className="pv-inline-edit-input"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                          />
                        </div>
                        <div className="pv-inline-edit-row">
                          <label className="pv-inline-edit-label">Maiden Name</label>
                          <input
                            type="text"
                            className="pv-inline-edit-input"
                            value={editMaidenName}
                            onChange={(e) => setEditMaidenName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="pv-inline-edit-row">
                          <label className="pv-inline-edit-label">Nickname</label>
                          <input
                            type="text"
                            className="pv-inline-edit-input"
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="pv-inline-edit-row">
                          <label className="pv-inline-edit-label">Gender</label>
                          <div className="pv-inline-edit-toggle">
                            <button
                              type="button"
                              className={`toggle-btn male ${editGender === 'male' ? 'active' : ''}`}
                              onClick={() => setEditGender('male')}
                            >
                              Male
                            </button>
                            <button
                              type="button"
                              className={`toggle-btn female ${editGender === 'female' ? 'active' : ''}`}
                              onClick={() => setEditGender('female')}
                            >
                              Female
                            </button>
                            <button
                              type="button"
                              className={`toggle-btn ${editGender === '' ? 'active' : ''}`}
                              onClick={() => setEditGender('')}
                            >
                              Unknown
                            </button>
                          </div>
                        </div>
                        <div className="pv-inline-edit-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={cancelNameGenderEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={saveNameGenderEdit}
                          >
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pv-info-row">
                          <span className="pv-info-label">First Name</span>
                          <span className="pv-info-value">{firstName || '—'}</span>
                        </div>
                        <div className="pv-info-row">
                          <span className="pv-info-label">Last Name</span>
                          <span className="pv-info-value">{lastName || '—'}</span>
                        </div>
                        {maidenName && (
                          <div className="pv-info-row">
                            <span className="pv-info-label">Maiden Name</span>
                            <span className="pv-info-value">{maidenName}</span>
                          </div>
                        )}
                        {nickname && (
                          <div className="pv-info-row">
                            <span className="pv-info-label">Nickname</span>
                            <span className="pv-info-value">{nickname}</span>
                          </div>
                        )}
                        <div className="pv-info-row">
                          <span className="pv-info-label">Gender</span>
                          <span className="pv-info-value">{gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Events Card - Per-event editing */}
                <div className="pv-card" style={{ marginTop: 12 }}>
                  <div className="pv-card-header">
                    <span className="pv-card-icon">★</span>
                    <span className="pv-card-title">Events</span>
                    <div className="pv-add-event-dropdown" ref={addEventDropdownRef}>
                      <button
                        className="pv-card-add-btn"
                        onClick={() => setAddEventDropdownOpen(!addEventDropdownOpen)}
                        title="Add event"
                      >
                        +
                      </button>
                      {addEventDropdownOpen && (
                        <div className="pv-add-event-menu">
                          <button
                            type="button"
                            onClick={startAddingUnion}
                          >
                            {EVENT_ICONS.marriage} Marriage
                          </button>
                          <div className="pv-add-event-divider" />
                          {EVENT_TYPES.map(et => (
                            <button
                              key={et.value}
                              type="button"
                              onClick={() => startAddingEvent(et.value)}
                            >
                              {EVENT_ICONS[et.value] || '●'} {et.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pv-card-body">
                    <div className="pv-events-list">
                      {allEvents.map((event) => {
                        const isEditing = editingEventId === event.id;
                        const eventCitationsForThis = event.type === 'birth' ? birthCitations :
                          event.type === 'death' ? deathCitations :
                          (eventCitations[event.id] || []);

                        // Skip death if marked alive and not editing
                        if (event.id === 'death' && event.isAlive && !isEditing) {
                          return (
                            <div key={event.id} className="pv-event pv-event-alive">
                              <div className={`pv-event-icon ${event.type}`}>
                                {EVENT_ICONS[event.type] || '●'}
                              </div>
                              <div className="pv-event-content">
                                <div className="pv-event-header">
                                  <span className="pv-event-type">Status</span>
                                  <span className="pv-event-alive-badge">Alive</span>
                                </div>
                              </div>
                              <div className="pv-event-button-group">
                                <button
                                  type="button"
                                  className="pv-event-attach-gq-btn"
                                  onClick={() => setAttachGQDialog({ isOpen: true, eventType: event.type, eventId: event.id })}
                                  title="Attach GénéalogieQuébec record"
                                >
                                  📎
                                </button>
                                <button
                                  type="button"
                                  className="pv-event-edit-btn"
                                  onClick={() => startEditingEvent(event.id)}
                                  title="Edit"
                                >
                                  ✎
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Skip events without data in view mode (unless editing)
                        if (!event.hasData && !isEditing && event.id !== 'birth' && event.id !== 'death') {
                          return null;
                        }

                        return (
                          <div key={event.id} className={`pv-event ${isEditing ? 'editing' : ''}`}>
                            <div className={`pv-event-icon ${event.type}`}>
                              {EVENT_ICONS[event.type] || '●'}
                            </div>
                            <div className="pv-event-content">
                              {isEditing ? (
                                /* Edit mode for this event */
                                <div className="pv-event-edit-form">
                                  <div className="pv-event-edit-title">{event.label}</div>

                                  {/* Death status toggle */}
                                  {event.id === 'death' && (
                                    <div className="pv-inline-edit-row">
                                      <label className="pv-inline-edit-label">Status</label>
                                      <div className="pv-inline-edit-toggle">
                                        <button
                                          type="button"
                                          className={`toggle-btn ${editEventDate?.type === 'alive' ? 'active' : ''}`}
                                          onClick={() => setEditEventDate({ type: 'alive' })}
                                        >
                                          Alive
                                        </button>
                                        <button
                                          type="button"
                                          className={`toggle-btn ${editEventDate?.type !== 'alive' ? 'active' : ''}`}
                                          onClick={() => setEditEventDate(prev => prev?.type === 'alive' ? { type: 'unknown' } : prev)}
                                        >
                                          Deceased
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Date/Place fields (hidden for alive status) */}
                                  {!(event.id === 'death' && editEventDate?.type === 'alive') && (
                                    <>
                                      <DateInput
                                        label="Date"
                                        value={editEventDate}
                                        onChange={setEditEventDate}
                                        parentDate={event.type === 'burial' ? deathDate : (event.id !== 'birth' ? birthDate : null)}
                                        parentLabel={event.type === 'burial' ? 'death' : 'birth'}
                                      />
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Place</label>
                                        <PlacePicker
                                          value={editEventPlace}
                                          placeId={editEventPlaceId}
                                          places={places}
                                          onChange={({ place, placeId }) => {
                                            setEditEventPlace(place);
                                            setEditEventPlaceId(placeId);
                                          }}
                                          onCreatePlace={onCreatePlace}
                                          placeholder={`${event.label} place`}
                                        />
                                      </div>
                                      {/* Cause/Reason field (not for unions) */}
                                      {!event.isUnion && (
                                        <div className="pv-inline-edit-row">
                                          <label className="pv-inline-edit-label">
                                            {event.type === 'death' ? 'Cause' : 'Reason'}
                                          </label>
                                          <input
                                            type="text"
                                            className="text-input"
                                            value={editEventCause}
                                            onChange={(e) => setEditEventCause(e.target.value)}
                                            placeholder={event.type === 'death' ? 'Cause of death' : 'Reason/cause'}
                                          />
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Notes/Citations for existing events */}
                                  {event.eventId && !event.isUnion && !(event.id === 'death' && editEventDate?.type === 'alive') && (
                                    <>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Notes</label>
                                        <NotesSection
                                          entityType="event"
                                          entityId={event.eventId}
                                          compact
                                        />
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Citations</label>
                                        <CitationList
                                          citations={eventCitationsForThis}
                                          onAdd={() => {
                                            setCitationTarget({ type: event.type, eventId: event.eventId });
                                            setEditingCitation(null);
                                            setCitationDialogOpen(true);
                                          }}
                                          onEdit={(citation) => {
                                            setCitationTarget({ type: event.type, eventId: event.eventId });
                                            setEditingCitation(citation);
                                            setCitationDialogOpen(true);
                                          }}
                                          onDelete={(citationId) => onDeleteCitation?.(citationId)}
                                          isEditing={true}
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* Partner and End reason for unions/marriages */}
                                  {event.isUnion && (
                                    <>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Partner</label>
                                        <PersonPicker
                                          value={editUnionPartnerId}
                                          onChange={(id) => setEditUnionPartnerId(id)}
                                          people={allPeople.filter(p => p.id !== person?.id)}
                                          placeholder="Select partner..."
                                        />
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Status</label>
                                        <select
                                          className="text-input"
                                          value={editUnionEndReason}
                                          onChange={(e) => setEditUnionEndReason(e.target.value)}
                                        >
                                          {END_REASONS.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">
                                          {firstName || 'Person'}'s prior status
                                        </label>
                                        <select
                                          className="text-input"
                                          value={editUnionPriorStatus1}
                                          onChange={(e) => setEditUnionPriorStatus1(e.target.value)}
                                        >
                                          {PRIOR_STATUS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">
                                          {(editUnionPartnerId && allPeople.find(p => p.id === editUnionPartnerId)?.firstName) || 'Partner'}'s prior status
                                        </label>
                                        <select
                                          className="text-input"
                                          value={editUnionPriorStatus2}
                                          onChange={(e) => setEditUnionPriorStatus2(e.target.value)}
                                        >
                                          {PRIOR_STATUS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Notes</label>
                                        <NotesSection
                                          entityType="union"
                                          entityId={event.id}
                                          compact
                                        />
                                      </div>
                                      <div className="pv-inline-edit-row">
                                        <label className="pv-inline-edit-label">Citations</label>
                                        <CitationList
                                          citations={unionCitations[event.id] || []}
                                          onAdd={() => {
                                            setCitationTarget({ type: 'union', unionId: event.id });
                                            setEditingCitation(null);
                                            setCitationDialogOpen(true);
                                          }}
                                          onEdit={(citation) => {
                                            setCitationTarget({ type: 'union', unionId: event.id });
                                            setEditingCitation(citation);
                                            setCitationDialogOpen(true);
                                          }}
                                          onDelete={(citationId) => onDeleteCitation?.(citationId)}
                                          isEditing={true}
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* Hint for new events */}
                                  {!event.eventId && !isAddingNewEvent && (
                                    <div className="pv-edit-event-hint">
                                      Save to add notes and citations
                                    </div>
                                  )}

                                  {/* Save/Cancel/Delete buttons */}
                                  <div className="pv-event-edit-actions">
                                    {/* Delete button for non-birth/death events */}
                                    {event.id !== 'birth' && event.id !== 'death' && !isAddingNewEvent && (
                                      <button
                                        type="button"
                                        className="btn-danger btn-small"
                                        onClick={() => {
                                          if (event.isUnion) {
                                            deleteUnion(event.id);
                                          } else {
                                            deleteEvent(event.id);
                                          }
                                          cancelEventEdit();
                                        }}
                                        title={event.isUnion ? "Delete union" : "Delete event"}
                                      >
                                        Delete
                                      </button>
                                    )}
                                    <div className="pv-event-edit-actions-right">
                                      <button
                                        type="button"
                                        className="btn-secondary btn-small"
                                        onClick={cancelEventEdit}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-primary btn-small"
                                        onClick={saveEventEdit}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* View mode for this event */
                                <>
                                  <div className="pv-event-header">
                                    <span className="pv-event-type">{event.label}</span>
                                    {event.date && event.date.type !== 'unknown' && event.date.type !== 'alive' && (
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
                                  {event.cause && (
                                    <div className="pv-event-cause">
                                      <span className="pv-event-cause-label">
                                        {event.type === 'death' ? 'Cause: ' : 'Reason: '}
                                      </span>
                                      {event.cause}
                                    </div>
                                  )}
                                  {event.partner && (
                                    <div className="pv-event-partner">
                                      <span className="pv-event-partner-photo" />
                                      {[event.partner.firstName, event.partner.lastName].filter(Boolean).join(' ')}
                                    </div>
                                  )}
                                  {event.endReasonLabel && (
                                    <div className="pv-event-status">
                                      <span className="pv-event-status-badge">{event.endReasonLabel}</span>
                                    </div>
                                  )}
                                  {(event.priorStatus1Label || event.priorStatus2Label) && (
                                    <div className="pv-event-prior-status">
                                      {event.priorStatus1Label && (
                                        <span className="pv-prior-status-item">
                                          {firstName || 'Person'}: {event.priorStatus1Label}
                                        </span>
                                      )}
                                      {event.priorStatus2Label && (
                                        <span className="pv-prior-status-item">
                                          {event.partner?.firstName || 'Partner'}: {event.priorStatus2Label}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {event.eventId && <EventMedia eventId={event.eventId} />}
                                  {/* Show placeholder for empty birth/death */}
                                  {!event.hasData && (event.id === 'birth' || event.id === 'death') && (
                                    <div className="pv-event-empty">Not recorded</div>
                                  )}
                                </>
                              )}
                            </div>
                            {/* Action buttons */}
                            {!isEditing && (
                              <div className="pv-event-button-group">
                                <button
                                  type="button"
                                  className="pv-event-attach-gq-btn"
                                  onClick={() => setAttachGQDialog({ isOpen: true, eventType: event.type, eventId: event.id })}
                                  title="Attach GénéalogieQuébec record"
                                >
                                  📎
                                </button>
                                <button
                                  type="button"
                                  className="pv-event-edit-btn"
                                  onClick={() => startEditingEvent(event.id)}
                                  title="Edit"
                                >
                                  ✎
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* New event being added */}
                      {isAddingNewEvent && (
                        <div className="pv-event editing">
                          <div className={`pv-event-icon ${editEventType}`}>
                            {EVENT_ICONS[editEventType] || '●'}
                          </div>
                          <div className="pv-event-content">
                            <div className="pv-event-edit-form">
                              <div className="pv-event-edit-title">
                                {EVENT_TYPES.find(t => t.value === editEventType)?.label || editEventType}
                              </div>
                              <DateInput
                                label="Date"
                                value={editEventDate}
                                onChange={setEditEventDate}
                                parentDate={editEventType === 'burial' ? deathDate : birthDate}
                                parentLabel={editEventType === 'burial' ? 'death' : 'birth'}
                              />
                              <div className="pv-inline-edit-row">
                                <label className="pv-inline-edit-label">Place</label>
                                <PlacePicker
                                  value={editEventPlace}
                                  placeId={editEventPlaceId}
                                  places={places}
                                  onChange={({ place, placeId }) => {
                                    setEditEventPlace(place);
                                    setEditEventPlaceId(placeId);
                                  }}
                                  onCreatePlace={onCreatePlace}
                                  placeholder="Event place"
                                />
                              </div>
                              <div className="pv-inline-edit-row">
                                <label className="pv-inline-edit-label">Reason</label>
                                <input
                                  type="text"
                                  className="text-input"
                                  value={editEventCause}
                                  onChange={(e) => setEditEventCause(e.target.value)}
                                  placeholder="Reason/cause"
                                />
                              </div>
                              <div className="pv-edit-event-hint">
                                Save to add notes and citations
                              </div>
                              <div className="pv-event-edit-actions">
                                <div className="pv-event-edit-actions-right">
                                  <button
                                    type="button"
                                    className="btn-secondary btn-small"
                                    onClick={cancelEventEdit}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-primary btn-small"
                                    onClick={saveEventEdit}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                                <button
                                  type="button"
                                  className="pv-remove-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmRemove({
                                      type: 'child',
                                      name: childName || 'Unknown',
                                      onConfirm: () => onRemoveChild?.(union.id, child.id)
                                    });
                                  }}
                                  title="Remove child from family"
                                >
                                  ×
                                </button>
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
                    </div>
                  );
                })}
              </div>

              {/* Right Column - Sources */}
              <div className="pv-column-right">
                {/* Sources Card */}
                {personSources.length > 0 && (
                  <div className="pv-card">
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
                    children.map(child => {
                      const childName = [child.firstName, child.lastName].filter(Boolean).join(' ') || 'Unknown';
                      return (
                      <div
                        key={child.id}
                        className={`pv-family-chip has-person-tooltip ${child.gender || ''}`}
                        title={childName}
                      >
                        <button
                          type="button"
                          className="pv-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRemove({
                              type: 'child',
                              name: childName,
                              onConfirm: () => onRemoveChild?.(union.id, child.id)
                            });
                          }}
                          title="Remove child from family"
                        >
                          ×
                        </button>
                        <PersonPhoto
                          personId={child.id}
                          width={28}
                          height={28}
                          className="person-photo-round"
                          onClick={() => onSelectPerson?.(child.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div
                          className="pv-family-chip-info"
                          onClick={() => onSelectPerson?.(child.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="pv-family-chip-name">
                            {[child.firstName, child.lastName].filter(Boolean).join(' ')}
                          </span>
                          <span className="pv-family-chip-dates">
                            {child.birthDate?.year && `☆ ${child.birthDate.year}`}
                            {child.deathDate?.year && ` † ${child.deathDate.year}`}
                          </span>
                        </div>
                        <PersonTooltip person={child} position="above" />
                      </div>
                    );})
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
          <Dialog isOpen={!!showNewFamilyDialog} onClose={() => setShowNewFamilyDialog(null)} size="medium">
            <Dialog.Header>
              <Dialog.Title>Add Child</Dialog.Title>
            </Dialog.Header>
            <Dialog.Content>
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
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Actions>
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
              </Dialog.Actions>
            </Dialog.Footer>
          </Dialog>
        )}

        {/* New Parent Dialog - View Mode */}
        {showNewParentDialog && (
          <Dialog isOpen={!!showNewParentDialog} onClose={() => setShowNewParentDialog(null)} size="medium">
            <Dialog.Header>
              <Dialog.Title>Add {showNewParentDialog === 'father' ? 'Father' : 'Mother'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Content>
              {/* Select existing person */}
              <div className="form-group">
                <label className="field-label">Select Existing Person</label>
                <PersonPicker
                  value={selectedExistingParentId}
                  people={allPeople}
                  onChange={(personId) => {
                    setSelectedExistingParentId(personId || '');
                    if (personId) {
                      setNewParentFirstName('');
                      setNewParentLastName('');
                    }
                  }}
                  placeholder={`Search for ${showNewParentDialog}...`}
                  excludeIds={[
                    person?.id,
                    parents.father?.id,
                    parents.mother?.id
                  ].filter(Boolean)}
                />
              </div>

              {/* Divider when not selecting existing */}
              {!selectedExistingParentId && (
                <div style={{ textAlign: 'center', color: 'var(--color-textMuted)', margin: '12px 0', fontSize: '12px' }}>
                  — or create new person —
                </div>
              )}

              {/* New person fields (hidden when existing person selected) */}
              {!selectedExistingParentId && (
                <>
                  <div className="form-group">
                    <label className="field-label">First Name</label>
                    <input
                      type="text"
                      value={newParentFirstName}
                      onChange={(e) => setNewParentFirstName(e.target.value)}
                      className="text-input"
                      placeholder="First name"
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
                </>
              )}
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Actions>
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
                    let parentIdToAdd = null;

                    if (selectedExistingParentId) {
                      parentIdToAdd = selectedExistingParentId;
                    } else if (onCreatePerson && (newParentFirstName || newParentLastName)) {
                      const gender = showNewParentDialog === 'father' ? 'male' : 'female';
                      parentIdToAdd = onCreatePerson({
                        firstName: newParentFirstName,
                        lastName: newParentLastName,
                        gender
                      });
                    }

                    if (parentIdToAdd) {
                      const newFatherId = showNewParentDialog === 'father' ? parentIdToAdd : (selectedFatherId || parents.father?.id || null);
                      const newMotherId = showNewParentDialog === 'mother' ? parentIdToAdd : (selectedMotherId || parents.mother?.id || null);

                      if (showNewParentDialog === 'father') {
                        setSelectedFatherId(parentIdToAdd);
                      } else {
                        setSelectedMotherId(parentIdToAdd);
                      }

                      if (onParentsChange && person) {
                        onParentsChange({
                          personId: person.id,
                          fatherId: newFatherId,
                          motherId: newMotherId
                        });
                      }
                    }
                    setShowNewParentDialog(null);
                  }}
                  disabled={!selectedExistingParentId && !newParentFirstName && !newParentLastName}
                >
                  Add
                </button>
              </Dialog.Actions>
            </Dialog.Footer>
          </Dialog>
        )}

        {/* Confirmation Dialog for Remove */}
        {confirmRemove && (
          <Dialog isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} size="small">
            <Dialog.Header>
              <Dialog.Title>Remove {confirmRemove.type === 'parent' ? 'Parent' : 'Child'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Content>
              <p>
                Remove <strong>{confirmRemove.name}</strong> as {confirmRemove.type === 'parent' ? 'a parent' : 'a child'}?
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-textMuted)', marginTop: 8 }}>
                This only removes the relationship, not the person.
              </p>
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Actions>
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmRemove(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={() => {
                    confirmRemove.onConfirm?.();
                    setConfirmRemove(null);
                  }}
                >
                  Remove
                </button>
              </Dialog.Actions>
            </Dialog.Footer>
          </Dialog>
        )}

        {/* Confirmation Dialog for Delete Person */}
        {showDeleteConfirm && (
          <Dialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} size="small">
            <Dialog.Header>
              <Dialog.Title>Delete Person</Dialog.Title>
            </Dialog.Header>
            <Dialog.Content>
              <p>
                Are you sure you want to delete <strong>{displayName}</strong>?
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-textMuted)', marginTop: 8 }}>
                This action cannot be undone. All events, citations, and relationships will be deleted.
              </p>
            </Dialog.Content>
            <Dialog.Footer>
              <Dialog.Actions>
                <button
                  className="btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.(person.id);
                  }}
                >
                  Delete
                </button>
              </Dialog.Actions>
            </Dialog.Footer>
          </Dialog>
        )}

        {/* Attach GénéalogieQuébec Event Dialog */}
        {attachGQDialog.isOpen && (() => {
          // Get appropriate citations for the event type
          const eventCitationsForType =
            attachGQDialog.eventType === 'birth' ? birthCitations :
            attachGQDialog.eventType === 'death' ? deathCitations :
            (eventCitations[attachGQDialog.eventId] || []);

          // Get existing event data if editing
          const existingEvent = attachGQDialog.eventId
            ? person.events?.find(e => e.id === attachGQDialog.eventId)
            : null;


          return (
            <AttachGQEventDialog
              isOpen={attachGQDialog.isOpen}
              onClose={() => setAttachGQDialog({ isOpen: false, eventType: null, eventId: null })}
              person={person}
              eventType={attachGQDialog.eventType}
              existingEventData={existingEvent}
              allPeople={allPeople}
              places={places}
              citations={eventCitationsForType}
              onCreatePlace={onCreatePlace}
              onCreateCitation={() => {
                setCitationDialogOpen(true);
              }}
              onUpdateCitation={() => {
                // TODO: Update citation dialog handler
              }}
              onSave={async (gqEventData) => {
                try {
                  // Determine if we're updating an existing event or creating a new one
                  const isExistingEvent = !!existingEvent;
                  const eventId = isExistingEvent ? existingEvent.id : `event-${Date.now()}`;

                  const newEvent = {
                    id: eventId,
                    type: gqEventData.eventData.type,
                    date: gqEventData.eventData.date,
                    place: gqEventData.eventData.place,
                    confidence: gqEventData.eventData.confidence,
                    notes: gqEventData.eventData.notes,
                    // Include event-specific fields
                    ...(gqEventData.eventData.spouse_id && { spouse_id: gqEventData.eventData.spouse_id }),
                    ...(gqEventData.eventData.spouse_name && { spouse_name: gqEventData.eventData.spouse_name }),
                    ...(gqEventData.eventData.cause && { cause: gqEventData.eventData.cause }),
                    ...(gqEventData.eventData.witnesses && gqEventData.eventData.witnesses.length > 0 && { witnesses: gqEventData.eventData.witnesses }),
                  };

                  // Update person's events array
                  let updatedPerson = { ...person };
                  if (isExistingEvent) {
                    // Update existing event in the array
                    updatedPerson.events = (person.events || []).map(e =>
                      e.id === eventId ? newEvent : e
                    );
                  } else {
                    // Add new event to the array
                    updatedPerson.events = [...(person.events || []), newEvent];
                  }

                  // Process photos: convert to base64, save to bundle, and create database records
                  const savedMediaIds = [];

                  for (const photoData of gqEventData.photoData) {
                    if (photoData.file) {
                      try {
                        // Convert File to base64
                        const reader = new FileReader();
                        const base64Data = await new Promise((resolve, reject) => {
                          reader.onload = () => resolve(reader.result);
                          reader.onerror = reject;
                          reader.readAsDataURL(photoData.file);
                        });

                        // Save to bundle
                        const bundleResult = await window.electronAPI.bundle.addMediaFromBase64({
                          base64Data: base64Data,
                          filename: photoData.file.name,
                          mimeType: photoData.file.type,
                          type: 'photos'
                        });

                        if (bundleResult.error) {
                          console.error('Error saving photo to bundle:', bundleResult.error);
                          continue;
                        }

                        // Now create media record in the database
                        const mediaId = bundleResult.id;
                        const now = new Date().toISOString();

                        await run(`
                          INSERT INTO media (
                            id, path, thumbnail_path, filename, type, mime_type,
                            title, created_at, updated_at
                          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                          mediaId,
                          bundleResult.path,
                          bundleResult.thumbnailPath || null,
                          bundleResult.filename,
                          'photo',
                          photoData.file.type,
                          photoData.label || bundleResult.filename,
                          now,
                          now,
                        ]);

                        // Create media_link to link media to event
                        const linkId = generateId();
                        await run(`
                          INSERT INTO media_link (
                            id, media_id, event_id, page_range_start, page_range_end,
                            created_at
                          ) VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                          linkId,
                          mediaId,
                          eventId,
                          photoData.pageRange ? photoData.pageRange.split('-')[0] : null,
                          photoData.pageRange ? photoData.pageRange.split('-')[1] : null,
                          now,
                        ]);

                        // Also link to person if in bundle mode
                        if (person.id) {
                          const personLinkId = generateId();
                          await run(`
                            INSERT INTO media_link (
                              id, media_id, person_id,
                              created_at
                            ) VALUES (?, ?, ?, ?)
                          `, [
                            personLinkId,
                            mediaId,
                            person.id,
                            now,
                          ]);
                        }

                        savedMediaIds.push(mediaId);
                      } catch (photoError) {
                        console.error('Error processing photo:', photoError);
                        // Continue with next photo on error
                      }
                    }
                  }

                  // Store photo IDs in event for reference
                  newEvent.photoIds = savedMediaIds;

                  // Save event to database
                  const now = new Date().toISOString();
                  try {
                    if (isExistingEvent) {
                      // Update existing event
                      await run(`
                        UPDATE event SET
                          type = ?,
                          date = ?,
                          place_detail = ?,
                          confidence = ?,
                          notes = ?,
                          updated_at = ?
                        WHERE id = ?
                      `, [
                        gqEventData.eventData.type,
                        gqEventData.eventData.date?.display || gqEventData.eventData.date || '',
                        gqEventData.eventData.place || '',
                        gqEventData.eventData.confidence || 'probable',
                        gqEventData.eventData.notes || '',
                        now,
                        eventId,
                      ]);
                    } else {
                      // Insert new event
                      await run(`
                        INSERT INTO event (
                          id, person_id, type, date, place_detail, confidence, notes,
                          created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                      `, [
                        eventId,
                        person.id,
                        gqEventData.eventData.type,
                        gqEventData.eventData.date?.display || gqEventData.eventData.date || '',
                        gqEventData.eventData.place || '',
                        gqEventData.eventData.confidence || 'probable',
                        gqEventData.eventData.notes || '',
                        now,
                        now,
                      ]);
                    }
                  } catch (dbError) {
                    console.error('Error saving event to database:', dbError);
                    // Continue anyway - we still have it in person.events
                  }

                  // Call onSave to update the person in the database
                  if (onSave) {
                    onSave(updatedPerson);
                  }

                  // Close dialog
                  setAttachGQDialog({ isOpen: false, eventType: null, eventId: null });

                  // Trigger refresh to update the view
                  triggerRefresh();
                } catch (error) {
                  console.error('Error saving GQ event:', error);
                }
              }}
            />
          );
        })()}
      </div>
  );
}
