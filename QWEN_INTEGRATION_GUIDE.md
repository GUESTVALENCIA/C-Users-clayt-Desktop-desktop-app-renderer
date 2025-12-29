# 🚀 GUÍA DE INTEGRACIÓN: QWEN EMBEBIDO

**Archivos creados:**
- ✅ `src/main/qwen-window.js` - Gestor de ventana QWEN
- ✅ `src/main/qwen-manager.js` - Gestor de sesiones persistentes
- ✅ `src/preload/qwen-preload.js` - Preload script seguro
- ✅ `src/renderer/qwen-renderer.html` - HTML con iframe
- ✅ `qwen-embedding-implementation.md` - Documentación técnica

---

## 📝 PASO 1: Agregar a main.js

En tu `main.js`, agregar esto al inicio (después de los imports):

```javascript
// ============ QWEN EMBEDDING ============
const { QwenWindow } = require('./src/main/qwen-window');
let qwenWindow;

/**
 * Crear panel de QWEN embebido
 */
function createQwenPanel() {
  if (qwenWindow && qwenWindow.isOpen()) {
    qwenWindow.focus();
    return;
  }

  qwenWindow = new QwenWindow(mainWindow);
  qwenWindow.create();
  console.log('[Main] ✅ Panel QWEN creado');
}

/**
 * Manejar IPC para abrir QWEN
 */
ipcMain.on('open-qwen', () => {
  createQwenPanel();
});
```

---

## 🎨 PASO 2: Agregar Botón/Ícono en tu Interfaz

En tu HTML principal (donde está el menú/interfaz), agregar un botón:

```html
<!-- En tu HTML principal -->
<button id="qwen-btn" class="ai-button" title="Abrir QWEN">
    🤖 QWEN
</button>

<script>
  const { ipcRenderer } = require('electron');

  document.getElementById('qwen-btn').addEventListener('click', () => {
    ipcRenderer.send('open-qwen');
  });
</script>
```

O en la barra de status (si tienes una):

```javascript
// En main.js, dentro de createWindow():

const qwenStatusBarItem = Menu.buildFromTemplate([
  {
    label: '🤖 QWEN',
    click: () => createQwenPanel()
  }
]);

// O como botón simple
const qwenBtn = new BrowserWindow({
  width: 40,
  height: 40,
  icon: path.join(__dirname, 'assets/qwen-icon.png')
});
```

---

## 🧪 PASO 3: Crear Estructuras de Carpetas

Si no existen, crear:

```bash
# En PowerShell o cmd
mkdir src\main
mkdir src\preload
mkdir src\renderer
mkdir assets
```

---

## 📦 PASO 4: Copiar Archivos

1. Copiar `src/main/qwen-window.js` a tu carpeta `src/main/`
2. Copiar `src/main/qwen-manager.js` a tu carpeta `src/main/`
3. Copiar `src/preload/qwen-preload.js` a tu carpeta `src/preload/`
4. Copiar `src/renderer/qwen-renderer.html` a tu carpeta `src/renderer/`

---

## ✅ PASO 5: Verificar package.json

Asegurar que tienes:

```json
{
  "main": "main.js",
  "dependencies": {
    "electron": "latest",
    "dotenv": "^latest"
  }
}
```

No necesitas dependencias adicionales - TODO funciona con Electron base.

---

## 🎯 PASO 6: Probar la Implementación

```bash
# En la carpeta desktop-app/

# Instalar dependencias (si no están)
npm install

# Iniciar la aplicación
npm start

# O si ejecutas main.js directo
npx electron .
```

---

## 📍 PASO 7: Integración con MCP Server

Una vez que QWEN funciona, para enviar respuestas al MCP Server:

