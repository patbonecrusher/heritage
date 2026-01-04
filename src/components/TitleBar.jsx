/**
 * TitleBar - Custom title bar that follows the theme
 */

import { useState, useEffect } from 'react';
import './TitleBar.css';

export default function TitleBar({ title, subtitle }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Check initial maximized state
  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI?.window?.isMaximized) {
        const maximized = await window.electronAPI.window.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.window?.minimize();
  };

  const handleMaximize = async () => {
    await window.electronAPI?.window?.maximize();
    const maximized = await window.electronAPI?.window?.isMaximized();
    setIsMaximized(maximized);
  };

  const handleClose = () => {
    window.electronAPI?.window?.close();
  };

  return (
    <div className="title-bar">
      {/* Draggable region - leave space for traffic lights on Mac */}
      <div className="title-bar-drag-region" />

      {/* Title in center */}
      <div className="title-bar-title">
        <span className="title-bar-app-name">{title || 'Heritage'}</span>
        {subtitle && <span className="title-bar-subtitle">{subtitle}</span>}
      </div>

      {/* Window controls - only show on non-Mac platforms */}
      {!isMac && (
        <div className="title-bar-controls">
          <button
            className="title-bar-btn minimize"
            onClick={handleMinimize}
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            className="title-bar-btn maximize"
            onClick={handleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  d="M2,3 L2,9 L8,9 L8,3 L2,3 M3,3 L3,1 L9,1 L9,7 L8,7"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect
                  x="0.5"
                  y="0.5"
                  width="9"
                  height="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            )}
          </button>
          <button
            className="title-bar-btn close"
            onClick={handleClose}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                fill="currentColor"
                d="M1,0 L5,4 L9,0 L10,1 L6,5 L10,9 L9,10 L5,6 L1,10 L0,9 L4,5 L0,1 Z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
