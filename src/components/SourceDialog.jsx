import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SOURCE_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'church_record', label: 'Church Record' },
  { value: 'civil_record', label: 'Civil Record' },
  { value: 'census', label: 'Census' },
  { value: 'book', label: 'Book' },
  { value: 'document', label: 'Document/Certificate' },
  { value: 'other', label: 'Other' },
];

export default function SourceDialog({ isOpen, onClose, onSave, initialData }) {
  const { theme } = useTheme();
  const firstInputRef = useRef(null);

  const [sourceType, setSourceType] = useState('website');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [accessDate, setAccessDate] = useState('');
  const [repository, setRepository] = useState('');
  const [location, setLocation] = useState('');
  const [recordType, setRecordType] = useState('');
  const [volume, setVolume] = useState('');
  const [page, setPage] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordNumber, setRecordNumber] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setSourceType(initialData.sourceType || 'website');
      setTitle(initialData.title || '');
      setUrl(initialData.url || '');
      setAccessDate(initialData.accessDate || '');
      setRepository(initialData.repository || '');
      setLocation(initialData.location || '');
      setRecordType(initialData.recordType || '');
      setVolume(initialData.volume || '');
      setPage(initialData.page || '');
      setRecordDate(initialData.recordDate || '');
      setRecordNumber(initialData.recordNumber || '');
      setAuthor(initialData.author || '');
      setPublisher(initialData.publisher || '');
      setYear(initialData.year || '');
      setNotes(initialData.notes || '');
    } else {
      setSourceType('website');
      setTitle('');
      setUrl('');
      setAccessDate('');
      setRepository('');
      setLocation('');
      setRecordType('');
      setVolume('');
      setPage('');
      setRecordDate('');
      setRecordNumber('');
      setAuthor('');
      setPublisher('');
      setYear('');
      setNotes('');
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
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e?.preventDefault();

    const source = {
      id: initialData?.id || `source-${Date.now()}`,
      sourceType,
      title: title || 'Untitled Source',
      url,
      accessDate,
      repository,
      location,
      recordType,
      volume,
      page,
      recordDate,
      recordNumber,
      author,
      publisher,
      year,
      notes,
    };

    onSave(source);
  };

  if (!isOpen) return null;

  const renderTypeFields = () => {
    switch (sourceType) {
      case 'website':
        return (
          <>
            <div className="form-group">
              <label className="field-label">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-input"
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label className="field-label">Access Date</label>
              <input
                type="text"
                value={accessDate}
                onChange={(e) => setAccessDate(e.target.value)}
                className="text-input"
                placeholder="When you accessed this source"
              />
            </div>
          </>
        );

      case 'church_record':
        return (
          <>
            <div className="form-group">
              <label className="field-label">Parish/Church Name</label>
              <input
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                className="text-input"
                placeholder="St. Mary's Catholic Church"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-input"
                  placeholder="City, Country"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Record Type</label>
                <input
                  type="text"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="text-input"
                  placeholder="Baptism, Marriage, Burial"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Volume/Register</label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="text-input"
                  placeholder="Vol. 12"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Page/Folio</label>
                <input
                  type="text"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="text-input"
                  placeholder="Page 45"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Record Number</label>
                <input
                  type="text"
                  value={recordNumber}
                  onChange={(e) => setRecordNumber(e.target.value)}
                  className="text-input"
                  placeholder="Entry #123"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Record Date</label>
                <input
                  type="text"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="text-input"
                  placeholder="Date of record"
                />
              </div>
            </div>
          </>
        );

      case 'civil_record':
        return (
          <>
            <div className="form-group">
              <label className="field-label">Registry/Office</label>
              <input
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                className="text-input"
                placeholder="Civil Registry of..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-input"
                  placeholder="City, Country"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Record Type</label>
                <input
                  type="text"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="text-input"
                  placeholder="Birth, Death, Marriage"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Record Number</label>
                <input
                  type="text"
                  value={recordNumber}
                  onChange={(e) => setRecordNumber(e.target.value)}
                  className="text-input"
                  placeholder="Certificate #"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Record Date</label>
                <input
                  type="text"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="text-input"
                  placeholder="Date of record"
                />
              </div>
            </div>
          </>
        );

      case 'census':
        return (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Census Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="text-input"
                  placeholder="1901"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-input"
                  placeholder="District, City, Country"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Page/Schedule</label>
                <input
                  type="text"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  className="text-input"
                  placeholder="Page number"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Line/Entry</label>
                <input
                  type="text"
                  value={recordNumber}
                  onChange={(e) => setRecordNumber(e.target.value)}
                  className="text-input"
                  placeholder="Line number"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">URL (if online)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-input"
                placeholder="https://..."
              />
            </div>
          </>
        );

      case 'book':
        return (
          <>
            <div className="form-group">
              <label className="field-label">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="text-input"
                placeholder="Author name"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Publisher</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="text-input"
                  placeholder="Publisher name"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="text-input"
                  placeholder="Publication year"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Page(s)</label>
              <input
                type="text"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                className="text-input"
                placeholder="Page reference"
              />
            </div>
          </>
        );

      case 'document':
        return (
          <>
            <div className="form-group">
              <label className="field-label">Document Type</label>
              <input
                type="text"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="text-input"
                placeholder="Birth certificate, Will, Letter, etc."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Date</label>
                <input
                  type="text"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="text-input"
                  placeholder="Document date"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Location/Repository</label>
                <input
                  type="text"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  className="text-input"
                  placeholder="Where held"
                />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog source-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{initialData ? 'Edit Source' : 'Add Source'}</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label className="field-label">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="text-input"
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="field-label">Title/Description</label>
            <input
              ref={firstInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-input"
              placeholder="Brief description of this source"
            />
          </div>

          {renderTypeFields()}

          <div className="form-group">
            <label className="field-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea-input"
              placeholder="Additional notes about this source..."
              rows={2}
            />
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Save' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
