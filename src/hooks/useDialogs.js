/**
 * useDialogs - Hook for managing dialog state
 * Handles union, preferences, and source dialogs
 */

import { useState, useCallback } from 'react';

export function useDialogs() {
  // Union dialog state
  const [unionDialogOpen, setUnionDialogOpen] = useState(false);
  const [editingUnionId, setEditingUnionId] = useState(null);
  const [unionDialogInitialData, setUnionDialogInitialData] = useState(null);
  const [pendingUnion, setPendingUnion] = useState(null);

  // Preferences dialog state
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Source dialog state
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [pendingSourceCallback, setPendingSourceCallback] = useState(null);

  // Union dialog handlers
  const openUnionDialog = useCallback(() => {
    setUnionDialogOpen(true);
  }, []);

  const closeUnionDialog = useCallback(() => {
    setUnionDialogOpen(false);
    setEditingUnionId(null);
    setUnionDialogInitialData(null);
    setPendingUnion(null);
  }, []);

  // Preferences dialog handlers
  const openPreferencesDialog = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const closePreferencesDialog = useCallback(() => {
    setPreferencesOpen(false);
  }, []);

  // Source dialog handlers
  const openSourceDialog = useCallback(() => {
    setSourceDialogOpen(true);
  }, []);

  const closeSourceDialog = useCallback(() => {
    setSourceDialogOpen(false);
    setEditingSource(null);
    setPendingSourceCallback(null);
  }, []);

  return {
    unionDialog: {
      isOpen: unionDialogOpen,
      editingId: editingUnionId,
      initialData: unionDialogInitialData,
      pendingUnion: pendingUnion,
      open: openUnionDialog,
      close: closeUnionDialog,
      setEditingId: setEditingUnionId,
      setInitialData: setUnionDialogInitialData,
      setPending: setPendingUnion,
    },
    preferencesDialog: {
      isOpen: preferencesOpen,
      open: openPreferencesDialog,
      close: closePreferencesDialog,
    },
    sourceDialog: {
      isOpen: sourceDialogOpen,
      editingSource: editingSource,
      open: openSourceDialog,
      close: closeSourceDialog,
      setEditingSource: setEditingSource,
      setPendingCallback: setPendingSourceCallback,
      pendingCallback: pendingSourceCallback,
    },
  };
}
