# ANÁLISIS CRÍTICO EXHAUSTIVO: Problemas de Conexión QWEN en StudioLab

**Fecha**: 29 de diciembre de 2025
**Versión**: 1.0
**Estado**: 🔴 CRÍTICO - Sistema no funcional
**Prioridad**: MÁXIMA

---

## RESUMEN EJECUTIVO

El sistema de integración QWEN en StudioLab tiene **múltiples puntos de fallo críticos** que causan que cuando el usuario intenta escribir "Hola" en el chat:

```
❌ Error: Timeout ejecutando script (15s)
Error: Render frame was disposed before WebFrameMain could be accessed
```

**Causa Raíz Identificada**: El BrowserView de QWEN se crea pero no se inicializa correctamente, y cuando se intenta inyectar código JavaScript, el frame ya está destruido o no es accesible.

---

## 1. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1.1 PROBLEMA PRINCIPAL: Timeout en Script Injection (ERROR DE DISEÑO)

**Ubicación**: `main.js:1653-1852` (Handler `qwen:sendMessage`)

**Código Problemático**:
```javascript
// ❌ PROBLEMA: El script se ejecuta sin esperar a que el DOM esté completamente listo
const result = await Promise.race([
  qwenBrowserView.webContents.executeJavaScript(injectCode),
  new Promise((_, reject) => setTimeout(() => {
    console.error('[QWEN] ❌ Timeout ejecutando script de inyección');
    reject(new Error('Timeout ejecutando script (15s)'));
  }, 15000))  // ❌ 15 segundos es INSUFICIENTE para una SPA que necesita cargar
]);
```

**Problemas Identificados**:

1. **Race Condition**: El script se ejecuta sin esperar a que QWEN (que es una SPA) termine de cargar completamente
2. **Frame Disposal**: El BrowserView está siendo destruido o el frame se vuelve inválido antes de la ejecución
3. **Timeout Insuficiente**: 15 segundos es demasiado corto para:
   - Cargar https://chat.qwen.ai/
   - Renderizar la interfaz React/Vue
   - Esperar a que los elementos estén en el DOM
4. **Sin Verificación de Disponibilidad**: No hay un sistema para verificar si el frame está listo ANTES de ejecutar el script

**Error Exacto del Log**:
```
[QWEN] Error sending from webFrameMain: Error: Render frame was disposed
before WebFrameMain could be accessed
```

Esto significa: El BrowserView fue cerrado, minimizado, o el proceso se cerró mientras se intenta ejecutar el script.

---

### 1.2 PROBLEMA: BrowserView se Destruye Demasiado Rápido

**Ubicación**: `main.js:1456-1620` (Handler `qwen:toggle`)

**Flujo Actual**:
```javascript
// El BrowserView se crea pero NO se verifica si está listo
qwenBrowserView = new BrowserView({...});
mainWindow.addBrowserView(qwenBrowserView);
qwenBrowserView.webContents.loadURL('https://qwenlm.ai');
// ❌ Inmediatamente intenta inyectar código sin esperar a 'did-finish-load'
```

**Problemas**:

1. **No hay handler para `did-finish-load`**: El BrowserView no espera a que la página termine de cargar
2. **No hay reintentos**: Si el DOM no está listo, simplemente falla
3. **Sesión persistida pero DOM no accesible**: Las cookies se cargan, pero el DOM no está disponible
4. **Headers de x-frame-options**: QWEN puede bloquear la inyección desde webContents

---

### 1.3 PROBLEMA: Selector de Modelos NO está Conectado al BrowserView

**Ubicación**: `renderer/studiolab-final-v2.html:5741-5760`

**Código**:
```javascript
// ✅ [Provider] Cambio de modelo:
//    ANTES: qwen/qwen3-omni-flash
//    DESPUÉS: qwen/qwen3-max
//    NOMBRE: Qwen3-Max
// ✅ Qwen seleccionado (usa botón verde de sidebar)
```

**Problema**:
- El selector de modelo CAMBIA `state.currentModel` en memoria
- PERO no se comunicación esta información al BrowserView embebido
- El BrowserView SIGUE usando el modelo anterior porque no recibió instrucción de cambio
- **No existe conexión IPC entre cambio de modelo y envío de mensaje**

**Ruta Faltante**:
```
[UI] Seleccionar modelo Qwen3-Max
  ↓
[Cambio en estado local: state.currentModel = 'qwen/qwen3-max']
  ↓
❌ FALTA: Enviar señal IPC a main.js sobre cambio de modelo
  ↓
❌ FALTA: main.js actualiza contexto del BrowserView
  ↓
❌ FALTA: BrowserView inyecta el nuevo modelo en QWEN
```

