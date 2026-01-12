/**
 * EventDetailsPanel - Form for entering event details
 *
 * Features:
 * - Context-aware fields based on event type
 * - Date field with multi-format support
 * - Place autocomplete
 * - Confidence level selector
 * - Notes/transcription field
 * - Photo reference checkboxes
 */

import React, { useState, useCallback, useMemo } from 'react';
import { WitnessManager } from './WitnessManager';
import PlacePicker from '../PlacePicker';
import { parseDateString } from '@/utils/dateParser';
import './EventDetailsPanel.css';

const PHOTO_TYPE_OPTIONS = {
  gq_screenshot: 'GQ Screenshot',
  drouin_original: 'Drouin Original',
  full_scan: 'Full Scan',
  church_record: 'Church Record',
  census_record: 'Census Record',
  other: 'Document',
};

const CONFIDENCE_OPTIONS = [
  {
    value: 'certain',
    label: 'Certain',
    description: 'Photo is clear, all details visible',
  },
  {
    value: 'probable',
    label: 'Probable',
    description: 'Photo is mostly clear, minor interpretation',
  },
  {
    value: 'possible',
    label: 'Possible',
    description: 'Photo is blurry/unclear, some estimates',
  },
  {
    value: 'uncertain',
    label: 'Uncertain',
    description: 'Educated guess from context',
  },
];

const DATE_FORMAT_HELP = [
  '15/05/1850 (DD/MM/YYYY)',
  '15-5-1850 (DD-MM-YYYY)',
  'May 15 1850 (English)',
  'Mai 1850 (French month)',
  '1850 (Year only)',
];

