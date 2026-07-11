// ─────────────────────────────────────────────────────────────────
//  Cora Workspace — Electron Preload Script
//  Exposes native macOS capabilities to the renderer via contextBridge
// ─────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // ── Platform Info ──────────────────────────────────────────────
  isMacOS: process.platform === 'darwin',
  isDesktop: true,
  platform: process.platform,

  // ── Existing Handlers ──────────────────────────────────────────
  toggleAlwaysOnTop: (enable) => ipcRenderer.invoke('toggle-always-on-top', enable),
  exportLocalMarkdown: (noteData) => ipcRenderer.invoke('export-local-markdown', noteData),
  getDesktopInfo: () => ipcRenderer.invoke('get-desktop-info'),

  // ── New Native Handlers ────────────────────────────────────────
  shareContent: (data) => ipcRenderer.invoke('share-content', data),
  setBadgeCount: (count) => ipcRenderer.invoke('set-badge-count', count),
  showNotification: (data) => ipcRenderer.invoke('show-notification', data),
  revealInFinder: (filePath) => ipcRenderer.invoke('reveal-in-finder', filePath),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),

  // ── Menu Event Listeners (main → renderer) ────────────────────
  on: (channel, callback) => {
    const validChannels = [
      'create-new-page',
      'toggle-ai-panel',
      'toggle-sidebar',
      'open-search',
      'open-settings',
      'export-markdown',
      'open-meeting-recorder',
      'system-theme-changed'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // ── Remove Listener ────────────────────────────────────────────
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