---

### 1.4 PROBLEMA: Arquitectura de Inyección es Frágil

**Ubicación**: `main.js:1750-1823`

**Problemas de Diseño**:

1. **Inyección Directa de JavaScript Crudo**: Intenta encontrar elementos DOM de forma ciega
   ```javascript
   // ❌ Esto falla si el selector no existe
   const input = document.querySelector('[placeholder*="Cuéntame"]');
   if (!input) return { success: false, error: 'Input no encontrado' };
   ```

2. **Sin Manejo de Errores**: Si la interfaz de QWEN cambió, el código rompe completamente

3. **Sin Alternativas de Fallback**: Solo intenta una estrategia de búsqueda

4. **Eventos Dispersos**: Dispara múltiples KeyboardEvents sin verificar que al menos uno funciona
   ```javascript
   // Dispara 3 eventos sin verificar si alguno fue capturado
   input.dispatchEvent(new KeyboardEvent('keydown', {...}));
   input.dispatchEvent(new KeyboardEvent('keypress', {...}));
   input.dispatchEvent(new KeyboardEvent('keyup', {...}));
   ```

---

### 1.5 PROBLEMA: Documentación Contradictoria (67 archivos MD duplicados)

**Ubicación**: `C:\Users\clayt\Desktop\desktop-app\` (67 archivos MD/TXT)

**Archivos Redundantes Encontrados**:
```
QWEN_COMPLETE_SUMMARY.md              ← OBSOLETO
QWEN_INTEGRATION_GUIDE.md             ← OBSOLETO
QWEN_INTEGRATION_COMPLETE.md          ← CONTRADICHO POR EL CÓDIGO ACTUAL
QWEN_COMPLETE_SOLUTION.md             ← NO IMPLEMENTADO
QWEN_MCP_INTEGRATION_COMPLETE.md      ← INCOMPLETO
...y 60+ archivos más
```

**Problema**: La documentación dice que QWEN está integrado correctamente, pero el código demuestra lo contrario.

---

### 1.6 PROBLEMA: Código Muerto y Duplicado

#### A. Múltiples Versiones de main.js
```
main.js              (2,880 líneas) - ACTUAL - CON BUGS
main-clean.js        (173 líneas) - OBSOLETO - Versión abandonada
main-simple.js       (4,375 líneas) - ALTERNATIVA - No sé cuál usar
```

**Impacto**: Confusión sobre cuál es la versión correcta, posible que se haya revertido a una versión antigua.

#### B. Múltiples Versiones de preload.js
```
preload.js                    (415 líneas) - PRINCIPAL
preload-simple.js             (319 líneas) - ALTERNATIVA
qwen-preload.js               (7,878 líneas) - ESPECÍFICO QWEN
qwen-preload.js.bak           (2,165 líneas) - BACKUP ANTIGUO ← PROBLEMA
qwen-preload-config.js        (5,898 líneas) - CONFIG QWEN
```

**Impacto**: 5 versiones de preload crean ambigüedad sobre qué API está disponible en `window.sandraAPI`.

#### C. Múltiples MCP Servers
```
mcp-server.js                 (5,015 líneas)
mcp-server-unified.js         (21,032 líneas) - ← DEBERÍA SER LA PRINCIPAL
mcp-server-sse.js             (10,549 líneas)
mcp-server-tools.js           (7,551 líneas)
mcp-server-neon.py            + 3 variantes (final, simple, backup)
```

**Impacto**: Múltiples servidores MCP corriendo simultáneamente causando conflictos de puertos.

#### D. Múltiples HTML de UI
```
studiolab-final-v2.html       (6,137 líneas) - PRINCIPAL
index.html                    (76,109 bytes) - ALTERNATIVA
index-modified.html           (69,115 bytes) - MODIFICADA
index.html.backup             (31,321 bytes) - BACKUP ANTIGUO
```

**Impacto**: Posible que se cargue el HTML incorrecto.

---

### 1.7 PROBLEMA: Múltiples Configuraciones de QWEN MCP

```
qwen-mcp-config.json                  (214 bytes)
qwen-mcp-config-alternative.json       (212 bytes)  ← Casi idéntico
qwen-mcp-config-final.json             (237 bytes)  ← Versión final
qwen-mcp-config-npx.json               (189 bytes)  ← Versión NPX
```

**Problema**: No está claro cuál configuración se está usando. Esto causa desconexiones MCP.

---

### 1.8 PROBLEMA: Script Injection Strategy es Obsoleta

**Ubicación**: `main.js:1750-1823`

**Estrategia Actual** (❌ FALLA):
1. Busca input con placeholder "Cuéntame"
2. Si no existe, busca textarea
3. Si no existe, busca cualquier input
4. Dispara eventos de teclado

**Por Qué Falla**:
- QWEN.ai usa arquitectura React/Vue moderna
- El DOM se regenera constantemente (Virtual DOM)
- Los eventos de teclado no disparan handlers internos
- **QWEN probablemente tiene validación XSS que bloquea inyección cruda**

---

### 1.9 PROBLEMA: Flujo de Comunicación Roto

**Secuencia Actual (Rota)**:
```
1. Usuario escribe "Hola" en studiolab-final-v2.html
   ↓
