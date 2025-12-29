// Preload simple para StudioLab
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studioAPI', {
  mcpCall: (tool, params) => ipcRenderer.invoke('mcp:call', { tool, params }),
  getPort: () => ipcRenderer.invoke('mcp:getPort')
});

console.log('✅ StudioLab API expuesta');
