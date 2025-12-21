import React, { useEffect, useState } from 'react';

const SITES = [
  { id: 'genealogieQuebec', name: 'Genealogie Quebec', url: 'genealogiequebec.com' },
  { id: 'familySearch', name: 'FamilySearch', url: 'familysearch.org' },
];

function PreferencesDialog({ isOpen, onClose }) {
  const [credentials, setCredentials] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved settings when dialog opens
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      const loadSettings = async () => {
        const allCreds = await window.electronAPI.getAllCredentials();
        setCredentials(allCreds || {});
      };
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!window.electronAPI) return;

    setSaving(true);
    try {
      for (const site of SITES) {
        if (credentials[site.id]) {
          await window.electronAPI.setCredentials(site.id, credentials[site.id]);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateCredential = (siteId, field, value) => {
    setCredentials(prev => ({
      ...prev,
      [siteId]: {
        ...prev[siteId],
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog preferences-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Preferences</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content preferences-content">
          <div className="preferences-section">
            <h3>Genealogy Site Credentials</h3>
            <p className="preferences-hint">
              Enter your login credentials for genealogy sites. These are stored securely on your device
              and can be used by the MCP server for research.
            </p>

            {SITES.map(site => (
              <div key={site.id} className="site-credentials">
                <h4>{site.name}</h4>
                <span className="site-url">{site.url}</span>
                <div className="credentials-row">
                  <div className="form-group">
                    <label>Username / Email</label>
                    <input
                      type="text"
                      value={credentials[site.id]?.username || ''}
                      onChange={(e) => updateCredential(site.id, 'username', e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={credentials[site.id]?.password || ''}
                      onChange={(e) => updateCredential(site.id, 'password', e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreferencesDialog;
