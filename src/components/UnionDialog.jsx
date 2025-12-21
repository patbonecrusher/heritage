import React, { useState, useEffect, useRef } from 'react';
import SourceSelector from './SourceSelector';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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

// Parse a flexible date string (copied from PersonDialog for consistency)
function parseDateString(input) {
  if (!input || input.trim() === '') {
    return { type: 'unknown', display: 'Unknown' };
  }

  const strLower = input.trim().toLowerCase();

  // Explicit unknown - user acknowledges the event happened but date is unknown
  if (strLower === '?' || strLower === 'unknown' || strLower === 'unk') {
    return { type: 'unknown_acknowledged', display: 'Unknown' };
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

function KeyHint({ children }) {
  return <span className="key-hint">{children}</span>;
}

export default function UnionDialog({ isOpen, onClose, onSave, initialData, sources = {}, onAddSource }) {
  const firstInputRef = useRef(null);

  const [unionType, setUnionType] = useState('marriage');
  const [startDateText, setStartDateText] = useState('');
  const [startDateParsed, setStartDateParsed] = useState({ type: 'unknown', display: 'Unknown' });
  const [startPlace, setStartPlace] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [endDateParsed, setEndDateParsed] = useState({ type: 'unknown', display: 'Unknown' });
  const [endReason, setEndReason] = useState('');
  const [unionSources, setUnionSources] = useState([]);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setUnionType(initialData.unionType || 'marriage');
      // Support both new (startDate) and legacy (marriageDate) fields
      const startDate = initialData.startDate || initialData.marriageDate;
      const startText = dateToInputString(startDate);
      setStartDateText(startText);
      setStartDateParsed(parseDateString(startText));
      setStartPlace(initialData.startPlace || initialData.marriagePlace || '');
      // Support both new (endDate) and legacy (divorceDate) fields
      const endDate = initialData.endDate || initialData.divorceDate;
      const endText = dateToInputString(endDate);
      setEndDateText(endText);
      setEndDateParsed(parseDateString(endText));
      setEndReason(initialData.endReason || '');
      setUnionSources(initialData.unionSources || initialData.marriageSources || []);
    } else {
      setUnionType('marriage');
      setStartDateText('');
      setStartDateParsed({ type: 'unknown', display: 'Unknown' });
      setStartPlace('');
      setEndDateText('');
      setEndDateParsed({ type: 'unknown', display: 'Unknown' });
      setEndReason('');
      setUnionSources([]);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStartDateChange = (e) => {
    const text = e.target.value;
    setStartDateText(text);
    setStartDateParsed(parseDateString(text));
  };

  const handleEndDateChange = (e) => {
    const text = e.target.value;
    setEndDateText(text);
    setEndDateParsed(parseDateString(text));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSave({
      unionType,
      startDate: startDateParsed,
      startPlace,
      endDate: endDateParsed.type !== 'unknown' ? endDateParsed : null,
      endReason,
      unionSources,
      // Keep legacy fields for backwards compatibility
      marriageDate: startDateParsed,
      marriagePlace: startPlace,
      divorceDate: endDateParsed.type !== 'unknown' ? endDateParsed : null,
      marriageSources: unionSources,
    });
  };

  if (!isOpen) return null;

  const typeLabel = UNION_TYPES.find(t => t.value === unionType)?.label || 'Union';

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog union-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-header">
          <h2>{initialData ? `Edit ${typeLabel}` : `Add ${typeLabel}`}</h2>
          <div className="dialog-shortcuts">
            <span><KeyHint>Esc</KeyHint> Close</span>
            <span><KeyHint>⌘↵</KeyHint> Save</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label className="field-label">Union Type</label>
            <select
              ref={firstInputRef}
              value={unionType}
              onChange={(e) => setUnionType(e.target.value)}
              className="text-input"
            >
              {UNION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label">
              {unionType === 'marriage' ? 'Marriage Date' : 'Start Date'}
            </label>
            <div className="smart-date-row">
              <input
                type="text"
                value={startDateText}
                onChange={handleStartDateChange}
                className="text-input smart-date-input"
                placeholder="1875, Jun 1875, 15 Jun 1875"
              />
              <span className={`date-preview ${startDateParsed.type === 'unknown' && startDateText ? 'error' : ''}`}>
                {startDateParsed.display || 'Unknown'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">
              {unionType === 'marriage' ? 'Marriage Place' : 'Place'}
            </label>
            <input
              type="text"
              value={startPlace}
              onChange={(e) => setStartPlace(e.target.value)}
              className="text-input"
              placeholder="City, State/Country"
            />
          </div>

          <div className="form-group">
            <label className="field-label">Status</label>
            <select
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              className="text-input"
            >
              {END_REASONS.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>

          {endReason && (
            <div className="form-group">
              <label className="field-label">
                {endReason === 'death' ? 'Date of Death' : `${endReason.charAt(0).toUpperCase() + endReason.slice(1)} Date`}
              </label>
              <div className="smart-date-row">
                <input
                  type="text"
                  value={endDateText}
                  onChange={handleEndDateChange}
                  className="text-input smart-date-input"
                  placeholder="Leave empty if unknown"
                />
                {endDateText && (
                  <span className={`date-preview ${endDateParsed.type === 'unknown' && endDateText ? 'error' : ''}`}>
                    {endDateParsed.display}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="field-label">Sources</label>
            <SourceSelector
              sources={sources}
              selectedSourceIds={unionSources}
              onChange={setUnionSources}
              onAddNew={() => onAddSource?.((newId) => setUnionSources(prev => [...prev, newId]))}
            />
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save <KeyHint>⌘↵</KeyHint>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
