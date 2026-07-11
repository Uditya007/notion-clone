// ─────────────────────────────────────────────────────────────────
//  Cora Workspace — Electron Main Process
//  Native macOS desktop application shell
// ─────────────────────────────────────────────────────────────────

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  shell,
  dialog,
  nativeImage,
  nativeTheme,
  screen,
  clipboard,
  Notification
} = require('electron');
const path = require('path');
const fs = require('fs');

// ── Globals ──────────────────────────────────────────────────────
let mainWindow = null;
let quickCaptureWindow = null;
let tray = null;
let meetingHudWindow = null;
let meetingDetectorInterval = null;
let currentMeetingPlatform = null;
let hudShownForCurrentMeeting = false;
let recordingProcess = null;

// 16×16 template tray icon (small green Cora dot)
const TRAY_ICON_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9h' +
  'AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdH' +
  'dhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABOSURBVDiNY/z//z8DJYCJgUIwas' +
  'CoAaMGjBpAXQNYGCgEoxYMDxiVYtSAUQNGDRg1gLoGsDJQCEYtGB4wKsWoAaMG' +
  'jBowasCoARQHABqaAxX5Do+EAAAAAElFTkSuQmCC';

// ── Window State Persistence ─────────────────────────────────────
const userDataPath = app.getPath('userData');
const windowStatePath = path.join(userDataPath, 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      return JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
    }
  } catch (e) {
    // Corrupted state file — use defaults
  }
  return { width: 1280, height: 800, x: undefined, y: undefined, isMaximized: false };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    fs.writeFileSync(
      windowStatePath,
      JSON.stringify({ ...bounds, isMaximized }),
      'utf-8'
    );
  } catch (e) {
    // Silently ignore write errors
  }
}

/**
 * Validate that saved window position is still on-screen.
 * Prevents the window from opening off-screen after a display change.
 */
function ensureBoundsOnScreen(state) {
  if (state.x === undefined || state.y === undefined) return state;

  const displays = screen.getAllDisplays();
  const isVisible = displays.some((display) => {
    const { x, y, width, height } = display.workArea;
    return (
      state.x >= x &&
      state.y >= y &&
      state.x + state.width <= x + width + 200 &&
      state.y + state.height <= y + height + 200
    );
  });

  if (!isVisible) {
    // Reset to center on primary display
    return { ...state, x: undefined, y: undefined };
  }
  return state;
}

// ── Main Window ──────────────────────────────────────────────────
function createMainWindow() {
  const savedState = ensureBoundsOnScreen(loadWindowState());

  const windowOptions = {
    width: savedState.width,
    height: savedState.height,
    minWidth: 860,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    roundedCorners: true,
    show: false, // Show after ready-to-show to prevent flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      devTools: true
    }
  };

  // Apply saved position if valid
  if (savedState.x !== undefined) windowOptions.x = savedState.x;
  if (savedState.y !== undefined) windowOptions.y = savedState.y;

  mainWindow = new BrowserWindow(windowOptions);

  // Show window gracefully — no white flash
  mainWindow.once('ready-to-show', () => {
    if (savedState.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
  });

  // Load the Next.js app
  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(devUrl);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Persist window state on move/resize (debounced via close)
  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Respond to macOS system theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        'system-theme-changed',
        nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
      );
    }
  });
}

// ── Quick Capture HUD ────────────────────────────────────────────
function createQuickCaptureWindow() {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
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
    skipTaskbar: true,
    backgroundColor: '#18181b',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  quickCaptureWindow.loadURL(`${devUrl}?quickCapture=true`);

  quickCaptureWindow.once('ready-to-show', () => {
    quickCaptureWindow.show();
  });

  quickCaptureWindow.on('blur', () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
      quickCaptureWindow.hide();
    }
  });

  quickCaptureWindow.on('closed', () => {
    quickCaptureWindow = null;
  });
}

// ── System Tray ──────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromDataURL(TRAY_ICON_BASE64);
  icon.setTemplateImage(true); // macOS template image adapts to light/dark menu bar

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Cora',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'New Page',
      accelerator: 'CmdOrCtrl+N',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('create-new-page');
        }
      }
    },
    {
      label: 'New Meeting Note',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('open-meeting-recorder');
        }
      }
    },
    {
      label: 'Quick Capture',
      accelerator: 'Option+Space',
      click: () => createQuickCaptureWindow()
    },
    { type: 'separator' },
    { label: 'Quit Cora', role: 'quit' }
  ]);

  tray.setToolTip('Cora Workspace');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── IPC Handlers ─────────────────────────────────────────────────
