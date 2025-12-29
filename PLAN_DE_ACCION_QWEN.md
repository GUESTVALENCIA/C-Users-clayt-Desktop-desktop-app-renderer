# PLAN DE ACCIÓN DETALLADO: Corrección del Sistema QWEN

**Documento Maestro para Corrección de Bugs de Conexión QWEN**
**Versión**: 1.0
**Status**: 📋 EN PREPARACIÓN
**Prioridad**: 🔴 CRÍTICA

---

## TABLA DE CONTENIDOS

1. [Resumen del Problema](#1-resumen-del-problema)
2. [Soluciones Identificadas](#2-soluciones-identificadas)
3. [Implementación Paso a Paso](#3-implementación-paso-a-paso)
4. [Testing y Validación](#4-testing-y-validación)
5. [Código Completo de Soluciones](#5-código-completo-de-soluciones)

---

## 1. RESUMEN DEL PROBLEMA

### 1.1 Error Actual

```
Usuario escribe "Hola" y presiona Enter
    ↓
[callAssistant] ❌ Error con QWEN: Error: Timeout ejecutando script (15s)
    ↓
QWEN no responde
```

### 1.2 Causa Raíz

El BrowserView de QWEN se crea pero antes de que el `executeJavaScript` pueda acceder a él:

1. **El frame se destruye** ("Render frame was disposed before WebFrameMain could be accessed")
2. **O el timeout de 15 segundos es insuficiente** para una SPA que necesita cargar completamente
3. **O ambos** - el frame se destruye porque tarda demasiado en cargar

### 1.3 Por Qué Falla el Script

```javascript
// ❌ ACTUAL (FALLA)
const result = await Promise.race([
  qwenBrowserView.webContents.executeJavaScript(injectCode),
  new Promise((_, reject) => setTimeout(() => {
    reject(new Error('Timeout ejecutando script (15s)'));
  }, 15000))  // ← 15 segundos es INSUFICIENTE
]);
```

**Problemas**:
1. No espera a que el DOM esté completamente listo
2. No verifica si el frame es accesible antes de intentar inyectar
3. 15 segundos de timeout es muy ajustado para una SPA
4. Sin reintentos - falla una vez y punto

---

## 2. SOLUCIONES IDENTIFICADAS

### 2.1 Solución 1: Health Check Previa (CRÍTICA)

**Objetivo**: Verificar que el BrowserView está realmente listo ANTES de inyectar

**Código**:
```javascript
// qwen-health-check.js (NUEVO)
async function verifyQWENReady(browserView, timeout = 20000) {
  return Promise.race([
    new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          // Intentar acceder a un elemento simple del DOM
          const result = await browserView.webContents.executeJavaScript(
            'typeof document !== "undefined" && document.body !== null'
          );
          if (result === true) {
            clearInterval(interval);
            resolve(true);
          }
        } catch (e) {
          // Ignorar errores temporales, reintentar
        }
      }, 500);  // Verificar cada 500ms
    }),
    new Promise((_r, reject) =>
      setTimeout(() => reject(new Error('BrowserView not ready after timeout')), timeout)
    )
  ]);
}
```

### 2.2 Solución 2: Reintentos con Backoff (IMPORTANTE)

**Objetivo**: Si falla la primera vez, reintentar con espera exponencial

**Estrategia**:
```javascript
async function sendMessageWithRetry(message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[QWEN] Intento ${attempt}/${maxRetries}...`);

      // 1. Health check
      await verifyQWENReady(qwenBrowserView, 25000);

      // 2. Inyectar mensaje
      const result = await qwenBrowserView.webContents.executeJavaScript(injectCode);

      if (result.success) {
        console.log(`[QWEN] ✅ Éxito en intento ${attempt}`);
        return { success: true };
      }
    } catch (e) {
      console.error(`[QWEN] ❌ Intento ${attempt} falló:`, e.message);

      if (attempt < maxRetries) {
        // Esperar exponencialmente: 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[QWEN] ⏳ Esperando ${delay}ms antes de reintentar...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error('Failed after 3 retries');
}
```

### 2.3 Solución 3: Timeout Dinámico (IMPORTANTE)

**Objetivo**: Aumentar timeout y hacerlo dinámico basado en circunstancias

**Código**:
```javascript
// Timeout dinámico
let scriptTimeout = 15000; // Base: 15 segundos

// Si QWEN aún está cargando, aumentar timeout
if (!qwenBrowserView.webContents.isLoading() === false) {
  scriptTimeout = 30000; // 30 segundos si aún está cargando
}

// En la primera carga (no hay cookies), puede necesitar más tiempo
if (!qwenCookiesLoaded) {
  scriptTimeout = 40000; // 40 segundos en primera carga
}
```

### 2.4 Solución 4: Inyección Inteligente (IMPORTANTE)

**Objetivo**: Usar múltiples estrategias en lugar de solo KeyboardEvent

**Estrategias de Inyección**:
```javascript
// Estrategia 1: Encontrar el input más probable
const input = document.querySelector('[placeholder*="Cuéntame"],
                                      [placeholder*="pregunta"],
                                      [contenteditable="true"],
                                      textarea,
                                      input[type="text"]:last-of-type');

// Estrategia 2: Si existe, usar focus() + setValue()
if (input) {
  input.focus();
  input.value = message;
  input.textContent = message;  // Para contenteditable

  // Triggerear eventos en el orden correcto
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true
  }));
}

// Estrategia 3: Si no hay input, buscar botón Send
const sendBtn = document.querySelector('[type="submit"],
                                        button:contains("Enviar"),
                                        button:contains("Send")');
if (sendBtn && input) {
  sendBtn.click();
}

// Estrategia 4: Si todo falla, usar React DevTools Hook
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  // Inyectar a través de React internals
}
```

### 2.5 Solución 5: Fallback a Alternativas (CRÍTICA)

**Objetivo**: Si QWEN embebido falla, usar Ollama o API como fallback

**Código**:
```javascript
async function callAssistant(payload) {
  const provider = state.currentProvider || 'groq';

  if (provider === 'qwen') {
    try {
      // 1. Intentar QWEN embebido
      console.log('[callAssistant] Intentando QWEN embebido...');
      const result = await sendMessageWithRetry(payload.message, 3);
      if (result.success) return { text: '✅ Enviado a QWEN', embedded: true };
    } catch (e) {
      console.error('[callAssistant] QWEN embebido falló:', e.message);

      // 2. Fallback: Intentar Ollama local
      try {
        console.log('[callAssistant] Intentando Ollama local...');
        const ollama Result = await window.sandraAPI.chatSend('ollama', payload.message, 'user');
        if (ollamaResult.success) {
          return {
            text: ollamaResult.response,
            provider: 'ollama',
            fallback: true
          };
        }
      } catch (e2) {
        console.error('[callAssistant] Ollama falló:', e2.message);

        // 3. Fallback final: Groq (siempre disponible)
        console.log('[callAssistant] Fallback final a Groq...');
        const groqResult = await window.sandraAPI.chatSend('groq', payload.message, 'user');
        return {
          text: groqResult.response,
          provider: 'groq',
          fallback: true
        };
      }
    }
  }

  // Para otros providers, usar API normal
  return await window.sandraAPI.chatSend(provider, payload.message, 'user');
}
```

### 2.6 Solución 6: Conexión Modelo Selector → BrowserView (IMPORTANTE)

**Objetivo**: Cuando el usuario cambia modelo, notificar a QWEN

**Código en studiolab-final-v2.html**:
```javascript
// Interceptar cambio de modelo
function selectModel(modelId) {
  // 1. Actualizar estado local
  state.currentModel = modelId;

  // 2. ✅ NUEVO: Notificar a main.js si es QWEN
  if (state.currentProvider === 'qwen') {
    ipcRenderer.invoke('qwen:changeModel', {
      model: modelId,
      provider: state.currentProvider
    }).catch(e => console.error('Error al cambiar modelo:', e));
  }

  // 3. Actualizar UI
  updateModelUI(modelId);
}
```

**Código en main.js**:
```javascript
// ✅ NUEVO: Handler para cambio de modelo
ipcMain.handle('qwen:changeModel', async (_e, { model, provider }) => {
  if (provider === 'qwen' && qwenBrowserView) {
    console.log(`[QWEN] Cambiando modelo a: ${model}`);

    // Inyectar cambio de modelo en QWEN
    // (Implementación específica de QWEN)
    try {
      await qwenBrowserView.webContents.executeJavaScript(`
        // Lógica para cambiar modelo en QWEN UI
        // Ejemplo: click en selector de modelo
        const modelSelector = document.querySelector('.model-selector');
        if (modelSelector) {
          modelSelector.value = '${model}';
          modelSelector.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      return { success: true, model };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'QWEN not available' };
});
```

---

## 3. IMPLEMENTACIÓN PASO A PASO

### PASO 1: Crear archivo de Health Check (5 minutos)

**Archivo**: `C:\Users\clayt\Desktop\desktop-app\qwen-health-check.js`

```javascript
// qwen-health-check.js - Sistema de verificación de disponibilidad de QWEN BrowserView

/**
 * Verifica que el BrowserView de QWEN está completamente listo
 * @param {BrowserView} browserView - BrowserView de QWEN
 * @param {number} timeout - Timeout en ms (default 20000)
 * @returns {Promise<boolean>}
 */
async function verifyQWENReady(browserView, timeout = 20000) {
  if (!browserView || !browserView.webContents) {
    throw new Error('BrowserView not available or invalid');
  }

  return Promise.race([
    new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 40; // 40 intentos × 500ms = 20 segundos

      const interval = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(interval);
          reject(new Error(`BrowserView not ready after ${maxAttempts * 500}ms`));
          return;
        }

        try {
          // Test 1: ¿Existe el DOM?
          const hasDom = await browserView.webContents.executeJavaScript(
            'typeof document !== "undefined" && document.body !== null'
          );

          if (!hasDom) return; // Esperar más

          // Test 2: ¿Está el contenido cargado?
          const hasContent = await browserView.webContents.executeJavaScript(
            'document.readyState === "complete" || document.readyState === "interactive"'
          );

          if (!hasContent) return; // Esperar más

          // Test 3: ¿Hay elementos interactivos?
          const hasInputs = await browserView.webContents.executeJavaScript(
            'document.querySelectorAll("input, textarea, [contenteditable]").length > 0'
          );

          if (hasInputs) {
            // ✅ TODO LISTO
            clearInterval(interval);
            console.log(`[Health Check] ✅ QWEN Ready (${attempts * 500}ms)`);
            resolve(true);
            return;
          }
        } catch (e) {
          // Ignorar errores temporales - reintentar
          if (attempts % 10 === 0) {
            console.log(`[Health Check] ⏳ Attempt ${attempts}... waiting for DOM`);
          }
        }
      }, 500); // Revisar cada 500ms
    }),

    new Promise((_r, reject) =>
      setTimeout(() => {
        reject(new Error(`BrowserView not ready after ${timeout}ms`));
      }, timeout)
    )
  ]);
}

/**
 * Envía un mensaje a QWEN con reintentos
 * @param {BrowserView} browserView - BrowserView de QWEN
 * @param {string} message - Mensaje a enviar
 * @param {number} maxRetries - Máximo de reintentos
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendMessageWithRetry(browserView, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[QWEN] Intento ${attempt}/${maxRetries}...`);

      // 1. Health Check
      console.log(`[QWEN] Verificando disponibilidad...`);
      const timeout = attempt === 1 ? 20000 : 30000; // Más tiempo en reintentos
      await verifyQWENReady(browserView, timeout);
      console.log(`[QWEN] ✅ BrowserView disponible`);

      // 2. Inyectar y enviar mensaje
      const injectCode = `
        (function() {
          // Lógica de inyección de mensaje
          const input = document.querySelector('[placeholder*="Cuéntame"],
                                                [placeholder*="pregunta"],
                                                textarea,
                                                input[type="text"]');
          if (!input) return { success: false, error: 'Input no encontrado' };

          input.focus();
          input.value = "${message.replace(/"/g, '\\"')}";
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

          return { success: true, message: 'Mensaje enviado' };
        })();
      `;

      console.log(`[QWEN] Inyectando mensaje...`);
      const result = await browserView.webContents.executeJavaScript(injectCode);

      if (result.success) {
        console.log(`[QWEN] ✅ Éxito en intento ${attempt}`);
        return { success: true, message: result.message };
      } else {
        console.error(`[QWEN] ❌ Inyección falló en intento ${attempt}:`, result.error);
      }
    } catch (error) {
      console.error(`[QWEN] ❌ Error en intento ${attempt}:`, error.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s...
        console.log(`[QWEN] ⏳ Reintentando en ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error('Failed to send message after all retries');
}

module.exports = {
  verifyQWENReady,
  sendMessageWithRetry
};
```

### PASO 2: Importar Health Check en main.js (10 minutos)

**Ubicación**: `main.js` línea 1 (cerca de otros imports)

```javascript
// ✅ AGREGAR AL INICIO DEL ARCHIVO
const { verifyQWENReady, sendMessageWithRetry } = require('./qwen-health-check');
```

### PASO 3: Actualizar Handler qwen:sendMessage (15 minutos)

**Ubicación**: `main.js` línea 1653

**REEMPLAZAR** el código del handler `qwen:sendMessage` con:

```javascript
ipcMain.handle('qwen:sendMessage', async (_e, { message }) => {
  try {
    if (!qwenBrowserView) {
      return { success: false, error: 'QWEN panel no está abierto. Abre primero con el botón verde.' };
    }

    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Mensaje inválido' };
    }

    console.log(`[QWEN] Enviando mensaje: "${message.substring(0, 50)}..."`);

    // ✅ USAR NUEVO SISTEMA CON REINTENTOS
    const result = await sendMessageWithRetry(qwenBrowserView, message, 3);

    if (result.success) {
      console.log(`[QWEN] ✅ Mensaje enviado exitosamente`);
      return { success: true, message: result.message };
    } else {
      console.error(`[QWEN] ❌ Error al enviar:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[QWEN] ❌ Error en sendMessage:`, error.message);
    return { success: false, error: error.message };
  }
});
```

### PASO 4: Agregar Handler qwen:changeModel (10 minutos)

**Ubicación**: `main.js` (después del handler `qwen:sendMessage`)

```javascript
// ✅ NUEVO: Handler para cambio de modelo
ipcMain.handle('qwen:changeModel', async (_e, { model, provider }) => {
  try {
    if (provider !== 'qwen' || !qwenBrowserView) {
      return { success: false, error: 'QWEN not available' };
    }

    console.log(`[QWEN] Cambiando modelo a: ${model}`);

    // Verificar disponibilidad
    await verifyQWENReady(qwenBrowserView, 15000);

    // Inyectar cambio de modelo
    const changeCode = `
      (function() {
        // Implementación específica para cambiar modelo en QWEN
        console.log('[QWEN Model Change] Buscando selector de modelo...');

        const modelSelectors = [
          '.model-selector',
          '[data-testid="model-selector"]',
          '.qwen-model-selector',
          'select.model'
        ];

        for (const selector of modelSelectors) {
          const elem = document.querySelector(selector);
          if (elem) {
            elem.value = "${model}";
            elem.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[QWEN Model Change] ✅ Modelo cambiado');
            return { success: true };
          }
        }

        return { success: false, error: 'Model selector not found' };
      })();
    `;

    const result = await qwenBrowserView.webContents.executeJavaScript(changeCode);
    return result.success ? { success: true, model } : { success: false, error: 'Failed to change model' };
  } catch (error) {
    console.error(`[QWEN] Error al cambiar modelo:`, error.message);
    return { success: false, error: error.message };
  }
});
```

### PASO 5: Actualizar callAssistant en HTML (20 minutos)

**Ubicación**: `renderer/studiolab-final-v2.html` línea ~4914

**REEMPLAZAR** la sección `if (provider === 'qwen')` con:

```javascript
// QWEN EMBEDDED: Enviar mensaje al BrowserView embebido
if (provider === 'qwen') {
  if (!window.sandraAPI?.qwenSendMessage) {
    throw new Error('QWEN embebido no disponible. Abre QWEN primero con el botón verde.');
  }

  try {
    console.log(`[callAssistant] Enviando a QWEN BrowserView: "${(payload.message || '').substring(0, 50)}..."`);

    // 1. Asegurar que QWEN está visible
    if (!state.qwen.panelVisible) {
      console.log('[callAssistant] Abriendo panel QWEN automáticamente...');
      await window.sandraAPI.qwenToggle(true);
      state.qwen.panelVisible = true;

      // Esperar a que la SPA cargue completamente
      console.log('[callAssistant] Esperando carga completamente...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
    }

    console.log('[callAssistant] Enviando mensaje a QWEN BrowserView...');

    // 2. ✅ NUEVO: Con manejo de errores mejorado
    const result = await window.sandraAPI.qwenSendMessage(payload.message || '');

    if (result.success) {
      console.log(`[callAssistant] ✅ Mensaje enviado a QWEN BrowserView`);
      return {
        text: '✅ Mensaje enviado a QWEN. Ve la respuesta en el panel lateral derecho.',
        provider: 'qwen',
        model: 'qwen-embedded',
        embedded: true
      };
    } else {
      throw new Error(result.error || 'Error desconocido al enviar');
    }
  } catch (qwenError) {
    console.error(`[callAssistant] ❌ QWEN falló:`, qwenError.message);

    // ✅ NUEVO: Fallback a Ollama
    try {
      console.log('[callAssistant] Fallback: Intentando Ollama...');
      const ollamaResult = await window.sandraAPI.chatSend('ollama', payload.message || '', 'user');

      if (ollamaResult.success) {
        console.log('[callAssistant] ✅ Ollama respondió exitosamente');
        return {
          text: ollamaResult.response || ollamaResult.message || '',
          provider: 'ollama',
          model: 'qwen2.5:7b',
          fallback: true
        };
      }
    } catch (ollamaError) {
      console.error('[callAssistant] Ollama también falló:', ollamaError.message);

      // ✅ NUEVO: Fallback final a Groq
      try {
        console.log('[callAssistant] Fallback final: Intentando Groq...');
        const groqResult = await window.sandraAPI.chatSend('groq', payload.message || '', 'user', 'llama-3.3-70b-versatile');

        if (groqResult.success) {
          console.log('[callAssistant] ✅ Groq respondió exitosamente');
          return {
            text: groqResult.response || groqResult.message || '',
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            fallback: true
          };
        }
      } catch (groqError) {
        console.error('[callAssistant] Todos los proveedores fallaron');
        throw new Error(`QWEN, Ollama y Groq fallaron. Error: ${groqError.message}`);
      }
    }
  }
}
```

### PASO 6: Conectar Selector de Modelos (15 minutos)

**Ubicación**: `renderer/studiolab-final-v2.html` (función `selectModel`)

**AGREGAR después de cambiar `state.currentModel`**:

```javascript
function selectModel(modelId) {
  // Actualizar estado
  const oldModel = state.currentModel;
  state.currentModel = modelId;

  console.log(`[selectModel] Cambiando de ${oldModel} a ${modelId}`);

  // ✅ NUEVO: Notificar a BrowserView si es QWEN
  if (state.currentProvider === 'qwen' && window.sandraAPI?.qwenChangeModel) {
    window.sandraAPI.qwenChangeModel(modelId)
      .then(result => {
        if (result.success) {
          console.log(`[selectModel] ✅ Modelo cambiado en QWEN`);
        } else {
          console.warn(`[selectModel] ⚠️ No se pudo cambiar modelo en QWEN:`, result.error);
        }
      })
      .catch(err => console.error('[selectModel] Error al cambiar modelo:', err));
  }

  // Actualizar UI
  updateModelUI(modelId);
}
```

### PASO 7: Agregar qwenChangeModel a preload.js (5 minutos)

**Ubicación**: `preload.js` (cerca de otros qwen:* handlers)

```javascript
// ✅ NUEVO
qwenChangeModel: (modelId) => ipcRenderer.invoke('qwen:changeModel', { modelId }),
```

---

## 4. TESTING Y VALIDACIÓN

### Test 1: Verificar que la aplicación inicia sin errores

```bash
cd "C:\Users\clayt\Desktop\desktop-app"
npm start
```

**Resultado esperado**:
```
[Main] ✅ INDEX OFICIAL CARGADO EXITOSAMENTE
[Main] ✅ MCP Server Unificado iniciado en puerto 19875
[Main] ✅ QWEN Health Check loaded
```

**Si falla**: Revisar que `qwen-health-check.js` está en la raíz

---

### Test 2: Test de Health Check

**En DevTools de la aplicación**:
```javascript
// Ejecutar esto en la consola
window.sandraAPI.qwenToggle(true).then(() => {
  console.log('QWEN panel abierto, esperando 3 segundos...');
  setTimeout(() => {
    console.log('Health check iniciado...');
    // El health check se ejecutará automáticamente cuando se intente enviar un mensaje
  }, 3000);
});
```

---

### Test 3: Test CRÍTICO - Enviar mensaje a QWEN

**Pasos**:
1. Hacer click en botón verde (QWEN)
2. Esperar a que se cargue (debe verse el panel de QWEN a la derecha)
3. Escribir "Hola" en el chat
4. Presionar Enter

**Resultado esperado**:
```
[callAssistant] Enviando a QWEN BrowserView: "Hola"
[Health Check] ✅ QWEN Ready (2500ms)
[QWEN] Inyectando mensaje...
[QWEN] ✅ Mensaje enviado exitosamente
```

**Resultado actual (esperamos cambiar de esto)**:
```
[callAssistant] ❌ Error con QWEN: Error: Timeout ejecutando script (15s)
```

---

### Test 4: Test de Cambio de Modelo

**Pasos**:
1. Abrir QWEN
2. Cambiar modelo de dropdown (Qwen3-Max, Qwen3-VL-235B, etc.)
3. Enviar mensaje

**Resultado esperado**:
```
[selectModel] Cambiando de qwen/qwen3-omni-flash a qwen/qwen3-max
[selectModel] ✅ Modelo cambiado en QWEN
[callAssistant] Enviando a QWEN BrowserView: "Prueba"
[QWEN] ✅ Mensaje enviado exitosamente
```

---

### Test 5: Test de Fallback

**Pasos** (simulado):
1. Cerrar manualmente el BrowserView de QWEN (o desconectar internet)
2. Cambiar a QWEN en el provider selector
3. Escribir "Hola"

**Resultado esperado**:
```
[callAssistant] ❌ QWEN falló: Frame was disposed
[callAssistant] Fallback: Intentando Ollama...
[callAssistant] ✅ Ollama respondió exitosamente
```

---

## 5. CÓDIGO COMPLETO DE SOLUCIONES

### Archivo 1: qwen-health-check.js (NUEVO)

**Ver sección 3.1 arriba** - Código completo

---

### Archivo 2: Cambios en main.js

**Línea 1 (import)**:
```javascript
const { verifyQWENReady, sendMessageWithRetry } = require('./qwen-health-check');
```

**Línea ~1653 (reemplazar handler completo)**:
```javascript
// Ver Paso 3 arriba
```

**Línea ~1860 (agregar nuevo handler)**:
```javascript
// Ver Paso 4 arriba
```

---

### Archivo 3: Cambios en preload.js

**Agregar a window.sandraAPI**:
```javascript
qwenChangeModel: (modelId) => ipcRenderer.invoke('qwen:changeModel', { modelId }),
```

---

### Archivo 4: Cambios en studiolab-final-v2.html

**callAssistant function (línea ~4921)**:
```javascript
// Ver Paso 5 arriba
```

**selectModel function**:
```javascript
// Ver Paso 6 arriba
```

---

## 6. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
1. ✅ PASO 1: Crear qwen-health-check.js (5 min)
   ↓
2. ✅ PASO 2: Importar en main.js (2 min)
   ↓
3. ✅ PASO 3: Actualizar qwen:sendMessage handler (10 min)
   ↓
4. ✅ PASO 4: Agregar qwen:changeModel handler (5 min)
   ↓
5. ✅ PASO 5: Actualizar callAssistant (15 min)
   ↓
6. ✅ PASO 6: Conectar selectModel (10 min)
   ↓
7. ✅ PASO 7: Agregar qwenChangeModel a preload (2 min)
   ↓
8. ✅ TEST: npm start + pruebas (10-15 min)
   ↓
9. ✅ VALIDACIÓN: Enviar "Hola" y verificar respuesta
```

**Tiempo total estimado**: 60-75 minutos

---

## 7. ROLLBACK (Si algo falla)

Todos los cambios son reversibles:

```bash
# 1. Si qwen-health-check.js causa problemas
rm qwen-health-check.js

# 2. Si main.js no inicia
git restore main.js  # Restaurar versión anterior

# 3. Si preload.js tiene errores
git restore preload.js

# 4. Si studiolab-final-v2.html falla
git restore renderer/studiolab-final-v2.html
```

---

## 8. PRÓXIMOS PASOS DESPUÉS

Una vez QWEN funcione:

1. ✅ Aumentar límites de calidad de respuesta
2. ✅ Implementar persistencia de chat
3. ✅ Agregar soporte para multimodal (imágenes, audio)
4. ✅ Optimizar inyección de JavaScript
5. ✅ Documentar proceso completo

---

**Estado del Documento**: 📋 LISTO PARA IMPLEMENTACIÓN
**Última Actualización**: 29 de diciembre de 2025
**Autor**: Claude Code - Expert System Analysis

