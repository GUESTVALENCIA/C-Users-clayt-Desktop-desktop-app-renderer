# Cambios Aplicados según Análisis de ChatGPT 5.2

## Problemas Identificados y Solucionados

### 1. ✅ URL Incorrecta
**Problema**: Se usaba `https://qwenlm.ai/chat` que tiene capa de verificación
**Solución**: Cambiado a `https://chat.qwen.ai/` (URL canónica sin verificación)

### 2. ✅ Background Throttling
**Problema**: Precargar invisible causa throttling que rompe login/OAuth
**Solución**: 
- Agregado `backgroundThrottling: false` en webPreferences
- Carga la URL SOLO cuando se muestra (con bounds reales y adjuntado)
- NO se precarga en background invisible

### 3. ✅ Viewport Size 0
**Problema**: BrowserView sin bounds reales causa viewport 0
**Solución**: 
- PRIMERO adjuntar BrowserView y establecer bounds REALES
- LUEGO cargar la URL (ya con viewport correcto)

### 4. ✅ User-Agent Inventado
**Problema**: UA de Opera inventado causa inconsistencias con client hints
**Solución**: Cambiado a User-Agent estándar de Chrome

### 5. ✅ Logs de Diagnóstico
**Problema**: No había forma de diagnosticar errores
**Solución**: Agregados logs para:
- `did-fail-load` (errores de carga)
- `did-get-response-details` (códigos HTTP 3xx/4xx/5xx)
- `console-message` (detección de "Current System does not Support")

### 6. ✅ OAuth Popups
**Problema**: Popups OAuth necesitan misma partition
**Solución**: Mejorado `setWindowOpenHandler` para mantener misma partition

## Cambios en el Código

### webPreferences
```javascript
webPreferences: {
  partition: 'persist:qwen-app',
  contextIsolation: true,
  nodeIntegration: false,
  webSecurity: false,
  allowRunningInsecureContent: true,
  backgroundThrottling: false, // ← NUEVO
  preload: path.join(__dirname, 'qwen-mcp-preload.js')
}
```

### URL Canónica
```javascript
// ANTES: https://qwenlm.ai/chat
// AHORA: https://chat.qwen.ai/
const QWEN_CHAT_URL = 'https://chat.qwen.ai/';
```

### Carga con Bounds Reales
```javascript
// PRIMERO: Adjuntar y establecer bounds
mainWindow.setBrowserView(qwenBrowserView);
qwenBrowserView.setBounds({ x: 0, y: offsetY, width: bounds.width, height: bounds.height - offsetY });

// LUEGO: Cargar URL (ya con viewport correcto)
qwenBrowserView.webContents.loadURL(QWEN_CHAT_URL);
```

### User-Agent Estándar
```javascript
// ANTES: User-Agent inventado de Opera
// AHORA: User-Agent estándar de Chrome
qwenBrowserView.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
```

## Comportamiento Actual

1. **Al iniciar app**: BrowserView se CREA pero NO se carga la URL
2. **Al hacer clic en QWEN**:
   - Se adjunta BrowserView a la ventana
   - Se establecen bounds REALES
   - Se carga la URL (con viewport correcto, sin throttling)
   - Se inyecta MCP bridge cuando carga

## Resultado Esperado

- ✅ No más "Current System does not Support"
- ✅ No más problemas de login/OAuth
- ✅ Viewport correcto desde el inicio
- ✅ Sin background throttling
- ✅ Logs de diagnóstico para problemas futuros

