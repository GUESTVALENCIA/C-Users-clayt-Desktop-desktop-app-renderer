// ============================================
// QWEN MCP PRELOAD - Bridge entre BrowserView y MCP Server
// Expone API segura para que QWEN (URL embebida) use el servidor MCP
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// API expuesta a QWEN para usar el servidor MCP "sandra-full-access"
contextBridge.exposeInMainWorld('mcpBridge', {
  // Llamar a cualquier herramienta del servidor MCP
  call: async (tool, params = {}) => {
    try {
      return await ipcRenderer.invoke('qwen:mcp:call', { tool, params });
    } catch (error) {
      console.error('[MCP Bridge] Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Listar herramientas disponibles
  listTools: async () => {
    try {
      return await ipcRenderer.invoke('qwen:mcp:listTools');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Verificar si el servidor MCP está disponible
  isAvailable: async () => {
    try {
      return await ipcRenderer.invoke('qwen:mcp:available');
    } catch (error) {
      return { success: false, available: false };
    }
  }
});

console.log('[QWEN MCP Preload] ✅ Bridge expuesto: window.mcpBridge');

