const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const secureStore = require('./secureStore');

// Shared config path for MCP server to read
const getSharedConfigPath = () => {
  return path.join(os.homedir(), '.heritage', 'config.json');
};

// Write current file path to shared config (for MCP server)
const updateSharedConfig = (filePath) => {
  const configDir = path.dirname(getSharedConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const config = { currentFile: filePath, updatedAt: new Date().toISOString() };
  fs.writeFileSync(getSharedConfigPath(), JSON.stringify(config, null, 2));
};

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Create application menu
  const menuTemplate = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-preferences')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tree',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        { type: 'separator' },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: 'Export as PNG...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export-png')
        },
        {
          label: 'Export as SVG...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu-export-svg')
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow.webContents.send('menu-preferences')
          },
          { type: 'separator' },
        ] : []),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Add Family Member',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow.webContents.send('menu-add-person')
        }
      ]
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Fit to View',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('menu-fit-view')
        }
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Handle save file dialog
ipcMain.handle('save-file', async (event, { data, defaultName, filters }) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: filters || [
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'SVG Image', extensions: ['svg'] },
      { name: 'JSON', extensions: ['json'] }
    ]
  });

  if (filePath) {
    if (typeof data === 'string') {
      fs.writeFileSync(filePath, data);
    } else {
      fs.writeFileSync(filePath, Buffer.from(data));
    }
    // Update shared config for MCP server (only for JSON files)
    if (filePath.endsWith('.json')) {
      updateSharedConfig(filePath);
    }
    return filePath;
  }
  return null;
});

// Handle open file dialog
ipcMain.handle('open-file', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Chart Files', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    // Update shared config for MCP server
    updateSharedConfig(filePaths[0]);
    return { path: filePaths[0], content: JSON.parse(content) };
  }
  return null;
});

// Handle reading a file by path (for loading last used file)
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Update shared config for MCP server
      updateSharedConfig(filePath);
      return { path: filePath, content: JSON.parse(content) };
    }
  } catch (error) {
    console.error('Error reading file:', error);
  }
  return null;
});

// Handle writing directly to a file path (for Save without dialog)
ipcMain.handle('write-file', async (event, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data);
    // Update shared config for MCP server
    updateSharedConfig(filePath);
    return filePath;
  } catch (error) {
    console.error('Error writing file:', error);
    return null;
  }
});

// Handle image selection dialog
ipcMain.handle('select-image', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    const imagePath = filePaths[0];
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mimeType};base64,${base64}`;
  }
  return null;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Secure store handlers for site credentials
ipcMain.handle('get-credentials', (event, site) => secureStore.getCredentials(site));
ipcMain.handle('set-credentials', (event, { site, credentials }) => {
  secureStore.setCredentials(site, credentials);
  return true;
});
ipcMain.handle('get-all-credentials', () => secureStore.getAllCredentials());
ipcMain.handle('has-credentials', (event, site) => secureStore.hasCredentials(site));
