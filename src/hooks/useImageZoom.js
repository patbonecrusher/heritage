/**
 * useImageZoom - Reusable hook for image zoom and pan functionality
 *
 * Features:
 * - Zoom in/out with constraints (min 50%, max 300%)
 * - Trackpad pinch gesture support (Ctrl/Cmd + wheel)
 * - Pan/drag when zoomed in
 * - Smooth zoom reset to fit
 * - Proper cursor feedback
 */

import { useState, useRef, useCallback } from 'react';

export function useImageZoom(initialZoom = 100) {
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Handle trackpad pinch zoom and mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (!containerRef.current) return;

    // Check if ctrl/cmd is pressed (pinch gesture or zoom)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -25 : 25;
      setZoomLevel((prev) => Math.max(50, Math.min(300, prev + delta)));
    }
  }, []);

  // Start panning when mouse down on zoomed image
  const handleMouseDown = useCallback((e) => {
    if (zoomLevel > 100 && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [zoomLevel, panOffset]);

  // Update pan offset during drag
  const handleMouseMove = useCallback((e) => {
    if (isDragging && imageRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPanOffset({ x: newX, y: newY });
    }
  }, [isDragging, dragStart]);

  // End panning
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Update zoom level and reset pan if fitting to window
  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(newZoom);
    if (newZoom === 100) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, []);

  // Reset zoom and pan to initial state
  const resetZoom = useCallback(() => {
    setZoomLevel(initialZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [initialZoom]);

  // Zoom in
  const zoomIn = useCallback(() => {
    handleZoomChange(Math.min(300, zoomLevel + 25));
  }, [zoomLevel, handleZoomChange]);

  // Zoom out
  const zoomOut = useCallback(() => {
    handleZoomChange(Math.max(50, zoomLevel - 25));
  }, [zoomLevel, handleZoomChange]);

  // Fit to window
  const fitToWindow = useCallback(() => {
    handleZoomChange(100);
  }, [handleZoomChange]);

  return {
    // State
    zoomLevel,
    panOffset,
    isDragging,
    containerRef,
    imageRef,

    // Event handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Actions
    handleZoomChange,
    resetZoom,
    zoomIn,
    zoomOut,
    fitToWindow,

    // Computed
    isZoomedIn: zoomLevel > 100,
    transformStyle: {
      transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    },
    containerStyle: {
      cursor: zoomLevel > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
    },
  };
}
