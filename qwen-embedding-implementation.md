# 🚀 IMPLEMENTACIÓN DE QWEN EMBEBIDO EN ELECTRON

## Cómo funciona en VS Code (Realidad)

```typescript
// 1. Registra una vista en la barra lateral
vscode.window.registerWebviewViewProvider('qwenView', provider);

// 2. Carga un iframe con QWEN
<iframe src="https://qwenlm.ai/" />

// 3. Guarda la sesión automáticamente
context.globalState.update('qwenSessionUrl', url);
```

**Es así de simple.** NO hay proceso externo, NO hay magia - solo un iframe con CSP permitido.

---

## Adaptación a Electron

### 1️⃣ **Estructura de Archivos a Crear**

```
desktop-app/
├── src/
│   ├── main/
│   │   ├── qwen-window.js          # Crear ventana de QWEN
│   │   ├── qwen-manager.js         # Gestionar sesión
│   │   └── qwen-ipc.js             # IPC handlers
│   ├── preload/
│   │   └── qwen-preload.js         # Preload script
│   ├── renderer/
│   │   └── qwen-renderer.html      # HTML con iframe
│   └── utils/
│       └── storage.js              # Almacenamiento persistente
├── qwen-session.json               # Estado persistente
└── main.js                         # (actualizar)
```

### 2️⃣ **El Componente Principal - qwen-window.js**

```javascript
/**
 * qwen-window.js
 *
 * Crea y gestiona la ventana de QWEN embebido
 * Exactamente como VS Code lo hace, pero en Electron
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

  create() {
    // 1. Cargar URL guardada o usar default
    const qwenUrl = this.sessionManager.getSessionUrl() || 'https://qwenlm.ai/';

    // 2. Crear ventana
    this.qwenWindow = new BrowserWindow({
      parent: this.mainWindow,
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload/qwen-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        allowRunningInsecureContent: false,
        sandbox: true
      }
    });

    // 3. Cargar HTML que contiene el iframe
    this.qwenWindow.loadFile(path.join(__dirname, '../renderer/qwen-renderer.html'));

    // 4. Inyectar la URL en el HTML
    this.qwenWindow.webContents.on('did-finish-load', () => {
      this.qwenWindow.webContents.send('load-qwen-url', qwenUrl);
    });

    // 5. Escuchar cambios de URL
    ipcMain.on('qwen-url-changed', (event, newUrl) => {
      this.sessionManager.saveSessionUrl(newUrl);
      console.log(`✅ Sesión QWEN guardada: ${newUrl}`);
    });

    return this.qwenWindow;
  }

  async loadQwenInPanel(parentPanel) {
    // Alternativa: cargar QWEN dentro de un panel existente
    // en lugar de una ventana separada

    const qwenUrl = this.sessionManager.getSessionUrl() || 'https://qwenlm.ai/';

    // Inyectar iframe en el panel
    parentPanel.webContents.executeJavaScript(`
      document.body.innerHTML = '<iframe id="qwen-iframe" src="${qwenUrl}" style="width: 100%; height: 100%; border: none;"></iframe>';

      const iframe = document.getElementById('qwen-iframe');
      iframe.onload = () => {
        window.electron.saveQwenUrl(iframe.src);
      };
    `);
  }

  reconnect() {
    // Reconectar si se perdió la conexión
    const qwenUrl = this.sessionManager.getSessionUrl();
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      this.qwenWindow.loadURL(qwenUrl);
    }
  }

  close() {
    if (this.qwenWindow && !this.qwenWindow.isDestroyed()) {
      this.qwenWindow.close();
      this.qwenWindow = null;
    }
  }
}

module.exports = { QwenWindow };
```

### 3️⃣ **Gestor de Sesión - qwen-manager.js**

```javascript
/**
 * qwen-manager.js
 *
 * Gestiona el almacenamiento persistente de sesiones QWEN
 * Exactamente como vscode.ExtensionContext.globalState
 */

const fs = require('fs');
const path = require('path');

class QwenSessionManager {
  constructor() {
    this.sessionFile = path.join(
      process.env.APPDATA || process.env.HOME,
      'StudioLab',
      'qwen-session.json'
    );
    this.ensureSessionFile();
  }

  ensureSessionFile() {
    const dir = path.dirname(this.sessionFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.sessionFile)) {
      fs.writeFileSync(this.sessionFile, JSON.stringify({ url: null }));
    }
  }

  getSessionUrl() {
    try {
      const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      return data.url || 'https://qwenlm.ai/';
    } catch (e) {
      console.warn('No se pudo leer sesión QWEN:', e.message);
      return 'https://qwenlm.ai/';
    }
  }

  saveSessionUrl(url) {
    try {
      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify({ url, savedAt: new Date().toISOString() }, null, 2)
      );
      console.log(`✅ Sesión QWEN guardada en ${this.sessionFile}`);
    } catch (e) {
      console.error('Error guardando sesión QWEN:', e);
    }
  }

  clearSession() {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify({ url: null }));
      console.log('✅ Sesión QWEN borrada');
    } catch (e) {
      console.error('Error borrando sesión QWEN:', e);
    }
  }
}

module.exports = { QwenSessionManager };
```

