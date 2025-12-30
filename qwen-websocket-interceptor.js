/**
 * ============================================================================
 * QWEN WEBSOCKET INTERCEPTOR - Sistema de Captura en Bloque
 * ============================================================================
 * 
 * Este módulo intercepta la comunicación WebSocket de QWEN para capturar
 * respuestas COMPLETAS en bloque, eliminando el problema del DOM scraping
 * que capturaba letra por letra y mezclaba UI con contenido.
 * 
 * Autor: Opus (Claude) para Cley
 * Fecha: 2025-12-30
 * 
 * USO:
 *   const { setupQwenWebSocketInterceptor, stopQwenInterceptor } = require('./qwen-websocket-interceptor');
 *   setupQwenWebSocketInterceptor(qwenBrowserView, mainWindow);
 * 
 * ============================================================================
 */

// Buffer para acumular respuestas streaming
let qwenResponseBuffer = '';
let qwenDebuggerAttached = false;
let currentBrowserView = null;
let currentMainWindow = null;

/**
 * Configura el interceptor de WebSocket usando Chrome DevTools Protocol
 * @param {BrowserView} browserView - El BrowserView de QWEN
 * @param {BrowserWindow} mainWindow - La ventana principal de Electron
 */
async function setupQwenWebSocketInterceptor(browserView, mainWindow) {
  if (!browserView || browserView.webContents.isDestroyed()) {
    console.error('[QWEN-WS] ❌ BrowserView no disponible');
    return { success: false, error: 'BrowserView no disponible' };
  }

  currentBrowserView = browserView;
  currentMainWindow = mainWindow;

  try {
    // Attach debugger si no está ya conectado
    if (!qwenDebuggerAttached) {
      await browserView.webContents.debugger.attach('1.3');
      qwenDebuggerAttached = true;
      console.log('[QWEN-WS] ✅ Debugger attached (CDP 1.3)');
    }

    // Habilitar captura de red
    await browserView.webContents.debugger.sendCommand('Network.enable');
    console.log('[QWEN-WS] ✅ Network.enable activado');

    // Configurar listener para eventos del debugger
    browserView.webContents.debugger.on('message', handleDebuggerMessage);

    console.log('[QWEN-WS] ✅ Interceptor WebSocket ACTIVO');
    console.log('[QWEN-WS] 📡 Escuchando WebSocket frames de QWEN...');

    return { success: true, message: 'Interceptor WebSocket activo' };

  } catch (err) {
    console.error('[QWEN-WS] ❌ Error configurando interceptor:', err.message);
    
    // Si el debugger ya estaba attached, no es un error crítico
    if (err.message.includes('Another debugger is already attached')) {
      console.log('[QWEN-WS] ⚠️ Debugger ya estaba attached, continuando...');
      qwenDebuggerAttached = true;
      return { success: true, message: 'Debugger ya activo' };
    }
    
    return { success: false, error: err.message };
  }
}

/**
 * Maneja los mensajes del Chrome DevTools Protocol
 */
function handleDebuggerMessage(event, method, params) {
  try {
    // ============ WEBSOCKET FRAMES ============
    if (method === 'Network.webSocketFrameReceived') {
      handleWebSocketFrame(params, 'received');
    }
    
    if (method === 'Network.webSocketFrameSent') {
      handleWebSocketFrame(params, 'sent');
    }

    // ============ FETCH/XHR RESPONSES (backup) ============
    if (method === 'Network.responseReceived') {
      const url = params.response?.url || '';
      if (url.includes('qwenlm.ai') && url.includes('/api')) {
        console.log('[QWEN-WS] 📥 HTTP Response:', url.substring(0, 80));
      }
    }

  } catch (err) {
    // Silenciar errores de parsing para no llenar la consola
  }
}

/**
 * Procesa un frame WebSocket
 */
