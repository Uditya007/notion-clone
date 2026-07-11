const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, dialog, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let quickCaptureWindow;
let tray;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(devUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickCaptureWindow() {
  if (quickCaptureWindow) {
    quickCaptureWindow.show();
    quickCaptureWindow.focus();
    return;
  }

  quickCaptureWindow = new BrowserWindow({
    width: 540,
    height: 380,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    show: false,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  quickCaptureWindow.loadURL(`${devUrl}?quickCapture=true`);

  quickCaptureWindow.on('blur', () => {
    quickCaptureWindow.hide();
  });
}

// IPC Handlers for Native macOS Features
function registerIpcHandlers() {
  // Toggle Always-On-Top Floating Mode
  ipcMain.handle('toggle-always-on-top', (event, enable) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(enable);
      return enable;
    }
    return false;
  });

  // Local File System Vault Backup / Save Note as Markdown
  ipcMain.handle('export-local-markdown', async (event, { title, content }) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Note to Local macOS Folder',
      defaultPath: path.join(app.getPath('documents'), `${title || 'Untitled'}.md`),
      filters: [{ name: 'Markdown Document', extensions: ['md'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, content || '', 'utf-8');
      return { success: true, filePath };
    }
    return { success: false };
  });

  // Get macOS App Version & Platform info
  ipcMain.handle('get-desktop-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      documentsDir: app.getPath('documents')
    };
  });
}

function buildApplicationMenu() {
  const template = [
    {
      label: 'Cora Workspace',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Open Quick Capture HUD',
          accelerator: 'Option+Space',
          click: () => createQuickCaptureWindow()
        },
        {
          label: 'Toggle Always on Top',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (mainWindow) {
              const isTop = mainWindow.isAlwaysOnTop();
              mainWindow.setAlwaysOnTop(!isTop);
            }
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Page',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('create-new-page');
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createMainWindow();
  buildApplicationMenu();
  registerIpcHandlers();

  // Register system-wide global hotkey for Quick Capture HUD (Option+Space)
  try {
    globalShortcut.register('Option+Space', () => {
      createQuickCaptureWindow();
    });
  } catch (err) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
