# CORRECCIONES REALIZADAS - QWEN EMBEDDING

## ✅ Problemas corregidos:

### 1. **Error de Unicode en Python** (CORREGIDO)
   - **Problema**: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2705'`
   - **Solución**: Reemplazados todos los emojis (✅, ❌, ⚠️, 👋) por texto simple ([OK], [ERROR], [WARN], [STOP])
   - **Archivo**: `mcp-server-neon.py`

### 2. **Ventanas externas en login OAuth** (CORREGIDO)
   - **Problema**: Cuando QWEN intenta hacer login, se abre una ventana externa que bloquea la aplicación
   - **Solución**: Añadido `setWindowOpenHandler` al BrowserView para interceptar popups OAuth y manejarlos dentro del mismo BrowserView
   - **Archivo**: `main.js` línea 1070-1074
   - **Código añadido**:
     ```javascript
     qwenBrowserView.webContents.setWindowOpenHandler(({ url }) => {
       // En lugar de abrir ventana externa, navegar en el mismo BrowserView
       qwenBrowserView.webContents.loadURL(url);
       return { action: 'deny' }; // No crear nueva ventana
     });
     ```

### 3. **Error en prompt inyectado** (CORREGIDO ANTERIORMENTE)
   - **Problema**: Prompt decía "puerto 3001" y "call()" en lugar de "puerto 19875" y "callTool()"
   - **Solución**: Corregido en `main.js` línea 1399

## 🔍 Cómo funciona ahora:

1. **Usuario hace clic en botón QWEN**:
   - Se crea BrowserView con `partition: 'persist:qwen-app'` (mantiene sesión)
   - Se registra `setWindowOpenHandler` para interceptar popups
   - Se carga `https://qwenlm.ai/` en el BrowserView

2. **Usuario intenta hacer login**:
   - QWEN intenta abrir popup OAuth (Google/GitHub)
   - `setWindowOpenHandler` intercepta el intento
   - En lugar de abrir ventana externa, navega a la URL OAuth en el mismo BrowserView
   - El flujo de OAuth se completa dentro del BrowserView embebido

3. **Sesión persistente**:
   - Las cookies se guardan en `partition: 'persist:qwen-app'`
   - En próximas sesiones, el usuario ya está logueado

## 🧪 Para probar:

1. Abre la aplicación
2. Haz clic en el botón QWEN
3. Cuando se abra QWEN, intenta hacer login
4. **NO debería abrirse ninguna ventana externa**
5. El flujo de login debería completarse dentro del BrowserView embebido

## 📝 Notas importantes:

- El `setWindowOpenHandler` DEBE registrarse ANTES de cargar la URL
- El orden correcto es: crear BrowserView → registrar handlers → cargar URL
- Si el login sigue abriendo ventanas externas, puede ser que QWEN use `window.open()` con características específicas, en cuyo caso necesitaríamos ajustar el handler

