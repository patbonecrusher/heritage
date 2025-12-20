import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';

const PersonNode = memo(({ id, data, selected }) => {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Get color from theme using colorIndex, or fall back to legacy color or primary
  const nodeColor = data.colorIndex !== undefined
    ? theme.colors.nodeColors[data.colorIndex]
    : (data.color || theme.colors.primary);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    // Use capture phase to catch events before React Flow
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [menuOpen]);

  const handleAddClick = (e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleMenuAction = (action) => {
    setMenuOpen(false);
    if (data.onMenuAction) {
      data.onMenuAction(id, action);
    }
  };

  return (
    <div className="person-node-wrapper">
      {/* Handles - outside inner content for proper positioning */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="node-handle"
        style={{
          background: nodeColor,
          width: '10px',
          height: '10px',
          border: '2px solid white',
        }}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="spouse-left"
        className="node-handle spouse-handle"
        style={{
          background: theme.colors.accent,
          width: '8px',
          height: '8px',
          border: '2px solid white',
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="spouse-right"
        className="node-handle spouse-handle"
        style={{
          background: theme.colors.accent,
          width: '8px',
          height: '8px',
          border: '2px solid white',
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="node-handle"
        style={{
          background: nodeColor,
          width: '10px',
          height: '10px',
          border: '2px solid white',
        }}
      />

      {/* Inner content */}
      <div
        className="person-node-inner"
        style={{
          background: theme.colors.surface,
          borderRadius: '8px',
          padding: '0',
          minWidth: '180px',
          boxShadow: selected
            ? `0 0 0 2px ${nodeColor}, 0 4px 12px rgba(0,0,0,0.15)`
            : '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* Image section */}
        {data.image && (
          <div
            style={{
              width: '100%',
              height: '120px',
              overflow: 'hidden',
              borderBottom: `3px solid ${nodeColor}`,
            }}
          >
            <img
              src={data.image}
              alt={data.name || 'Person'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Header with color */}
        <div
          style={{
            background: nodeColor,
            padding: '10px 14px',
            color: 'white',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: '600',
                fontSize: '14px',
                marginBottom: data.dates ? '2px' : 0,
              }}
            >
              {data.name || 'Unnamed'}
            </div>
            {data.dates && (
              <div style={{ fontSize: '11px', opacity: 0.9 }}>
                {data.dates}
              </div>
            )}
          </div>

          {/* Plus button */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={handleAddClick}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              +
            </button>

            {/* Popup menu */}
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '28px',
                  right: '0',
                  background: 'white',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  minWidth: '150px',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => handleMenuAction('add-photo')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span style={{ fontSize: '16px' }}>📷</span>
                  {data.image ? 'Change Photo' : 'Add Photo'}
                </button>
                {data.image && (
                  <button
                    onClick={() => handleMenuAction('remove-photo')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderTop: '1px solid #e5e7eb',
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <span style={{ fontSize: '16px' }}>🗑️</span>
                    Remove Photo
                  </button>
                )}
                <button
                  onClick={() => handleMenuAction('edit-info')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderTop: '1px solid #e5e7eb',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                  <span style={{ fontSize: '16px' }}>✏️</span>
                  Edit Info
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        {data.description && (
          <div
            style={{
              padding: '10px 14px',
              fontSize: '12px',
              color: theme.colors.textMuted,
              borderTop: `1px solid ${theme.colors.border}`,
            }}
          >
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';

export default PersonNode;
