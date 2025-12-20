import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SourceSelector from './SourceSelector';

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

  // Explicit unknown - user acknowledges the event happened but date is unknown
  if (strLower === '?' || strLower === 'unknown' || strLower === 'unk') {
    return { type: 'unknown_acknowledged', display: 'Unknown' };
  }

  // Still alive - for death date field
  if (strLower === 'alive' || strLower === 'living' || strLower === 'still alive') {
    return { type: 'alive', display: 'Living' };
  }

  const str = input.trim();

  // Check for approximate: "1850+-5", "1850 +- 5", "c.1850", "circa 1850", "~1850", "about 1850"
  const approxMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)?(\d{4})\s*(?:\+-|±)\s*(\d+)$/i);
  if (approxMatch) {
    return {
      type: 'approximate',
      year: approxMatch[1],
      variance: parseInt(approxMatch[2]),
      display: `c. ${approxMatch[1]} (±${approxMatch[2]} years)`
    };
  }

  // Check for circa without variance: "c.1850", "circa 1850", "~1850", "about 1850"
  const circaMatch = str.match(/^(?:c\.?\s*|circa\s+|~|about\s+)(\d{4})$/i);
  if (circaMatch) {
    return {
      type: 'approximate',
      year: circaMatch[1],
      variance: 5,
      display: `c. ${circaMatch[1]} (±5 years)`
    };
  }

  // Check for year only: "1850"
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

  // Check for month year: "Mar 1850", "March 1850", "3/1850", "03/1850"
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

  // Check for numeric month/year: "3/1850", "03/1850"
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

  // Check for full date: "15 Mar 1850", "15 March 1850"
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

  // Check for US format: "March 15, 1850", "Mar 15 1850", "August 19 1971"
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

  // Check for numeric full date: "15/3/1850", "15/03/1850"
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

  // Couldn't parse - return as-is with unknown type
  return { type: 'unknown', display: `? (couldn't parse "${str}")` };
}

// Convert structured date back to input string
function dateToInputString(date) {
  if (!date || date.type === 'unknown') return '';
  if (date.type === 'approximate') {
    return `${date.year}+-${date.variance || 5}`;
  }
  // Exact date
  const parts = [];
  if (date.day) parts.push(date.day);
  if (date.month) parts.push(MONTHS[parseInt(date.month) - 1]?.substring(0, 3));
  if (date.year) parts.push(date.year);
  return parts.join(' ');
}