2. callAssistant() verifica si provider es 'qwen'
   ↓
3. Llama window.sandraAPI.qwenSendMessage('Hola')
   ↓
4. preload.js invoca IPC 'qwen:sendMessage'
   ↓
5. main.js handler intenta inyectar JavaScript en BrowserView
   ↓
❌ FALLO: Frame disposed / Script injection timeout
   ↓
❌ Error mostrado al usuario: "Timeout ejecutando script (15s)"
```

**Problemas en el Flujo**:
1. No hay verificación previa de que el BrowserView está listo
2. No hay reintentos
3. No hay timeout dinámico basado en estado de carga
4. No hay fallback a Ollama/API si QWEN embebido falla

---

## 2. ANÁLISIS DE ARQUITECTURA: QUÉ ESTÁ FUNCIONANDO vs. QUÉ NO

### ✅ LO QUE FUNCIONA:

```
[✅] Botón verde del sidebar abre el BrowserView de QWEN
     (Confirmado: "[QWEN3] ✅ BrowserView visible como panel lateral")

[✅] Las cookies de sesión se guardan y cargan
     (Confirmado: "📦 Cargando 80 cookies guardadas", "💾 77 cookies guardadas")

[✅] El selector de modelos renderiza 19 modelos de QWEN
     (Confirmado: "[renderModelLists] ✅ Renderizando 19 modelos de Qwen")

[✅] El cambio de modelo se registra en memoria
     (Confirmado: "✅ [Provider] Cambio de modelo:... DESPUÉS: qwen/qwen3-max")

[✅] Groq API funciona perfectamente
     (Confirmado: "[Groq] ✅ API disponible - Listo para usar")

[✅] MCP Server está en puerto 19875
     (Confirmado: "[Main] ✅ MCP Server Unificado iniciado en puerto 19875")
```

### ❌ LO QUE NO FUNCIONA:

```
[❌] Comunicación entre UI y BrowserView de QWEN
     Error: "Timeout ejecutando script (15s)"

[❌] Inyección de JavaScript en el BrowserView
     Error: "Render frame was disposed before WebFrameMain"

[❌] Envío de mensajes a QWEN embebido
     El BrowserView se abre pero NO responde a mensajes

[❌] Cambio de modelo se refleja en QWEN
     El modelo se cambia en UI pero QWEN no lo sabe

[❌] Modelo Selector → BrowserView Pipeline
     Existe UI para seleccionar modelo pero no conecta con el backend

[❌] Recuperación de respuestas de QWEN
     No hay sistema para obtener la respuesta del chat de vuelta a StudioLab
```

---

## 3. CAUSA RAÍZ: Por Qué el Error "Render frame was disposed"

### Diagnóstico Técnico:

**Posibilidad 1: BrowserView se Cierra por Falta de Actividad**
```javascript
// main.js línea ~1670
// El BrowserView NO tiene un keepalive o heartbeat
// Si la ventana pierde el foco, Electron puede destruir el render process
```

**Posibilidad 2: Timeout de Render Process**
```javascript
// Electron destroza el render process si tarda demasiado
// QWEN.ai tarda +10 segundos en cargar completamente
// El timeout de 15 segundos es muy ajustado
```

**Posibilidad 3: XFrame-Options Block**
```javascript
// QWEN.ai puede estar sirviendo
// X-Frame-Options: DENY o X-Frame-Options: SAMEORIGIN
// Electron BrowserView puede estar siendo bloqueado
// La inyección de scripts falla porque el frame es inaccesible
```

**Posibilidad 4: webFrameMain Invalidado**
```javascript
// main.js line 1827
// qwenBrowserView.webContents puede volverse null si:
// - El usuario cierra la ventana
// - El BrowserView se quita de la ventana
// - El proceso renderer crashea
```

### Confirmación de los Logs:

```
[QWEN] Error sending from webFrameMain: Error: Render frame was disposed
before WebFrameMain could be accessed
    at s._sendInternal (node:electron/js2c/browser_init:2:83221)
    at _._sendInternal (node:electron/js2c/browser_init:2:69245)
