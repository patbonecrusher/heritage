/**
 * LibraryPanel - Collapsible right-side panel for Media and Places libraries
 * Supports drag-and-drop of items to PersonView fields
 */

import React, { useEffect } from 'react';
import { MediaPanelContent } from './MediaLibrary';
import { PlacesPanelContent } from './PlacesLibrary';
import './LibraryPanel.css';

export default function LibraryPanel({
  isOpen,
  activeTab,
  onTabChange,
  onToggle,
  onClose,
  onOpenPlacesLibrary,
  onOpenMediaLibrary,
}) {
  // Handle Escape key to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div className={`library-panel ${isOpen ? 'open' : 'closed'}`}>
      {/* Toggle button visible when closed */}
      {!isOpen && (
        <button
          className="library-panel-toggle-closed"
          onClick={onToggle}
          title="Open Library"
        >
          Library
        </button>
      )}

      {/* Panel content when open */}
      <div className="library-panel-inner">
        <div className="library-panel-header">
          <div className="library-panel-tabs">
            <button
              className={activeTab === 'media' ? 'active' : ''}
              onClick={() => onTabChange('media')}
            >
              Media
            </button>
            <button
              className={activeTab === 'places' ? 'active' : ''}
              onClick={() => onTabChange('places')}
            >
              Places
            </button>
          </div>
          <button
            className="library-panel-close"
            onClick={onToggle}
            title="Close Library"
          >
            ×
          </button>
        </div>

        <div className="library-panel-content">
          {activeTab === 'media' ? (
            <MediaPanelContent onOpenFullLibrary={onOpenMediaLibrary} />
          ) : (
            <PlacesPanelContent onOpenFullLibrary={onOpenPlacesLibrary} />
          )}
        </div>
      </div>
    </div>
  );
}