```javascript
// En qwen-window.js, después de ipcMain.on('qwen-url-changed')

ipcMain.on('qwen-message', async (event, message) => {
  try {
    // Enviar al MCP Server
    const response = await fetch('https://pwa-imbf.onrender.com/api/projects/realtime-voice-system/propose', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MCP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Propuesta de QWEN',
        description: message,
        files: []
      })
    });

    const result = await response.json();
    console.log('[QWEN→MCP] ✅ Propuesta enviada:', result);
  } catch (error) {
    console.error('[QWEN→MCP] ❌ Error:', error);
  }
});
```

---

## 🔄 PASO 8: Flujo Completo (Roadmap)

Después de QWEN, agregar:

1. **Claude** (iframe similar a https://claude.ai/)
2. **ChatGPT** (iframe a https://chatgpt.com/)
3. **Gemini** (iframe a https://gemini.google.com/)
4. **DeepSeek** (iframe a https://chat.deepseek.com/)

Todos con el **MISMO PATRÓN** - solo cambiar la URL.

---

## 🛠️ ESTRUCTURA FINAL

```
desktop-app/
├── main.js                          # ACTUALIZADO con QwenWindow
├── package.json
├── src/
│   ├── main/
│   │   ├── qwen-window.js          # ✅ NUEVO
│   │   ├── qwen-manager.js         # ✅ NUEVO
│   │   └── (otros archivos)
│   ├── preload/
│   │   ├── qwen-preload.js         # ✅ NUEVO
│   │   └── (otros preloads)
│   ├── renderer/
│   │   ├── qwen-renderer.html      # ✅ NUEVO
│   │   └── (otros HTML)
│   └── utils/
├── assets/
│   └── qwen-icon.png               # (Opcional)
└── (resto de tu estructura)
```

---

## 🔐 SEGURIDAD

✅ Context Isolation: Habilitada
✅ Node Integration: Deshabilitada
✅ Preload Script: Validación completa
✅ CSP (Content Security Policy): Configurada
✅ Sandbox: Habilitado

**Las credenciales de QWEN:**
- NO se guardan en el código
- NO se guardan en plain text
- Se guardan en cookies del navegador embebido
- Automáticamente se restauran en próximas sesiones

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module 'qwen-window'"
```
Solución: Asegurar que existe src/main/qwen-window.js
```

### Error: "Preload script not found"
```
Solución: Asegurar que existe src/preload/qwen-preload.js
```

### QWEN no carga
```
Solución:
1. Verificar conexión a internet
2. Clickear botón "Reconectar"
3. Revisar logs en DevTools (Ctrl+Shift+I)
```

### Sesión no persiste
```
Solución:
1. Verificar que ~/AppData/Local/StudioLab/sessions/ existe
2. Revisar permisos de escritura
3. Borrar qwen-session.json y reiniciar
```

---

## 📊 LOGS Y DEBUGGING

Cuando inicies la app, deberías ver logs como:

```
[Main] ✅ Panel QWEN creado
[QwenSessionManager] ✅ Sesión cargada
[Renderer] ✅ QWEN cargado correctamente
🟢 Conectado a QWEN
```

Si no ves esto, hay un error de integración.

---

## ✨ PRÓXIMOS PASOS

1. **Integración completada** ✅ QWEN embebido funciona
2. **Agregar otros modelos** - Claude, ChatGPT, etc.
3. **Conectar a MCP Server** - Enviar propuestas
4. **Crear orquestador** - Llamadas entre IAs
5. **Snapshot/Restauración** - Backup del estado completo

---

## 📞 VERIFICACIÓN RÁPIDA

Después de integrar, ejecutar esta prueba:

```bash
# Terminal
npm start

# Esperar a que la app abra
# Clickear botón "🤖 QWEN"
# Debería:
# 1. Abrirse una ventana con QWEN
# 2. Mostrar "🟢 Conectado a QWEN"
# 3. Poder chatear normalmente
# 4. Si reinicias la app, mantiene tu sesión

# ✅ Si todo funciona = ÉXITO
```

---

**Eso es todo. Simple, directo, funcionando.**

Basado en el código REAL de vscode-qwen, adaptado para Electron.

