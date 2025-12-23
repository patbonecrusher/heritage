/**
 * WelcomeScreen - Shown when no file/bundle is open
 */

import React from 'react';

export default function WelcomeScreen({
  onNewBundle,
  onOpenBundle,
  onNewLegacy,
  onOpenLegacy,
  isLoading,
}) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-logo">
          <svg viewBox="0 0 100 100" className="welcome-icon">
            <path
              d="M50 10 L50 90 M30 30 Q50 50 70 30 M20 50 Q50 70 80 50 M25 70 Q50 85 75 70"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <h1>Heritage</h1>
          <p className="welcome-tagline">Document your family history</p>
        </div>

        <div className="welcome-actions">
          <div className="welcome-section">
            <h2>Get Started</h2>
            <button
              className="welcome-btn primary"
              onClick={onNewBundle}
              disabled={isLoading}
            >
              <span className="btn-icon">+</span>
              <span className="btn-text">
                <strong>New Family Tree</strong>
                <small>Create a new .heritage file</small>
              </span>
            </button>

            <button
              className="welcome-btn"
              onClick={onOpenBundle}
              disabled={isLoading}
            >
              <span className="btn-icon">📂</span>
              <span className="btn-text">
                <strong>Open Family Tree</strong>
                <small>Open an existing .heritage file</small>
              </span>
            </button>
          </div>

          <div className="welcome-section legacy">
            <h3>Legacy Format</h3>
            <p className="legacy-note">
              For compatibility with older Heritage files
            </p>
            <div className="legacy-buttons">
              <button
                className="welcome-btn-small"
                onClick={onNewLegacy}
                disabled={isLoading}
              >
                New JSON
              </button>
              <button
                className="welcome-btn-small"
                onClick={onOpenLegacy}
                disabled={isLoading}
              >
                Open JSON
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="welcome-loading">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
