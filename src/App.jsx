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
import { dbDateToLegacy, dbEventToLegacy } from './utils/formatConverters';
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
import { usePersonOperations } from './hooks/usePersonOperations';
import { usePersonViewConfig } from './hooks/usePersonViewConfig';
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

  // Extract person operations (save, unions, parents, children) to custom hook
  const personOps = usePersonOperations({
    storageMode,
    selectedPersonId,
    data,
    setData,
    showToast,
    updatePersonDb,
    createUnion,
    updateUnion,
    deleteUnion,
    addChild,
    removeChild,
    createEvent,
    updateEvent,
    deleteEvent,
    upsertBirthEvent,
    upsertDeathEvent,
    upsertMarriageEvent,
    getBirthEvent,
    getDeathEvent,
    getEventsForPerson,
    getUnionsForPerson,
    getParentUnionForPerson,
    findOrCreateUnion,
    fetchAllUnions,
    triggerRefresh,
    setLoadedBirthEvent,
    setLoadedDeathEvent,
    setLoadedOtherEvents,
    setLoadedUnions,
    setLoadedParentUnion,
    loadedUnions,
    loadedOtherEvents,
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

  // Build PersonView configuration (all props consolidated into one object)
  const { personViewProps } = usePersonViewConfig({
    storageMode,
    selectedPersonId,
    personForView,
    peopleForView,
    unionsForView,
    data,
    dbUnions,
    places,
    personCitations,
    birthCitations,
    deathCitations,
    eventCitations,
    personUnionCitations,
    mediaCitations,
    dbSources,
    personOps,
    setFocusedView,
    navigateToPerson,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward,
    setSelectedPersonId,
    createPlace,
    createPerson,
    fetchPersons,
    deletePerson,
    fetchAllUnions,
    triggerRefresh,
    setData,
    generateId,
    citationHandlers,
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

      return <PersonView {...personViewProps} />;
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
