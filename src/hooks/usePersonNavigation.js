/**
 * usePersonNavigation - Hook for person navigation with history management
 * Provides navigation with back/forward buttons and View Transitions API support
 */

import { useState, useCallback } from 'react';

export function usePersonNavigation() {
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [forwardHistory, setForwardHistory] = useState([]);

  // Navigate to a person, pushing current to history
  const navigateTo = useCallback((personId) => {
    if (personId && personId !== selectedPersonId) {
      const doNavigation = () => {
        // Push current person to history before navigating
        if (selectedPersonId) {
          setNavigationHistory(prev => [...prev, selectedPersonId]);
        }
        // Clear forward history when navigating to a new person
        setForwardHistory([]);
        setSelectedPersonId(personId);
      };

      // Use View Transitions API if available for smooth crossfade
      if (document.startViewTransition) {
        document.startViewTransition(doNavigation);
      } else {
        doNavigation();
      }
    }
  }, [selectedPersonId]);

  // Navigate back in history
  const navigateBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const doNavigation = () => {
        const prevPersonId = navigationHistory[navigationHistory.length - 1];
        // Push current person to forward history
        if (selectedPersonId) {
          setForwardHistory(prev => [...prev, selectedPersonId]);
        }
        setNavigationHistory(prev => prev.slice(0, -1));
        setSelectedPersonId(prevPersonId);
      };

      // Use View Transitions API if available for smooth crossfade
      if (document.startViewTransition) {
        document.startViewTransition(doNavigation);
      } else {
        doNavigation();
      }
    }
  }, [navigationHistory, selectedPersonId]);

  // Navigate forward in history
  const navigateForward = useCallback(() => {
    if (forwardHistory.length > 0) {
      const doNavigation = () => {
        const nextPersonId = forwardHistory[forwardHistory.length - 1];
        // Push current person to back history
        if (selectedPersonId) {
          setNavigationHistory(prev => [...prev, selectedPersonId]);
        }
        setForwardHistory(prev => prev.slice(0, -1));
        setSelectedPersonId(nextPersonId);
      };

      // Use View Transitions API if available for smooth crossfade
      if (document.startViewTransition) {
        document.startViewTransition(doNavigation);
      } else {
        doNavigation();
      }
    }
  }, [forwardHistory, selectedPersonId]);

  // Clear navigation history (when loading new file)
  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
    setForwardHistory([]);
  }, []);

  return {
    selectedPersonId,
    setSelectedPersonId,
    navigateTo,
    navigateBack,
    navigateForward,
    canGoBack: navigationHistory.length > 0,
    canGoForward: forwardHistory.length > 0,
    clearHistory,
  };
}
