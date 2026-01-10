/**
 * useToast - Hook for toast notifications
 */

import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ visible: false, message: '' });
  }, []);

  return { toast, showToast, hideToast };
}
