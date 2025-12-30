/**
 * QWEN PRELOAD FUNCTIONS
 * 
 * Estas funciones deben exponerse en el preload.js para que
 * el renderer pueda comunicarse con el main process.
 */

// Agregar estos métodos al contextBridge en preload.js:

/*
contextBridge.exposeInMainWorld('qwenAPI', {
  // Toggle del panel
  toggle: (show) => ipcRenderer.invoke('qwen:toggle', { show }),
  
  // Enviar mensaje
  sendMessage: (message) => ipcRenderer.invoke('qwen:sendMessage', { message }),
  
  // Verificar login
  checkLogin: () => ipcRenderer.invoke('qwen:checkLogin'),
  
  // Abrir ventana de login
  login: () => ipcRenderer.invoke('qwen:login'),
  
  // Cerrar sesión
  logout: () => ipcRenderer.invoke('qwen:logout'),
  
  // Obtener última respuesta
  getResponse: () => ipcRenderer.invoke('qwen:getResponse'),
  
  // Escuchar respuestas en tiempo real
  onResponse: (callback) => {
    ipcRenderer.on('qwen:response', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('qwen:response');
  }
});
*/

// ============ CÓDIGO COMPLETO PARA AGREGAR AL PRELOAD.JS ============
const PRELOAD_QWEN_CODE = `
// ============ QWEN API ============
const qwenAPI = {
  // Toggle del panel de QWEN
  toggle: (show) => ipcRenderer.invoke('qwen:toggle', { show }),
  
  // Enviar mensaje a QWEN
  sendMessage: (message) => ipcRenderer.invoke('qwen:sendMessage', { message }),
  
  // Verificar estado de login
  checkLogin: () => ipcRenderer.invoke('qwen:checkLogin'),
  
  // Abrir ventana de login
  login: () => ipcRenderer.invoke('qwen:login'),
  
  // Cerrar sesión
  logout: () => ipcRenderer.invoke('qwen:logout'),
  
  // Obtener última respuesta
  getResponse: () => ipcRenderer.invoke('qwen:getResponse'),
  
  // Escuchar respuestas en tiempo real
  onResponse: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('qwen:response', handler);
    return () => ipcRenderer.removeListener('qwen:response', handler);
  }
};

// Exponer en contextBridge
contextBridge.exposeInMainWorld('qwenAPI', qwenAPI);
`;

module.exports = { PRELOAD_QWEN_CODE };
