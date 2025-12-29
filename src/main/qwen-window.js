/**
 * qwen-window.js
 *
 * Crea y gestiona la ventana de QWEN embebido
 * Basado en vscode-qwen pero adaptado a Electron
 */

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { QwenSessionManager } = require('./qwen-manager');

class QwenWindow {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.qwenWindow = null;
    this.sessionManager = new QwenSessionManager();
  }

  /**
   * Crear la ventana de QWEN
   */
  create() {
    // 1. Cargar URL guardada o usar default
    const qwenUrl = this.sessionManager.getSessionUrl() || 'https://qwenlm.ai/';

    // 2. Crear ventana
    this.qwenWindow = new BrowserWindow({
      parent: this.mainWindow,
      width: 1000,
      height: 700,
      icon: path.join(__dirname, '../../assets/qwen-icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/qwen-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        allowRunningInsecureContent: false,
        sandbox: true,
        spellcheck: false
      }
    });

    // 3. Cargar HTML que contiene el iframe
    const htmlPath = path.join(__dirname, '../renderer/qwen-renderer.html');
    this.qwenWindow.loadFile(htmlPath);

    // 4. Inyectar la URL en el HTML después de cargar
    this.qwenWindow.webContents.on('did-finish-load', () => {
      this.qwenWindow.webContents.send('load-qwen-url', qwenUrl);
      console.log(`[QWEN] ✅ Panel cargado con URL: ${qwenUrl}`);
    });

    // 5. Manejar errores de carga
    this.qwenWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[QWEN] ❌ Error de carga: ${errorCode} - ${errorDescription}`);
      this.qwenWindow.webContents.send('qwen-load-error', errorDescription);
    });

    // 6. Escuchar cambios de URL (cuando la sesión cambia)
    ipcMain.on('qwen-url-changed', (event, newUrl) => {
      this.sessionManager.saveSessionUrl(newUrl);
      console.log(`[QWEN] ✅ Sesión guardada: ${newUrl}`);
    });

    // 7. Escuchar solicitud de reconexión
    ipcMain.on('qwen-reconnect', (event) => {
      if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
        this.qwenWindow.webContents.reload();
        console.log('[QWEN] 🔄 Reconectando...');
      }
    });

    // 8. Escuchar mensajes de QWEN para enviar al MCP Server
    ipcMain.on('qwen-send-to-mcp', (event, { message, context = {} }) => {
      // Re-emitir a main.js para que lo procese
      event.sender.send('qwen-message', { message, context });
      console.log(`[QWEN Window] 📤 Mensaje enviado al MCP: ${message.substring(0, 50)}...`);
    });

    // 9. Escuchar eventos de desconexión
    this.qwenWindow.on('closed', () => {
      this.qwenWindow = null;
      console.log('[QWEN] 🔒 Panel cerrado');
    });

    return this.qwenWindow;
  }

  /**
   * Enfocarse en la ventana si existe
   */
  focus() {
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      if (this.qwenWindow.isMinimized()) {
        this.qwenWindow.restore();
      }
      this.qwenWindow.focus();
    }
  }

  /**
   * Reconectar si se perdió la conexión
   */
  reconnect() {
    const qwenUrl = this.sessionManager.getSessionUrl();
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      this.qwenWindow.webContents.loadURL(qwenUrl);
      console.log(`[QWEN] 🔄 Cargando: ${qwenUrl}`);
    }
  }

  /**
   * Cerrar la ventana
   */
  close() {
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      this.qwenWindow.close();
      this.qwenWindow = null;
    }
  }

  /**
   * Verificar si está abierta
   */
  isOpen() {
    return this.qwenWindow && !this.qwenWindow.isDestroyed();
  }

  /**
   * Obtener la URL actual
   */
  getCurrentUrl() {
    return this.sessionManager.getSessionUrl();
  }

  /**
   * Cambiar la URL
   */
  setUrl(newUrl) {
    this.sessionManager.saveSessionUrl(newUrl);
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      this.qwenWindow.webContents.loadURL(newUrl);
    }
  }
}

module.exports = { QwenWindow };
