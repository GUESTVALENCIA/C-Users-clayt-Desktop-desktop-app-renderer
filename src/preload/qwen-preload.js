/**
 * qwen-preload.js
 *
 * Script de preload seguro para el contexto de QWEN
 * Proporciona API limitada y segura desde el renderer al main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura en el contexto de la ventana
contextBridge.exposeInMainWorld('qwenAPI', {
  /**
   * Guardar URL de sesión
   */
  saveQwenUrl: (url) => {
    ipcRenderer.send('qwen-url-changed', url);
  },

  /**
   * Escuchar cambios de URL
   */
  onLoadUrl: (callback) => {
    ipcRenderer.on('load-qwen-url', (event, url) => {
      callback(url);
    });
  },

  /**
   * Solicitar reconexión
   */
  reconnect: () => {
    ipcRenderer.send('qwen-reconnect');
  },

  /**
   * Manejar errores de carga
   */
  onLoadError: (callback) => {
    ipcRenderer.on('qwen-load-error', (event, error) => {
      callback(error);
    });
  },

  /**
   * Enviar evento al MCP Server
   */
  sendToMCP: (event, data) => {
    ipcRenderer.send('send-to-mcp', { event, data });
  },

  /**
   * Recibir eventos del MCP Server
   */
  onMCPEvent: (callback) => {
    ipcRenderer.on('mcp-event', (event, data) => {
      callback(data);
    });
  },

  /**
   * Log seguro (no expone datos sensibles)
   */
  log: (message) => {
    ipcRenderer.send('qwen-log', message);
  }
});

// Escuchar evento de carga de URL
ipcRenderer.on('load-qwen-url', (event, url) => {
  console.log(`[Preload] Cargando QWEN desde: ${url}`);
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  ipcRenderer.send('qwen-error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

console.log('[Preload] ✅ Contexto de QWEN inicializado');