### 4️⃣ **HTML con iframe - qwen-renderer.html**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self';
               frame-src https://qwenlm.ai https://qwen.alibaba.com;
               connect-src https://qwenlm.ai https://qwen.alibaba.com;
               script-src 'self' https://qwenlm.ai 'unsafe-inline';
               style-src 'self' https://qwenlm.ai 'unsafe-inline';">
    <style>
        * { margin: 0; padding: 0; }
        body { width: 100vw; height: 100vh; overflow: hidden; }
        #qwen-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        #status-bar {
            padding: 8px 12px;
            background: #1e1e1e;
            color: #d4d4d4;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e42;
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
        }
        .status-indicator.connected {
            background: #4ec9b0;
        }
        .status-indicator.disconnected {
            background: #f48771;
        }
        #qwen-iframe {
            flex: 1;
            width: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div id="qwen-container">
        <!-- Barra de estado (como en el plan) -->
        <div id="status-bar">
            <span id="status-text">
                <span class="status-indicator connected"></span>
                Conectado a QWEN
            </span>
            <button id="reconnect-btn" style="padding: 4px 8px; cursor: pointer;">
                Reconectar
            </button>
        </div>

        <!-- iframe de QWEN -->
        <iframe
            id="qwen-iframe"
            src="https://qwenlm.ai/"
            style="flex: 1; width: 100%; height: auto;">
        </iframe>
    </div>

    <script>
        const { ipcRenderer } = require('electron');

        // Recibir URL desde main process
        ipcRenderer.on('load-qwen-url', (event, url) => {
            const iframe = document.getElementById('qwen-iframe');
            iframe.src = url;
        });

        // Detectar cambios de URL
        const iframe = document.getElementById('qwen-iframe');
        iframe.onload = () => {
            ipcRenderer.send('qwen-url-changed', iframe.src);
            updateStatusBar('connected');
        };

        iframe.onerror = () => {
            updateStatusBar('disconnected');
        };

        // Botón de reconexión
        document.getElementById('reconnect-btn').onclick = () => {
            location.reload();
        };

        function updateStatusBar(status) {
            const indicator = document.querySelector('.status-indicator');
            const text = document.getElementById('status-text');

            if (status === 'connected') {
                indicator.classList.remove('disconnected');
                indicator.classList.add('connected');
                text.textContent = 'Conectado a QWEN';
            } else {
                indicator.classList.remove('connected');
                indicator.classList.add('disconnected');
                text.textContent = 'Desconectado de QWEN';
            }
        }
    </script>
</body>
</html>
```

### 5️⃣ **Preload Script - qwen-preload.js**

```javascript
/**
 * qwen-preload.js
 *
 * Proporciona API segura para renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveQwenUrl: (url) => ipcRenderer.send('qwen-url-changed', url),
  onLoadUrl: (callback) => ipcRenderer.on('load-qwen-url', callback),
  reconnect: () => ipcRenderer.send('qwen-reconnect')
});
```

### 6️⃣ **Integración en main.js**

```javascript
// En main.js, agregar:

const { QwenWindow } = require('./src/main/qwen-window');

let qwenWindow;

function createQwenPanel() {
  qwenWindow = new QwenWindow(mainWindow);
  qwenWindow.create();

  // Agregar botón en la barra de herramientas
  addQwenStatusBar();
}

function addQwenStatusBar() {
  // Agregar icono/botón QWEN a la barra de status
  // (depende de tu framework UI - puede ser HTML custom en la app)
}

// Llamar cuando usuario hace click en QWEN
ipcMain.on('open-qwen', () => {
  if (qwenWindow && !qwenWindow.qwenWindow.isDestroyed()) {
    qwenWindow.qwenWindow.focus();
  } else {
    createQwenPanel();
  }
});
```

---

## 📊 **Flujo de Ejecución**

```
Usuario clickea [🤖 QWEN]
    ↓
Se ejecuta createQwenPanel()
    ↓
QwenWindow.create() lee sesión guardada
    ↓
Si existe URL guardada → carga esa URL
Si no → carga https://qwenlm.ai/
    ↓
iframe se carga con QWEN embebido
    ↓
Usuario inicia sesión (primera vez)
    ↓
iframe.onload() guarda URL automáticamente
    ↓
Siguiente sesión: carga automáticamente la URL guardada
    ↓
Usuario logueado sin necesidad de credenciales otra vez
```

---

## 🔐 **Ventajas de esta Implementación**

✅ **Simple** - Solo un iframe
✅ **Seguro** - CSP restrictivo, context isolation
✅ **Persistente** - Sesión guardada entre reinicios
✅ **Offline-resiliente** - Botón de reconexión
✅ **Sin exposición de credenciales** - Las credenciales quedan en QWEN
✅ **Escalable** - Fácil agregar otros modelos (Claude, ChatGPT, etc.)

---

## 📦 **Dependencias Necesarias**

```json
{
  "dependencies": {
    "electron": "^latest"
    // Nada más - no necesita bibliotecas especiales
  }
}
```

---

## 🚀 **Próximos Modelos (Roadmap)**

Una vez que QWEN funcione, agregar:

1. **Claude** (similar)
2. **ChatGPT** (similar)
3. **Gemini** (similar)
4. **DeepSeek** (similar)

Todos con el **mismo patrón**: `<iframe src="url-del-modelo">`

---

**Este es el plan real, honesto y basado en cómo VS Code lo hace.**
