import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const UnionNode = memo(({ id, data, selected }) => {
  const formatYear = () => {
    if (!data.marriageDate) return '';
    if (data.marriageDate.type === 'unknown') return '';
    return data.marriageDate.year || '';
  };

  const year = formatYear();

  return (
    <div
      className={`union-node ${selected ? 'selected' : ''}`}
      title={data.marriagePlace ? `${year} - ${data.marriagePlace}` : year}
    >
      {/* Left handle for spouse 1 */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="union-handle union-handle-left"
      />

      {/* Ring symbol */}
      <div className="union-rings">
        <svg viewBox="0 0 32 24" width="32" height="24">
          {/* Two interlocked rings */}
          <circle
            cx="10"
            cy="12"
            r="7"
            fill="none"
            stroke={selected ? '#ec4899' : '#9ca3af'}
            strokeWidth="2"
          />
          <circle
            cx="22"
            cy="12"
            r="7"
            fill="none"
            stroke={selected ? '#ec4899' : '#9ca3af'}
            strokeWidth="2"
          />
        </svg>
        {year && <span className="union-year">{year}</span>}
      </div>

      {/* Right handle for spouse 2 */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="union-handle union-handle-right"
      />

      {/* Bottom handle for children */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="union-handle union-handle-bottom"
      />
    </div>
  );
});

UnionNode.displayName = 'UnionNode';

export default UnionNode;
