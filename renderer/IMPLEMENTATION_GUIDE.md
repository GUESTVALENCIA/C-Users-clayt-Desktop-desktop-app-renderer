# Guía de Implementación — Sandra Studio Ultimate

## 📋 Resumen

Se han creado los siguientes componentes para solucionar el problema del observer que describe todo el contenido del chat:

1. **`smart-button-observer.js`** — Observer inteligente que solo observa botones específicos
2. **`canvas-core.js`** — Sistema de lienzo interactivo
3. **`chat-handler.js`** — Manejo limpio del chat (solo texto, sin describir UI)
4. **Backend orquestador** — Sistema completo de modelos (Qwen3-Max, Qwen-VL, DeepSeek-R1)

## 🔧 Integración en `studiolab-final-v2.html`

### Paso 1: Añadir los scripts al HTML

Añade estos scripts **antes del cierre de `</body>`** en `studiolab-final-v2.html`:

```html
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- SANDRA STUDIO ULTIMATE - COMPONENTES NUEVOS -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<!-- 1. Observer inteligente de botones (REEMPLAZA cualquier observer anterior) -->
<script src="./smart-button-observer.js"></script>

<!-- 2. Sistema de lienzo interactivo -->
<script src="./canvas-core.js"></script>

<!-- 3. Chat handler limpio -->
<script src="./chat-handler.js"></script>
```

### Paso 2: Asegurar que los botones tengan los IDs correctos

Verifica que tus botones tengan estos IDs exactos:

```html
<button id="cameraBtn">📷</button>
<button id="videoGenBtn">🎥</button>
<button id="artefactBtn">🧩</button>
<button id="micBtn">🎤</button>
<button id="uploadBtn">➕</button>
<button id="sendBtn">➤</button>
```

### Paso 3: Configurar IPC en Electron (main.js)

Si usas Electron, añade estos listeners en tu `main.js`:

```javascript
const { ipcMain } = require('electron');
const { handleChat, handleButton } = require('./orchestrator');

// Escuchar mensajes de chat
ipcMain.on('sandra:chat', (event, payload) => {
  handleChat(payload, (response) => {
    event.sender.send('sandra:reply', response);
  });
});

// Escuchar acciones de botones
ipcMain.on('sandra:button', (event, payload) => {
  handleButton(payload, (result) => {
    event.sender.send('sandra:action-result', result);
  });
});

// Escuchar actualizaciones del lienzo
ipcMain.on('sandra:canvas-update', (event, payload) => {
  console.log('[MAIN] Canvas actualizado:', payload);
  // Procesar actualización del lienzo si es necesario
});
```

### Paso 4: Configurar preload.js (Electron)

En tu `preload.js`, expón estas APIs:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Chat
  sendChat: (data) => ipcRenderer.send('sandra:chat', data),
  
  // Botones
  sendButtonEvent: (data) => ipcRenderer.send('sandra:button', data),
  
  // Canvas
  sendCanvasUpdate: (data) => ipcRenderer.send('sandra:canvas-update', data),
  
  // Respuestas
  onReply: (callback) => {
    ipcRenderer.on('sandra:reply', (event, data) => callback(data));
  },
  
  onActionResult: (callback) => {
    ipcRenderer.on('sandra:action-result', (event, data) => callback(data));
  }
});
```

## 🎯 Cómo Funciona

### Observer Inteligente

El `smart-button-observer.js`:
- ✅ Solo observa botones con IDs específicos
- ✅ Ignora todo el contenido del chat
- ✅ Evita repeticiones (idempotente)
- ✅ Envía payloads ligeros (solo metadata del botón)

### Chat Handler

El `chat-handler.js`:
- ✅ Envía **solo el texto** del mensaje (sin describir botones ni UI)
- ✅ Recibe respuestas de Sandra/QWEN
- ✅ Muestra indicador de "pensando"
- ✅ Integración limpia con el lienzo

### Canvas Core

El `canvas-core.js`:
- ✅ Lienzo interactivo para dibujo
- ✅ Sistema de capas
- ✅ Exportación PNG
- ✅ Notificaciones a Sandra cuando se actualiza

## 🚀 Pruebas

1. **Abre la aplicación**
2. **Escribe un mensaje en el chat** — Debe enviarse solo el texto
3. **Haz clic en un botón** (📷, 🎥, 🧩) — Debe enviarse solo la acción del botón
4. **Dibuja en el lienzo** — Debe notificarse a Sandra sin describir todo el contenido

## ⚠️ Solución de Problemas

### El observer no funciona
- Verifica que los botones tengan los IDs correctos
- Abre la consola y busca `[OBSERVER]` para ver logs
- Asegúrate de que `smart-button-observer.js` se carga después del DOM

### El chat envía contenido extra
- Verifica que `chat-handler.js` esté cargado
- Revisa que no haya otro observer describiendo el contenido
- Busca en el código cualquier `MutationObserver` que observe el chat completo

### Los botones no envían eventos
- Verifica que `window.electronAPI` o `window.sandraAPI` estén disponibles
- Revisa la consola para errores de IPC
- Asegúrate de que el preload.js esté configurado correctamente

## 📝 Notas Importantes

- **El observer anterior que describía todo el chat debe ser desactivado o eliminado**
- Los nuevos componentes son **modulares** y pueden funcionar independientemente
- El backend orquestador es **opcional** si ya tienes tu propio sistema de comunicación con QWEN

## ✅ Checklist de Implementación

- [ ] Añadir scripts al HTML
- [ ] Verificar IDs de botones
- [ ] Configurar IPC en Electron (si aplica)
- [ ] Configurar preload.js (si aplica)
- [ ] Desactivar observer anterior (si existe)
- [ ] Probar envío de mensajes
- [ ] Probar clics en botones
- [ ] Probar dibujo en lienzo

