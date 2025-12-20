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
import PersonNode from './components/PersonNode';
import UnionNode from './components/UnionNode';
import PersonDialog from './components/PersonDialog';
import UnionDialog from './components/UnionDialog';
import PreferencesDialog from './components/PreferencesDialog';
import SourceDialog from './components/SourceDialog';
import Toast from './components/Toast';
import { exportToImage, exportToSvg } from './utils/export';
import { useTheme } from './contexts/ThemeContext';

const nodeTypes = {
  person: PersonNode,
  union: UnionNode,
};

// Start with empty state - will load last file on mount
const initialNodes = [];
const initialEdges = [];

function App() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const { fitView } = useReactFlow();
  const { theme } = useTheme();

  // Person Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [dialogInitialData, setDialogInitialData] = useState(null);

  // Union Dialog state
  const [unionDialogOpen, setUnionDialogOpen] = useState(false);
  const [editingUnionId, setEditingUnionId] = useState(null);
  const [unionDialogInitialData, setUnionDialogInitialData] = useState(null);
  const [pendingUnion, setPendingUnion] = useState(null); // For creating new unions

  // Preferences Dialog state
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '' });
  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
  }, []);

  // Sources library
  const [sources, setSources] = useState({});
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [pendingSourceCallback, setPendingSourceCallback] = useState(null);

  // Load last used file on startup
  useEffect(() => {
    const loadLastFile = async () => {
      const lastFilePath = localStorage.getItem('heritage-last-file');
      if (lastFilePath && window.electronAPI) {
        const result = await window.electronAPI.readFile(lastFilePath);
        if (result) {
          setNodes(result.content.nodes || []);
          setEdges(result.content.edges || []);
          setSources(result.content.sources || {});
          setCurrentFilePath(result.path);
        }
      }
    };
    loadLastFile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open edit dialog for a node
  const openEditDialog = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setDialogInitialData(node.data);
      setDialogOpen(true);
    }
  }, [nodes]);

  // Handle double-click on node
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'union') {
      // Open union dialog for editing
      setEditingUnionId(node.id);
      setUnionDialogInitialData(node.data);
      setUnionDialogOpen(true);
    } else {
      openEditDialog(node.id);
    }
  }, [openEditDialog]);

  // Handle union dialog save
  const handleUnionDialogSave = useCallback((data) => {
    if (editingUnionId) {
      // Editing existing union
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingUnionId) {
            return { ...n, data: { ...n.data, ...data } };
          }
          return n;
        })
      );
    } else if (pendingUnion) {
      // Creating new union
      const unionId = `union-${Date.now()}`;

      // Determine which spouse is on the left vs right based on x position
      const spouse1IsLeft = pendingUnion.spouse1Pos.x < pendingUnion.spouse2Pos.x;
      const leftSpouseId = spouse1IsLeft ? pendingUnion.spouse1Id : pendingUnion.spouse2Id;
      const rightSpouseId = spouse1IsLeft ? pendingUnion.spouse2Id : pendingUnion.spouse1Id;
      const leftPos = spouse1IsLeft ? pendingUnion.spouse1Pos : pendingUnion.spouse2Pos;
      const rightPos = spouse1IsLeft ? pendingUnion.spouse2Pos : pendingUnion.spouse1Pos;

      // Calculate position between spouses
      const midX = (leftPos.x + rightPos.x) / 2 + 70;
      const midY = (leftPos.y + rightPos.y) / 2 + 20;

      // Create union node
      const unionNode = {
        id: unionId,
        type: 'union',
        position: { x: midX, y: midY },
        data: {
          ...data,
          spouse1Id: leftSpouseId,
          spouse2Id: rightSpouseId,
        },
      };

      // Create edges from spouses to union
      // Left spouse connects via their right handle to union's left
      const leftSpouseEdge = {
        id: `e-${leftSpouseId}-${unionId}`,
        source: leftSpouseId,
        sourceHandle: 'spouse-right',
        target: unionId,
        targetHandle: 'left',
        type: 'straight',
        className: 'spouse-edge',
      };

      // Right spouse connects via their left handle to union's right
      const rightSpouseEdge = {
        id: `e-${rightSpouseId}-${unionId}`,
        source: rightSpouseId,
        sourceHandle: 'spouse-left',
        target: unionId,
        targetHandle: 'right',
        type: 'straight',
        className: 'spouse-edge',
      };

      setNodes((nds) => [...nds, unionNode]);
      setEdges((eds) => [...eds, leftSpouseEdge, rightSpouseEdge]);
    }

    setUnionDialogOpen(false);
    setEditingUnionId(null);
    setUnionDialogInitialData(null);
    setPendingUnion(null);
    showToast('Saved');
  }, [editingUnionId, pendingUnion, setNodes, setEdges, showToast]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if dialog is open or if typing in an input
      if (dialogOpen) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Press 'e' to edit selected node
      if (e.key === 'e' || e.key === 'E') {
        const selectedNode = nodes.find(n => n.selected);
        if (selectedNode) {
          e.preventDefault();
          openEditDialog(selectedNode.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, dialogOpen, openEditDialog]);

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      // Check if this is a spouse connection (spouse handles between two person nodes)
      // With connectionMode="loose", we might connect to a source handle, so check both
      const isSpouseHandle = (handle) => handle?.startsWith('spouse-');
      const isSpouseConnection =
        sourceNode?.type === 'person' &&
        targetNode?.type === 'person' &&
        isSpouseHandle(params.sourceHandle);

      if (isSpouseConnection) {
        // Store pending union info and open dialog
        setPendingUnion({
          spouse1Id: params.source,
          spouse2Id: params.target,
          spouse1Pos: sourceNode.position,
          spouse2Pos: targetNode.position,
        });
        setUnionDialogOpen(true);
        return; // Don't add edge yet, will be done after dialog save
      }

      // Regular parent-child connection
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
      }, eds));
    },
    [nodes, setEdges]
  );

  const addNode = useCallback(() => {
    setEditingNodeId(null);
    setDialogInitialData(null);
    setDialogOpen(true);
  }, []);

  const handleDialogSave = useCallback((data) => {
    if (editingNodeId) {
      // Editing existing node
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...data,
              },
            };
          }
          return n;
        })
      );
    } else {
      // Adding new node
      const id = `${Date.now()}`;
      const newNode = {
        id,
        type: 'person',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100
        },
        data: {
          ...data,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
    setDialogOpen(false);
    setEditingNodeId(null);
    setDialogInitialData(null);
    showToast('Saved');
  }, [editingNodeId, setNodes, showToast]);

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

  const handleMenuAction = useCallback(async (nodeId, action) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (action === 'add-photo') {
      let image = null;
      if (window.electronAPI) {
        image = await window.electronAPI.selectImage();
      } else {
        image = await selectImageWeb();
      }
      if (image) {
        setNodes((nds) =>
          nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, image } } : n)
        );
      }
    } else if (action === 'remove-photo') {
      setNodes((nds) =>
        nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, image: null } } : n)
      );
    } else if (action === 'edit-info') {
      setEditingNodeId(nodeId);
      setDialogInitialData(node.data);
      setDialogOpen(true);
    }
  }, [nodes, setNodes]);

  // Add the menu action handler to all nodes
  const nodesWithHandlers = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onMenuAction: handleMenuAction,
      },
    }));
  }, [nodes, handleMenuAction]);

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

  const handleNew = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSources({});
    setCurrentFilePath(null);
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async (forceNewFile = false) => {
    const data = {
      nodes,
      edges,
      sources,
    };
    const jsonString = JSON.stringify(data, null, 2);

    if (window.electronAPI) {
      // If we have a current file and not forcing new file, save directly
      if (currentFilePath && !forceNewFile) {
        const result = await window.electronAPI.writeFile({
          filePath: currentFilePath,
          data: jsonString,
        });
        if (result) {
          localStorage.setItem('heritage-last-file', result);
        }
      } else {
        // Show save dialog for new files or Save As
        const result = await window.electronAPI.saveFile({
          data: jsonString,
          defaultName: 'chart.json',
          filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        if (result) {
          setCurrentFilePath(result);
          localStorage.setItem('heritage-last-file', result);
        }
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'chart.json';
      link.href = url;
      link.click();
    }
  }, [nodes, edges, sources, currentFilePath]);

  const handleLoad = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result) {
        setNodes(result.content.nodes || []);
        setEdges(result.content.edges || []);
        setSources(result.content.sources || {});
        setCurrentFilePath(result.path);
        localStorage.setItem('heritage-last-file', result.path);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = JSON.parse(event.target.result);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          setSources(data.sources || {});
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }, [setNodes, setEdges]);

  // Source management
  const handleAddSource = useCallback((callback) => {
    setEditingSource(null);
    setPendingSourceCallback(() => callback);
    setSourceDialogOpen(true);
  }, []);

  const handleSourceSave = useCallback((source) => {
    setSources(prev => ({
      ...prev,
      [source.id]: source,
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

  return (
    <div className="app">
      <Toolbar
        onAddNode={addNode}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onSave={handleSave}
        onLoad={handleLoad}
      />
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
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => node.data.color || '#6366f1'}
            maskColor="rgba(0,0,0,0.1)"
          />
          <Background variant="dots" gap={20} size={1} />
        </ReactFlow>
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
        sources={sources}
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
        sources={sources}
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
