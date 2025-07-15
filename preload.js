const { contextBridge, ipcRenderer } = require('electron');

// Expose specific IPC methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['reload', 'clear-cache'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});
