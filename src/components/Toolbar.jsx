import React from 'react';

export default function Toolbar({
  onAddNode,
  onExportPng,
  onExportSvg,
  onSave,
  onLoad,
  bundleInfo,
  storageMode,
}) {
  const fileName = bundleInfo?.info?.name || (storageMode === 'legacy' ? 'Untitled' : null);

  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        Heritage
        {fileName && (
          <span className="toolbar-filename">
            — {fileName}
            {storageMode === 'bundle' && <span className="toolbar-badge">.heritage</span>}
          </span>
        )}
      </div>

      <div className="toolbar-group">
        <button onClick={onAddNode} className="primary">
          + Add Family Member
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={onSave}>Save</button>
        <button onClick={onLoad}>Open</button>
      </div>

      <div className="toolbar-group">
        <button onClick={onExportPng}>Export PNG</button>
        <button onClick={onExportSvg}>Export SVG</button>
      </div>

      <div style={{ marginLeft: 'auto', color: 'var(--color-textMuted)', fontSize: '12px' }}>
        {storageMode === 'bundle' ? 'Database mode' : 'Legacy JSON mode'}
      </div>
    </div>
  );
}
