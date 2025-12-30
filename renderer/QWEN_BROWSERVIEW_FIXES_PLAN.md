# Plan: Correcciones BrowserView QWEN - Comunicación Bidireccional Persistente

## Problemas Identificados

1. **BrowserView desaparece al tocarlo** → Se pierde comunicación bidireccional
2. **Primer saludo se queda "pensando"** → Nunca responde, hay que repetirlo
3. **Respuestas dobles** → A veces responde dos veces
4. **Código mezclado con texto** → Observer necesita mejor detección
5. **Botones faltantes** → Necesita compartir, regenerar, copiar (NO like/dislike)

## Soluciones

### 1. BrowserView Interno y Protegido

**Archivo**: `[main.js](main.js)` (líneas 1481-1692)

**Problema**: El BrowserView se puede tocar y desaparece, perdiendo comunicación.

**Solución**:
- Deshabilitar interacción del usuario con el BrowserView
- Usar `setIgnoreMouseEvents()` para que los clicks pasen a través
- Mantener BrowserView siempre visible cuando QWEN está activo
- Prevenir que se oculte accidentalmente

```javascript
// Después de crear BrowserView (línea 1491)
qwenBrowserView.webContents.setIgnoreMouseEvents(true, { forward: true });
// Esto permite que los clicks pasen a través pero mantiene la comunicación

// Asegurar que siempre esté visible cuando QWEN está activo
qwenBrowserView.webContents.on('will-navigate', (event) => {
  // Prevenir navegaciones que puedan romper la comunicación
  console.log('[QWEN3] Navegación detectada, manteniendo comunicación activa');
});
```

### 2. Fix Primer Saludo - Timeout y Reintento

**Archivo**: `[main.js](main.js)` (líneas 2283-2430)

**Problema**: El primer saludo se queda en "thinking" y nunca responde.

**Solución**:
- Añadir timeout para detectar cuando se queda atascado
- Reintentar automáticamente si no hay respuesta en X segundos
- Mejorar detección del estado "thinking" vs "idle"

```javascript
// En startQwenResponseCapture(), añadir:
let firstGreetingTimeout = null;
let greetingRetryCount = 0;
const MAX_GREETING_RETRIES = 2;

// Detectar si es el primer mensaje y está atascado
if (currentState === 'thinking' && responseText === '' && greetingRetryCount === 0) {
  firstGreetingTimeout = setTimeout(() => {
    console.log('[QWEN Capture] ⚠️ Primer saludo atascado, reintentando...');
    greetingRetryCount++;
    // Reenviar el mensaje automáticamente
    // (necesitaríamos guardar el último mensaje enviado)
  }, 10000); // 10 segundos de timeout
}
```

### 3. Fix Respuestas Dobles - Mejorar Idempotencia

**Archivo**: `[main.js](main.js)` (líneas 2397-2428)

**Problema**: A veces responde dos veces.

**Solución**:
- Mejorar el hash para incluir timestamp del mensaje
- Añadir debounce más agresivo
- Verificar que no se envíe el mismo contenido dos veces seguidas

```javascript
// Mejorar hash para incluir contexto temporal
function enhancedHash(text, state) {
  const baseHash = simpleHash(text);
  const stateHash = simpleHash(state || '');
  return simpleHash(baseHash + stateHash + Math.floor(Date.now() / 1000)); // Hash por segundo
}

// Añadir debounce más agresivo
let lastSentHash = '';
let lastSentTime = 0;
const DEBOUNCE_MS = 1000; // 1 segundo mínimo entre envíos

if (currentHash !== lastTextHash && currentHash !== lastSentHash) {
  const now = Date.now();
  if (now - lastSentTime < DEBOUNCE_MS) {
    console.log('[QWEN Capture] ⏸️ Debounce activo, esperando...');
    return;
  }
  lastSentHash = currentHash;
  lastSentTime = now;
  // ... enviar
}
```

### 4. Mejorar Detección de Código

**Archivo**: `[main.js](main.js)` (líneas 2107-2144)

**Problema**: Código mezclado con texto no se detecta bien.

**Solución**:
- Mejorar `isExecutingCode()` para detectar bloques de código más específicos
- Separar código de texto en el Observer
- Enviar código por canal separado