export function EventDetailsPanel({
  eventType,
  person,
  formData,
  photos,
  witnesses = [],
  allPeople = [],
  places = [],
  citations = [],
  onUpdateField,
  onAddWitness,
  onRemoveWitness,
  onUpdateWitness,
  onCreatePlace,
  onCreateCitation,
  onUpdateCitation,
  error,
  disabled = false,
}) {
  const [showDateHelp, setShowDateHelp] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(
    photos.map((p) => p.id)
  );
  const [selectedCitationId, setSelectedCitationId] = useState(
    formData.citationId || null
  );

  const handlePhotoSelection = useCallback(
    (photoId) => {
      setSelectedPhotos((prev) =>
        prev.includes(photoId)
          ? prev.filter((id) => id !== photoId)
          : [...prev, photoId]
      );
    },
    []
  );

  const handleCitationSelection = useCallback(
    (citationId) => {
      setSelectedCitationId(citationId);
      onUpdateField('citationId', citationId);
    },
    [onUpdateField]
  );

  // ============================================
  // Render by Event Type
  // ============================================

  const renderEventTypeFields = () => {
    switch (eventType) {
      case 'baptism':
      case 'birth':
        return (
          <>
            <DateField
              value={formData.date}
              onChange={(val) => onUpdateField('date', val)}
              onShowHelp={() => setShowDateHelp(!showDateHelp)}
              showHelp={showDateHelp}
              error={error?.includes('date')}
            />

            <div className="form-group">
              <label htmlFor="place">Place</label>
              <PlacePicker
                value={formData.place}
                placeId={formData.placeId}
                places={places}
                onChange={({ place, placeId }) => {
                  onUpdateField('place', place);
                  onUpdateField('placeId', placeId);
                }}
                onCreatePlace={onCreatePlace}
                placeholder={`${eventType.charAt(0).toUpperCase() + eventType.slice(1)} place`}
              />
            </div>

            {eventType === 'baptism' && (
              <WitnessManager
                eventType="baptism"
                witnesses={witnesses}
                onAddWitness={onAddWitness}
                onRemoveWitness={onRemoveWitness}
                onUpdateWitness={onUpdateWitness}
                allPeople={allPeople}
                disabled={disabled}
              />
            )}
          </>
        );

      case 'marriage':
        return (
          <>
            <SpouseField
              spouseId={formData.spouse_id}
              spouseName={formData.spouse_name}
              onUpdateSpouseId={(val) => onUpdateField('spouse_id', val)}
              onUpdateSpouseName={(val) => onUpdateField('spouse_name', val)}
              error={error?.includes('spouse')}
            />

            <DateField
              value={formData.date}
              onChange={(val) => onUpdateField('date', val)}
              onShowHelp={() => setShowDateHelp(!showDateHelp)}
              showHelp={showDateHelp}
              error={error?.includes('date')}
            />

            <div className="form-group">
              <label htmlFor="place">Place</label>
              <PlacePicker
                value={formData.place}
                placeId={formData.placeId}
                places={places}
                onChange={({ place, placeId }) => {
                  onUpdateField('place', place);
                  onUpdateField('placeId', placeId);
                }}
                onCreatePlace={onCreatePlace}
                placeholder="Marriage place"
              />
            </div>

            <WitnessManager
              eventType="marriage"
              witnesses={witnesses}
              onAddWitness={onAddWitness}
              onRemoveWitness={onRemoveWitness}
              onUpdateWitness={onUpdateWitness}
              allPeople={allPeople}
              disabled={disabled}
            />
          </>
        );

      case 'death':
      case 'burial':
        return (
          <>
            <DateField
              value={formData.date}
              onChange={(val) => onUpdateField('date', val)}
              onShowHelp={() => setShowDateHelp(!showDateHelp)}
              showHelp={showDateHelp}
              error={error?.includes('date')}
            />

            <div className="form-group">
              <label htmlFor="place">Place</label>
              <PlacePicker
                value={formData.place}
                placeId={formData.placeId}
                places={places}
                onChange={({ place, placeId }) => {
                  onUpdateField('place', place);
                  onUpdateField('placeId', placeId);
                }}
                onCreatePlace={onCreatePlace}
                placeholder="Death place"
              />
            </div>

            {eventType === 'death' && (
              <div className="form-group">
                <label htmlFor="cause">Cause of Death (optional)</label>
                <input
                  id="cause"
                  type="text"
                  value={formData.cause || ''}
                  onChange={(e) => onUpdateField('cause', e.target.value)}
                  placeholder="e.g., pneumonia, old age"
                  className="form-input"
                />
              </div>
            )}

            <WitnessManager
              eventType={eventType}
              witnesses={witnesses}
              onAddWitness={onAddWitness}
              onRemoveWitness={onRemoveWitness}
              onUpdateWitness={onUpdateWitness}
              allPeople={allPeople}
              disabled={disabled}
            />
          </>
        );

      default:
        return (
          <>
            <DateField
              value={formData.date}
              onChange={(val) => onUpdateField('date', val)}
              onShowHelp={() => setShowDateHelp(!showDateHelp)}
              showHelp={showDateHelp}
              error={error?.includes('date')}
            />

            <div className="form-group">
              <label htmlFor="place">Place</label>
              <PlacePicker
                value={formData.place}
                placeId={formData.placeId}
                places={places}
                onChange={({ place, placeId }) => {
                  onUpdateField('place', place);
                  onUpdateField('placeId', placeId);
                }}
                onCreatePlace={onCreatePlace}
                placeholder="Burial place"
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="event-details-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>
          {eventType.charAt(0).toUpperCase() + eventType.slice(1)} Details
        </h3>
        <p className="panel-subtitle">
          {person.firstName} {person.lastName}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {/* Event Type Fields */}
      <div className="form-section">
        {renderEventTypeFields()}
      </div>

      {/* Confidence */}
      <div className="form-section">
        <label>Confidence in This Data</label>
        <div className="confidence-options">
          {CONFIDENCE_OPTIONS.map((option) => (
            <label key={option.value} className="radio-option">
              <input
                type="radio"
                name="confidence"
                value={option.value}
                checked={formData.confidence === option.value}
                onChange={(e) => onUpdateField('confidence', e.target.value)}
              />
              <span className="radio-label">{option.label}</span>
              <span className="radio-description">{option.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Photo References */}
      {photos.length > 0 && (
        <div className="form-section">
          <label>Photos Containing This Data</label>
          <div className="photo-checkboxes">
            {photos.map((photo, index) => (
              <label key={photo.id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={selectedPhotos.includes(photo.id)}
                  onChange={() => handlePhotoSelection(photo.id)}
                />
                <span className="checkbox-label">
                  Photo {index + 1} - {photo.label}
                  {photo.pageRange && <span> (p. {photo.pageRange})</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Citation Selection */}
      <div className="form-section">
        <label>
          Source Citation
          <button
            type="button"
            className="help-button"
            onClick={onCreateCitation}
            title="Create new citation"
            disabled={disabled}
          >
            +
          </button>
        </label>
        {citations.length > 0 ? (
          <div className="citation-selection">
            <select
              value={selectedCitationId || ''}
              onChange={(e) => handleCitationSelection(e.target.value || null)}
              className="form-input"
              disabled={disabled}
            >
              <option value="">-- Select a citation --</option>
              {citations.map((citation) => (
                <option key={citation.id} value={citation.id}>
                  {citation.source_name}
                  {citation.page && ` p. ${citation.page}`}
                  {citation.entry_number && ` #${citation.entry_number}`}
                </option>
              ))}
            </select>
            {selectedCitationId && (
              <div className="citation-details">
                {(() => {
                  const selected = citations.find((c) => c.id === selectedCitationId);
                  return selected ? (
                    <div className="citation-info">
                      <div className="citation-source">{selected.source_name}</div>
                      {selected.url && (
                        <a
                          href={selected.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="citation-url"
                        >
                          View Source
                        </a>
                      )}
                      <div className="citation-confidence">
                        Confidence: <strong>{selected.confidence}</strong>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="citation-empty">
            <p>No citations yet. Create one to link this record to a source.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCreateCitation}
              disabled={disabled}
            >
              + New Citation
            </button>
          </div>
        )}
      </div>

      {/* Notes/Transcription */}
      <div className="form-section">
        <label htmlFor="notes">Notes / Transcription (optional)</label>
        <textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => onUpdateField('notes', e.target.value)}
          placeholder="Transcription from record, witness names, additional context..."
          className="form-textarea"
          rows="4"
        />
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function DateField({ value, onChange, onShowHelp, showHelp, error }) {
  const parsedDate = useMemo(() => {
    return parseDateString(value);
  }, [value]);

  const isValid = parsedDate.type !== 'unknown' || (value === '' || value === '?');

  return (
    <div className="form-group">
      <label htmlFor="date">
        Event Date
        <button
          type="button"
          onClick={onShowHelp}
          className="help-button"
          title="Show date format examples"
        >
          ?
        </button>
      </label>
      <input
        id="date"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="15/05/1850 or May 15 1850"
        className={`form-input ${error ? 'error' : ''}`}
      />

      {/* Display parsed date if valid */}
      {value && isValid && (
        <div className="date-preview">
          <span className="date-preview-label">Parsed as:</span>
          <span className="date-preview-value">{parsedDate.display}</span>
        </div>
      )}

      {showHelp && (
        <div className="date-help">
          <strong>Accepted formats:</strong>
          <ul>
            {DATE_FORMAT_HELP.map((format, i) => (
              <li key={i}>{format}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpouseField({ spouseId, spouseName, onUpdateSpouseId, onUpdateSpouseName, error }) {
  return (
    <div className="form-group">
      <label htmlFor="spouse">
        Spouse / Partner {error && <span className="error-marker">*</span>}
      </label>
      <input
        id="spouse"
        type="text"
        value={spouseName}
        onChange={(e) => onUpdateSpouseName(e.target.value)}
        placeholder="Enter spouse name"
        className={`form-input ${error ? 'error' : ''}`}
      />
      {/* TODO: In real implementation, add spouse picker/search */}
      <p className="form-hint">
        Type spouse name to search existing people or create new
      </p>
    </div>
  );
}
