import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import PedigreeView from './components/PedigreeView';
import DescendantsView from './components/DescendantsView';
import PersonView from './components/PersonView';
import PersonNode from './components/PersonNode';
import UnionNode from './components/UnionNode';
import UnionDialog from './components/UnionDialog';
import PreferencesDialog from './components/PreferencesDialog';
import SourceDialog from './components/SourceDialog';
import Toast from './components/Toast';
import WelcomeScreen from './components/WelcomeScreen';
import MediaLibrary from './components/MediaLibrary';
import PlacesLibrary from './components/PlacesLibrary';
import SourcesLibrary from './components/SourcesLibrary';
import LibraryPanel from './components/LibraryPanel';
import { exportToImage, exportToSvg } from './utils/export';
import { dateFormatToDbEvent, dbDateToLegacy, dbEventToLegacy } from './utils/formatConverters';
import { useTheme } from './contexts/ThemeContext';
import { useDatabase, usePersons, useUnions, useEvents, usePlaces, useSources, useMedia, generateId } from './data';
import { useToast } from './hooks/useToast';
import { useLibraryPanel } from './hooks/useLibraryPanel';
import { useDialogs } from './hooks/useDialogs';
import { usePersonNavigation } from './hooks/usePersonNavigation';
import { useFileOperations } from './hooks/useFileOperations';
import { usePersonDataLoader } from './hooks/usePersonDataLoader';
import { useCitationManager } from './hooks/useCitationManager';
import { usePersonForView } from './hooks/usePersonForView';
import { migrateToNewFormat, convertToReactFlow } from './utils/migration';
import { isNewFormat, createEmptyData, addPerson, updatePerson, findPersonById } from './utils/dataModel';

const nodeTypes = {
  person: PersonNode,
  union: UnionNode,
};

