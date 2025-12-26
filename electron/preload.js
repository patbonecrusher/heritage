const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Legacy file operations (for JSON format - can be removed later)
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  writeFile: (options) => ipcRenderer.invoke('write-file', options),
  openFile: () => ipcRenderer.invoke('open-file'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  selectImage: () => ipcRenderer.invoke('select-image'),

  // Menu event listeners
  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
  onMenuExportPng: (callback) => ipcRenderer.on('menu-export-png', callback),
  onMenuExportSvg: (callback) => ipcRenderer.on('menu-export-svg', callback),
  onMenuPreferences: (callback) => ipcRenderer.on('menu-preferences', callback),
  onMenuAddPerson: (callback) => ipcRenderer.on('menu-add-person', callback),
  onMenuFitView: (callback) => ipcRenderer.on('menu-fit-view', callback),

  // Bundle opened event (for double-click open)
  onBundleOpened: (callback) => ipcRenderer.on('bundle-opened', (event, data) => callback(data)),

  // Database changed event (for MCP server updates)
  onDatabaseChanged: (callback) => ipcRenderer.on('database-changed', () => callback()),

  // Cleanup
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu-new');
    ipcRenderer.removeAllListeners('menu-open');
    ipcRenderer.removeAllListeners('menu-save');
    ipcRenderer.removeAllListeners('menu-save-as');
    ipcRenderer.removeAllListeners('menu-export-png');
    ipcRenderer.removeAllListeners('menu-export-svg');
    ipcRenderer.removeAllListeners('menu-preferences');
    ipcRenderer.removeAllListeners('menu-add-person');
    ipcRenderer.removeAllListeners('menu-fit-view');
    ipcRenderer.removeAllListeners('bundle-opened');
    ipcRenderer.removeAllListeners('database-changed');
  },

  // Secure store - site credentials
  getCredentials: (site) => ipcRenderer.invoke('get-credentials', site),
  setCredentials: (site, credentials) => ipcRenderer.invoke('set-credentials', { site, credentials }),
  getAllCredentials: () => ipcRenderer.invoke('get-all-credentials'),
  hasCredentials: (site) => ipcRenderer.invoke('has-credentials', site),

  // ============================================
  // Bundle Management
  // ============================================
  bundle: {
    create: (name) => ipcRenderer.invoke('bundle-create', name),
    open: () => ipcRenderer.invoke('bundle-open'),
    openPath: (path) => ipcRenderer.invoke('bundle-open-path', path),
    close: () => ipcRenderer.invoke('bundle-close'),
    info: () => ipcRenderer.invoke('bundle-info'),
    importMedia: (type) => ipcRenderer.invoke('bundle-import-media', { type }),
    resolveMedia: (relativePath) => ipcRenderer.invoke('bundle-resolve-media', relativePath),
    readMediaBase64: (relativePath) => ipcRenderer.invoke('bundle-read-media-base64', relativePath),
    deleteMedia: (relativePath) => ipcRenderer.invoke('bundle-delete-media', relativePath),
  },

  // ============================================
  // Database Operations
  // ============================================
  db: {
    // SELECT queries - returns { rows: [...] } or { error: string }
    query: (sql, params) => ipcRenderer.invoke('db-query', { sql, params }),

    // SELECT single row - returns { row: {...} } or { error: string }
    get: (sql, params) => ipcRenderer.invoke('db-get', { sql, params }),

    // INSERT/UPDATE/DELETE - returns { changes, lastInsertRowid } or { error: string }
    run: (sql, params) => ipcRenderer.invoke('db-run', { sql, params }),

    // Transaction - execute multiple statements atomically
    // statements: [{ sql: string, params: any[] }, ...]
    transaction: (statements) => ipcRenderer.invoke('db-transaction', { statements }),
  },
});
