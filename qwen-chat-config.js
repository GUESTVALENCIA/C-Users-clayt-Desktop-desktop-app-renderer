// Configuración para cargar la interfaz de chat con Qwen

const path = require('path');

// Configuración para el módulo de chat con Qwen
const qwenChatConfig = {
  name: 'qwen-chat',
  title: 'Chat con Qwen',
  description: 'Interfaz de chat integrada con el modelo Qwen a través de Ollama',
  icon: '🤖',
  // Ruta al archivo HTML de la interfaz de chat
  htmlPath: path.join(__dirname, 'renderer', 'qwen-chat.html'),
  // Archivos CSS y JS adicionales que se deben cargar
  stylesheets: [
    path.join(__dirname, 'renderer', 'qwen-chat-style.css')
  ],
  scripts: [
    path.join(__dirname, 'renderer', 'qwen-ollama-integration.js')
  ],
  // Opciones para la ventana de Electron
  windowOptions: {
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: false, // Importante para seguridad
      contextIsolation: true,
      enableRemoteModule: false
    }
  },
  // Función para inicializar el módulo
  initialize: (mainWindow) => {
    console.log('Módulo Qwen Chat inicializado');
    // Aquí puedes añadir lógica adicional para inicializar el módulo
  },
  // Función para cargar el módulo en la aplicación
  load: (mainWindow) => {
    const { BrowserView } = require('electron');
    const view = new BrowserView();
    
    mainWindow.setBrowserView(view);
    
    const bounds = mainWindow.getBounds();
    view.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height
    });
    
    view.webContents.loadFile(path.join(__dirname, 'renderer', 'qwen-chat.html'));
    
    // Manejar redimensionamiento
    mainWindow.on('resize', () => {
      const bounds = mainWindow.getBounds();
      view.setBounds({
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height
      });
    });
    
    return view;
  }
};

module.exports = qwenChatConfig;