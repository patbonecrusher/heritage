/**
 * Dialog - Reusable dialog component with compound pattern
 *
 * Usage:
 * <Dialog isOpen={true} onClose={handleClose} size="medium">
 *   <Dialog.Header>
 *     <Dialog.Title>My Dialog</Dialog.Title>
 *   </Dialog.Header>
 *   <Dialog.Content>Content here</Dialog.Content>
 *   <Dialog.Footer>
 *     <Dialog.Actions>
 *       <button onClick={onClose}>Cancel</button>
 *       <button onClick={onSave}>Save</button>
 *     </Dialog.Actions>
 *   </Dialog.Footer>
 * </Dialog>
 */

import React, { useEffect, createContext, useContext } from 'react';
import './Dialog.css';

const DialogContext = createContext();

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog compound components must be used within Dialog component');
  }
  return context;
}

/**
 * Dialog - Main dialog component
 *
 * @param {boolean} isOpen - Controls dialog visibility
 * @param {function} onClose - Called when dialog should close
 * @param {string} size - Size variant: 'small', 'medium', 'large', 'fullscreen'
 * @param {boolean} closeOnEscape - Enable Escape key closing (default: true)
 * @param {boolean} closeOnOverlayClick - Enable overlay click closing (default: true)
 * @param {boolean} showCloseButton - Show close button in header (default: true)
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} children - Dialog content
 */
function Dialog({
  isOpen = false,
  onClose,
  size = 'medium',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
  children,
}) {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className="dialog-overlay"
      onClick={handleOverlayClick}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`dialog-container dialog ${className}`}
        data-size={size}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogContext.Provider value={{ onClose, showCloseButton }}>
          {children}
        </DialogContext.Provider>
      </div>
    </div>
  );
}

/**
 * Dialog.Header - Header section with optional close button
 */
function DialogHeader({ children, className = '' }) {
  const { onClose, showCloseButton } = useDialogContext();

  return (
    <div className={`dialog-header ${className}`}>
      <div className="dialog-header-content">{children}</div>
      {showCloseButton && (
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Dialog.Title - Styled title element
 */
function DialogTitle({ children, className = '' }) {
  return <h2 className={`dialog-title ${className}`}>{children}</h2>;
}

/**
 * Dialog.Content - Scrollable content area
 */
function DialogContent({ children, className = '' }) {
  return (
    <div className={`dialog-content ${className}`}>
      {children}
    </div>
  );
}

/**
 * Dialog.Footer - Fixed footer section
 */
function DialogFooter({ children, className = '' }) {
  return (
    <div className={`dialog-footer ${className}`}>
      {children}
    </div>
  );
}

/**
 * Dialog.Actions - Helper for button layouts in footer
 */
function DialogActions({ children, className = '' }) {
  return (
    <div className={`dialog-actions ${className}`}>
      {children}
    </div>
  );
}

// Attach compound components
Dialog.Header = DialogHeader;
Dialog.Title = DialogTitle;
Dialog.Content = DialogContent;
Dialog.Footer = DialogFooter;
Dialog.Actions = DialogActions;

export default Dialog;
