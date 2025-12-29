// main-simple.js - StudioLab 8.0 Pro (versión corregida)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Función para crear la ventana principal
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'StudioLab - Multimodal Intelligence',
    webPreferences: {
      nodeIntegration: false, // Deshabilitado por seguridad
      contextIsolation: true, // Habilitado por seguridad
      preload: path.join(__dirname, 'preload.js'), // Archivo preload oficial
      partition: 'persist:qwen' // Partición persistente
    },
    icon: path.join(__dirname, 'assets', 'icon.png') // Icono de la aplicación (si existe)
  });

  // Cargar el archivo HTML oficial: studiolab-final-v2.html
  const INDEX_OFFICIAL_PATH = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
  const fs = require('fs');
  if (fs.existsSync(INDEX_OFFICIAL_PATH)) {
    win.loadFile(INDEX_OFFICIAL_PATH);
    console.log('[Main-Simple] ✅ Cargando studiolab-final-v2.html');
  } else {
    console.error('[Main-Simple] ❌ studiolab-final-v2.html no encontrado, usando index.html como fallback');
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }
  
  // Abrir DevTools para desarrollo
  // win.webContents.openDevTools();
  
  // Permitir popups para login si es necesario
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('Ventana emergente:', url);
    return { action: 'allow' };
  });
  
  return win;
}

// Manejar solicitudes del renderer para cargar rutas específicas
ipcMain.handle('load-route', async (event, route) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  switch(route) {
    case 'qwen-chat':
      await win.loadFile(path.join(__dirname, 'renderer', 'qwen-chat.html'));
      break;
    case 'studiolab':
      await win.loadFile(path.join(__dirname, 'renderer', 'studiolab-final-v2.html'));
      break;
    case 'qwen-offline':
      // Cargar la versión offline de Qwen si está disponible
      const qwenOfflinePath = path.join(__dirname, 'renderer', 'qwen-offline.html');
      const fs = require('fs');
      if (fs.existsSync(qwenOfflinePath)) {
        await win.loadFile(qwenOfflinePath);
      } else {
        // Si no existe, cargar la versión oficial
        await win.loadFile(path.join(__dirname, 'renderer', 'studiolab-final-v2.html'));
      }
      break;
    default:
      await win.loadFile(path.join(__dirname, 'renderer', 'studiolab-final-v2.html'));
  }
});

// Manejar solicitudes del renderer para servicios
ipcMain.handle('service-call', async (event, service, params) => {
  switch(service) {
    case 'ollama-check':
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
      } catch (error) {
        console.error('Error verificando Ollama:', error);
        return false;
      }
    case 'send-message':
      // Lógica para enviar mensaje a través de Ollama
      try {
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: params.model || 'qwen2.5:7b',
            messages: [{ role: 'user', content: params.message }],
            stream: false
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error de Ollama: ${response.status}`);
        }
        
        const data = await response.json();
        return data.message.content;
      } catch (error) {
        console.error('Error enviando mensaje a Ollama:', error);
        throw error;
      }
    default:
      throw new Error(`Servicio desconocido: ${service}`);
  }
});

// Iniciar la aplicación cuando esté lista
app.whenReady().then(() => {
  // Crear ventana principal
  const mainWindow = createWindow();
  
  // Manejar cierre de la aplicación
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cerrar la aplicación cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejar cierre de la aplicación
app.on('before-quit', () => {
  console.log('Cerrando aplicación...');
});