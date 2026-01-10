/**
 * useLibraryPanel - Hook for managing library panel state
 * Handles the collapsible library panel and modal library windows
 */

import { useState, useEffect } from 'react';

export function useLibraryPanel() {
  // Library panel (side panel with Media/Places tabs)
  const [libraryPanelOpen, setLibraryPanelOpen] = useState(() => {
    return localStorage.getItem('heritage-library-panel-open') === 'true';
  });
  const [libraryActiveTab, setLibraryActiveTab] = useState(() => {
    return localStorage.getItem('heritage-library-active-tab') || 'media';
  });

  // Full library modals (for editing/managing)
  const [placesLibraryOpen, setPlacesLibraryOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [sourcesLibraryOpen, setSourcesLibraryOpen] = useState(false);

  // Persist library panel state to localStorage
  useEffect(() => {
    localStorage.setItem('heritage-library-panel-open', libraryPanelOpen);
  }, [libraryPanelOpen]);

  useEffect(() => {
    localStorage.setItem('heritage-library-active-tab', libraryActiveTab);
  }, [libraryActiveTab]);

  return {
    libraryPanel: {
      isOpen: libraryPanelOpen,
      activeTab: libraryActiveTab,
      setIsOpen: setLibraryPanelOpen,
      setActiveTab: setLibraryActiveTab,
      toggleOpen: () => setLibraryPanelOpen(prev => !prev),
    },
    placesLibrary: {
      isOpen: placesLibraryOpen,
      open: () => setPlacesLibraryOpen(true),
      close: () => setPlacesLibraryOpen(false),
    },
    mediaLibrary: {
      isOpen: mediaLibraryOpen,
      open: () => setMediaLibraryOpen(true),
      close: () => setMediaLibraryOpen(false),
    },
    sourcesLibrary: {
      isOpen: sourcesLibraryOpen,
      open: () => setSourcesLibraryOpen(true),
      close: () => setSourcesLibraryOpen(false),
    },
  };
}
