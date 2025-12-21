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

import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PedigreeView from './components/PedigreeView';
import DescendantsView from './components/DescendantsView';
import PersonNode from './components/PersonNode';
import UnionNode from './components/UnionNode';
import PersonDialog from './components/PersonDialog';
import UnionDialog from './components/UnionDialog';
import PreferencesDialog from './components/PreferencesDialog';
import SourceDialog from './components/SourceDialog';
import Toast from './components/Toast';
import { exportToImage, exportToSvg } from './utils/export';
import { useTheme } from './contexts/ThemeContext';
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

  // Core data state - using new format
  const [data, setData] = useState(createEmptyData());
  const [currentFilePath, setCurrentFilePath] = useState(null);

  // View mode state
  const [viewMode, setViewMode] = useState('focused'); // 'focused' | 'canvas'
  const [focusedView, setFocusedView] = useState('pedigree'); // 'pedigree' | 'descendants'
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  // React Flow state for canvas mode
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Person Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [dialogInitialData, setDialogInitialData] = useState(null);

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

  // Load last used file on startup
  useEffect(() => {
    const loadLastFile = async () => {
      const lastFilePath = localStorage.getItem('heritage-last-file');
      if (lastFilePath && window.electronAPI) {
        const result = await window.electronAPI.readFile(lastFilePath);
        if (result && result.content) {
          // Migrate to new format if needed
          const migratedData = migrateToNewFormat(result.content);
          setData(migratedData);
          setCurrentFilePath(result.path);

          // Select first person if available
          if (migratedData.people?.length > 0) {
            setSelectedPersonId(migratedData.people[0].id);
          }
        }
      }
    };
    loadLastFile();
  }, []);

  // Open edit dialog for a person
  const openEditDialog = useCallback((personId) => {
    const person = findPersonById(data, personId);
    if (person) {
      setEditingNodeId(personId);
      setDialogInitialData(person);
      setDialogOpen(true);
    }
  }, [data]);

  // Handle double-click on node (for canvas mode)
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'union') {
      const union = data.unions?.find(u => u.id === node.id);
      if (union) {
        setEditingUnionId(node.id);
        setUnionDialogInitialData(union);
        setUnionDialogOpen(true);
      }
    } else {
      openEditDialog(node.id);
    }
  }, [data, openEditDialog]);

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
      if (dialogOpen || unionDialogOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'e' || e.key === 'E') {
        if (selectedPersonId) {
          e.preventDefault();
          openEditDialog(selectedPersonId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPersonId, dialogOpen, unionDialogOpen, openEditDialog]);

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
  const addNode = useCallback(() => {
    setEditingNodeId(null);
    setDialogInitialData(null);
    setDialogOpen(true);
  }, []);

  // Handle person dialog save
  const handleDialogSave = useCallback((personData) => {
    if (editingNodeId) {
      // Editing existing person
      setData(prev => updatePerson(prev, editingNodeId, personData));
    } else {
      // Adding new person
      const newData = addPerson(data, personData);
      setData(newData);

      // Select the new person
      const newPerson = newData.people[newData.people.length - 1];
      setSelectedPersonId(newPerson.id);
    }
    setDialogOpen(false);
    setEditingNodeId(null);
    setDialogInitialData(null);
    showToast('Saved');
  }, [editingNodeId, data, showToast]);

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
      openEditDialog(nodeId);
    }
  }, [data, openEditDialog]);

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
          ? openEditDialog
          : (unionId) => {
              const union = data.unions?.find(u => u.id === unionId);
              if (union) {
                setEditingUnionId(unionId);
                setUnionDialogInitialData(union);
                setUnionDialogOpen(true);
              }
            }
      },
    }));
  }, [nodes, handleMenuAction, openEditDialog, data.unions]);

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
  const handleNew = useCallback(() => {
    setData(createEmptyData());
    setCurrentFilePath(null);
    setSelectedPersonId(null);
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
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result && result.content) {
        const migratedData = migrateToNewFormat(result.content);
        setData(migratedData);
        setCurrentFilePath(result.path);
        localStorage.setItem('heritage-last-file', result.path);

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
          setData(migratedData);

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

    // Focused view mode
    if (focusedView === 'pedigree') {
      return (
        <PedigreeView
          data={data}
          focusPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
          onEditPerson={openEditDialog}
          onEditUnion={(unionId) => {
            const union = data.unions?.find(u => u.id === unionId);
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
        data={data}
        focusPersonId={selectedPersonId}
        onSelectPerson={setSelectedPersonId}
        onEditPerson={openEditDialog}
        onEditUnion={(unionId) => {
          const union = data.unions?.find(u => u.id === unionId);
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

  return (
    <div className="app">
      <Toolbar
        onAddNode={addNode}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onSave={handleSave}
        onLoad={handleLoad}
      />

      <div className="app-content">
        <Sidebar
          data={data}
          selectedPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
          onEditPerson={openEditDialog}
          onAddPerson={addNode}
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
              </>
            )}
          </div>

          {renderMainView()}
        </div>
      </div>

      <PersonDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingNodeId(null);
          setDialogInitialData(null);
        }}
        onSave={handleDialogSave}
        initialData={dialogInitialData}
        sources={data.sources || {}}
        onAddSource={handleAddSource}
      />

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
        sources={data.sources || {}}
        onAddSource={handleAddSource}
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
