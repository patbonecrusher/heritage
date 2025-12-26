/**
 * DatabaseContext - Manages bundle state and provides database access
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DatabaseContext = createContext(null);

// Generate a new UUID
export const generateId = () => uuidv4();

export function DatabaseProvider({ children }) {
  const [bundleInfo, setBundleInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check if a bundle is open
  const isOpen = bundleInfo !== null;

  // Create a new bundle
  const createBundle = useCallback(async (name = 'Family Tree') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.bundle.create(name);
      if (result?.error) {
        setError(result.error);
        return null;
      }
      if (result) {
        setBundleInfo(result);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Open an existing bundle via dialog
  const openBundle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.bundle.open();
      if (result?.error) {
        setError(result.error);
        return null;
      }
      if (result) {
        setBundleInfo(result);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Open a bundle by path
  const openBundlePath = useCallback(async (path) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.bundle.openPath(path);
      if (result?.error) {
        setError(result.error);
        return null;
      }
      if (result) {
        setBundleInfo(result);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Close current bundle
  const closeBundle = useCallback(async () => {
    await window.electronAPI.bundle.close();
    setBundleInfo(null);
    setError(null);
  }, []);

  // Execute a SELECT query
  const query = useCallback(async (sql, params = []) => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.db.query(sql, params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.rows;
  }, [isOpen]);

  // Execute a SELECT query for a single row
  const get = useCallback(async (sql, params = []) => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.db.get(sql, params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.row;
  }, [isOpen]);

  // Execute an INSERT/UPDATE/DELETE
  const run = useCallback(async (sql, params = []) => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.db.run(sql, params);
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }, [isOpen]);

  // Execute multiple statements in a transaction
  const transaction = useCallback(async (statements) => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.db.transaction(statements);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.results;
  }, [isOpen]);

  // Import media
  const importMedia = useCallback(async (type = 'photos') => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.bundle.importMedia(type);
    if (result?.error) {
      throw new Error(result.error);
    }
    return result?.media || null;
  }, [isOpen]);

  // Resolve media path
  const resolveMediaPath = useCallback(async (relativePath) => {
    if (!isOpen || !relativePath) return null;
    return await window.electronAPI.bundle.resolveMedia(relativePath);
  }, [isOpen]);

  // Delete media
  const deleteMedia = useCallback(async (relativePath) => {
    if (!isOpen) {
      throw new Error('No bundle open');
    }
    const result = await window.electronAPI.bundle.deleteMedia(relativePath);
    if (result?.error) {
      throw new Error(result.error);
    }
    return true;
  }, [isOpen]);

  // Listen for bundle opened events (double-click)
  useEffect(() => {
    const handleBundleOpened = (data) => {
      if (data) {
        setBundleInfo(data);
      }
    };

    window.electronAPI.onBundleOpened(handleBundleOpened);

    return () => {
      // Cleanup handled by removeMenuListeners
    };
  }, []);

  // Listen for database changes (from MCP server or external tools)
  useEffect(() => {
    if (!window.electronAPI?.onDatabaseChanged) return;

    const handleDatabaseChanged = () => {
      console.log('Database changed externally, triggering refresh...');
      setRefreshTrigger(prev => prev + 1);
    };

    window.electronAPI.onDatabaseChanged(handleDatabaseChanged);

    return () => {
      // Cleanup handled by removeMenuListeners
    };
  }, []);

  const value = {
    // State
    bundleInfo,
    refreshTrigger,
    isOpen,
    isLoading,
    error,

    // Bundle operations
    createBundle,
    openBundle,
    openBundlePath,
    closeBundle,

    // Database operations
    query,
    get,
    run,
    transaction,

    // Media operations
    importMedia,
    resolveMediaPath,
    deleteMedia,

    // Utilities
    generateId,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

export default DatabaseContext;
