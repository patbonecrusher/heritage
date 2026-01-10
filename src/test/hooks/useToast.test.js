import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../../hooks/useToast';

describe('useToast', () => {
  it('initializes with empty toast', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast.visible).toBe(false);
    expect(result.current.toast.message).toBe('');
  });

  it('shows toast with message', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toast.visible).toBe(true);
    expect(result.current.toast.message).toBe('Test message');
  });

  it('hides toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toast.visible).toBe(true);

    act(() => {
      result.current.hideToast();
    });

    expect(result.current.toast.visible).toBe(false);
  });

  it('updates message when showing new toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First message');
    });

    expect(result.current.toast.message).toBe('First message');

    act(() => {
      result.current.showToast('Second message');
    });

    expect(result.current.toast.message).toBe('Second message');
  });
});
