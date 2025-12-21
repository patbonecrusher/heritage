import React, { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

const UNION_TYPES = {
  marriage: { label: 'Marriage', color: '#ec4899' },
  civil_union: { label: 'Civil Union', color: '#8b5cf6' },
  common_law: { label: 'Common Law', color: '#6366f1' },
  partnership: { label: 'Partnership', color: '#14b8a6' },
};

const UnionNode = memo(({ id, data, selected }) => {
  const clickTimeoutRef = useRef(null);
  const clickCountRef = useRef(0);

  const handleClick = (e) => {
    e.stopPropagation();
    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 300);
    } else if (clickCountRef.current === 2) {
      clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
      if (data.onDoubleClick) {
        data.onDoubleClick(id);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Support both new (startDate) and legacy (marriageDate) fields
  const unionDate = data.startDate || data.marriageDate;
  const unionPlace = data.startPlace || data.marriagePlace || '';
  const unionType = data.unionType || 'marriage';
  const typeConfig = UNION_TYPES[unionType] || UNION_TYPES.marriage;

  const formatYear = () => {
    if (!unionDate) return '';
    if (unionDate.type === 'unknown') return '';
    return unionDate.year || '';
  };

  const year = formatYear();
  const hasEnded = data.endDate || data.divorceDate;
  const endReason = data.endReason || (hasEnded ? 'ended' : '');

  // Build tooltip
  let tooltip = typeConfig.label;
  if (year) tooltip += `: ${year}`;
  if (unionPlace) tooltip += ` - ${unionPlace}`;
  if (endReason) tooltip += ` (${endReason})`;

  return (
    <div
      className={`union-node ${selected ? 'selected' : ''} ${hasEnded ? 'ended' : ''}`}
      title={tooltip}
      onClick={handleClick}
    >
      {/* Left handle for spouse 1 */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="union-handle union-handle-left"
      />

      {/* Union symbol */}
      <div className="union-rings">
        <svg viewBox="0 0 32 24" width="32" height="24">
          {/* Two interlocked rings/circles */}
          <circle
            cx="10"
            cy="12"
            r="7"
            fill="none"
            stroke={selected ? typeConfig.color : (hasEnded ? '#9ca3af' : '#9ca3af')}
            strokeWidth="2"
            strokeDasharray={hasEnded ? '3,2' : 'none'}
          />
          <circle
            cx="22"
            cy="12"
            r="7"
            fill="none"
            stroke={selected ? typeConfig.color : (hasEnded ? '#9ca3af' : '#9ca3af')}
            strokeWidth="2"
            strokeDasharray={hasEnded ? '3,2' : 'none'}
          />
        </svg>
        {year && <span className="union-year">{year}</span>}
        {unionType !== 'marriage' && (
          <span className="union-type-badge" style={{ background: typeConfig.color }}>
            {unionType === 'civil_union' ? 'CU' : unionType === 'common_law' ? 'CL' : 'P'}
          </span>
        )}
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
