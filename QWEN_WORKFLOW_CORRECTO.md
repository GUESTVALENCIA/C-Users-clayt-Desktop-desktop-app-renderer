# Workflow Correcto de QWEN (basado en VS Code Simple Browser)

## Tipo de Aplicación
**Electron Desktop App** - Usando BrowserView (top-level, NO iframe)

## Problema Identificado

VS Code funciona porque:
- Usa **Simple Browser / WebView** que es **top-level** (como abrir un navegador dentro de la app)
- **NO usa iframe** (que QWEN bloquea con CSP/X-Frame-Options)

Nuestra app debe replicar esto:
- ✅ Ya estamos usando **BrowserView** (correcto - es top-level)
- ✅ NO estamos usando iframe (correcto)
- ✅ Cookies persistentes con `partition: 'persist:qwen-app'` (correcto)
- ⚠️ Verificar que BrowserView se comporte como top-level window

## Implementación Correcta (ya aplicada)

```javascript
// BrowserView (top-level, no iframe)
qwenBrowserView = new BrowserView({
  webPreferences: {
    partition: 'persist:qwen-app', // Cookies persistentes
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: false, // Necesario para cargar contenido externo
    allowRunningInsecureContent: true
  }
});

// User-Agent de Opera (mejor compatibilidad)
qwenBrowserView.webContents.setUserAgent('Mozilla/5.0 ... OPR/117.0.0.0');

// Cargar URL directamente (top-level)
qwenBrowserView.webContents.loadURL('https://qwenlm.ai/chat');
```

## Checklist de Verificación

- [x] Usar BrowserView (NO iframe, NO webview tag)
- [x] Partition persistente para cookies
- [x] User-Agent correcto (Opera)
- [x] Carga en background antes de mostrar
- [x] Top-level (no dentro de contenedor HTML)

## Diferencia Clave vs VS Code

VS Code Simple Browser:
- Abre una pestaña/tab en VS Code
- WebView top-level dentro de la pestaña
- Sesión persistente automática

Nuestra implementación:
- BrowserView que se adjunta/desadjunta de la ventana principal
- Mismo concepto: top-level, sesión persistente
- Se muestra/oculta al hacer clic en el botón QWEN

## Notas Importantes

1. **NO usar webSecurity: false en producción** (solo desarrollo)
2. **BrowserView es top-level por defecto** - no necesita configuración especial
3. **Cookies persistentes** se mantienen entre sesiones gracias a la partition
4. **User-Agent Opera** evita problemas de detección de navegador embebido

