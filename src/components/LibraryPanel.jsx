/**
 * LibraryPanel - Collapsible right-side panel for Media and Places libraries
 * Supports drag-and-drop of items to PersonView fields
 */

import React from 'react';
import { MediaPanelContent } from './MediaLibrary';
import { PlacesPanelContent } from './PlacesLibrary';
import { SourcesPanelContent } from './SourcesLibrary';
import './LibraryPanel.css';

export default function LibraryPanel({
  isOpen,
  activeTab,
  onTabChange,
  onToggle,
  onOpenPlacesLibrary,
  onOpenMediaLibrary,
  onOpenSourcesLibrary,
  places,
}) {
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
            <button
              className={activeTab === 'sources' ? 'active' : ''}
              onClick={() => onTabChange('sources')}
            >
              Sources
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
          {activeTab === 'media' && (
            <MediaPanelContent onOpenFullLibrary={onOpenMediaLibrary} />
          )}
          {activeTab === 'places' && (
            <PlacesPanelContent onOpenFullLibrary={onOpenPlacesLibrary} places={places} />
          )}
          {activeTab === 'sources' && (
            <SourcesPanelContent onOpenFullLibrary={onOpenSourcesLibrary} />
          )}
        </div>
      </div>
    </div>
  );
}