function App() {
  const reactFlowWrapper = useRef(null);
  const { fitView } = useReactFlow();
  const { theme } = useTheme();
  const { isOpen, bundleInfo, createBundle, openBundle, openBundlePath, closeBundle, isLoading, triggerRefresh } = useDatabase();
  const { persons, createPerson, updatePerson: updatePersonDb, deletePerson, getPerson, getPersonFull, fetchPersons } = usePersons();
  const { unions: dbUnions, createUnion, updateUnion, deleteUnion, addChild, removeChild, createChildForUnion, getUnionsForPerson, getParentUnionForPerson, findOrCreateUnion, fetchAllUnions } = useUnions();
  const { upsertBirthEvent, upsertDeathEvent, upsertMarriageEvent, getBirthEvent, getDeathEvent, getEventsForPerson, createEvent, updateEvent, deleteEvent, getAllVitalEvents } = useEvents();
  const { places, createPlace, fetchPlaces } = usePlaces();
  const { sources: dbSources, getCitationsForPerson, getCitationsForEvent, getCitationsForUnion, getCitationsForMedia, createCitation, updateCitation, deleteCitation } = useSources();
  const { getMediaForPerson } = useMedia();

  // Core data state - using new format (legacy JSON mode)
  const [data, setData] = useState(createEmptyData());

  // Mode: 'legacy' for JSON files, 'bundle' for .heritage bundles
  const [storageMode, setStorageMode] = useState(null); // null = welcome screen


  // Combined view data for pedigree/descendants views (works in both modes)
  const viewData = useMemo(() => {
    if (storageMode === 'bundle') {
      // Convert database format to legacy format for views
      return {
        people: persons.map(p => ({
          id: p.id,
          firstName: p.given_names || '',
          lastName: p.surname || '',
          maidenName: p.surname_at_birth || '',
          gender: p.gender || 'unknown',
          notes: p.notes || '',
          birthDate: dbDateToLegacy(p.birth_date, p.birth_date_qualifier, false),
          birthPlace: p.birth_place || '',
          deathDate: dbDateToLegacy(p.death_date, p.death_date_qualifier, p.is_living),
          deathPlace: p.death_place || '',
          events: (p.events || []).map(dbEventToLegacy),
        })),
        unions: dbUnions.map(u => ({
          id: u.id,
          partner1Id: u.person1_id,
          partner2Id: u.person2_id,
          type: u.type || 'marriage',
          childIds: u.childIds || [],
        })),
        sources: {},
      };
    }
    return data;
  }, [storageMode, persons, dbUnions, data]);

  // Helper to find union by ID (works in both modes)
  const findUnionById = useCallback((unionId) => {
    if (storageMode === 'bundle') {
      const dbUnion = dbUnions.find(u => u.id === unionId);
      if (dbUnion) {
        // Convert to format expected by UnionDialog
        return {
          id: dbUnion.id,
          partner1Id: dbUnion.person1_id,
          partner2Id: dbUnion.person2_id,
          type: dbUnion.type || 'marriage',
          childIds: dbUnion.childIds || [],
        };
      }
      return null;
    }
    return data.unions?.find(u => u.id === unionId) || null;
  }, [storageMode, dbUnions, data.unions]);

  // View mode state
  const [viewMode, setViewMode] = useState('focused'); // 'focused' | 'canvas'
  const [focusedView, setFocusedView] = useState('pedigree'); // 'pedigree' | 'descendants' | 'person'

  // Extract navigation logic to custom hook
  const navigation = usePersonNavigation();
  const { selectedPersonId, setSelectedPersonId, navigateTo: navigateToPerson, navigateBack, navigateForward, canGoBack: canNavigateBack, canGoForward: canNavigateForward, clearHistory: clearNavHistory } = navigation;

  // Extract dialog state to custom hook
  const dialogs = useDialogs();
  const { unionDialog, preferencesDialog, sourceDialog } = dialogs;
  const unionDialogOpen = unionDialog.isOpen;
  const editingUnionId = unionDialog.editingId;
  const unionDialogInitialData = unionDialog.initialData;
  const pendingUnion = unionDialog.pendingUnion;
  const setUnionDialogOpen = unionDialog.open;
  const setEditingUnionId = unionDialog.setEditingId;
  const setUnionDialogInitialData = unionDialog.setInitialData;
  const setPendingUnion = unionDialog.setPending;
  const preferencesOpen = preferencesDialog.isOpen;
  const setPreferencesOpen = preferencesDialog.open;
  const sourceDialogOpen = sourceDialog.isOpen;
  const editingSource = sourceDialog.editingSource;
  const pendingSourceCallback = sourceDialog.pendingCallback;
  const setSourceDialogOpen = sourceDialog.open;
  const setEditingSource = sourceDialog.setEditingSource;
  const setPendingSourceCallback = sourceDialog.setPendingCallback;

  // Extract toast state to custom hook
  const { toast, showToast, hideToast } = useToast();

  // Load person data using custom hook (bundle mode)
  const {
    loadedBirthEvent,
    setLoadedBirthEvent,
    loadedDeathEvent,
    setLoadedDeathEvent,
    loadedOtherEvents,
    setLoadedOtherEvents,
    loadedUnions,
    setLoadedUnions,
    loadedParentUnion,
    setLoadedParentUnion,
    loadedDataForPersonId,
    personCitations,
    setPersonCitations,
    birthCitations,
    setBirthCitations,
    deathCitations,
    setDeathCitations,
    eventCitations,
    setEventCitations,
    personUnionCitations,
    setPersonUnionCitations,
    unionCitations,
    setUnionCitations,
    mediaCitations,
    setMediaCitations,
    vitalEvents,
    setVitalEvents,
  } = usePersonDataLoader({
    storageMode,
    selectedPersonId,
    isOpen,
    editingUnionId,
    triggerRefresh,
    getBirthEvent,
    getDeathEvent,
    getEventsForPerson,
    getUnionsForPerson,
    getParentUnionForPerson,
    getCitationsForPerson,
    getCitationsForEvent,
    getCitationsForUnion,
    getMediaForPerson,
    getCitationsForMedia,
    getAllVitalEvents,
  });

  // Extract library panel state to custom hook
  const libraryPanelHook = useLibraryPanel();
  const libraryPanelOpen = libraryPanelHook.libraryPanel.isOpen;
  const setLibraryPanelOpen = libraryPanelHook.libraryPanel.setIsOpen;
  const libraryActiveTab = libraryPanelHook.libraryPanel.activeTab;
  const setLibraryActiveTab = libraryPanelHook.libraryPanel.setActiveTab;
  const placesLibraryOpen = libraryPanelHook.placesLibrary.isOpen;
  const setPlacesLibraryOpen = libraryPanelHook.placesLibrary.open;
  const closePlacesLibrary = libraryPanelHook.placesLibrary.close;
  const mediaLibraryOpen = libraryPanelHook.mediaLibrary.isOpen;
  const setMediaLibraryOpen = libraryPanelHook.mediaLibrary.open;
  const closeMediaLibrary = libraryPanelHook.mediaLibrary.close;
  const sourcesLibraryOpen = libraryPanelHook.sourcesLibrary.isOpen;
  const setSourcesLibraryOpen = libraryPanelHook.sourcesLibrary.open;
  const closeSourcesLibrary = libraryPanelHook.sourcesLibrary.close;

  // Extract citation management to custom hook (bundle mode)
  const citationHandlers = useCitationManager({
    setPersonCitations,
    setBirthCitations,
    setDeathCitations,
    setEventCitations,
    setPersonUnionCitations,
    setMediaCitations,
    setUnionCitations,
    getCitationsForPerson,
    getCitationsForEvent,
    getCitationsForUnion,
    getCitationsForMedia,
    getMediaForPerson,
    createCitation,
    updateCitation,
    deleteCitation,
    selectedPersonId,
    loadedBirthEvent,
    loadedDeathEvent,
    loadedOtherEvents,
    loadedUnions,
    editingUnionId,
  });

  // React Flow state for canvas mode
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load events and unions for selected person in bundle mode
  // Data loading is now handled by usePersonDataLoader hook

  // Convert data to React Flow format for canvas view
  const reactFlowData = useMemo(() => {
    return convertToReactFlow(data);
  }, [data]);

  // Update React Flow state when data changes (for canvas mode)
  useEffect(() => {
    if (viewMode === 'canvas') {
      setNodes(reactFlowData.nodes || []);
      setEdges(reactFlowData.edges || []);
    }
  }, [reactFlowData, viewMode, setNodes, setEdges]);

  // Sync storageMode with database state (handles bundle opened via double-click etc)
  useEffect(() => {
    if (isOpen && storageMode !== 'bundle') {
      setStorageMode('bundle');
      setData(createEmptyData());
      setCurrentFilePath(null);
      setNavigationHistory([]);
    }
  }, [isOpen, storageMode]);

  // Persist library panel state
  useEffect(() => {
    localStorage.setItem('heritage-library-panel-open', libraryPanelOpen);
  }, [libraryPanelOpen]);

  useEffect(() => {
    localStorage.setItem('heritage-library-active-tab', libraryActiveTab);
  }, [libraryActiveTab]);

  // Select first person when persons load in bundle mode
  useEffect(() => {
    if (storageMode === 'bundle' && isOpen && persons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(persons[0].id);
    }
  }, [storageMode, isOpen, persons, selectedPersonId]);

  // Vital events loading is handled by usePersonDataLoader hook

  // Disabled: auto-loading last file on startup
  // The app now starts fresh each time

  // Handle double-click on node (for canvas mode)
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'union') {
      const union = findUnionById(node.id);
      if (union) {
        setEditingUnionId(node.id);
        setUnionDialogInitialData(union);
        setUnionDialogOpen(true);
      }
    } else {
      // Navigate to person view
      setSelectedPersonId(node.id);
      setFocusedView('person');
    }
  }, [findUnionById]);

  // Handle union dialog save
  const handleUnionDialogSave = useCallback((dialogData) => {
    if (editingUnionId) {
      // Editing existing union
      setData(prev => ({
        ...prev,
        unions: (prev.unions || []).map(u =>
          u.id === editingUnionId
            ? {
                ...u,
                type: dialogData.unionType,
                startDate: dialogData.startDate,
                startPlace: dialogData.startPlace,
                endDate: dialogData.endDate,
                endReason: dialogData.endReason,
                sources: dialogData.unionSources
              }
            : u
        )
      }));
    } else if (pendingUnion) {
      // Creating new union
      const unionId = `union-${Date.now()}`;
      const newUnion = {
        id: unionId,
        partner1Id: pendingUnion.spouse1Id,
        partner2Id: pendingUnion.spouse2Id,
        type: dialogData.unionType || 'marriage',
        startDate: dialogData.startDate,
        startPlace: dialogData.startPlace,
        endDate: dialogData.endDate,
        endReason: dialogData.endReason,
        childIds: [],
        sources: dialogData.unionSources || []
      };

      setData(prev => ({
        ...prev,
        unions: [...(prev.unions || []), newUnion]
      }));
    }

    setUnionDialogOpen(false);
    setEditingUnionId(null);
    setUnionDialogInitialData(null);
    setPendingUnion(null);
    showToast('Saved');
  }, [editingUnionId, pendingUnion, showToast]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (unionDialogOpen) return;

      // Cmd+L to toggle library panel (works even in input fields)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        setLibraryPanelOpen(prev => !prev);
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'e' || e.key === 'E') {
        if (selectedPersonId) {
          e.preventDefault();
          setFocusedView('person');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPersonId, unionDialogOpen]);

  // Handle connection in canvas mode
  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      const isSpouseHandle = (handle) => handle?.startsWith('spouse-');
      const isSpouseConnection =
        sourceNode?.type === 'person' &&
        targetNode?.type === 'person' &&
        isSpouseHandle(params.sourceHandle);

      if (isSpouseConnection) {
        setPendingUnion({
          spouse1Id: params.source,
          spouse2Id: params.target,
          spouse1Pos: sourceNode.position,
          spouse2Pos: targetNode.position,
        });
        setUnionDialogOpen(true);
        return;
      }

      // For child connections, we need to find the union and add the child
      const sourceUnion = data.unions?.find(u => u.id === params.source);
      if (sourceUnion && targetNode?.type === 'person') {
        setData(prev => ({
          ...prev,
          unions: (prev.unions || []).map(u =>
            u.id === params.source
              ? { ...u, childIds: [...(u.childIds || []), params.target] }
              : u
          )
        }));
      }
    },
    [nodes, data]
  );

  // Add new person
  const addNode = useCallback(async () => {
    if (storageMode === 'bundle') {
      // Create in database
      const newId = await createPerson({
        given_names: '',
        surname: '',
        gender: 'unknown',
      });
      // Trigger refresh to update all hooks (including Sidebar)
      triggerRefresh();
      if (newId) {
        setSelectedPersonId(newId);
        setFocusedView('person');
      }
    } else {
      // Legacy mode - create in local state
      const newId = String(Date.now());
      const newPerson = {
        id: newId,
        firstName: '',
        lastName: '',
        middleName: '',
        maidenName: '',
        nickname: '',
        title: '',
        gender: 'male',
        birthDate: { type: 'unknown' },
        deathDate: { type: 'unknown' },
        birthPlace: '',
        deathPlace: '',
        notes: '',
        image: '',
        events: [],
      };
      setData(prev => ({
        ...prev,
        people: [...(prev.people || []), newPerson]
      }));
      setSelectedPersonId(newId);
      setFocusedView('person');
    }
  }, [storageMode, createPerson, triggerRefresh]);

  // Handle menu actions from person node
  const handleMenuAction = useCallback(async (nodeId, action) => {
    const person = findPersonById(data, nodeId);
    if (!person) return;

    if (action === 'add-photo' || action === 'remove-photo') {
      let image = null;
      if (action === 'add-photo') {
        if (window.electronAPI) {
          image = await window.electronAPI.selectImage();
        } else {
          image = await selectImageWeb();
        }
      }
      setData(prev => updatePerson(prev, nodeId, { image }));
    } else if (action === 'edit-info') {
      setSelectedPersonId(nodeId);
      setFocusedView('person');
    }
  }, [data]);

  const selectImageWeb = () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  };

  // Add handlers to canvas nodes
  const nodesWithHandlers = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onMenuAction: handleMenuAction,
        onDoubleClick: node.type === 'person'
          ? (personId) => {
              setSelectedPersonId(personId);
              setFocusedView('person');
            }
          : (unionId) => {
              const union = findUnionById(unionId);
              if (union) {
                setEditingUnionId(unionId);
                setUnionDialogInitialData(union);
                setUnionDialogOpen(true);
              }
            }
      },
    }));
  }, [nodes, handleMenuAction, findUnionById]);

  // Export functions
  const handleExportPng = useCallback(async () => {
    if (reactFlowWrapper.current) {
      const dataUrl = await exportToImage(reactFlowWrapper.current, theme);
      if (window.electronAPI) {
        const base64Data = dataUrl.split(',')[1];
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        await window.electronAPI.saveFile({
          data: Array.from(buffer),
          defaultName: 'chart.png',
          filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });
      } else {
        const link = document.createElement('a');
        link.download = 'chart.png';
        link.href = dataUrl;
        link.click();
      }
    }
  }, [theme]);

  const handleExportSvg = useCallback(async () => {
    if (reactFlowWrapper.current) {
      const svgString = await exportToSvg(reactFlowWrapper.current, theme);
      if (window.electronAPI) {
        await window.electronAPI.saveFile({
          data: svgString,
          defaultName: 'chart.svg',
          filters: [{ name: 'SVG Image', extensions: ['svg'] }]
        });
      } else {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'chart.svg';
        link.href = url;
        link.click();
      }
    }
  }, [theme]);

  // File operations
  // Extract file operations to custom hook
  const fileOps = useFileOperations({
    storageMode,
    setStorageMode,
    data,
    setData,
    navigation: { setSelectedPersonId, clearHistory: clearNavHistory },
    createBundle,
    openBundle,
    openBundlePath,
    showToast,
  });
  const { currentFilePath, setCurrentFilePath, recentFiles, createNew: handleNew, createNewLegacy: handleNewLegacy, save: handleSave, open: handleLoad, openRecent: handleOpenRecentFile, openLegacy: handleLoadLegacy } = fileOps;

  // Source management
  const handleAddSource = useCallback((callback) => {
    setEditingSource(null);
    setPendingSourceCallback(() => callback);
    setSourceDialogOpen(true);
  }, []);

  const handleSourceSave = useCallback((source) => {
    setData(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [source.id]: source
      }
    }));
    setSourceDialogOpen(false);
    if (pendingSourceCallback) {
      pendingSourceCallback(source.id);
      setPendingSourceCallback(null);
    }
    setEditingSource(null);
  }, [pendingSourceCallback]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleOpenPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  // Listen for menu events from Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.onMenuNew(() => handleNew());
    window.electronAPI.onMenuOpen(() => handleLoad());
    window.electronAPI.onMenuSave(() => handleSave());
    window.electronAPI.onMenuSaveAs(() => handleSave(true));
    window.electronAPI.onMenuExportPng(() => handleExportPng());
    window.electronAPI.onMenuExportSvg(() => handleExportSvg());
    window.electronAPI.onMenuAddPerson(() => addNode());
    window.electronAPI.onMenuFitView(() => handleFitView());
    window.electronAPI.onMenuPreferences(() => handleOpenPreferences());
    window.electronAPI.onMenuToggleLibrary(() => setLibraryPanelOpen(prev => !prev));
    window.electronAPI.onMenuViewPedigree(() => {
      setViewMode('focused');
      setFocusedView('pedigree');
    });
    window.electronAPI.onMenuViewDescendants(() => {
      setViewMode('focused');
      setFocusedView('descendants');
    });
    window.electronAPI.onMenuViewPerson(() => {
      if (selectedPersonId) {
        setViewMode('focused');
        setFocusedView('person');
      }
    });
    window.electronAPI.onMenuViewCanvas(() => {
      setViewMode('canvas');
    });

    return () => {
      if (window.electronAPI?.removeMenuListeners) {
        window.electronAPI.removeMenuListeners();
      }
    };
  }, [handleNew, handleLoad, handleSave, handleExportPng, handleExportSvg, addNode, handleFitView, handleOpenPreferences, selectedPersonId]);

  // Get selected person data (works in both bundle and legacy modes)
  const selectedPerson = storageMode === 'bundle'
    ? persons.find(p => p.id === selectedPersonId)
    : findPersonById(data, selectedPersonId);

  // Transform person and unions data to view format (must be at top level of component)
  const { personForView, unionsForView, allPeople: peopleForView } = usePersonForView({
    storageMode,
    selectedPersonId,
    selectedPerson,
    loadedBirthEvent,
    loadedDeathEvent,
    loadedOtherEvents,
    loadedUnions,
    loadedParentUnion,
    loadedDataForPersonId,
    persons,
    vitalEvents,
    data,
  });

  // Render main view based on mode
  const renderMainView = () => {
    if (viewMode === 'canvas') {
      return (
        <div className="chart-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            connectionMode="loose"
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => node.data.color || '#6366f1'}
              maskColor="rgba(0,0,0,0.1)"
            />
            <Background variant="dots" gap={20} size={1} />
          </ReactFlow>
        </div>
      );
    }

    // Person view mode (read-only with edit capability)
    if (focusedView === 'person') {
      // If no valid person is selected, render pedigree view instead
      if (!selectedPerson) {
        return (
          <PedigreeView
            data={viewData}
            focusPersonId={selectedPersonId}
            onSelectPerson={navigateToPerson}
            onEditPerson={(personId) => {
              setSelectedPersonId(personId);
              setFocusedView('person');
            }}
            onEditUnion={(unionId) => {
              const union = findUnionById(unionId);
              if (union) {
                setEditingUnionId(unionId);
                setUnionDialogInitialData(union);
                setUnionDialogOpen(true);
              }
            }}
            onMenuAction={handleMenuAction}
          />
        );
      }

      return (
        <PersonView
          person={personForView}
          sources={data.sources || {}}
          onAddSource={handleAddSource}
          allPeople={peopleForView}
          existingUnions={unionsForView}
          allUnions={storageMode === 'bundle'
            ? dbUnions.map(u => ({
                id: u.id,
                partner1Id: u.person1_id,
                partner2Id: u.person2_id,
                childIds: u.childIds || [],
              }))
            : (data.unions || [])}
          onUnionsChange={async (updatedUnions) => {
            if (storageMode === 'bundle') {
              // Handle unions in bundle mode via database
              const existingUnionIds = new Set(loadedUnions.map(u => u.id));
              const updatedUnionIds = new Set(updatedUnions.map(u => u.id));

              // Delete removed unions
              for (const existing of loadedUnions) {
                if (!updatedUnionIds.has(existing.id)) {
                  await deleteUnion(existing.id);
                }
              }

              // Create or update unions
              for (const union of updatedUnions) {
                if (!existingUnionIds.has(union.id) || union.id.startsWith('union-new-')) {
                  // Create new union
                  const newUnionId = await createUnion({
                    person1_id: selectedPersonId,
                    person2_id: union.partnerId || union.partner2Id,
                    type: union.type || 'marriage',
                    status: union.endReason || null,
                    prior_status_1: union.priorStatus1 || null,
                    prior_status_2: union.priorStatus2 || null,
                  });
                  // Add children to new union
                  for (const childId of (union.childIds || [])) {
                    await addChild(newUnionId, childId);
                  }
                  // Create marriage event if date provided
                  if (union.startDate && union.startDate.type !== 'unknown') {
                    const eventData = dateFormatToDbEvent(union.startDate);
                    await createEvent({
                      union_id: newUnionId,
                      type: 'marriage',
                      date: eventData.date,
                      date_qualifier: eventData.date_qualifier,
                      place_detail: union.startPlace || null,
                      place_id: union.startPlaceId || null,
                    });
                  }
                } else {
                  // Update existing union
                  // Need to map priorStatus based on who is person1 in the database
                  const existingDbUnion = loadedUnions.find(u => u.id === union.id);
                  const isCurrentPerson1 = existingDbUnion?.person1_id === selectedPersonId;
                  await updateUnion(union.id, {
                    type: union.type,
                    status: union.endReason || null,
                    // priorStatus1 in PersonView is always the current person's status
                    // Map it back to the correct database column based on who is person1
                    prior_status_1: isCurrentPerson1 ? (union.priorStatus1 || null) : (union.priorStatus2 || null),
                    prior_status_2: isCurrentPerson1 ? (union.priorStatus2 || null) : (union.priorStatus1 || null),
                  });

                  // Update marriage event (date/place)
                  if (union.startDate && union.startDate.type !== 'unknown') {
                    const eventData = dateFormatToDbEvent(union.startDate);
                    await upsertMarriageEvent(union.id, {
                      date: eventData.date,
                      date_qualifier: eventData.date_qualifier,
                      place_detail: union.startPlace || null,
                      place_id: union.startPlaceId || null,
                    });
                  }

                  // Sync children - compare existing vs updated
                  const existingUnion = loadedUnions.find(u => u.id === union.id);
                  const existingChildIds = new Set((existingUnion?.children || []).map(c => c.id));
                  const updatedChildIds = new Set(union.childIds || []);

                  // Remove children that are no longer in the union
                  for (const existingChildId of existingChildIds) {
                    if (!updatedChildIds.has(existingChildId)) {
                      await removeChild(union.id, existingChildId);
                    }
                  }

                  // Add new children
                  for (const childId of updatedChildIds) {
                    if (!existingChildIds.has(childId)) {
                      await addChild(union.id, childId);
                    }
                  }
                }
              }

              // Reload unions for PersonView
              const reloadedUnions = await getUnionsForPerson(selectedPersonId);
              setLoadedUnions(reloadedUnions || []);
              // Also refresh the global unions list for pedigree/descendants views
              await fetchAllUnions();
            } else {
              // Legacy mode - update local state
              setData(prev => {
                const otherUnions = (prev.unions || []).filter(u =>
                  u.partner1Id !== selectedPersonId && u.partner2Id !== selectedPersonId
                );
                return {
                  ...prev,
                  unions: [...otherUnions, ...updatedUnions]
                };
              });
            }
          }}
          onSave={async (updatedData) => {
            if (selectedPersonId) {
              if (storageMode === 'bundle') {
                // Save person to database
                const isLiving = updatedData.deathDate?.type === 'alive';
                await updatePersonDb(selectedPersonId, {
                  given_names: updatedData.firstName,
                  surname: updatedData.lastName,
                  surname_at_birth: updatedData.maidenName,
                  nickname: updatedData.nickname,
                  gender: updatedData.gender,
                  notes: updatedData.notes,
                  is_living: isLiving ? 1 : 0,
                });

                // Save birth event to database
                if (updatedData.birthDate && updatedData.birthDate.type !== 'unknown') {
                  const birthEventData = dateFormatToDbEvent(updatedData.birthDate);
                  await upsertBirthEvent(selectedPersonId, {
                    date: birthEventData.date,
                    date_qualifier: birthEventData.date_qualifier,
                    place_id: updatedData.birthPlaceId || null,
                    place_detail: updatedData.birthPlace || null,
                  });
                }

                // Save death event to database (only if not living)
                if (!isLiving && updatedData.deathDate && updatedData.deathDate.type !== 'unknown') {
                  const deathEventData = dateFormatToDbEvent(updatedData.deathDate);
                  await upsertDeathEvent(selectedPersonId, {
                    date: deathEventData.date,
                    date_qualifier: deathEventData.date_qualifier,
                    place_id: updatedData.deathPlaceId || null,
                    place_detail: updatedData.deathPlace || null,
                  });
                }

                // Handle other events (non-birth/death)
                const updatedEvents = updatedData.events || [];
                const updatedEventIds = new Set(updatedEvents.filter(e => e.id).map(e => e.id));
                const loadedEventIds = new Set(loadedOtherEvents.map(e => e.id));

                // Delete removed events
                for (const loadedEvent of loadedOtherEvents) {
                  if (!updatedEventIds.has(loadedEvent.id)) {
                    await deleteEvent(loadedEvent.id);
                  }
                }

                // Create or update events
                for (const event of updatedEvents) {
                  const eventData = dateFormatToDbEvent(event.date);
                  if (!event.id || !loadedEventIds.has(event.id)) {
                    // Create new event
                    await createEvent({
                      person_id: selectedPersonId,
                      type: event.type,
                      date: eventData.date,
                      date_qualifier: eventData.date_qualifier,
                      place_id: event.placeId || null,
                      place_detail: event.place || null,
                      description: event.description || null,
                    });
                  } else {
                    // Update existing event
                    await updateEvent(event.id, {
                      type: event.type,
                      date: eventData.date,
                      date_qualifier: eventData.date_qualifier,
                      place_id: event.placeId || null,
                      place_detail: event.place || null,
                      description: event.description || null,
                    });
                  }
                }

                // Reload events after save
                const [birth, death, allEvents] = await Promise.all([
                  getBirthEvent(selectedPersonId),
                  getDeathEvent(selectedPersonId),
                  getEventsForPerson(selectedPersonId),
                ]);
                setLoadedBirthEvent(birth);
                setLoadedDeathEvent(death);
                const otherEvents = (allEvents || []).filter(e => e.type !== 'birth' && e.type !== 'death');
                setLoadedOtherEvents(otherEvents);

                // Trigger refresh to update sidebar
                triggerRefresh();

                showToast('Saved');
              } else {
                // Legacy mode - update local state
                setData(prev => ({
                  ...prev,
                  people: (prev.people || []).map(p =>
                    p.id === selectedPersonId
                      ? { ...p, ...updatedData }
                      : p
                  )
                }));
                showToast('Saved');
              }
            }
          }}
          onCancel={() => {
            setFocusedView('pedigree');
          }}
          onSelectPerson={navigateToPerson}
          onNavigateBack={navigateBack}
          canNavigateBack={canNavigateBack}
          onNavigateForward={navigateForward}
          canNavigateForward={canNavigateForward}
          places={places}
          onCreatePlace={async (name) => {
            if (storageMode === 'bundle') {
              const id = await createPlace({ name });
              // Return the created place object
              return { id, name };
            }
            return null;
          }}
          onParentsChange={async ({ personId, fatherId, motherId }) => {
            if (storageMode === 'bundle') {
              // Handle parent changes in bundle mode via database

              // First, remove person from any existing parent union
              const existingParentUnion = await getParentUnionForPerson(personId);
              if (existingParentUnion) {
                await removeChild(existingParentUnion.id, personId);
              }

              // If new parents selected, add to their union
              if (fatherId || motherId) {
                // Find or create union for parents
                const unionId = await findOrCreateUnion(
                  fatherId || motherId,
                  fatherId && motherId ? (fatherId === (fatherId || motherId) ? motherId : fatherId) : null
                );
                // Add this person as child
                await addChild(unionId, personId);
              }

              // Reload unions (both partner unions and parent union)
              const [reloadedUnions, reloadedParentUnion] = await Promise.all([
                getUnionsForPerson(selectedPersonId),
                getParentUnionForPerson(personId),
              ]);
              setLoadedUnions(reloadedUnions || []);
              setLoadedParentUnion(reloadedParentUnion);
              // Also refresh the global unions list for pedigree/descendants views
              await fetchAllUnions();
            } else {
              // Legacy mode
              setData(prev => {
                // Find existing union where this person is a child
                const existingParentUnion = (prev.unions || []).find(u =>
                  (u.childIds || []).includes(personId)
                );

                // If no parents selected, remove person from any parent union
                if (!fatherId && !motherId) {
                  if (existingParentUnion) {
                    return {
                      ...prev,
                      unions: prev.unions.map(u =>
                        u.id === existingParentUnion.id
                          ? { ...u, childIds: (u.childIds || []).filter(id => id !== personId) }
                          : u
                      ).filter(u => (u.childIds || []).length > 0 || u.partner1Id || u.partner2Id)
                    };
                  }
                  return prev;
                }

                // Check if there's already a union between these two parents
                const parentsUnion = (prev.unions || []).find(u =>
                  (u.partner1Id === fatherId && u.partner2Id === motherId) ||
                  (u.partner1Id === motherId && u.partner2Id === fatherId) ||
                  (fatherId && !motherId && (u.partner1Id === fatherId || u.partner2Id === fatherId)) ||
                  (motherId && !fatherId && (u.partner1Id === motherId || u.partner2Id === motherId))
                );

                if (parentsUnion) {
                  // Add person to existing parents union, remove from old union if different
                  let updatedUnions = prev.unions.map(u => {
                    if (u.id === parentsUnion.id) {
                      const newChildIds = (u.childIds || []).includes(personId)
                        ? u.childIds
                        : [...(u.childIds || []), personId];
                      return { ...u, childIds: newChildIds };
                    }
                    if (existingParentUnion && u.id === existingParentUnion.id && u.id !== parentsUnion.id) {
                      return { ...u, childIds: (u.childIds || []).filter(id => id !== personId) };
                    }
                    return u;
                  });
                  return { ...prev, unions: updatedUnions };
                }

                // Create new union for parents
                const newUnion = {
                  id: `union-${Date.now()}`,
                  partner1Id: fatherId || '',
                  partner2Id: motherId || '',
                  type: 'marriage',
                  startDate: null,
                  startPlace: '',
                  endDate: null,
                  endReason: '',
                  childIds: [personId],
                  sources: []
                };

                // Remove from old parent union if exists
                let updatedUnions = existingParentUnion
                  ? prev.unions.map(u =>
                      u.id === existingParentUnion.id
                        ? { ...u, childIds: (u.childIds || []).filter(id => id !== personId) }
                        : u
                    )
                  : prev.unions || [];

                return { ...prev, unions: [...updatedUnions, newUnion] };
              });
            }
          }}
          onRemoveChild={async (unionId, childId) => {
            if (storageMode === 'bundle') {
              // Remove child from union in database
              await removeChild(unionId, childId);
              // Reload unions
              const reloadedUnions = await getUnionsForPerson(selectedPersonId);
              setLoadedUnions(reloadedUnions || []);
              // Also refresh the global unions list for pedigree/descendants views
              await fetchAllUnions();
            } else {
              // Legacy mode - remove child from union
              setData(prev => ({
                ...prev,
                unions: prev.unions.map(u =>
                  u.id === unionId
                    ? { ...u, childIds: (u.childIds || []).filter(id => id !== childId) }
                    : u
                )
              }));
            }
          }}
          onCreatePerson={({ firstName, lastName, gender }) => {
            if (storageMode === 'bundle') {
              // Generate ID upfront so we can return it immediately
              // The person will be created asynchronously in the database
              const newId = generateId();
              // Create person in database asynchronously
              createPerson({
                id: newId,
                given_names: firstName || '',
                surname: lastName || '',
                gender: gender || 'unknown',
              }).then(() => {
                // Refresh persons list after creation
                fetchPersons();
              });
              return newId;
            } else {
              // Legacy mode
              const newId = String(Date.now());
              const newPerson = {
                id: newId,
                firstName: firstName || '',
                lastName: lastName || '',
                middleName: '',
                maidenName: '',
                nickname: '',
                title: '',
                gender: gender || 'male',
                birthDate: { type: 'unknown' },
                deathDate: { type: 'unknown' },
                birthPlace: '',
                deathPlace: '',
                notes: '',
                image: '',
                events: [],
              };
              setData(prev => ({
                ...prev,
                people: [...(prev.people || []), newPerson]
              }));
              return newId;
            }
          }}
          onDelete={async (personId) => {
            if (storageMode === 'bundle') {
              // Clear selection first to avoid showing deleted person
              setSelectedPersonId(null);
              setFocusedView('pedigree');
              // Then delete and trigger refresh for all hooks (including Sidebar)
              await deletePerson(personId);
              await fetchAllUnions();
              triggerRefresh();
            } else {
              // Legacy mode - clear selection first
              setSelectedPersonId(null);
              setFocusedView('pedigree');
              // Then update data
              setData(prev => ({
                ...prev,
                people: (prev.people || []).filter(p => p.id !== personId),
                // Also remove from any unions
                unions: (prev.unions || []).map(u => ({
                  ...u,
                  childIds: (u.childIds || []).filter(id => id !== personId)
                })).filter(u => u.partner1Id !== personId && u.partner2Id !== personId)
              }));
            }
          }}
          // Citation props
          personCitations={personCitations}
          birthCitations={birthCitations}
          deathCitations={deathCitations}
          eventCitations={eventCitations}
          unionCitations={personUnionCitations}
          mediaCitations={mediaCitations}
          onCreateCitation={citationHandlers.onCreateCitation}
          onUpdateCitation={citationHandlers.onUpdateCitation}
          onDeleteCitation={citationHandlers.onDeleteCitation}
          dbSources={dbSources}
        />
      );
    }

    if (focusedView === 'pedigree') {
      return (
        <PedigreeView
          data={viewData}
          focusPersonId={selectedPersonId}
          onSelectPerson={navigateToPerson}
          onEditPerson={(personId) => {
            setSelectedPersonId(personId);
            setFocusedView('person');
          }}
          onEditUnion={(unionId) => {
            const union = findUnionById(unionId);
            if (union) {
              setEditingUnionId(unionId);
              setUnionDialogInitialData(union);
              setUnionDialogOpen(true);
            }
          }}
          onMenuAction={handleMenuAction}
        />
      );
    }

    return (
      <DescendantsView
        data={viewData}
        focusPersonId={selectedPersonId}
        onSelectPerson={navigateToPerson}
        onEditPerson={(personId) => {
          setSelectedPersonId(personId);
          setFocusedView('person');
        }}
        onEditUnion={(unionId) => {
          const union = findUnionById(unionId);
          if (union) {
            setEditingUnionId(unionId);
            setUnionDialogInitialData(union);
            setUnionDialogOpen(true);
          }
        }}
        onMenuAction={handleMenuAction}
      />
    );
  };

  // Show welcome screen if no file/bundle is open
  if (storageMode === null) {
    return (
      <WelcomeScreen
        onNewBundle={handleNew}
        onOpenBundle={handleLoad}
        onOpenRecentFile={handleOpenRecentFile}
        recentFiles={recentFiles}
        onNewLegacy={handleNewLegacy}
        onOpenLegacy={handleLoadLegacy}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="app">
      <TitleBar
        title="Heritage"
        subtitle={bundleInfo?.info?.name}
      />
      <div className="app-content">
        <Sidebar
          data={data}
          selectedPersonId={selectedPersonId}
          onSelectPerson={navigateToPerson}
          onEditPerson={(personId) => {
            setSelectedPersonId(personId);
            setViewMode('focused');
            setFocusedView('person');
          }}
          onAddPerson={addNode}
          storageMode={storageMode}
        />

        <div className="main-view">
          {renderMainView()}
        </div>

        {/* Library Panel - always in DOM for smooth animation */}
        <LibraryPanel
          isOpen={libraryPanelOpen}
          activeTab={libraryActiveTab}
          onTabChange={setLibraryActiveTab}
          onToggle={() => setLibraryPanelOpen(!libraryPanelOpen)}
          onOpenPlacesLibrary={() => setPlacesLibraryOpen(true)}
          onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
          onOpenSourcesLibrary={() => setSourcesLibraryOpen(true)}
          places={places}
        />
      </div>

      <UnionDialog
        isOpen={unionDialogOpen}
        onClose={() => {
          setUnionDialogOpen(false);
          setEditingUnionId(null);
          setUnionDialogInitialData(null);
          setPendingUnion(null);
        }}
        onSave={handleUnionDialogSave}
        initialData={unionDialogInitialData}
        citations={unionCitations}
        dbSources={dbSources}
        onCreateCitation={citationHandlers.onCreateUnionCitation}
        onUpdateCitation={citationHandlers.onUpdateUnionCitation}
        onDeleteCitation={citationHandlers.onDeleteUnionCitation}
      />

      <PreferencesDialog
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />

      <SourceDialog
        isOpen={sourceDialogOpen}
        onClose={() => {
          setSourceDialogOpen(false);
          setEditingSource(null);
          setPendingSourceCallback(null);
        }}
        onSave={handleSourceSave}
        initialData={editingSource}
      />

      {/* Full Library Modals - for editing/managing */}
      {placesLibraryOpen && (
        <PlacesLibrary onClose={() => setPlacesLibraryOpen(false)} onPlacesChanged={fetchPlaces} />
      )}
      {mediaLibraryOpen && (
        <MediaLibrary onClose={() => setMediaLibraryOpen(false)} />
      )}
      {sourcesLibraryOpen && (
        <SourcesLibrary onClose={() => setSourcesLibraryOpen(false)} />
      )}

      <Toast
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