```

**Esto confirma**: El frame del render process de QWEN fue destruido (**disposed**) antes de que el `executeJavaScript` pudiera acceder a él.

---

## 4. IMPACTO EN EL USUARIO

Cuando el usuario:

1. **Abre la aplicación StudioLab**
   - ✅ Conectado (logs muestran todo cargado)

2. **Hace click en botón verde de QWEN**
   - ✅ El panel se abre a la derecha
   - ✅ Se cargan las cookies

3. **Cambia a modelo QWEN en dropdown**
   - ✅ El dropdown muestra "Qwen3-Max"
   - ✅ El estado se actualiza en memory

4. **Escribe "Hola" y presiona Enter**
   - ❌ **FALLO**: "Error: Timeout ejecutando script (15s)"
   - ❌ El mensaje NO llega a QWEN
   - ❌ QWEN NO responde
   - ❌ El usuario ve un error rojo en la interfaz

**Resultado**: Sistema completamente no funcional para QWEN embebido.

---

## 5. LISTA DE ARCHIVOS QUE NECESITAN LIMPIEZA/CONSOLIDACIÓN

### 🗑️ Archivos a ELIMINAR (CÓDIGO MUERTO):

```
main-clean.js                          ← Versión antigua, no se usa
main-simple.js                         ← Confusión, no está claro su propósito
preload-simple.js                      ← Versión antigua
qwen-preload.js.bak                    ← BACKUP, no debe estar en prod
qwen-mcp-config-alternative.json       ← Duplicado de qwen-mcp-config.json
qwen-mcp-config-npx.json               ← Variante no usada
index.html.backup                      ← BACKUP ANTIGUO
index.html.backup2                     ← BACKUP ANTIGUO
index-modified.html                    ← NO ESTÁ EN USO
mcp-server-neon.py.backup              ← BACKUP
```

### 🔄 Archivos a CONSOLIDAR:

```
mcp-server.js                          ← OBSOLETO, usar mcp-server-unified.js
mcp-server-sse.js                      ← OBSOLETO, usar mcp-server-unified.js
mcp-server-tools.js                    ← OBSOLETO, usar mcp-server-unified.js

qwen-integration-loader.js             ← POSIBLE DUPLICIDAD CON qwen-auto-injector.js
qwen-connection-core.js                ← POSIBLE DUPLICIDAD CON qwen-intelligent-integration.js

test-qwen-integration.js               ← Versión ligera
TEST_QWEN_INTEGRATION.js               ← Versión completa (¿Cuál usar?)
```

### 📚 Documentación REDUNDANTE a CONSOLIDAR:

```
67 archivos MD/TXT sobre QWEN
├── Resumen en QWEN_COMPLETE_SUMMARY.md (USAR ESTE)
├── QWEN_INTEGRATION_GUIDE.md (ACTUALIZAR SI ES NECESARIO)
├── Todos los demás (ELIMINAR)
```

---

## 6. ARQUITECTURA PROPUESTA DE SOLUCIÓN

### Fase 1: Verificación Pre-Envío (Reliability)

**Objetivo**: Asegurarse de que el BrowserView esté realmente listo antes de intentar inyectar código.

**Implementación**:
```javascript
// qwen-health-check.js (NUEVO)
async function verifyQWENReady(browserView, timeout = 20000) {
  return Promise.race([
    // Intentar acceder al DOM
    new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const result = await browserView.webContents.executeJavaScript(
            'document.querySelector("input,textarea") !== null'
          );
          if (result) {
            clearInterval(interval);
            resolve(true);
          }
        } catch (e) {
          // Ignorar errores temporales
        }
      }, 500); // Revisar cada 500ms
    }),
    new Promise((_r, reject) =>
      setTimeout(() => reject(new Error('QWEN not ready after 20s')), timeout)
    )
  ]);
}
```

### Fase 2: Manejo de Errores Robusto (Fallback)

**Objetivo**: Si QWEN embebido falla, intentar alternativas (Ollama, API local).

**Implementación**:
```javascript
// En callAssistant()
if (provider === 'qwen') {
  try {
    await verifyQWENReady(qwenBrowserView, 20000); // ← Esperar a que esté listo
    const result = await window.sandraAPI.qwenSendMessage(payload.message);
    if (result.success) return { text: '✅ Mensaje enviado' };
  } catch (e) {
    console.warn('QWEN fallió, intentando Ollama...');
    // Fallback a Ollama local
    return await callOllamaLocal(payload);
  }
}
```

### Fase 3: Inyección Inteligente (Resilience)

**Objetivo**: Usar estrategias múltiples para inyectar mensajes (no solo KeyboardEvent).

**Implementación**:
```javascript
// Estrategia 1: React DevTools Hook
// Estrategia 2: Custom Events
// Estrategia 3: Direct API Call (si existe)
// Estrategia 4: Fallback KeyboardEvent
```

### Fase 4: Selector de Modelos → BrowserView Pipeline (Connection)

**Objetivo**: Conectar cambios de modelo en UI con QWEN embebido.

**Implementación**:
```javascript
// En studiolab-final-v2.html
function onModelChange(newModel) {
  state.currentModel = newModel;
  // ✅ NUEVO: Notificar a main.js
  ipcRenderer.invoke('qwen:changeModel', { model: newModel });
}

