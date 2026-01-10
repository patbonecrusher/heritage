import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialogs } from '../../hooks/useDialogs';

describe('useDialogs', () => {
  describe('Union Dialog', () => {
    it('initializes union dialog as closed', () => {
      const { result } = renderHook(() => useDialogs());

      expect(result.current.unionDialog.isOpen).toBe(false);
      expect(result.current.unionDialog.editingId).toBeNull();
      expect(result.current.unionDialog.initialData).toBeNull();
    });

    it('opens union dialog', () => {
      const { result } = renderHook(() => useDialogs());

      const initialData = {
        id: 'union-1',
        partner1Id: 'person-1',
        partner2Id: 'person-2',
      };

      act(() => {
        result.current.unionDialog.open();
      });

      expect(result.current.unionDialog.isOpen).toBe(true);
    });

    it('closes union dialog', () => {
      const { result } = renderHook(() => useDialogs());

      act(() => {
        result.current.unionDialog.open();
      });

      expect(result.current.unionDialog.isOpen).toBe(true);

      act(() => {
        result.current.unionDialog.close();
      });

      expect(result.current.unionDialog.isOpen).toBe(false);
    });

    it('sets editing union id', () => {
      const { result } = renderHook(() => useDialogs());

      act(() => {
        result.current.unionDialog.setEditingId('union-1');
      });

      expect(result.current.unionDialog.editingId).toBe('union-1');
    });

    it('sets initial data for union', () => {
      const { result } = renderHook(() => useDialogs());

      const initialData = {
        id: 'union-1',
        partner1Id: 'person-1',
      };

      act(() => {
        result.current.unionDialog.setInitialData(initialData);
      });

      expect(result.current.unionDialog.initialData).toEqual(initialData);
    });

    it('sets pending union', () => {
      const { result } = renderHook(() => useDialogs());

      const pendingData = { type: 'marriage' };

      act(() => {
        result.current.unionDialog.setPending(pendingData);
      });

      expect(result.current.unionDialog.pendingUnion).toEqual(pendingData);
    });
  });

  describe('Preferences Dialog', () => {
    it('initializes preferences dialog as closed', () => {
      const { result } = renderHook(() => useDialogs());

      expect(result.current.preferencesDialog.isOpen).toBe(false);
    });

    it('opens and closes preferences dialog', () => {
      const { result } = renderHook(() => useDialogs());

      act(() => {
        result.current.preferencesDialog.open();
      });

      expect(result.current.preferencesDialog.isOpen).toBe(true);

      act(() => {
        result.current.preferencesDialog.close();
      });

      expect(result.current.preferencesDialog.isOpen).toBe(false);
    });
  });

  describe('Source Dialog', () => {
    it('initializes source dialog as closed', () => {
      const { result } = renderHook(() => useDialogs());

      expect(result.current.sourceDialog.isOpen).toBe(false);
      expect(result.current.sourceDialog.editingSource).toBeNull();
    });

    it('opens source dialog', () => {
      const { result } = renderHook(() => useDialogs());

      act(() => {
        result.current.sourceDialog.open();
      });

      expect(result.current.sourceDialog.isOpen).toBe(true);
    });

    it('sets editing source', () => {
      const { result } = renderHook(() => useDialogs());

      const source = { id: 'source-1', title: 'Birth Certificate' };

      act(() => {
        result.current.sourceDialog.setEditingSource(source);
      });

      expect(result.current.sourceDialog.editingSource).toEqual(source);
    });

    it('sets pending callback', () => {
      const { result } = renderHook(() => useDialogs());

      const callback = () => {};

      act(() => {
        result.current.sourceDialog.setPendingCallback(callback);
      });

      expect(result.current.sourceDialog.pendingCallback).toBe(callback);
    });

    it('closes source dialog', () => {
      const { result } = renderHook(() => useDialogs());

      act(() => {
        result.current.sourceDialog.open();
      });

      expect(result.current.sourceDialog.isOpen).toBe(true);

      act(() => {
        result.current.sourceDialog.close();
      });

      expect(result.current.sourceDialog.isOpen).toBe(false);
    });
  });
});