function handleWebSocketFrame(params, direction) {
  try {
    const payloadData = params.response?.payloadData;
    if (!payloadData) return;

    // Log de diagnóstico (solo para frames no vacíos)
    if (payloadData.length > 2) {
      console.log(`[QWEN-WS] ${direction === 'received' ? '📥' : '📤'} Frame (${payloadData.length} bytes)`);
    }

    // Intentar parsear como JSON
    try {
      const data = JSON.parse(payloadData);
      
      // ============ FORMATO QWEN STREAMING ============
      // QWEN usa formato similar a OpenAI: { delta: { content: "..." }, done: true/false }
      
      if (data.delta?.content) {
        // Acumular contenido delta
        qwenResponseBuffer += data.delta.content;
        console.log('[QWEN-WS] 📝 Delta acumulado:', data.delta.content.substring(0, 30) + '...');
      }

      // Verificar si es el mensaje final
      if (data.done === true || data.finish_reason === 'stop' || data.choices?.[0]?.finish_reason === 'stop') {
        // ¡MENSAJE COMPLETO!
        const fullResponse = qwenResponseBuffer;
        qwenResponseBuffer = ''; // Reset buffer
        
        console.log('[QWEN-WS] ✅ RESPUESTA COMPLETA:', fullResponse.length, 'caracteres');
        
        // Detectar si contiene código
        const codeInfo = detectCodeBlocks(fullResponse);
        
        // Enviar a la ventana principal
        if (currentMainWindow && !currentMainWindow.isDestroyed()) {
          currentMainWindow.webContents.send('qwen:response', {
            type: codeInfo.hasCode ? 'code' : 'text',
            content: fullResponse,
            state: 'complete',
            stream: false,
            isCode: codeInfo.hasCode,
            codeBlocks: codeInfo.blocks,
            source: 'websocket-interceptor'
          });
          
          console.log('[QWEN-WS] 📤 Enviado a renderer:', {
            length: fullResponse.length,
            hasCode: codeInfo.hasCode,
            codeBlocksCount: codeInfo.blocks.length
          });
        }
      }

      // ============ OTROS FORMATOS POSIBLES ============
      
      // Formato alternativo: { message: { content: "..." } }
      if (data.message?.content && !data.delta) {
        const content = data.message.content;
        console.log('[QWEN-WS] 📝 Mensaje directo:', content.substring(0, 50) + '...');
        
        const codeInfo = detectCodeBlocks(content);
        
        if (currentMainWindow && !currentMainWindow.isDestroyed()) {
          currentMainWindow.webContents.send('qwen:response', {
            type: codeInfo.hasCode ? 'code' : 'text',
            content: content,
            state: 'complete',
            stream: false,
            isCode: codeInfo.hasCode,
            codeBlocks: codeInfo.blocks,
            source: 'websocket-interceptor'
          });
        }
      }

      // Formato: { text: "..." } o { output: { text: "..." } }
      if (data.text || data.output?.text) {
        const content = data.text || data.output.text;
        console.log('[QWEN-WS] 📝 Texto directo:', content.substring(0, 50) + '...');
        
        const codeInfo = detectCodeBlocks(content);
        
        if (currentMainWindow && !currentMainWindow.isDestroyed()) {
          currentMainWindow.webContents.send('qwen:response', {
            type: codeInfo.hasCode ? 'code' : 'text',
            content: content,
            state: 'complete',
            stream: false,
            isCode: codeInfo.hasCode,
            codeBlocks: codeInfo.blocks,
            source: 'websocket-interceptor'
          });
        }
      }

    } catch (parseErr) {
      // No es JSON válido, podría ser texto plano
      if (payloadData.length > 10 && !payloadData.startsWith('{') && !payloadData.startsWith('[')) {
        console.log('[QWEN-WS] 📝 Texto plano:', payloadData.substring(0, 50));
      }
    }

  } catch (err) {
    console.error('[QWEN-WS] ⚠️ Error procesando frame:', err.message);
  }
}

/**
 * Detecta bloques de código en el texto
 */
function detectCodeBlocks(text) {
  if (!text) return { hasCode: false, blocks: [] };
  
  const blocks = [];
  
  // Detectar bloques markdown ```lang ... ```
  const markdownPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = markdownPattern.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2],
      format: 'markdown'
    });
  }
  
  // Detectar código inline `code`
  const inlinePattern = /`([^`]+)`/g;
  while ((match = inlinePattern.exec(text)) !== null) {
    if (match[1].length > 5) { // Solo código significativo
      blocks.push({
        language: 'inline',
        code: match[1],
        format: 'inline'
      });
    }
  }
  
  // Detectar por patrones de lenguaje
  const hasCode = blocks.length > 0 || 
    /\b(function|const|let|var|class|def|import|from|print\(|console\.log|if\s*\(|for\s*\(|while\s*\()\b/.test(text) ||
    /\b(Get-|Set-|New-|Write-Host|Write-Output|\$[A-Za-z])\b/.test(text);
  
  return { hasCode, blocks };
}

/**
 * Detiene el interceptor y limpia recursos
 */
function stopQwenInterceptor() {
  try {
    if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && qwenDebuggerAttached) {
      currentBrowserView.webContents.debugger.removeAllListeners('message');
      
      try {
        currentBrowserView.webContents.debugger.detach();
      } catch (e) {
        // Ignorar si ya estaba detached
      }
      
      qwenDebuggerAttached = false;
      console.log('[QWEN-WS] ✅ Interceptor detenido');
    }
    
    // Limpiar referencias
    currentBrowserView = null;
    currentMainWindow = null;
    qwenResponseBuffer = '';
    
  } catch (err) {
    console.error('[QWEN-WS] ⚠️ Error deteniendo interceptor:', err.message);
  }
}

/**
 * Verifica si el interceptor está activo
 */
function isInterceptorActive() {
  return qwenDebuggerAttached && currentBrowserView && !currentBrowserView.webContents.isDestroyed();
}

// Exportar funciones
module.exports = {
  setupQwenWebSocketInterceptor,
  stopQwenInterceptor,
  isInterceptorActive
};
