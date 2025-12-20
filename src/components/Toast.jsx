import React, { useEffect, useState } from 'react';

export default function Toast({ message, isVisible, onClose, duration = 2000 }) {
  const [isShowing, setIsShowing] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      setIsFading(false);

      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, duration - 300);

      const hideTimer = setTimeout(() => {
        setIsShowing(false);
        onClose?.();
      }, duration);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isVisible, duration, onClose]);

  if (!isShowing) return null;

  return (
    <div className={`toast ${isFading ? 'fading' : ''}`}>
      <span className="toast-icon">✓</span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