function registerIpcHandlers() {
  // Toggle Always-On-Top Floating Mode
  ipcMain.handle('toggle-always-on-top', (_event, enable) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(enable);
      return enable;
    }
    return false;
  });

  // Export note as Markdown via native Save dialog
  ipcMain.handle('export-local-markdown', async (_event, { title, content }) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Note to Local macOS Folder',
      defaultPath: path.join(
        app.getPath('documents'),
        `${(title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-')}.md`
      ),
      filters: [{ name: 'Markdown Document', extensions: ['md'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, content || '', 'utf-8');
      return { success: true, filePath };
    }
    return { success: false };
  });

  // Get macOS app and platform info
  ipcMain.handle('get-desktop-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      documentsDir: app.getPath('documents')
    };
  });

  // Share content (macOS clipboard fallback since NSSharingServicePicker
  // is not exposed by Electron without native modules)
  ipcMain.handle('share-content', async (_event, { title, text, url }) => {
    clipboard.writeText(text || url || title || '');
    return { success: true, method: 'clipboard' };
  });

  // Badge count on dock icon (task reminders, unread counts)
  ipcMain.handle('set-badge-count', (_event, count) => {
    if (process.platform === 'darwin') {
      app.setBadgeCount(count);
    }
    return count;
  });

  // Native macOS notification
  ipcMain.handle('show-notification', (_event, { title, body, silent }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: silent || false }).show();
    }
  });

  // Reveal file in Finder
  ipcMain.handle('reveal-in-finder', async (_event, filePath) => {
    shell.showItemInFolder(filePath);
    return true;
  });

  // Get system theme (light/dark)
  ipcMain.handle('get-system-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  // Close meeting HUD
  ipcMain.handle('close-meeting-hud', () => {
    if (meetingHudWindow && !meetingHudWindow.isDestroyed()) meetingHudWindow.hide();
    hudShownForCurrentMeeting = false;
  });

  // Start system audio recording via sox
  ipcMain.handle('start-system-recording', async () => {
    const os = require('os');
    const outputPath = path.join(os.tmpdir(), `cora-meeting-${Date.now()}.wav`);
    
    // sox records from default input (set BlackHole or system mic in Audio MIDI Setup)
    recordingProcess = require('child_process').spawn('sox', [
      '-d',           // default audio device
      '-r', '16000',  // 16kHz sample rate (optimal for Gemini)
      '-c', '1',      // mono
      '-b', '16',     // 16-bit
      outputPath
    ]);

    recordingProcess.stderr.on('data', (data) => {
      console.log('SOX:', data.toString());
    });

    return { success: true, outputPath };
  });

  ipcMain.handle('stop-system-recording', async (event, outputPath) => {
    if (recordingProcess) {
      recordingProcess.kill('SIGTERM');
      recordingProcess = null;
    }
    
    // Wait for file to flush
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read the file and return as base64
    try {
      const audioData = fs.readFileSync(outputPath);
      const base64 = audioData.toString('base64');
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath); // cleanup
      }
      return { success: true, base64, mimeType: 'audio/wav' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Open main window and navigate to the meeting summary page
  ipcMain.handle('open-meeting-in-cora', (event, pageId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('navigate-to-page', pageId);
    }
  });
}

// ── Application Menu (Notion-style) ─────────────────────────────
function buildApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only — Electron auto-inserts on other platforms)
    ...(isMac
      ? [
          {
            label: 'Cora',
            submenu: [
              { role: 'about', label: 'About Cora' },
              { type: 'separator' },
              {
                label: 'Preferences…',
                accelerator: 'Cmd+,',
                click: () => {
                  if (mainWindow) mainWindow.webContents.send('open-settings');
                }
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide Cora' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit Cora' }
            ]
          }
        ]
      : []),

    // ── File ──
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
        {
          label: 'New Meeting Note',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-meeting-recorder');
          }
        },
        { type: 'separator' },
        {
          label: 'Export as Markdown…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('export-markdown');
          }
        },
        { type: 'separator' },
        {
          label: 'Quick Capture HUD',
          accelerator: 'Option+Space',
          click: () => createQuickCaptureWindow()
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },

    // ── Edit ──
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          submenu: [
            {
              label: 'Find in Page…',
              accelerator: 'CmdOrCtrl+F',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('open-search');
              }
            }
          ]
        },
        ...(isMac
          ? [
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' },
                  { role: 'stopSpeaking' }
                ]
              }
            ]
          : [])
      ]
    },

    // ── View ──
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('toggle-sidebar');
          }
        },
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('toggle-ai-panel');
          }
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Toggle Always on Top',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              const isTop = mainWindow.isAlwaysOnTop();
              mainWindow.setAlwaysOnTop(!isTop);
            }
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },

    // ── Window ──
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        ...(isMac
          ? [{ role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Dock Menu (macOS) ────────────────────────────────────────────
function buildDockMenu() {
  if (process.platform !== 'darwin') return;

  app.dock.setMenu(
    Menu.buildFromTemplate([
      {
        label: 'New Page',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('create-new-page');
          }
        }
      },
      {
        label: 'Quick Capture',
        click: () => createQuickCaptureWindow()
      },
      {
        label: 'New Meeting Note',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.webContents.send('open-meeting-recorder');
          }
        }
      }
    ])
  );
}

