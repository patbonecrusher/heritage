const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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
  },

  // Secure store - site credentials
  getCredentials: (site) => ipcRenderer.invoke('get-credentials', site),
  setCredentials: (site, credentials) => ipcRenderer.invoke('set-credentials', { site, credentials }),
  getAllCredentials: () => ipcRenderer.invoke('get-all-credentials'),
  hasCredentials: (site) => ipcRenderer.invoke('has-credentials', site),
});
