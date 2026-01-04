/**
 * CitationDialog - Dialog for adding/editing citations to events
 */

import { useState, useEffect } from 'react';
import { useSources, SOURCE_TYPES, CONFIDENCE_LEVELS } from '../data/useSources';
import './CitationDialog.css';

export default function CitationDialog({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  entityType = 'event', // 'event', 'person', 'union'
  entityId = null,
}) {
  const { sources, loading: sourcesLoading } = useSources();

  const [formData, setFormData] = useState({
    source_id: '',
    url: '',
    page: '',
    volume: '',
    entry_number: '',
    film_number: '',
    item_number: '',
    certificate_number: '',
    accessed_date: '',
    transcription: '',
    translation: '',
    abstract: '',
    confidence: 'probable',
    notes: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          source_id: initialData.source_id || '',
          url: initialData.url || '',
          page: initialData.page || '',
          volume: initialData.volume || '',
          entry_number: initialData.entry_number || '',
          film_number: initialData.film_number || '',
          item_number: initialData.item_number || '',
          certificate_number: initialData.certificate_number || '',
          accessed_date: initialData.accessed_date || '',
          transcription: initialData.transcription || '',
          translation: initialData.translation || '',
          abstract: initialData.abstract || '',
          confidence: initialData.confidence || 'probable',
          notes: initialData.notes || '',
        });
        // Show advanced if any advanced fields are filled
        if (initialData.volume || initialData.film_number || initialData.item_number ||
            initialData.certificate_number || initialData.translation || initialData.abstract) {
          setShowAdvanced(true);
        }
      } else {
        setFormData({
          source_id: '',
          url: '',
          page: '',
          volume: '',
          entry_number: '',
          film_number: '',
          item_number: '',
          certificate_number: '',
          accessed_date: new Date().toISOString().split('T')[0],
          transcription: '',
          translation: '',
          abstract: '',
          confidence: 'probable',
          notes: '',
        });
        setShowAdvanced(false);
      }
    }
  }, [isOpen, initialData]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.source_id) return;

    onSave({
      ...formData,
      [`${entityType}_id`]: entityId,
    });
  };

  const selectedSource = sources.find(s => s.id === formData.source_id);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog citation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{initialData ? 'Edit Citation' : 'Add Citation'}</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            {/* Source Selection */}
            <div className="form-group">
              <label className="field-label required">Source</label>
              {sourcesLoading ? (
                <div className="loading-text">Loading sources...</div>
              ) : sources.length === 0 ? (
                <div className="empty-text">No sources yet. Add sources in the Library panel.</div>
              ) : (
                <select
                  value={formData.source_id}
                  onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                  className="text-input"
                  autoFocus
                >
                  <option value="">Select a source...</option>
                  {sources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.name} ({SOURCE_TYPES[source.type] || source.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected source info */}
            {selectedSource && (
              <div className="source-info-box">
                <span className="source-type-badge">{SOURCE_TYPES[selectedSource.type]}</span>
                {selectedSource.url && (
                  <a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    {selectedSource.url}
                  </a>
                )}
              </div>
            )}

            {/* Common fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Page / Image #</label>
                <input
                  type="text"
                  value={formData.page}
                  onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                  className="text-input"
                  placeholder="e.g., 45 or image 234"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Entry / Record #</label>
                <input
                  type="text"
                  value={formData.entry_number}
                  onChange={(e) => setFormData({ ...formData, entry_number: e.target.value })}
                  className="text-input"
                  placeholder="e.g., 1234"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Direct URL</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="text-input"
                placeholder="Link to specific record..."
              />
            </div>

            {/* Advanced fields toggle */}
            <button
              type="button"
              className="toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '− Hide advanced fields' : '+ Show advanced fields'}
            </button>

            {showAdvanced && (
              <div className="advanced-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label className="field-label">Volume</label>
                    <input
                      type="text"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      className="text-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Film #</label>
                    <input
                      type="text"
                      value={formData.film_number}
                      onChange={(e) => setFormData({ ...formData, film_number: e.target.value })}
                      className="text-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="field-label">Item #</label>
                    <input
                      type="text"
                      value={formData.item_number}
                      onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                      className="text-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label">Certificate #</label>
                    <input
                      type="text"
                      value={formData.certificate_number}
                      onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                      className="text-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="field-label">Abstract / Summary</label>
                  <textarea
                    value={formData.abstract}
                    onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                    className="textarea-input"
                    rows={2}
                    placeholder="Brief summary of what this record says..."
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Translation</label>
                  <textarea
                    value={formData.translation}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    className="textarea-input"
                    rows={2}
                    placeholder="If transcription is in another language..."
                  />
                </div>
              </div>
            )}

            {/* Transcription */}
            <div className="form-group">
              <label className="field-label">Transcription</label>
              <textarea
                value={formData.transcription}
                onChange={(e) => setFormData({ ...formData, transcription: e.target.value })}
                className="textarea-input"
                rows={3}
                placeholder="Exact text from the record..."
              />
            </div>

            {/* Confidence and access date */}
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Confidence</label>
                <select
                  value={formData.confidence}
                  onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                  className="text-input"
                >
                  {Object.entries(CONFIDENCE_LEVELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="field-label">Date Accessed</label>
                <input
                  type="date"
                  value={formData.accessed_date}
                  onChange={(e) => setFormData({ ...formData, accessed_date: e.target.value })}
                  className="text-input"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="field-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="textarea-input"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!formData.source_id}
            >
              {initialData ? 'Save Changes' : 'Add Citation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
