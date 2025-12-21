import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

import PersonNode from './PersonNode';
import UnionNode from './UnionNode';
import { computeDescendantsLayout } from '../utils/layoutDescendants';

const nodeTypes = {
  person: PersonNode,
  union: UnionNode
};

export default function DescendantsView({
  data,
  focusPersonId,
  onSelectPerson,
  onEditPerson,
  onEditUnion,
  onMenuAction
}) {
  // Compute layout whenever data or focus changes
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!focusPersonId) {
      return { nodes: [], edges: [] };
    }
    return computeDescendantsLayout(data, focusPersonId, {
      startX: 500,
      startY: 100,
      maxDepth: 10
    });
  }, [data, focusPersonId]);

  // Add menu action handler to node data
  const nodesWithHandlers = useMemo(() => {
    return layoutNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onMenuAction: onMenuAction
      }
    }));
  }, [layoutNodes, onMenuAction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithHandlers);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Update nodes when layout changes
  React.useEffect(() => {
    setNodes(nodesWithHandlers);
    setEdges(layoutEdges);
  }, [nodesWithHandlers, layoutEdges, setNodes, setEdges]);

  // Handle node click - navigate to that person
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'person' && onSelectPerson) {
      onSelectPerson(node.id);
    }
  }, [onSelectPerson]);

  // Handle double-click to edit
  const onNodeDoubleClick = useCallback((event, node) => {
    if (node.type === 'person' && onEditPerson) {
      onEditPerson(node.id);
    } else if (node.type === 'union' && onEditUnion) {
      onEditUnion(node.id);
    }
  }, [onEditPerson, onEditUnion]);

  if (!focusPersonId) {
    return (
      <div className="descendants-empty">
        <p>Select a person from the sidebar to view their descendants</p>
      </div>
    );
  }

  return (
    <div className="descendants-view">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
