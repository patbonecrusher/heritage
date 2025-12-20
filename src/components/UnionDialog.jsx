import React, { useState, useEffect, useRef } from 'react';
import SourceSelector from './SourceSelector';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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

  const [marriageDateText, setMarriageDateText] = useState('');
  const [marriageDateParsed, setMarriageDateParsed] = useState({ type: 'unknown', display: 'Unknown' });
  const [marriagePlace, setMarriagePlace] = useState('');
  const [divorceDateText, setDivorceDateText] = useState('');
  const [divorceDateParsed, setDivorceDateParsed] = useState({ type: 'unknown', display: 'Unknown' });
  const [marriageSources, setMarriageSources] = useState([]);

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const marriageText = dateToInputString(initialData.marriageDate);
      setMarriageDateText(marriageText);
      setMarriageDateParsed(parseDateString(marriageText));
      setMarriagePlace(initialData.marriagePlace || '');
      const divorceText = dateToInputString(initialData.divorceDate);
      setDivorceDateText(divorceText);
      setDivorceDateParsed(parseDateString(divorceText));
      setMarriageSources(initialData.marriageSources || []);
    } else {
      setMarriageDateText('');
      setMarriageDateParsed({ type: 'unknown', display: 'Unknown' });
      setMarriagePlace('');
      setDivorceDateText('');
      setDivorceDateParsed({ type: 'unknown', display: 'Unknown' });
      setMarriageSources([]);
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

  const handleMarriageDateChange = (e) => {
    const text = e.target.value;
    setMarriageDateText(text);
    setMarriageDateParsed(parseDateString(text));
  };

  const handleDivorceDateChange = (e) => {
    const text = e.target.value;
    setDivorceDateText(text);
    setDivorceDateParsed(parseDateString(text));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSave({
      marriageDate: marriageDateParsed,
      marriagePlace,
      divorceDate: divorceDateParsed.type !== 'unknown' ? divorceDateParsed : null,
      marriageSources,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog union-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-header">
          <h2>{initialData ? 'Edit Marriage' : 'Add Marriage'}</h2>
          <div className="dialog-shortcuts">
            <span><KeyHint>Esc</KeyHint> Close</span>
            <span><KeyHint>⌘↵</KeyHint> Save</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label className="field-label">Marriage Date</label>
            <div className="smart-date-row">
              <input
                ref={firstInputRef}
                type="text"
                value={marriageDateText}
                onChange={handleMarriageDateChange}
                className="text-input smart-date-input"
                placeholder="1875, Jun 1875, 15 Jun 1875"
              />
              <span className={`date-preview ${marriageDateParsed.type === 'unknown' && marriageDateText ? 'error' : ''}`}>
                {marriageDateParsed.display || 'Unknown'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">Marriage Place</label>
            <input
              type="text"
              value={marriagePlace}
              onChange={(e) => setMarriagePlace(e.target.value)}
              className="text-input"
              placeholder="City, State/Country"
            />
          </div>

          <div className="form-group">
            <label className="field-label">Divorce Date (if applicable)</label>
            <div className="smart-date-row">
              <input
                type="text"
                value={divorceDateText}
                onChange={handleDivorceDateChange}
                className="text-input smart-date-input"
                placeholder="Leave empty if still married"
              />
              {divorceDateText && (
                <span className={`date-preview ${divorceDateParsed.type === 'unknown' && divorceDateText ? 'error' : ''}`}>
                  {divorceDateParsed.display}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="field-label">Sources</label>
            <SourceSelector
              sources={sources}
              selectedSourceIds={marriageSources}
              onChange={setMarriageSources}
              onAddNew={() => onAddSource?.((newId) => setMarriageSources(prev => [...prev, newId]))}
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
