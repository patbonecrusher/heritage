/**
 * CitationList - Display citations for an event/person with add/edit capability
 */

import { useState } from 'react';
import { CONFIDENCE_LEVELS } from '../data/useSources';
import './CitationList.css';

export default function CitationList({
  citations = [],
  onAdd,
  onEdit,
  onDelete,
  isEditing = false,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0 && !isEditing) {
    return null;
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'certain': return 'var(--color-success, #22c55e)';
      case 'probable': return 'var(--color-primary)';
      case 'possible': return 'var(--color-warning, #f59e0b)';
      case 'uncertain': return 'var(--color-textMuted)';
      default: return 'var(--color-primary)';
    }
  };

  const formatCitation = (citation) => {
    const parts = [citation.source_name];
    if (citation.page) parts.push(`p. ${citation.page}`);
    if (citation.entry_number) parts.push(`#${citation.entry_number}`);
    if (citation.film_number) parts.push(`film ${citation.film_number}`);
    return parts.join(', ');
  };

  if (compact) {
    // Compact mode: just show count badge
    return (
      <div className="citation-list-compact">
        {citations.length > 0 && (
          <button
            className="citation-badge"
            onClick={() => setExpanded(!expanded)}
            title={`${citations.length} citation${citations.length !== 1 ? 's' : ''}`}
          >
            [{citations.length}]
          </button>
        )}
        {isEditing && onAdd && (
          <button className="citation-add-btn-inline" onClick={onAdd} title="Add citation">
            +cite
          </button>
        )}
        {expanded && citations.length > 0 && (
          <div className="citation-popover">
            {citations.map(citation => (
              <div key={citation.id} className="citation-popover-item">
                <span className="citation-text">{formatCitation(citation)}</span>
                {citation.url && (
                  <a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-link">↗</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full mode: show list with details
  return (
    <div className="citation-list">
      {citations.length > 0 && (
        <div className="citation-list-header">
          <span className="citation-list-title">
            Sources ({citations.length})
          </span>
        </div>
      )}

      {citations.map(citation => (
        <div key={citation.id} className="citation-item">
          <div className="citation-main">
            <span
              className="citation-confidence"
              style={{ backgroundColor: getConfidenceColor(citation.confidence) }}
              title={CONFIDENCE_LEVELS[citation.confidence] || citation.confidence}
            />
            <div className="citation-content">
              <span className="citation-source">{citation.source_name}</span>
              <span className="citation-detail">
                {[
                  citation.page && `p. ${citation.page}`,
                  citation.entry_number && `entry ${citation.entry_number}`,
                  citation.volume && `vol. ${citation.volume}`,
                  citation.film_number && `film ${citation.film_number}`,
                ].filter(Boolean).join(', ')}
              </span>
              {citation.transcription && (
                <div className="citation-transcription">"{citation.transcription}"</div>
              )}
            </div>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="citation-url"
                title="Open source"
              >
                ↗
              </a>
            )}
          </div>
          {isEditing && (
            <div className="citation-actions">
              {onEdit && (
                <button
                  className="citation-action-btn"
                  onClick={() => onEdit(citation)}
                  title="Edit"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  className="citation-action-btn danger"
                  onClick={() => onDelete(citation.id)}
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {isEditing && onAdd && (
        <button className="citation-add-btn" onClick={onAdd}>
          + Add Citation
        </button>
      )}
    </div>
  );
}
