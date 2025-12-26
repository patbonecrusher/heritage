import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SourceSelector from './SourceSelector';
import MediaGallery from './MediaGallery';
import PersonPhoto from './PersonPhoto';
import { getParentIds, getChildrenIds } from '../utils/dataModel';

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

function EventEntry({ event, onChange, onRemove, sources, onAddSource, parentDate }) {
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
          <input
            type="text"
            value={event.place || ''}
            onChange={(e) => onChange({ ...event, place: e.target.value })}
            className="text-input"
            placeholder="Place"
          />
          <SourceSelector
            sources={sources}
            selectedSourceIds={event.sources || []}
            onChange={(newSources) => onChange({ ...event, sources: newSources })}
            onAddNew={() => onAddSource?.((newId) => onChange({ ...event, sources: [...(event.sources || []), newId] }))}
          />
        </div>
      )}
    </div>
  );
}

function UnionEntry({ union, onChange, onRemove, allPeople, currentPersonId, sources, onAddSource }) {
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
          <SourceSelector
            sources={sources}
            selectedSourceIds={union.sources || []}
            onChange={(newSources) => onChange({ ...union, sources: newSources })}
            onAddNew={() => onAddSource?.((newId) => onChange({ ...union, sources: [...(union.sources || []), newId] }))}
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

export default function PersonView({ person, onSave, onCancel, sources = {}, onAddSource, allPeople = [], existingUnions = [], onUnionsChange, onSelectPerson, onParentsChange, onCreatePerson, onNavigateBack, canNavigateBack }) {
  const { theme } = useTheme();
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
  const [deathPlace, setDeathPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [personSources, setPersonSources] = useState([]);
  const [birthSources, setBirthSources] = useState([]);
  const [deathSources, setDeathSources] = useState([]);
  const [events, setEvents] = useState([]);
  const [unions, setUnions] = useState([]);
  const [birthExpanded, setBirthExpanded] = useState(true);
  const [deathExpanded, setDeathExpanded] = useState(true);
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
      setDeathPlace(person.deathPlace || '');
      setNotes(person.notes || '');
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
  }, [person?.id]); // Only reset when person ID changes, not on every existingUnions change

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
      deathPlace,
      notes,
      description: notes,
      dates,
      colorIndex,
      sources: personSources,
      birthSources,
      deathSources,
      events,
    });

    setIsEditing(false);
  }, [title, firstName, middleName, lastName, maidenName, nickname, gender, birthDate, deathDate, birthPlace, deathPlace, notes, colorIndex, personSources, birthSources, deathSources, events, unions, person, onSave, onUnionsChange, selectedFatherId, selectedMotherId, onParentsChange]);

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
            setDeathPlace(person.deathPlace || '');
            setNotes(person.notes || '');
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

  // Read-only summary view
  if (!isEditing) {
    return (
      <div className="person-view">
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
            <PersonPhoto personId={person?.id} width={70} height={90} />
            <div className="person-view-title">
              <h2>
                {displayName}
                {personSources.length > 0 && (
                  <span className="person-source-badge" title={`${personSources.length} source${personSources.length > 1 ? 's' : ''}`}>
                    [{personSources.length}]
                  </span>
                )}
              </h2>
              {nickname && <span className="person-nickname">"{nickname}"</span>}
              {maidenName && <span className="person-maiden-name">(née {maidenName})</span>}
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsEditing(true)}
          >
            Edit <KeyHint>⌘E</KeyHint>
          </button>
        </div>

        <div className="person-view-parents person-view-parents-fixed">
          <div className="parent-card-container">
            {parents.father ? (
              <button
                type="button"
                className="parent-card"
                onClick={() => onSelectPerson?.(parents.father.id)}
              >
                <span className="parent-label">Father</span>
                <span className="parent-name">
                  {[parents.father.firstName, parents.father.lastName].filter(Boolean).join(' ') || 'Unknown'}
                </span>
                {parents.father.birthDate?.year && (
                  <span className="parent-dates">{parents.father.birthDate.year}</span>
                )}
              </button>
            ) : (
              <div className="parent-card parent-unknown">
                <span className="parent-label">Father</span>
                <span className="parent-name">Unknown</span>
              </div>
            )}

            {parents.mother ? (
              <button
                type="button"
                className="parent-card"
                onClick={() => onSelectPerson?.(parents.mother.id)}
              >
                <span className="parent-label">Mother</span>
                <span className="parent-name">
                  {[parents.mother.firstName, parents.mother.lastName].filter(Boolean).join(' ') || 'Unknown'}
                </span>
                {parents.mother.birthDate?.year && (
                  <span className="parent-dates">{parents.mother.birthDate.year}</span>
                )}
              </button>
            ) : (
              <div className="parent-card parent-unknown">
                <span className="parent-label">Mother</span>
                <span className="parent-name">Unknown</span>
              </div>
            )}
          </div>
        </div>

        <div className="person-view-scrollable">
          {fullDates && (
            <div className="person-view-dates">{fullDates}</div>
          )}

          <div className="person-view-section">
            <h3 className="person-view-section-title">Birth</h3>
            <div className="person-view-detail">
              {birthDate && birthDate.type !== 'unknown' ? (
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{birthDate.display || formatSingleDate(birthDate)}</span>
                </div>
              ) : null}
              {birthPlace && (
                <div className="detail-row">
                  <span className="detail-label">Place:</span>
                  <span className="detail-value">{birthPlace}</span>
                </div>
              )}
              {!birthDate || (birthDate.type === 'unknown' && !birthPlace) ? (
                <span className="detail-empty">No birth information</span>
              ) : null}
            </div>
          </div>

          <div className="person-view-section">
            <h3 className="person-view-section-title">
              {deathDate?.type === 'alive' ? 'Status' : 'Death'}
            </h3>
            <div className="person-view-detail">
              {deathDate?.type === 'alive' ? (
                <span className="detail-value living-status">Living</span>
              ) : (
                <>
                  {deathDate && deathDate.type !== 'unknown' ? (
                    <div className="detail-row">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{deathDate.display || formatSingleDate(deathDate)}</span>
                    </div>
                  ) : null}
                  {deathPlace && (
                    <div className="detail-row">
                      <span className="detail-label">Place:</span>
                      <span className="detail-value">{deathPlace}</span>
                    </div>
                  )}
                  {(!deathDate || deathDate.type === 'unknown') && !deathPlace ? (
                    <span className="detail-empty">No death information</span>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {unions.length > 0 && (
            <div className="person-view-section">
              <h3 className="person-view-section-title">Unions</h3>
              <div className="person-view-list">
                {unions.map((union) => {
                  const partner = allPeople.find(p => p.id === union.partnerId);
                  const partnerName = partner
                    ? [partner.firstName, partner.lastName].filter(Boolean).join(' ')
                    : 'Unknown';
                  const unionType = UNION_TYPES.find(t => t.value === union.type)?.label || 'Union';
                  return (
                    <div key={union.id} className="person-view-list-item">
                      <span className="list-item-label">{unionType}:</span>
                      <span className="list-item-value">{partnerName}</span>
                      {union.startDate && union.startDate.type !== 'unknown' && (
                        <span className="list-item-date">
                          ({union.startDate.display || union.startDate.year})
                        </span>
                      )}
                      {union.endReason && (
                        <span className="list-item-note">
                          — {END_REASONS.find(r => r.value === union.endReason)?.label || union.endReason}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="person-view-section">
              <h3 className="person-view-section-title">Events</h3>
              <div className="person-view-list">
                {events.map((event) => {
                  const eventType = EVENT_TYPES.find(t => t.value === event.type);
                  return (
                    <div key={event.id} className="person-view-list-item">
                      <span className="list-item-label">{eventType?.label || event.type}:</span>
                      {event.date && event.date.type !== 'unknown' && (
                        <span className="list-item-value">
                          {event.date.display || formatSingleDate(event.date)}
                        </span>
                      )}
                      {event.place && (
                        <span className="list-item-value">{event.place}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {notes && (
            <div className="person-view-section">
              <h3 className="person-view-section-title">Notes</h3>
              <div className="person-view-notes">{notes}</div>
            </div>
          )}

          {/* Photos Section */}
          <div className="person-view-section">
            <MediaGallery personId={person?.id} />
          </div>
        </div>

        {/* Family Panel - Spouses and Children */}
        {familyData.length > 0 && (
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
                        {children.length > 0 ? (
                          children.map(child => (
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
                          ))
                        ) : (
                          <span className="family-no-children">No children</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="person-view person-view-editing">
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
            <select
              value={selectedFatherId}
              onChange={(e) => {
                if (e.target.value === '__create_new__') {
                  setNewParentFirstName('');
                  setNewParentLastName(lastName || '');
                  setShowNewParentDialog('father');
                } else {
                  setSelectedFatherId(e.target.value);
                }
              }}
              className="text-input parent-select"
            >
              <option value="">Select father...</option>
              <option value="__create_new__">+ Create new person...</option>
              {allPeople
                .filter(p => p.id !== person?.id && p.gender !== 'female' && !descendantIds.has(p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  </option>
                ))}
            </select>
          </div>

          <div className="parent-card-edit">
            <span className="parent-label">Mother</span>
            <select
              value={selectedMotherId}
              onChange={(e) => {
                if (e.target.value === '__create_new__') {
                  setNewParentFirstName('');
                  setNewParentLastName('');
                  setShowNewParentDialog('mother');
                } else {
                  setSelectedMotherId(e.target.value);
                }
              }}
              className="text-input parent-select"
            >
              <option value="">Select mother...</option>
              <option value="__create_new__">+ Create new person...</option>
              {allPeople
                .filter(p => p.id !== person?.id && p.gender !== 'male' && !descendantIds.has(p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  </option>
                ))}
            </select>
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

            {/* Person Sources */}
            <div className="form-group person-sources-group">
              <label className="field-label">
                Sources
                {personSources.length > 0 && ` [${personSources.length}]`}
              </label>
              <SourceSelector
                sources={sources}
                selectedSourceIds={personSources}
                onChange={setPersonSources}
                onAddNew={() => onAddSource?.((newId) => setPersonSources(prev => [...prev, newId]))}
              />
            </div>
          </div>

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
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="text-input"
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label className="field-label">Sources</label>
                    <SourceSelector
                      sources={sources}
                      selectedSourceIds={birthSources}
                      onChange={setBirthSources}
                      onAddNew={() => onAddSource?.((newId) => setBirthSources(prev => [...prev, newId]))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

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
                    <input
                      type="text"
                      value={deathPlace}
                      onChange={(e) => setDeathPlace(e.target.value)}
                      className="text-input"
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <label className="field-label">Sources</label>
                    <SourceSelector
                      sources={sources}
                      selectedSourceIds={deathSources}
                      onChange={setDeathSources}
                      onAddNew={() => onAddSource?.((newId) => setDeathSources(prev => [...prev, newId]))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

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
                  <EventEntry
                    key={event.id}
                    event={event}
                    parentDate={parentDate}
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
                  />
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
                />
              ))}
            </div>
          </div>

          <div className="edit-view-section">
            <h3 className="edit-view-section-title">Notes</h3>
            <div className="form-group">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea-input"
                placeholder="Occupation, achievements, stories..."
                rows={4}
              />
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
        <div className="dialog-overlay" onClick={() => setShowNewParentDialog(null)}>
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
        <div className="dialog-overlay" onClick={() => setShowNewFamilyDialog(null)}>
          <div className="dialog new-parent-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Add New {showNewFamilyDialog.type === 'child' ? 'Child' : 'Partner'}</h3>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label className="field-label">First Name</label>
                <input
                  type="text"
                  value={newFamilyFirstName}
                  onChange={(e) => setNewFamilyFirstName(e.target.value)}
                  className="text-input"
                  placeholder="First name"
                  autoFocus
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
                  if (onCreatePerson && (newFamilyFirstName || newFamilyLastName)) {
                    const newId = onCreatePerson({
                      firstName: newFamilyFirstName,
                      lastName: newFamilyLastName,
                      gender: newFamilyGender || ''
                    });
                    if (newId && person) {
                      let updatedUnions;
                      if (showNewFamilyDialog.type === 'child') {
                        // Add child to the union
                        const unionId = showNewFamilyDialog.unionId;
                        updatedUnions = unions.map(u =>
                          u.id === unionId
                            ? { ...u, childIds: [...(u.childIds || []), newId] }
                            : u
                        );
                      } else if (showNewFamilyDialog.type === 'partner') {
                        // Create a new union with this partner
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
                  }
                  setShowNewFamilyDialog(null);
                }}
                disabled={!newFamilyFirstName && !newFamilyLastName}
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
