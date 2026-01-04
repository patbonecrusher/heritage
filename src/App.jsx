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
import { useTheme } from './contexts/ThemeContext';
import { useDatabase, usePersons, useUnions, useEvents, usePlaces, useSources, useMedia, generateId } from './data';
import { migrateToNewFormat, convertToReactFlow } from './utils/migration';
import { isNewFormat, createEmptyData, addPerson, updatePerson, findPersonById } from './utils/dataModel';

const nodeTypes = {
  person: PersonNode,
  union: UnionNode,
};

// Helper to convert database event to PersonView date format
function dbEventToDateFormat(event) {
  if (!event || !event.date) {
    return { type: 'unknown' };
  }

  // Parse the date string (expected format: YYYY-MM-DD or YYYY-MM or YYYY)
  const dateParts = event.date.split('-');
  const year = dateParts[0] || '';
  const month = dateParts[1] || '';
  const day = dateParts[2] || '';

  // Handle qualifiers
  if (event.date_qualifier === 'about') {
    return {
      type: 'approximate',
      year,
      variance: 5,
      display: `c. ${year}`,
    };
  }

  // Build display string
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  let display = '';
  if (day && month && year) {
    display = `${parseInt(day)} ${MONTHS[parseInt(month) - 1]?.substring(0, 3)} ${year}`;
  } else if (month && year) {
    display = `${MONTHS[parseInt(month) - 1]} ${year}`;
  } else if (year) {
    display = year;
  }

  return {
    type: 'exact',
    year,
    month,
    day,
    display,
  };
}

// Helper to convert PersonView date format to database event format
function dateFormatToDbEvent(dateObj) {
  if (!dateObj || dateObj.type === 'unknown') {
    return { date: null, date_qualifier: 'exact' };
  }

  if (dateObj.type === 'alive') {
    return { date: null, date_qualifier: 'exact', is_living: true };
  }

  // Build date string
  let dateStr = '';
  if (dateObj.year) {
    dateStr = dateObj.year;
    if (dateObj.month) {
      dateStr += `-${dateObj.month.padStart(2, '0')}`;
      if (dateObj.day) {
        dateStr += `-${dateObj.day.padStart(2, '0')}`;
      }
    }
  }

  // Handle approximate dates
  if (dateObj.type === 'approximate') {
    return { date: dateStr || null, date_qualifier: 'about' };
  }

  return { date: dateStr || null, date_qualifier: 'exact' };
}

// Helper to convert database union to PersonView union format
function dbUnionToPersonViewFormat(dbUnion, currentPersonId) {
  const partnerId = dbUnion.person1_id === currentPersonId
    ? dbUnion.person2_id
    : dbUnion.person1_id;

  return {
    id: dbUnion.id,
    partner1Id: currentPersonId,
    partner2Id: partnerId,
    partnerId: partnerId,
    type: dbUnion.type || 'marriage',
    startDate: dbUnion.marriageEvent ? dbEventToDateFormat(dbUnion.marriageEvent) : { type: 'unknown' },
    startPlace: dbUnion.marriageEvent?.place_name || '',
    endDate: null,
    endReason: dbUnion.status || '',
    childIds: (dbUnion.children || []).map(c => c.id),
    sources: [],
    isExisting: true,
  };
}

