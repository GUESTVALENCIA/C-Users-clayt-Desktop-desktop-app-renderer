# QWEN Integration para StudioLab

## 🎯 Problema Resuelto

El problema era que manipulabas el DOM directamente, pero **QWEN usa React** y los eventos DOM normales no llegan al estado interno de React.

## ✅ Solución

La solución usa `Object.getOwnPropertyDescriptor` para acceder al **native setter** del input, lo que fuerza a React a detectar el cambio.

```javascript
// Método correcto para React
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype, 'value'
).set;

nativeInputValueSetter.call(inputElement, message);
inputElement.dispatchEvent(new Event('input', { bubbles: true }));
```

---

## 📁 Archivos Creados

```
qwen-integration/
├── qwen-handlers.js    # Handlers IPC para main.js
├── qwen-preload.js     # Funciones para preload.js
├── qwen-widget.js      # Widget HTML/CSS/JS para el UI
└── README.md           # Este archivo
```

---

## 🔧 Instalación

### Paso 1: Modificar main.js

Al inicio del archivo, importar los handlers:

```javascript
// Agregar al inicio de main.js
const { registerAllQwenHandlers } = require('./qwen-integration/qwen-handlers');
```

Después de crear `mainWindow`, registrar los handlers:

```javascript
// Después de crear mainWindow en app.whenReady()
registerAllQwenHandlers(app, mainWindow);
```

**IMPORTANTE:** Comentar o eliminar los handlers antiguos de QWEN:
- `ipcMain.handle('qwen:toggle', ...)`
- `ipcMain.handle('qwen:sendMessage', ...)`
- `ipcMain.handle('qwen:login', ...)`

### Paso 2: Modificar preload.js

Agregar la API de QWEN al contextBridge:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Agregar esto junto con las otras exposiciones de API
contextBridge.exposeInMainWorld('qwenAPI', {
  toggle: (show) => ipcRenderer.invoke('qwen:toggle', { show }),
  sendMessage: (message) => ipcRenderer.invoke('qwen:sendMessage', { message }),
  checkLogin: () => ipcRenderer.invoke('qwen:checkLogin'),
  login: () => ipcRenderer.invoke('qwen:login'),
  logout: () => ipcRenderer.invoke('qwen:logout'),
  getResponse: () => ipcRenderer.invoke('qwen:getResponse'),
  onResponse: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('qwen:response', handler);
    return () => ipcRenderer.removeListener('qwen:response', handler);
  }
});
```

### Paso 3: Agregar Widget al HTML

En `studiolab-final-v2.html`, antes de `</body>`:

```html
<!-- QWEN Widget -->
<div class="qwen-widget" id="qwen-widget">
  <!-- Botón flotante -->
  <button class="qwen-toggle-btn" id="qwen-toggle-btn" title="Abrir QWEN">
    <svg viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  </button>
  
  <!-- Panel con Login/Logout -->
  <div class="qwen-panel" id="qwen-panel">
    <div class="qwen-header">
      <span>🤖 QWEN Chat</span>
      <div class="qwen-status">
        <span class="qwen-status-dot" id="qwen-status-dot"></span>
        <button id="qwen-login-btn">Login</button>
        <button id="qwen-logout-btn" style="display:none">Logout</button>
      </div>
    </div>
    <!-- ... resto del widget ... -->
  </div>
</div>

<!-- Estilos y Scripts del widget -->
<!-- Ver qwen-widget.js para el código completo -->
```

O puedes copiar el código completo de `qwen-widget.js`.

---

## 🔑 Cómo Funciona el Login

1. Usuario hace clic en **Login**
2. Se abre una ventana modal con `https://qwenlm.ai/auth/login`
3. Usuario inicia sesión (Google, email, etc.)
4. Cuando navega al chat, detectamos el login exitoso
5. Guardamos las cookies en `persist:qwen3`
6. Cerramos la ventana automáticamente
7. El BrowserView principal ya tiene las cookies

**Persistencia:** Las cookies se guardan en:
- Partición: `persist:qwen3` (automático de Electron)
- Archivo backup: `userData/qwen-cookies.json`

---

## 📤 Cómo Funciona el Envío de Mensajes

1. Tu app llama a `window.qwenAPI.sendMessage("Hola")`
2. El handler `qwen:sendMessage` ejecuta JavaScript en el BrowserView
3. El script inyectado:
   - Busca el input/textarea de QWEN
   - Usa el **native setter** para modificar el valor (React lo detecta)
   - Dispara eventos `input` y `change`
   - Hace clic en el botón de enviar o presiona Enter
4. QWEN procesa el mensaje normalmente

---

## 🐛 Debugging

### Ver logs en consola
```javascript
// En DevTools de tu app (F12)
await window.qwenAPI.checkLogin()  // Verificar estado
await window.qwenAPI.sendMessage("test")  // Probar envío
```

### Ver logs del BrowserView
En main.js, puedes abrir DevTools del BrowserView:
```javascript
qwenBrowserView.webContents.openDevTools({ mode: 'detach' });
```

---

## ⚠️ Diferencias con VS Code

La extensión de VS Code (KingLeoJr/vscode-qwen) funciona igual:
- Embebe qwenlm.ai en un WebView
- Las cookies persisten en la sesión de VS Code
- No tiene código especial de autenticación

Tu implementación es equivalente, solo necesitaba el fix de React.

---

## 🚀 Uso desde tu Chat

```javascript
// En tu sistema de chat, cuando el usuario escribe "@qwen hola"
const message = "hola";

// Verificar que está logueado
const status = await window.qwenAPI.checkLogin();
if (!status.isLoggedIn) {
  await window.qwenAPI.login();
  return;
}

// Abrir panel si está cerrado
await window.qwenAPI.toggle(true);

// Enviar mensaje
const result = await window.qwenAPI.sendMessage(message);
if (result.success) {
  console.log('Mensaje enviado!');
  
  // Obtener respuesta después de un delay
  setTimeout(async () => {
    const response = await window.qwenAPI.getResponse();
    console.log('Respuesta:', response);
  }, 3000);
}
```

---

## 📝 Notas Importantes

1. **URL correcta:** Usa `https://chat.qwenlm.ai` en lugar de `https://qwenlm.ai` para evitar redirecciones.

2. **Timeout del script:** El script se inyecta 2 segundos después de cargar la página para asegurar que React esté listo.

3. **Sandbox:** El BrowserView tiene `sandbox: true` por seguridad.

4. **Cookies:** Se guardan cada 30 segundos y al navegar.