function DateInput({ label, value, onChange, showCeremony, ceremonyLabel, ceremonyValue, onCeremonyChange }) {
  const [inputText, setInputText] = useState(() => dateToInputString(value));
  const [parsed, setParsed] = useState(() => parseDateString(dateToInputString(value)));
  const [ceremonyText, setCeremonyText] = useState(ceremonyValue?.offset || ceremonyValue?.date || '');
  const isEditing = useRef(false);
  const ceremonyIsEditing = useRef(false);

  // Sync from props only when not actively editing
  useEffect(() => {
    if (!isEditing.current) {
      const text = dateToInputString(value);
      setInputText(text);
      setParsed(parseDateString(text));
    }
  }, [value]);

  useEffect(() => {
    if (!ceremonyIsEditing.current) {
      setCeremonyText(ceremonyValue?.offset || ceremonyValue?.date || '');
    }
  }, [ceremonyValue]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    const result = parseDateString(text);
    setParsed(result);
    onChange(result);
  };

  const handleFocus = () => {
    isEditing.current = true;
  };

  const handleBlur = () => {
    isEditing.current = false;
  };

  const handleCeremonyFocus = () => {
    ceremonyIsEditing.current = true;
  };

  const handleCeremonyBlur = () => {
    ceremonyIsEditing.current = false;
  };

  const handleCeremonyChange = (e) => {
    const text = e.target.value;
    setCeremonyText(text);
    if (!text.trim()) {
      onCeremonyChange?.(null);
    } else if (text.startsWith('+')) {
      onCeremonyChange?.({ type: 'offset', offset: text });
    } else {
      onCeremonyChange?.({ type: 'date', date: text });
    }
  };

  // Calculate ceremony date preview based on offset
  const getCeremonyPreview = () => {
    if (!ceremonyText.trim()) return null;

    // If it's an offset like +2d, +1w, +3m
    if (ceremonyText.startsWith('+')) {
      const match = ceremonyText.match(/^\+(\d+)([dwmy]?)$/i);
      if (match && parsed.type !== 'unknown' && parsed.year) {
        const num = parseInt(match[1]);
        const unit = (match[2] || 'd').toLowerCase();

        // We need a base date to calculate from
        const baseYear = parseInt(parsed.year);
        const baseMonth = parsed.month ? parseInt(parsed.month) - 1 : 0;
        const baseDay = parsed.day ? parseInt(parsed.day) : 1;

        const date = new Date(baseYear, baseMonth, baseDay);

        switch (unit) {
          case 'd': date.setDate(date.getDate() + num); break;
          case 'w': date.setDate(date.getDate() + num * 7); break;
          case 'm': date.setMonth(date.getMonth() + num); break;
          case 'y': date.setFullYear(date.getFullYear() + num); break;
        }

        const day = date.getDate();
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();

        return `${day} ${month.substring(0, 3)} ${year}`;
      }
      return null;
    }

    // Otherwise try to parse it as a date
    const result = parseDateString(ceremonyText);
    if (result.type !== 'unknown') {
      return result.display;
    }
    return null;
  };

  const ceremonyPreview = getCeremonyPreview();

  return (
    <div className="date-input-group">
      <label className="field-label">{label}</label>
      <div className="smart-date-row">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="text-input smart-date-input"
          placeholder="1850, Mar 1850, 15 Mar 1850, 1850+-5, c.1850"
        />
        <span className={`date-preview ${parsed.type === 'unknown' && inputText ? 'error' : ''}`}>
          {parsed.display || 'Unknown'}
        </span>
      </div>

      {showCeremony && parsed.type !== 'unknown' && (
        <div className="ceremony-row">
          <label className="ceremony-inline-label">{ceremonyLabel}:</label>
          <input
            type="text"
            value={ceremonyText}
            onChange={handleCeremonyChange}
            onFocus={handleCeremonyFocus}
            onBlur={handleCeremonyBlur}
            className="text-input ceremony-inline-input"
            placeholder="+2d, +1w, or date"
          />
          {ceremonyPreview && (
            <span className="date-preview ceremony-preview">{ceremonyPreview}</span>
          )}
        </div>
      )}
    </div>
  );
}

function EventEntry({ event, onChange, onRemove, sources, onAddSource, parentDate }) {
  const [dateText, setDateText] = useState(() => {
    if (event.dateOffset) return event.dateOffset;
    return dateToInputString(event.date);
  });
  const isEditing = useRef(false);

  // Determine if event has meaningful data
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

  // Calculate date from offset
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
      // It's an offset
      const calculated = calculateDateFromOffset(text, parentDate);
      onChange({
        ...event,
        dateOffset: text,
        date: calculated || { type: 'unknown', display: 'Unknown' }
      });
    } else {
      // Regular date
      const parsed = parseDateString(text);
      onChange({ ...event, dateOffset: null, date: parsed });
    }
  };

  // Get display for the date preview
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

  // Build summary text
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

// Parse legacy date string format like "1850 - 1920", "b. 1850", "c. 1850"
function parseLegacyDates(datesString) {
  if (!datesString) return { birth: null, death: null };

  let birth = null;
  let death = null;

  // Check for "circa" approximate dates
  const circaMatch = datesString.match(/c\.\s*(\d{4})/);
  if (circaMatch) {
    birth = { type: 'approximate', year: circaMatch[1], variance: 5 };
  }

  // Check for "b. YYYY" birth only format
  const birthOnlyMatch = datesString.match(/b\.\s*(\d{4})/);
  if (birthOnlyMatch) {
    birth = { type: 'exact', year: birthOnlyMatch[1], month: '', day: '' };
  }

  // Check for "d. YYYY" death only format
  const deathOnlyMatch = datesString.match(/d\.\s*(\d{4})/);
  if (deathOnlyMatch) {
    death = { type: 'exact', year: deathOnlyMatch[1], month: '', day: '' };
  }

  // Check for "YYYY - YYYY" range format
  const rangeMatch = datesString.match(/(\d{4})\s*-\s*(\d{4})/);
  if (rangeMatch) {
    birth = { type: 'exact', year: rangeMatch[1], month: '', day: '' };
    death = { type: 'exact', year: rangeMatch[2], month: '', day: '' };
  }

  return { birth, death };
}

