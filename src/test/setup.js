import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.electronAPI for Electron API calls
global.window.electronAPI = {
  selectDirectory: vi.fn(),
  selectFile: vi.fn(),
  removeMenuListeners: vi.fn(),
  onOpenFile: vi.fn(),
  onNewFile: vi.fn(),
  onSaveFile: vi.fn(),
};