```javascript
// Mejorar isExecutingCode()
function isExecutingCode() {
  // Buscar bloques de código con indicadores de ejecución
  const codeBlocks = document.querySelectorAll('pre code, [class*="code-block"], [class*="syntax-highlight"]');
  if (codeBlocks.length > 0) {
    const hasExecution = Array.from(codeBlocks).some(block => {
      const text = block.textContent || '';
      const parent = block.closest('pre, div, section');
      const parentText = parent ? parent.textContent : '';
      
      // Indicadores más específicos
      return text.includes('>>>') || text.includes('$') || 
             text.includes('Running') || text.includes('Executing') ||
             text.includes('Output:') || text.includes('Result:') ||
             parentText.includes('Ejecutando') || parentText.includes('Running');
    });
    if (hasExecution) return true;
  }
  
  // Buscar en el texto del mensaje
  const assistantMessages = document.querySelectorAll('[data-role="assistant"], [class*="assistant"]');
  for (const msg of assistantMessages) {
    const text = msg.textContent || '';
    if (text.match(/```[\s\S]*?```/) && (text.includes('>>>') || text.includes('$'))) {
      return true;
    }
  }
  
  return false;
}
```

### 5. Añadir Botones: Compartir, Regenerar, Copiar

**Archivo**: `[studiolab-final-v2.html](studiolab-final-v2.html)` (líneas 3407-3560)

**Solución**:
- Añadir botones en el mensaje de QWEN cuando se completa
- Implementar handlers para cada botón
- Integrar con IPC para acciones

```javascript
// En el listener de QWEN (línea 3534), cuando type === 'complete'
if (data.type === 'complete') {
  const msgEl = document.querySelector('.qwen-streaming-message');
  if (msgEl) {
    msgEl.classList.remove('qwen-streaming-message');
    
    // Añadir botones de acción (según plan)
    const contentEl = msgEl.querySelector('.qwen-response-content');
    if (contentEl && !contentEl.querySelector('.qwen-action-buttons')) {
      const actionButtons = document.createElement('div');
      actionButtons.className = 'qwen-action-buttons';
      actionButtons.innerHTML = `
        <button class="qwen-action-btn" onclick="qwenCopyMessage(this)" title="Copiar">
          <span>📋</span>
        </button>
        <button class="qwen-action-btn" onclick="qwenRegenerateMessage(this)" title="Regenerar">
          <span>🔄</span>
        </button>
        <button class="qwen-action-btn" onclick="qwenShareMessage(this)" title="Compartir">
          <span>📤</span>
        </button>
      `;
      contentEl.appendChild(actionButtons);
    }
    
    // ... resto del código existente
  }
}

// Funciones para los botones
function qwenCopyMessage(btn) {
  const msgEl = btn.closest('.message-row');
  const text = msgEl.querySelector('.qwen-response-content').textContent;
  navigator.clipboard.writeText(text);
  // Feedback visual
}

function qwenRegenerateMessage(btn) {
  // Reenviar último mensaje del usuario a QWEN
  const lastUserMessage = getLastUserMessage();
  if (lastUserMessage) {
    window.sandraAPI?.sendToQWEN?.(lastUserMessage);
  }
}

function qwenShareMessage(btn) {
  // Implementar compartir (Web Share API o copiar link)
  const msgEl = btn.closest('.message-row');
  const text = msgEl.querySelector('.qwen-response-content').textContent;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    // Fallback: copiar
    navigator.clipboard.writeText(text);
  }
}
```

## Archivos a Modificar

1. **`main.js`**:
   - Líneas 1481-1491: Deshabilitar interacción del BrowserView
   - Líneas 2283-2430: Fix primer saludo y respuestas dobles
   - Líneas 2107-2144: Mejorar detección de código

2. **`studiolab-final-v2.html`**:
   - Líneas 3534-3553: Añadir botones de acción
   - Añadir funciones para los botones
   - Añadir estilos CSS para los botones

## Flujo Mejorado

```
BrowserView creado
    ↓
Deshabilitar interacción (setIgnoreMouseEvents)
    ↓
Mantener siempre visible cuando QWEN activo
    ↓
Observer detecta cambio
    ↓
¿Es código? → Canal 'code'
¿Es texto? → Canal 'text'
    ↓
Validar idempotencia mejorada
    ↓
Enviar respuesta
    ↓
Añadir botones (copiar, regenerar, compartir)
```

