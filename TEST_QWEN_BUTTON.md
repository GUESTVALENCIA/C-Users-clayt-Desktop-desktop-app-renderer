# 🧪 TEST: Botón Qwen Embedded

## Verificaciones Realizadas

### ✅ 1. Handler IPC en main.js
- Handler: `ipcMain.handle('qwen:toggle', async (_e, params) => { ... })`
- Maneja parámetro `boolean` o `{ show: boolean }`
- URL: `https://qwenlm.ai` (correcta según pipeline)
- Sesión persistente: `persist:qwen3`

### ✅ 2. Preload.js
- Función: `qwenToggle: (show) => ipcRenderer.invoke('qwen:toggle', show)`
- Envía `boolean` directamente

### ✅ 3. HTML (studiolab-final-v2.html)
- Botón: `<button id="qwenBtn" onclick="openQwenEmbedded()">`
- Función: `openQwenEmbedded()` → llama a `toggleQwen()`
- `toggleQwen()` → llama a `window.sandraAPI.qwenToggle(state.qwen.panelVisible)`

### ✅ 4. Funciones de Cookies
- `saveQwenCookies()` definida antes de `window-all-closed`
- Guardado automático cada 30 segundos
- Guardado al cerrar aplicación
- Carga de cookies al iniciar

## Pruebas a Realizar

### Test 1: Botón Funciona
1. Iniciar aplicación: `npm start`
2. Hacer clic en botón verde (sidebar izquierda, debajo del logo)
3. **Esperado**: Panel lateral derecho aparece con Qwen cargándose

### Test 2: Qwen Se Abre
1. Después de hacer clic, esperar carga
2. **Esperado**: URL `https://qwenlm.ai` se carga
3. **Esperado**: No hay errores en consola

### Test 3: Cookies Persistentes
1. Primera vez: Iniciar sesión en Qwen manualmente
2. Cerrar aplicación
3. Abrir aplicación nuevamente
4. **Esperado**: Sesión se mantiene (no pide login de nuevo)

### Test 4: Chat Responde
1. Escribir mensaje en el chat de Qwen
2. **Esperado**: Qwen responde normalmente

## Instrucciones para Probar

```bash
cd C:\Users\clayt\Desktop\desktop-app
npm start
```

Luego:
1. Buscar el botón verde con el logo de Qwen en la sidebar izquierda
2. Hacer clic
3. Verificar que aparece el panel lateral derecho
4. Verificar que carga `https://qwenlm.ai`

## Posibles Problemas

1. **Error de sandbox**: Si hay error relacionado con `sandbox: true`, cambiar a `sandbox: false` en webPreferences
2. **Error de contextIsolation**: Si hay problemas, cambiar a `contextIsolation: false` temporalmente
3. **URL no carga**: Verificar conexión a internet y que `qwenlm.ai` esté accesible

## Logs a Revisar

En la consola de Electron deberías ver:
- `[QWEN3] Toggle BrowserView: SHOW`
- `[QWEN3] Creando BrowserView para QWEN con sesión persistente...`
- `[QWEN3] 🔄 Cargando https://qwenlm.ai...`
- `[QWEN3] ✅ QWEN cargado exitosamente en BrowserView`