function checkForActiveMeeting() {
  // Check Google Chrome tabs for Meet/Zoom URLs
  const chromeScript = `
    osascript -e '
      tell application "System Events"
        set chromRunning to (name of processes) contains "Google Chrome"
      end tell
      if chromRunning then
        tell application "Google Chrome"
          set tabURL to ""
          repeat with w in windows
            repeat with t in tabs of w
              set u to URL of t
              if u contains "meet.google.com" or u contains "zoom.us/wc" then
                set tabURL to u
                exit repeat
              end if
            end repeat
          end repeat
          return tabURL
        end tell
      end if
      return ""
    '
  `;

  exec(chromeScript, (err, stdout) => {
    const url = (stdout || '').trim();
    
    if (url.includes('meet.google.com')) {
      handleMeetingDetected('Google Meet');
    } else if (url.includes('zoom.us')) {
      handleMeetingDetected('Zoom');
    } else {
      // Also check if Zoom desktop app is running
      exec(`osascript -e 'tell application "System Events" to (name of processes) contains "zoom.us"'`, 
        (err2, stdout2) => {
          if ((stdout2 || '').trim() === 'true') {
            handleMeetingDetected('Zoom');
          } else {
            // Meeting ended
            if (currentMeetingPlatform) {
              currentMeetingPlatform = null;
              hudShownForCurrentMeeting = false;
              if (meetingHudWindow && !meetingHudWindow.isDestroyed()) {
                meetingHudWindow.hide();
              }
            }
          }
        }
      );
    }
  });
}

function handleMeetingDetected(platform) {
  if (currentMeetingPlatform === platform && hudShownForCurrentMeeting) return;
  currentMeetingPlatform = platform;
  hudShownForCurrentMeeting = true;
  createMeetingHudWindow(platform);
}

function startMeetingDetector() {
  if (meetingDetectorInterval) return;
  meetingDetectorInterval = setInterval(checkForActiveMeeting, 8000);
}

function createMeetingHudWindow(platform) {
  if (meetingHudWindow && !meetingHudWindow.isDestroyed()) {
    meetingHudWindow.webContents.send('meeting-platform', platform);
    meetingHudWindow.show();
    return;
  }

  // Position in bottom-right corner of primary display
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  meetingHudWindow = new BrowserWindow({
    width: 320,
    height: 140,
    x: width - 340,
    y: height - 160,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'hud',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  meetingHudWindow.loadURL(`${devUrl}?meetingHud=true&platform=${encodeURIComponent(platform)}`);

  meetingHudWindow.once('ready-to-show', () => {
    meetingHudWindow.show();
    meetingHudWindow.webContents.send('meeting-platform', platform);
  });

  meetingHudWindow.on('closed', () => {
    meetingHudWindow = null;
    hudShownForCurrentMeeting = false;
  });
}

// ── App Lifecycle ────────────────────────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  buildApplicationMenu();
  buildDockMenu();
  registerIpcHandlers();
  createTray();
  startMeetingDetector();

  // Register system-wide global hotkey for Quick Capture HUD
  try {
    globalShortcut.register('Option+Space', () => {
      createQuickCaptureWindow();
    });
  } catch (err) {
    console.error('Failed to register global shortcut:', err);
  }

  // macOS: re-create window when dock icon clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // macOS convention: app stays running after last window closes
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
