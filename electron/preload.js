const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isMacOS: process.platform === 'darwin',
  isDesktop: true,
  toggleAlwaysOnTop: (enable) => ipcRenderer.invoke('toggle-always-on-top', enable),
  exportLocalMarkdown: (noteData) => ipcRenderer.invoke('export-local-markdown', noteData),
  getDesktopInfo: () => ipcRenderer.invoke('get-desktop-info'),
  on: (channel, callback) => {
    const validChannels = ['create-new-page', 'toggle-ai-panel'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});
