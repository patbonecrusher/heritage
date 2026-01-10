/**
 * useFileOperations - Hook for file create/open/save operations
 * Handles both .heritage bundles and legacy JSON files
 */

import { useState, useCallback, useEffect } from 'react';
import { migrateToNewFormat } from '../utils/migration';
import { createEmptyData } from '../utils/dataModel';

export function useFileOperations({
  storageMode,
  setStorageMode,
  data,
  setData,
  navigation, // { setSelectedPersonId, clearHistory }
  createBundle,
  openBundle,
  openBundlePath,
  showToast,
}) {
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);

  // Load recent files when welcome screen is shown
  useEffect(() => {
    if (storageMode === null && window.electronAPI?.bundle?.getRecentFiles) {
      window.electronAPI.bundle.getRecentFiles().then(files => {
        setRecentFiles(files || []);
      });
    }
  }, [storageMode]);

  // Create new .heritage bundle
  const createNew = useCallback(async () => {
    const result = await createBundle('Family Tree');
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData());
      setCurrentFilePath(null);
      navigation.setSelectedPersonId(null);
      navigation.clearHistory();
    }
  }, [createBundle, setStorageMode, setData, navigation]);

  // Create new legacy JSON file
  const createNewLegacy = useCallback(() => {
    setStorageMode('legacy');
    setData(createEmptyData());
    setCurrentFilePath(null);
    navigation.setSelectedPersonId(null);
    navigation.clearHistory();
  }, [setStorageMode, setData, navigation]);

  // Save legacy JSON file (current or new)
  const save = useCallback(async (forceNewFile = false) => {
    const jsonString = JSON.stringify(data, null, 2);

    if (window.electronAPI) {
      if (currentFilePath && !forceNewFile) {
        const result = await window.electronAPI.writeFile({
          filePath: currentFilePath,
          data: jsonString,
        });
        if (result) {
          localStorage.setItem('heritage-last-file', result);
          showToast('Saved');
        }
      } else {
        const result = await window.electronAPI.saveFile({
          data: jsonString,
          defaultName: 'family.json',
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        if (result) {
          setCurrentFilePath(result);
          localStorage.setItem('heritage-last-file', result);
          showToast('Saved');
        }
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'family.json';
      link.href = url;
      link.click();
      showToast('Downloaded');
    }
  }, [data, currentFilePath, showToast]);

  // Open .heritage bundle
  const open = useCallback(async () => {
    const result = await openBundle();
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData()); // Will be loaded from database
      setCurrentFilePath(null);
      navigation.clearHistory();
      navigation.setSelectedPersonId(null);
    }
  }, [openBundle, setStorageMode, setData, navigation]);

  // Open recent .heritage bundle by path
  const openRecent = useCallback(async (filePath) => {
    const result = await openBundlePath(filePath);
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData());
      setCurrentFilePath(null);
      navigation.clearHistory();
      navigation.setSelectedPersonId(null);
    }
  }, [openBundlePath, setStorageMode, setData, navigation]);

  // Open legacy JSON file
  const openLegacy = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result && result.content) {
        const migratedData = migrateToNewFormat(result.content);
        setStorageMode('legacy');
        setData(migratedData);
        setCurrentFilePath(result.path);
        localStorage.setItem('heritage-last-file', result.path);
        navigation.clearHistory();

        if (migratedData.people?.length > 0) {
          navigation.setSelectedPersonId(migratedData.people[0].id);
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = JSON.parse(event.target.result);
          const migratedData = migrateToNewFormat(content);
          setStorageMode('legacy');
          setData(migratedData);
          navigation.clearHistory();

          if (migratedData.people?.length > 0) {
            navigation.setSelectedPersonId(migratedData.people[0].id);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }, [setStorageMode, setData, navigation]);

  return {
    currentFilePath,
    setCurrentFilePath,
    recentFiles,
    createNew,
    createNewLegacy,
    save,
    open,
    openRecent,
    openLegacy,
  };
}
