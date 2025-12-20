import React, { useEffect, useState } from 'react';

const SITES = [
  { id: 'genealogieQuebec', name: 'Genealogie Quebec', url: 'genealogiequebec.com' },
  { id: 'familySearch', name: 'FamilySearch', url: 'familysearch.org' },
];

function PreferencesDialog({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('api');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState(true);
  const [credentials, setCredentials] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved settings when dialog opens
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      const loadSettings = async () => {
        const key = await window.electronAPI.getApiKey();
        setApiKey(key || '');

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
      await window.electronAPI.setApiKey(apiKey);

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

        <div className="preferences-tabs">
          <button
            className={`preferences-tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            API Key
          </button>
          <button
            className={`preferences-tab ${activeTab === 'sites' ? 'active' : ''}`}
            onClick={() => setActiveTab('sites')}
          >
            Site Credentials
          </button>
        </div>

        <div className="dialog-content preferences-content">
          {activeTab === 'api' && (
            <div className="preferences-section">
              <h3>Claude API Key</h3>
              <p className="preferences-hint">
                Required for the Research Agent. Get your API key from{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
                  console.anthropic.com
                </a>
              </p>
              <div className="form-group">
                <label>API Key</label>
                <div className="api-key-input">
                  <input
                    type={apiKeyMasked ? 'password' : 'text'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setApiKeyMasked(!apiKeyMasked)}
                    title={apiKeyMasked ? 'Show' : 'Hide'}
                  >
                    {apiKeyMasked ? '👁' : '👁‍🗨'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sites' && (
            <div className="preferences-section">
              <h3>Genealogy Site Credentials</h3>
              <p className="preferences-hint">
                Enter your login credentials for genealogy sites. These are stored securely on your device.
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
          )}
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
