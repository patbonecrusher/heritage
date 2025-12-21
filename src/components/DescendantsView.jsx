import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls
} from 'reactflow';
import 'reactflow/dist/style.css';

import PersonNode from './PersonNode';
import UnionNode from './UnionNode';
import { computeDescendantsLayout } from '../utils/layoutDescendants';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
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

  // Add handlers to node data
  const nodesWithHandlers = useMemo(() => {
    return layoutNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onMenuAction: onMenuAction,
        onDoubleClick: node.type === 'person' ? onEditPerson : onEditUnion
      }
    }));
  }, [layoutNodes, onMenuAction, onEditPerson, onEditUnion]);

  // Handle node click - navigate to that person
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'person' && onSelectPerson) {
      onSelectPerson(node.id);
    }
  }, [onSelectPerson]);

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
        nodes={nodesWithHandlers}
        edges={layoutEdges}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={theme.colors.border} gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
