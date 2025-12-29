# Diagnóstico QWEN Webview

## Problema Actual
El webview muestra una pantalla gris/blanca y no carga QWEN.

## Configuración Actual
1. **main.js**: `webviewTag: true`, `webSecurity: false`, `allowRunningInsecureContent: true`
2. **HTML**: Tag `<webview>` con `src="https://qwenlm.ai/"` y `partition="persist:qwen-app"`
3. **toggleQwen()**: Muestra/oculta el panel y intenta cargar la URL

## Pasos para Diagnosticar

### 1. Abrir DevTools en la ventana principal
Presiona `Ctrl+Shift+I` o `F12` en la aplicación y revisa la consola.

### 2. Verificar si el webview existe
En la consola, ejecuta:
```javascript
const webview = document.getElementById('qwenWebview');
console.log('Webview encontrado:', webview);
console.log('Webview src:', webview?.src);
console.log('Webview URL:', webview?.getURL());
```

### 3. Verificar eventos del webview
En la consola, ejecuta:
```javascript
const webview = document.getElementById('qwenWebview');
webview.addEventListener('did-fail-load', (e) => {
  console.error('ERROR WEBVIEW:', e.errorCode, e.errorDescription);
});
webview.addEventListener('did-finish-load', () => {
  console.log('✅ WEBVIEW CARGADO:', webview.getURL());
});
```

### 4. Intentar cargar manualmente
En la consola, ejecuta:
```javascript
const webview = document.getElementById('qwenWebview');
webview.src = 'https://qwenlm.ai/';
```

### 5. Verificar si hay errores de red
En DevTools, ve a la pestaña "Network" y verifica si hay requests fallidos.

## Posibles Soluciones

### Solución 1: Webview necesita estar visible
El webview puede necesitar estar visible antes de cargar. Cambiar en `toggleQwen()`:
```javascript
// Mostrar PRIMERO, luego cargar
qwenPanel.classList.remove('hidden');
setTimeout(() => {
  webview.src = 'https://qwenlm.ai/';
}, 100);
```

### Solución 2: Problema con partition
Probar sin partition o con partition diferente:
```html
<webview id="qwenWebview" src="https://qwenlm.ai/" allowpopups="true"></webview>
```

### Solución 3: Usar BrowserView en lugar de webview tag
Si el webview tag no funciona, usar BrowserView del main process.

## Logs a Revisar
1. Consola del renderer (F12)
2. Terminal donde ejecutas `npm start`
3. Eventos del webview (did-fail-load, did-finish-load)