export default function PersonDialog({ isOpen, onClose, onSave, initialData, sources = {}, onAddSource }) {
  const { theme } = useTheme();
  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

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
  const [birthSources, setBirthSources] = useState([]);
  const [deathSources, setDeathSources] = useState([]);
  const [events, setEvents] = useState([]);
  const [birthExpanded, setBirthExpanded] = useState(true);
  const [deathExpanded, setDeathExpanded] = useState(true);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setFirstName(initialData.firstName || initialData.name?.split(' ')[0] || '');
      setMiddleName(initialData.middleName || '');
      setLastName(initialData.lastName || initialData.name?.split(' ').slice(1).join(' ') || '');
      setMaidenName(initialData.maidenName || '');
      setNickname(initialData.nickname || '');
      setGender(initialData.gender || '');

      // Handle dates - use structured data if available, otherwise parse legacy string
      let parsedBirth = initialData.birthDate;
      let parsedDeath = initialData.deathDate;

      if (!parsedBirth && !parsedDeath && initialData.dates) {
        const legacy = parseLegacyDates(initialData.dates);
        parsedBirth = legacy.birth;
        parsedDeath = legacy.death;
      }

      setBirthDate(parsedBirth || { type: 'exact' });
      setDeathDate(parsedDeath || { type: 'unknown' });
      setBirthPlace(initialData.birthPlace || '');
      setDeathPlace(initialData.deathPlace || '');
      setNotes(initialData.notes || initialData.description || '');
      // Handle colorIndex or legacy color
      if (initialData.colorIndex !== undefined) {
        setColorIndex(initialData.colorIndex);
      } else if (initialData.color) {
        // Try to find matching color in nodeColors for backward compatibility
        const idx = theme.colors.nodeColors.indexOf(initialData.color);
        setColorIndex(idx >= 0 ? idx : 0);
      } else {
        setColorIndex(0);
      }
      setBirthSources(initialData.birthSources || []);
      setDeathSources(initialData.deathSources || []);
      setEvents(initialData.events || []);
      // Collapse sections that have data
      const hasBirthData = parsedBirth?.type !== 'unknown' || initialData.birthPlace;
      const hasDeathData = parsedDeath?.type !== 'unknown' || initialData.deathPlace;
      setBirthExpanded(!hasBirthData);
      setDeathExpanded(!hasDeathData);
    } else {
      setTitle('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setMaidenName('');
      setNickname('');
      setGender('');
      setBirthDate({ type: 'exact' });
      setDeathDate({ type: 'unknown' });
      setBirthPlace('');
      setDeathPlace('');
      setNotes('');
      setColorIndex(0);
      setBirthSources([]);
      setDeathSources([]);
      setEvents([]);
      setBirthExpanded(true);
      setDeathExpanded(true);
    }
  }, [initialData, isOpen, theme.colors.nodeColors]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();

    const name = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Unknown';
    const dates = formatDatesDisplay(birthDate, deathDate);

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
      birthSources,
      deathSources,
      events,
    });
  }, [title, firstName, middleName, lastName, maidenName, nickname, gender, birthDate, deathDate, birthPlace, deathPlace, notes, colorIndex, birthSources, deathSources, events, onSave]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
      // Enter to go to next field (not in textarea)
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
      // Ctrl/Cmd + number for gender
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const genders = ['male', 'female', 'other'];
        setGender(genders[parseInt(e.key) - 1]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSubmit]);

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

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-header">
          <h2 id="dialog-title">{initialData ? 'Edit Family Member' : 'Add Family Member'}</h2>
          <div className="dialog-shortcuts">
            <span><KeyHint>Esc</KeyHint> Close</span>
            <span><KeyHint>⌘↵</KeyHint> Save</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="dialog-scrollable">
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
              <div className="form-group"></div>
            </div>

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
                <span className="life-event-label">Birth</span>
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
                <span className="life-event-label">{deathDate?.type === 'alive' ? 'Status' : 'Death'}</span>
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

          <div className="events-section">
            <div className="events-header">
              <label className="field-label">Additional Events</label>
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

          <div className="form-group">
            <label className="field-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea-input"
              placeholder="Occupation, achievements, stories..."
              rows={2}
            />
          </div>
          </div>

          <div className="dialog-footer">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="field-label">Card Color <span className="label-hint">(Tab + 1-7)</span></label>
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
                    onKeyDown={(e) => {
                      if (e.key >= '1' && e.key <= '7') {
                        setColorIndex(parseInt(e.key) - 1);
                      }
                    }}
                    tabIndex={colorIndex === i ? 0 : -1}
                  >
                    {colorIndex === i && <span className="color-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {initialData ? 'Save' : 'Add'} <KeyHint>⌘↵</KeyHint>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
