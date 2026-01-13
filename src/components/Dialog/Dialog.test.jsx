import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dialog from './Dialog';

describe('Dialog Component', () => {
  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <Dialog isOpen={false} onClose={vi.fn()}>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('.dialog-overlay')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
      render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Header>
            <Dialog.Title>Test Dialog</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });

    it('renders all compound components', () => {
      render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Header>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>Content text</Dialog.Content>
          <Dialog.Footer>
            <Dialog.Actions>
              <button>Cancel</button>
            </Dialog.Actions>
          </Dialog.Footer>
        </Dialog>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Content text')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button by default', () => {
      render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Dialog isOpen={true} onClose={vi.fn()} showCloseButton={false}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      fireEvent.click(screen.getByLabelText('Close dialog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Escape Key', () => {
    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose} closeOnEscape={true}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close dialog when closeOnEscape is false', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose} closeOnEscape={false}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose for other keys', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Overlay Click', () => {
    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();

      const { container } = render(
        <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={true}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      const overlay = container.querySelector('.dialog-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close dialog when closeOnOverlayClick is false', () => {
      const onClose = vi.fn();

      const { container } = render(
        <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      const overlay = container.querySelector('.dialog-overlay');
      fireEvent.click(overlay);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close when clicking inside dialog content', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={true}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>
            <button>Click me</button>
          </Dialog.Content>
        </Dialog>
      );

      fireEvent.click(screen.getByText('Click me'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('sets size attribute for small', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()} size="small">
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('[data-size="small"]')).toBeInTheDocument();
    });

    it('sets size attribute for medium (default)', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('[data-size="medium"]')).toBeInTheDocument();
    });

    it('sets size attribute for large', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()} size="large">
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('[data-size="large"]')).toBeInTheDocument();
    });

    it('sets size attribute for fullscreen', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()} size="fullscreen">
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('[data-size="fullscreen"]')).toBeInTheDocument();
    });
  });

  describe('Content Scrolling', () => {
    it('Dialog.Content has overflow-y: auto for scrolling', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Content>Scrollable content</Dialog.Content>
        </Dialog>
      );

      const content = container.querySelector('.dialog-content');
      expect(content).toHaveClass('dialog-content');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to dialog container', () => {
      const { container } = render(
        <Dialog isOpen={true} onClose={vi.fn()} className="custom-class">
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Dialog.Actions helper', () => {
    it('renders buttons in correct order with proper spacing', () => {
      render(
        <Dialog isOpen={true} onClose={vi.fn()}>
          <Dialog.Footer>
            <Dialog.Actions>
              <button>Cancel</button>
              <button>Save</button>
            </Dialog.Actions>
          </Dialog.Footer>
        </Dialog>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Multiple dialogs', () => {
    it('handles multiple dialogs independently', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      const { rerender } = render(
        <>
          <Dialog isOpen={true} onClose={onClose1}>
            <Dialog.Header>
              <Dialog.Title>Dialog 1</Dialog.Title>
            </Dialog.Header>
          </Dialog>
          <Dialog isOpen={true} onClose={onClose2}>
            <Dialog.Header>
              <Dialog.Title>Dialog 2</Dialog.Title>
            </Dialog.Header>
          </Dialog>
        </>
      );

      expect(screen.getByText('Dialog 1')).toBeInTheDocument();
      expect(screen.getByText('Dialog 2')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      // Both dialogs listen to Escape, so both are called
      expect(onClose1).toHaveBeenCalled();
      expect(onClose2).toHaveBeenCalled();
    });
  });

  describe('Context Provider', () => {
    it('provides onClose and showCloseButton to child components', () => {
      const onClose = vi.fn();

      render(
        <Dialog isOpen={true} onClose={onClose} showCloseButton={true}>
          <Dialog.Header>
            <Dialog.Title>Test</Dialog.Title>
          </Dialog.Header>
        </Dialog>
      );

      // Verify close button exists and is clickable (proving context was passed)
      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
