import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonNavigation } from '../../hooks/usePersonNavigation';

describe('usePersonNavigation', () => {
  it('initializes with null selectedPersonId', () => {
    const { result } = renderHook(() => usePersonNavigation());

    expect(result.current.selectedPersonId).toBeNull();
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it('navigates to a person', () => {
    const { result } = renderHook(() => usePersonNavigation());

    act(() => {
      result.current.navigateTo('person-1');
    });

    expect(result.current.selectedPersonId).toBe('person-1');
  });

  it('maintains navigation history', () => {
    const { result } = renderHook(() => usePersonNavigation());

    act(() => {
      result.current.navigateTo('person-1');
    });

    expect(result.current.canGoBack).toBe(false);

    act(() => {
      result.current.navigateTo('person-2');
    });

    expect(result.current.selectedPersonId).toBe('person-2');
    expect(result.current.canGoBack).toBe(true);
  });

  it('navigates back through history', () => {
    const { result } = renderHook(() => usePersonNavigation());

    act(() => {
      result.current.navigateTo('person-1');
    });

    act(() => {
      result.current.navigateTo('person-2');
    });

    act(() => {
      result.current.navigateTo('person-3');
    });

    expect(result.current.selectedPersonId).toBe('person-3');
    expect(result.current.canGoBack).toBe(true);

    act(() => {
      result.current.navigateBack();
    });

    expect(result.current.selectedPersonId).toBe('person-2');
  });

  it('navigates forward through history', () => {
    const { result } = renderHook(() => usePersonNavigation());

    act(() => {
      result.current.navigateTo('person-1');
    });

    act(() => {
      result.current.navigateTo('person-2');
    });

    act(() => {
      result.current.navigateBack();
    });

    expect(result.current.selectedPersonId).toBe('person-1');
    expect(result.current.canGoForward).toBe(true);

    act(() => {
      result.current.navigateForward();
    });

    expect(result.current.selectedPersonId).toBe('person-2');
  });

  it('clears history', () => {
    const { result } = renderHook(() => usePersonNavigation());

    act(() => {
      result.current.navigateTo('person-1');
    });

    act(() => {
      result.current.navigateTo('person-2');
    });

    expect(result.current.selectedPersonId).toBe('person-2');

    act(() => {
      result.current.clearHistory();
    });

    // clearHistory only clears the history stacks, not the selectedPersonId
    expect(result.current.selectedPersonId).toBe('person-2');
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });
});