// En main.js
ipcMain.handle('qwen:changeModel', async (_e, { model }) => {
  // Inyectar cambio de modelo en BrowserView
  // (implementar lógica específica de QWEN)
});
```

---

## 7. RECOMENDACIONES INMEDIATAS

### 🔴 CRÍTICO - Hacer AHORA:

1. **Eliminar todos los archivos .bak y .backup**
   ```bash
   rm main-*.js preload-simple.js qwen-preload.js.bak index.html.backup*
   ```

2. **Consolidar MCP Servers** (USAR SOLO `mcp-server-unified.js`)
   ```bash
   # Renombrar/backup
   mv mcp-server.js mcp-server.js.old
   mv mcp-server-sse.js mcp-server-sse.js.old
   mv mcp-server-tools.js mcp-server-tools.js.old
   ```

3. **Consolidar QWEN Configs** (USAR SOLO `qwen-mcp-config.json`)
   ```bash
   rm qwen-mcp-config-*.json
   ```

4. **Verificar cuál HTML se está usando realmente**
   - Abrir DevTools
   - Verificar que sea `studiolab-final-v2.html`
   - Si no, actualizar `main.js` para usar siempre `studiolab-final-v2.html`

### 🟠 ALTA PRIORIDAD - Hacer en próximas horas:

5. **Implementar Health Check de QWEN** (qwen-health-check.js)
6. **Aumentar timeout a 25 segundos mínimo** con retry logic
7. **Implementar fallback a Ollama** si QWEN falla
8. **Conectar modelo selector con BrowserView**

### 🟡 IMPORTANTE - Esta sesión o siguiente:

9. **Refactorizar script injection** (usar múltiples estrategias)
10. **Consolidar documentación** (guardar QWEN_COMPLETE_SUMMARY.md, eliminar duplicados)
11. **Testing automatizado** de comunicación QWEN

---

## 8. ARCHIVOS CLAVE PARA REVISAR/MODIFICAR

```
priority: CRÍTICO
├── main.js (líneas 1456-1852) - QWEN BrowserView & Script Injection
├── preload.js (líneas 157-161) - API Exposure
├── studiolab-final-v2.html (líneas 4914-4988) - callAssistant() & Model Selector
└── .env - Variables de configuración

priority: ALTO
├── qwen-auto-injector.js - Inyección de código
├── qwen-memory-manager.js - Gestión de estado
├── qwen-integration-loader.js - Carga de integración
└── chat-service.js - Router de servicios

priority: CONSOLIDACIÓN
├── mcp-server-unified.js (mantener, consolidar otros aquí)
├── qwen-mcp-config.json (mantener, eliminar variantes)
└── Documentación (consolidar en QWEN_COMPLETE_SUMMARY.md)
```

---

## 9. CONCLUSIÓN

**El sistema de QWEN embebido tiene un fallo de diseño fundamental**: Intenta comunicarse con un BrowserView que:

1. **No está completamente inicializado** cuando se intenta la inyección
2. **Se destruye antes de que se complete la comunicación** (frame disposal)
3. **No tiene manejo de errores robusto** ni reintentos
4. **No está conectado correctamente con el selector de modelos**
5. **Tiene demasiado código duplicado y muerto** causando confusión

**La solución requiere**:
- Verificación de salud previa al envío (health check)
- Reintentos con timeout dinámico
- Fallback a alternativas (Ollama, API)
- Conexión real entre UI y BrowserView
- Limpieza de código duplicado
- Refactorización de la estrategia de inyección

**Tiempo estimado de corrección**: 4-6 horas para una solución robusta y funcional.

---

## 10. PRÓXIMOS PASOS

Ver el archivo `PLAN_DE_ACCION_QWEN.md` para el plan de implementación detallado paso a paso.

