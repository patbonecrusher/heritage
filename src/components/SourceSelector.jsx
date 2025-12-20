import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function SourceSelector({
  sources = {},
  selectedSourceIds = [],
  onChange,
  onAddNew
}) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const sourceList = Object.values(sources);
  const selectedSources = selectedSourceIds
    .map(id => sources[id])
    .filter(Boolean);

  const handleToggleSource = (sourceId) => {
    if (selectedSourceIds.includes(sourceId)) {
      onChange(selectedSourceIds.filter(id => id !== sourceId));
    } else {
      onChange([...selectedSourceIds, sourceId]);
    }
  };

  const getSourceTypeIcon = (type) => {
    switch (type) {
      case 'website': return '🌐';
      case 'church_record': return '⛪';
      case 'civil_record': return '🏛️';
      case 'census': return '📊';
      case 'book': return '📚';
      case 'document': return '📄';
      default: return '📋';
    }
  };

  return (
    <div className="source-selector">
      <div className="source-selected-list">
        {selectedSources.length > 0 ? (
          selectedSources.map(source => (
            <span key={source.id} className="source-tag">
              {getSourceTypeIcon(source.sourceType)} {source.title}
              <button
                type="button"
                className="source-tag-remove"
                onClick={() => handleToggleSource(source.id)}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="source-none">No sources attached</span>
        )}
      </div>

      <div className="source-actions">
        <button
          type="button"
          className="source-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Done' : 'Attach Source'}
        </button>
        <button
          type="button"
          className="source-btn source-btn-new"
          onClick={onAddNew}
        >
          + New
        </button>
      </div>

      {isOpen && (
        <div className="source-dropdown">
          {sourceList.length === 0 ? (
            <div className="source-dropdown-empty">
              No sources yet. Click "+ New" to create one.
            </div>
          ) : (
            sourceList.map(source => (
              <label key={source.id} className="source-dropdown-item">
                <input
                  type="checkbox"
                  checked={selectedSourceIds.includes(source.id)}
                  onChange={() => handleToggleSource(source.id)}
                />
                <span className="source-dropdown-icon">
                  {getSourceTypeIcon(source.sourceType)}
                </span>
                <span className="source-dropdown-title">{source.title}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
