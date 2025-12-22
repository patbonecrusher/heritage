import React from 'react';

export default function Toolbar({
  onAddNode,
  onExportPng,
  onExportSvg,
  onSave,
  onLoad,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        Heritage
      </div>

      <div className="toolbar-group">
        <button onClick={onAddNode} className="primary">
          + Add Family Member
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={onSave}>Save Tree</button>
        <button onClick={onLoad}>Open Tree</button>
      </div>

      <div className="toolbar-group">
        <button onClick={onExportPng}>Export PNG</button>
        <button onClick={onExportSvg}>Export SVG</button>
      </div>

      <div style={{ marginLeft: 'auto', color: 'var(--color-textMuted)', fontSize: '12px' }}>
        Drag side handles to marry | Drag from union to add children
      </div>
    </div>
  );
}