function App() {
  const reactFlowWrapper = useRef(null);
  const { fitView } = useReactFlow();
  const { theme } = useTheme();
  const { isOpen, bundleInfo, createBundle, openBundle, openBundlePath, closeBundle, isLoading, triggerRefresh } = useDatabase();
  const { persons, createPerson, updatePerson: updatePersonDb, deletePerson, getPerson, getPersonFull, fetchPersons } = usePersons();
  const { unions: dbUnions, createUnion, updateUnion, deleteUnion, addChild, removeChild, createChildForUnion, getUnionsForPerson, getParentUnionForPerson, findOrCreateUnion, fetchAllUnions } = useUnions();
  const { upsertBirthEvent, upsertDeathEvent, getBirthEvent, getDeathEvent, getEventsForPerson, createEvent, updateEvent, deleteEvent, getAllVitalEvents } = useEvents();
  const { places } = usePlaces();
  const { sources: dbSources, getCitationsForPerson, getCitationsForEvent, getCitationsForUnion, getCitationsForMedia, createCitation, updateCitation, deleteCitation } = useSources();
  const { getMediaForPerson } = useMedia();

  // Loaded events for selected person (bundle mode)
  const [loadedBirthEvent, setLoadedBirthEvent] = useState(null);
  const [loadedDeathEvent, setLoadedDeathEvent] = useState(null);
  const [loadedOtherEvents, setLoadedOtherEvents] = useState([]);
  const [loadedUnions, setLoadedUnions] = useState([]);
  const [loadedParentUnion, setLoadedParentUnion] = useState(null); // Union where person is a child
  const [loadedDataForPersonId, setLoadedDataForPersonId] = useState(null); // Track which person data belongs to
  const [vitalEvents, setVitalEvents] = useState({}); // Map of personId -> { birthDate, deathDate, birthPlace, deathPlace }

  // Loaded citations for selected person (bundle mode)
  const [personCitations, setPersonCitations] = useState([]); // Citations attached to person
  const [birthCitations, setBirthCitations] = useState([]);
  const [deathCitations, setDeathCitations] = useState([]);
  const [eventCitations, setEventCitations] = useState({}); // Map of eventId -> citations[]
  const [personUnionCitations, setPersonUnionCitations] = useState({}); // Map of unionId -> citations[] for PersonView
  const [unionCitations, setUnionCitations] = useState([]); // Citations for union being edited in dialog
  const [mediaCitations, setMediaCitations] = useState({}); // Map of mediaId -> citations[] for PersonView

  // Core data state - using new format (legacy JSON mode)
  const [data, setData] = useState(createEmptyData());
  const [currentFilePath, setCurrentFilePath] = useState(null);

  // Mode: 'legacy' for JSON files, 'bundle' for .heritage bundles
  const [storageMode, setStorageMode] = useState(null); // null = welcome screen

  // Recent files for welcome screen
  const [recentFiles, setRecentFiles] = useState([]);

  // Helper to convert database date to legacy format
  const dbDateToLegacy = (dateStr, qualifier, isLiving) => {
    if (isLiving) return { type: 'alive' };
    if (!dateStr) return { type: 'unknown' };

    const parts = dateStr.split('-');
    const year = parts[0] || '';
    const month = parts[1] || '';
    const day = parts[2] || '';

    if (qualifier === 'about') {
      return { type: 'approximate', year, variance: 5, display: `c. ${year}` };
    }

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let display = year;
    if (month && day) {
      display = `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
    } else if (month) {
      display = `${MONTHS[parseInt(month) - 1]} ${year}`;
    }

    return { type: 'exact', year, month, day, display };
  };

  // Helper to convert database event to legacy format
  const dbEventToLegacy = (event) => ({
    id: event.id,
    type: event.type,
    date: dbDateToLegacy(event.date, event.date_qualifier, false),
    place: event.place_detail || event.place_name || '',
    description: event.description || '',
  });

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
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [forwardHistory, setForwardHistory] = useState([]);

  // Navigation functions
  const navigateToPerson = useCallback((personId) => {
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

  const canNavigateBack = navigationHistory.length > 0;
  const canNavigateForward = forwardHistory.length > 0;

  // React Flow state for canvas mode
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Union Dialog state
  const [unionDialogOpen, setUnionDialogOpen] = useState(false);
  const [editingUnionId, setEditingUnionId] = useState(null);
  const [unionDialogInitialData, setUnionDialogInitialData] = useState(null);
  const [pendingUnion, setPendingUnion] = useState(null);

  // Preferences Dialog state
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '' });
  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
  }, []);

  // Sources library (stored in data.sources)
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [pendingSourceCallback, setPendingSourceCallback] = useState(null);

  // Library panel (replaces modal libraries)
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

  // Load events and unions for selected person in bundle mode
  useEffect(() => {
    // Clear previous person's data immediately and mark as not-yet-loaded
    setLoadedBirthEvent(null);
    setLoadedDeathEvent(null);
    setLoadedOtherEvents([]);
    setLoadedUnions([]);
    setLoadedParentUnion(null);
    setLoadedDataForPersonId(null);
    setBirthCitations([]);
    setDeathCitations([]);
    setEventCitations({});
    setPersonUnionCitations({});
    setMediaCitations({});

    const loadPersonData = async () => {
      if (storageMode === 'bundle' && selectedPersonId && isOpen) {
        // Load birth and death events, unions (where person is partner), and parent union (where person is child)
        const [birth, death, allEvents, unions, parentUnion] = await Promise.all([
          getBirthEvent(selectedPersonId),
          getDeathEvent(selectedPersonId),
          getEventsForPerson(selectedPersonId),
          getUnionsForPerson(selectedPersonId),
          getParentUnionForPerson(selectedPersonId),
        ]);
        setLoadedBirthEvent(birth);
        setLoadedDeathEvent(death);
        // Filter out birth/death events from other events
        const otherEvents = (allEvents || []).filter(e => e.type !== 'birth' && e.type !== 'death');
        setLoadedOtherEvents(otherEvents);
        setLoadedUnions(unions || []);
        setLoadedParentUnion(parentUnion);
        // Mark that data is loaded for this specific person
        setLoadedDataForPersonId(selectedPersonId);

        // Load citations for person
        const personCits = await getCitationsForPerson(selectedPersonId);
        setPersonCitations(personCits || []);

        // Load citations for birth and death events
        if (birth?.id) {
          const citations = await getCitationsForEvent(birth.id);
          setBirthCitations(citations || []);
        }
        if (death?.id) {
          const citations = await getCitationsForEvent(death.id);
          setDeathCitations(citations || []);
        }

        // Load citations for other events
        const citationsMap = {};
        for (const event of otherEvents) {
          const citations = await getCitationsForEvent(event.id);
          if (citations && citations.length > 0) {
            citationsMap[event.id] = citations;
          }
        }
        setEventCitations(citationsMap);

        // Load citations for unions
        const unionCitationsMap = {};
        for (const union of (unions || [])) {
          const citations = await getCitationsForUnion(union.id);
          if (citations && citations.length > 0) {
            unionCitationsMap[union.id] = citations;
          }
        }
        setPersonUnionCitations(unionCitationsMap);

        // Load citations for media
        const media = await getMediaForPerson(selectedPersonId);
        const mediaCitationsMap = {};
        for (const item of (media || [])) {
          const citations = await getCitationsForMedia(item.id);
          if (citations && citations.length > 0) {
            mediaCitationsMap[item.id] = citations;
          }
        }
        setMediaCitations(mediaCitationsMap);
      }
    };
    loadPersonData();
  }, [storageMode, selectedPersonId, isOpen, getBirthEvent, getDeathEvent, getEventsForPerson, getUnionsForPerson, getParentUnionForPerson, getCitationsForPerson, getCitationsForEvent, getCitationsForUnion, getMediaForPerson, getCitationsForMedia]);

  // Load citations for union being edited
  useEffect(() => {
    const loadUnionCitations = async () => {
      if (storageMode === 'bundle' && editingUnionId && isOpen) {
        const citations = await getCitationsForUnion(editingUnionId);
        setUnionCitations(citations || []);
      } else {
        setUnionCitations([]);
      }
    };
    loadUnionCitations();
  }, [storageMode, editingUnionId, isOpen, getCitationsForUnion]);

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

  // Fetch recent files for welcome screen
  useEffect(() => {
    if (storageMode === null && window.electronAPI?.bundle?.getRecentFiles) {
      window.electronAPI.bundle.getRecentFiles().then(files => {
        setRecentFiles(files || []);
      });
    }
  }, [storageMode]);

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

  // Load vital events (birth/death) for all persons when bundle opens
  useEffect(() => {
    const loadVitalEvents = async () => {
      if (storageMode === 'bundle' && isOpen) {
        const events = await getAllVitalEvents();
        setVitalEvents(events);
      }
    };
    loadVitalEvents();
  }, [storageMode, isOpen, getAllVitalEvents, triggerRefresh]);

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
  const handleNew = useCallback(async () => {
    // Create a new .heritage bundle
    const result = await createBundle('Family Tree');
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData());
      setCurrentFilePath(null);
      setSelectedPersonId(null);
      setNavigationHistory([]);
    }
  }, [createBundle]);

  const handleNewLegacy = useCallback(() => {
    // Create a new JSON file (legacy mode)
    setStorageMode('legacy');
    setData(createEmptyData());
    setCurrentFilePath(null);
    setSelectedPersonId(null);
    setNavigationHistory([]);
  }, []);

  const handleSave = useCallback(async (forceNewFile = false) => {
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

  const handleLoad = useCallback(async () => {
    // Open a .heritage bundle
    const result = await openBundle();
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData()); // Will be loaded from database
      setCurrentFilePath(null);
      setNavigationHistory([]);
      setSelectedPersonId(null);
      // TODO: Load persons from database and select first one
    }
  }, [openBundle]);

  const handleOpenRecentFile = useCallback(async (filePath) => {
    // Open a recent .heritage bundle by path
    const result = await openBundlePath(filePath);
    if (result) {
      setStorageMode('bundle');
      setData(createEmptyData());
      setCurrentFilePath(null);
      setNavigationHistory([]);
      setSelectedPersonId(null);
    }
  }, [openBundlePath]);

  const handleLoadLegacy = useCallback(async () => {
    // Open a JSON file (legacy mode)
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result && result.content) {
        const migratedData = migrateToNewFormat(result.content);
        setStorageMode('legacy');
        setData(migratedData);
        setCurrentFilePath(result.path);
        localStorage.setItem('heritage-last-file', result.path);
        setNavigationHistory([]);

        if (migratedData.people?.length > 0) {
          setSelectedPersonId(migratedData.people[0].id);
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
          setNavigationHistory([]);

          if (migratedData.people?.length > 0) {
            setSelectedPersonId(migratedData.people[0].id);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }, []);

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

    return () => {
      if (window.electronAPI?.removeMenuListeners) {
        window.electronAPI.removeMenuListeners();
      }
    };
  }, [handleNew, handleLoad, handleSave, handleExportPng, handleExportSvg, addNode, handleFitView, handleOpenPreferences]);

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
      // In bundle mode, use database persons; in legacy mode, use local data
      const selectedPerson = storageMode === 'bundle'
        ? persons.find(p => p.id === selectedPersonId)
        : findPersonById(data, selectedPersonId);

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

      // Convert database person to legacy format for PersonView
      // Only use loaded events if they belong to the currently selected person
      const eventsReady = loadedDataForPersonId === selectedPersonId;
      const personForView = storageMode === 'bundle' && selectedPerson
        ? {
            id: selectedPerson.id,
            firstName: selectedPerson.given_names || '',
            lastName: selectedPerson.surname || '',
            maidenName: selectedPerson.surname_at_birth || '',
            gender: selectedPerson.gender || '',
            notes: selectedPerson.notes || '',
            // Convert database events to PersonView format (only if loaded for this person)
            birthDate: eventsReady ? dbEventToDateFormat(loadedBirthEvent) : { type: 'unknown' },
            deathDate: selectedPerson.is_living
              ? { type: 'alive', display: 'Living' }
              : (eventsReady ? dbEventToDateFormat(loadedDeathEvent) : { type: 'unknown' }),
            birthPlace: eventsReady ? (loadedBirthEvent?.place_detail || loadedBirthEvent?.place_name || '') : '',
            birthPlaceId: eventsReady ? (loadedBirthEvent?.place_id || null) : null,
            birthEventId: eventsReady ? (loadedBirthEvent?.id || null) : null,
            deathPlace: eventsReady ? (loadedDeathEvent?.place_detail || loadedDeathEvent?.place_name || '') : '',
            deathPlaceId: eventsReady ? (loadedDeathEvent?.place_id || null) : null,
            deathEventId: eventsReady ? (loadedDeathEvent?.id || null) : null,
            // Convert other events from database format (only if loaded for this person)
            events: eventsReady ? loadedOtherEvents.map(e => ({
              id: e.id,
              type: e.type,
              date: dbEventToDateFormat(e),
              place: e.place_detail || e.place_name || '',
              placeId: e.place_id || null,
              description: e.description || '',
            })) : [],
            sources: [],
          }
        : selectedPerson;

      // Convert database unions to PersonView format for bundle mode (only if loaded for this person)
      // Include both unions where person is a partner AND the parent union where person is a child
      let unionsForView;
      if (storageMode === 'bundle') {
        if (eventsReady) {
          // Unions where person is a partner
          const partnerUnions = loadedUnions.map(u => dbUnionToPersonViewFormat(u, selectedPersonId));
          // Parent union where person is a child (needs different format for getParentIds to work)
          const parentUnionFormatted = loadedParentUnion ? {
            id: loadedParentUnion.id,
            partner1Id: loadedParentUnion.person1_id,
            partner2Id: loadedParentUnion.person2_id,
            childIds: (loadedParentUnion.children || []).map(c => c.id),
            type: loadedParentUnion.type || 'marriage',
          } : null;
          unionsForView = parentUnionFormatted
            ? [...partnerUnions, parentUnionFormatted]
            : partnerUnions;
        } else {
          unionsForView = [];
        }
      } else {
        unionsForView = (data.unions || []).filter(u =>
          u.partner1Id === selectedPersonId || u.partner2Id === selectedPersonId ||
          (u.childIds || []).includes(selectedPersonId)
        );
      }

      return (
        <PersonView
          person={personForView}
          sources={data.sources || {}}
          onAddSource={handleAddSource}
          allPeople={storageMode === 'bundle'
            ? persons.map(p => {
                const vital = vitalEvents[p.id] || {};
                return {
                  id: p.id,
                  firstName: p.given_names || '',
                  lastName: p.surname || '',
                  gender: p.gender || '',
                  birthDate: vital.birthDate,
                  deathDate: vital.deathDate,
                  birthPlace: vital.birthPlace,
                  deathPlace: vital.deathPlace,
                };
              })
            : (data.people || [])}
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
                    });
                  }
                } else {
                  // Update existing union
                  await updateUnion(union.id, {
                    type: union.type,
                    status: union.endReason || null,
                  });

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
          onCreateCitation={async (data) => {
            await createCitation(data);
            // Reload citations for the affected person, event or union
            if (data.person_id) {
              const citations = await getCitationsForPerson(data.person_id);
              setPersonCitations(citations || []);
            }
            if (data.event_id) {
              const eventId = data.event_id;
              const citations = await getCitationsForEvent(eventId);
              if (eventId === loadedBirthEvent?.id) {
                setBirthCitations(citations || []);
              } else if (eventId === loadedDeathEvent?.id) {
                setDeathCitations(citations || []);
              } else {
                setEventCitations(prev => ({ ...prev, [eventId]: citations || [] }));
              }
            }
            if (data.union_id) {
              const unionId = data.union_id;
              const citations = await getCitationsForUnion(unionId);
              setPersonUnionCitations(prev => ({ ...prev, [unionId]: citations || [] }));
            }
            if (data.media_id) {
              const mediaId = data.media_id;
              const citations = await getCitationsForMedia(mediaId);
              setMediaCitations(prev => ({ ...prev, [mediaId]: citations || [] }));
            }
          }}
          onUpdateCitation={async (citationId, data) => {
            await updateCitation(citationId, data);
            // Reload all citations for this person
            if (selectedPersonId) {
              const personCits = await getCitationsForPerson(selectedPersonId);
              setPersonCitations(personCits || []);
            }
            if (loadedBirthEvent?.id) {
              const citations = await getCitationsForEvent(loadedBirthEvent.id);
              setBirthCitations(citations || []);
            }
            if (loadedDeathEvent?.id) {
              const citations = await getCitationsForEvent(loadedDeathEvent.id);
              setDeathCitations(citations || []);
            }
            for (const event of loadedOtherEvents) {
              const citations = await getCitationsForEvent(event.id);
              if (citations && citations.length > 0) {
                setEventCitations(prev => ({ ...prev, [event.id]: citations }));
              }
            }
            // Also reload union citations
            for (const union of loadedUnions) {
              const citations = await getCitationsForUnion(union.id);
              setPersonUnionCitations(prev => ({ ...prev, [union.id]: citations || [] }));
            }
            // Also reload media citations
            if (selectedPersonId) {
              const media = await getMediaForPerson(selectedPersonId);
              for (const item of (media || [])) {
                const citations = await getCitationsForMedia(item.id);
                setMediaCitations(prev => ({ ...prev, [item.id]: citations || [] }));
              }
            }
          }}
          onDeleteCitation={async (citationId) => {
            await deleteCitation(citationId);
            // Reload all citations for this person
            if (selectedPersonId) {
              const personCits = await getCitationsForPerson(selectedPersonId);
              setPersonCitations(personCits || []);
            }
            if (loadedBirthEvent?.id) {
              const citations = await getCitationsForEvent(loadedBirthEvent.id);
              setBirthCitations(citations || []);
            }
            if (loadedDeathEvent?.id) {
              const citations = await getCitationsForEvent(loadedDeathEvent.id);
              setDeathCitations(citations || []);
            }
            const citationsMap = {};
            for (const event of loadedOtherEvents) {
              const citations = await getCitationsForEvent(event.id);
              if (citations && citations.length > 0) {
                citationsMap[event.id] = citations;
              }
            }
            setEventCitations(citationsMap);
            // Also reload union citations
            const unionCitationsMap = {};
            for (const union of loadedUnions) {
              const citations = await getCitationsForUnion(union.id);
              if (citations && citations.length > 0) {
                unionCitationsMap[union.id] = citations;
              }
            }
            setPersonUnionCitations(unionCitationsMap);
            // Also reload media citations
            if (selectedPersonId) {
              const media = await getMediaForPerson(selectedPersonId);
              const mediaCitationsMap = {};
              for (const item of (media || [])) {
                const citations = await getCitationsForMedia(item.id);
                if (citations && citations.length > 0) {
                  mediaCitationsMap[item.id] = citations;
                }
              }
              setMediaCitations(mediaCitationsMap);
            }
          }}
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
          {/* View mode toggle */}
          <div className="view-toggle">
            <span className="view-toggle-label">View:</span>
            <button
              className={`view-toggle-btn ${viewMode === 'focused' ? 'active' : ''}`}
              onClick={() => setViewMode('focused')}
            >
              Focused
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'canvas' ? 'active' : ''}`}
              onClick={() => setViewMode('canvas')}
            >
              Canvas
            </button>

            {viewMode === 'focused' && (
              <>
                <div className="view-toggle-separator" />
                <button
                  className={`view-toggle-btn ${focusedView === 'pedigree' ? 'active' : ''}`}
                  onClick={() => setFocusedView('pedigree')}
                >
                  Pedigree
                </button>
                <button
                  className={`view-toggle-btn ${focusedView === 'descendants' ? 'active' : ''}`}
                  onClick={() => setFocusedView('descendants')}
                >
                  Descendants
                </button>
                <button
                  className={`view-toggle-btn ${focusedView === 'person' ? 'active' : ''}`}
                  onClick={() => setFocusedView('person')}
                  disabled={!selectedPersonId}
                  title={selectedPersonId ? 'View selected person' : 'Select a person first'}
                >
                  Person
                </button>
              </>
            )}
          </div>

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
        onCreateCitation={async (data) => {
          await createCitation(data);
          // Reload union citations
          if (editingUnionId) {
            const citations = await getCitationsForUnion(editingUnionId);
            setUnionCitations(citations || []);
          }
        }}
        onUpdateCitation={async (citationId, data) => {
          await updateCitation(citationId, data);
          // Reload union citations
          if (editingUnionId) {
            const citations = await getCitationsForUnion(editingUnionId);
            setUnionCitations(citations || []);
          }
        }}
        onDeleteCitation={async (citationId) => {
          await deleteCitation(citationId);
          // Reload union citations
          if (editingUnionId) {
            const citations = await getCitationsForUnion(editingUnionId);
            setUnionCitations(citations || []);
          }
        }}
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
        <PlacesLibrary onClose={() => setPlacesLibraryOpen(false)} />
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
        onClose={() => setToast({ visible: false, message: '' })}
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
