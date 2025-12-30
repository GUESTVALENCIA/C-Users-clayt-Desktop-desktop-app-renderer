/**
 * ============================================================================
 * QWEN NETWORK INTERCEPTOR - Sistema de Captura en Bloque
 * ============================================================================
 * 
 * Este módulo intercepta la comunicación de red de QWEN para capturar
 * respuestas COMPLETAS en bloque. Soporta:
 * - WebSocket
 * - Server-Sent Events (SSE)
 * - Fetch/XHR streaming
 * 
 * Autor: Opus (Claude) para Cley
 * Fecha: 2025-12-30
 * 
 * ============================================================================
 */

// Buffer para acumular respuestas streaming
let qwenResponseBuffer = '';
let qwenDebuggerAttached = false;
let currentBrowserView = null;
let currentMainWindow = null;
let activeRequestIds = new Map(); // Track active streaming requests

/**
 * Configura el interceptor de red usando Chrome DevTools Protocol
 */
async function setupQwenWebSocketInterceptor(browserView, mainWindow) {
  if (!browserView || browserView.webContents.isDestroyed()) {
    console.error('[QWEN-NET] ❌ BrowserView no disponible');
    return { success: false, error: 'BrowserView no disponible' };
  }

  currentBrowserView = browserView;
  currentMainWindow = mainWindow;

  try {
    // Attach debugger si no está ya conectado
    if (!qwenDebuggerAttached) {
      await browserView.webContents.debugger.attach('1.3');
      qwenDebuggerAttached = true;
      console.log('[QWEN-NET] ✅ Debugger attached (CDP 1.3)');
    }

    // Habilitar captura de red completa
    await browserView.webContents.debugger.sendCommand('Network.enable');
    console.log('[QWEN-NET] ✅ Network.enable activado');

    // Configurar listener para eventos del debugger
    browserView.webContents.debugger.on('message', handleDebuggerMessage);

    console.log('[QWEN-NET] ✅ Interceptor de Red ACTIVO');
    console.log('[QWEN-NET] 📡 Escuchando WebSocket + SSE + Fetch de QWEN...');

    return { success: true, message: 'Interceptor de red activo' };

  } catch (err) {
    console.error('[QWEN-NET] ❌ Error configurando interceptor:', err.message);
    
    if (err.message.includes('Another debugger is already attached')) {
      console.log('[QWEN-NET] ⚠️ Debugger ya estaba attached, continuando...');
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
      console.log('[QWEN-NET] 🔌 WebSocket frame recibido');
      handleWebSocketFrame(params, 'received');
    }
    
    if (method === 'Network.webSocketFrameSent') {
      handleWebSocketFrame(params, 'sent');
    }

    // ============ HTTP RESPONSES (SSE/Fetch) ============
    if (method === 'Network.responseReceived') {
      const url = params.response?.url || '';
      const contentType = params.response?.headers?.['content-type'] || '';
      
      // Detectar respuestas de QWEN API
      if (url.includes('qwenlm.ai') || url.includes('qwen')) {
        console.log('[QWEN-NET] 📥 HTTP Response:', url.substring(0, 80));
        console.log('[QWEN-NET] 📋 Content-Type:', contentType);
        
        // Si es SSE o streaming, trackear el requestId
        if (contentType.includes('text/event-stream') || 
            contentType.includes('application/json') ||
            contentType.includes('text/plain')) {
          activeRequestIds.set(params.requestId, {
            url: url,
            contentType: contentType,
            buffer: ''
          });
          console.log('[QWEN-NET] 📡 Tracking request:', params.requestId);
        }
      }
    }

    // ============ DATA RECEIVED (SSE chunks) ============
    if (method === 'Network.dataReceived') {
      if (activeRequestIds.has(params.requestId)) {
        console.log('[QWEN-NET] 📦 Data chunk recibido para request:', params.requestId);
        // Los datos reales vienen en loadingFinished o necesitamos getResponseBody
      }
    }

    // ============ LOADING FINISHED ============
    if (method === 'Network.loadingFinished') {
      if (activeRequestIds.has(params.requestId)) {
        console.log('[QWEN-NET] ✅ Request completado:', params.requestId);
        handleLoadingFinished(params);
      }
    }

    // ============ EVENT SOURCE MESSAGE (SSE) ============
    if (method === 'Network.eventSourceMessageReceived') {
      console.log('[QWEN-NET] 📡 SSE Message:', params.data?.substring(0, 100));
      handleSSEMessage(params);
    }

  } catch (err) {
    console.error('[QWEN-NET] ⚠️ Error en handler:', err.message);
  }
}

/**
 * Maneja cuando una request HTTP termina de cargar
 */
async function handleLoadingFinished(params) {
  const requestInfo = activeRequestIds.get(params.requestId);
  if (!requestInfo) return;

  try {
    // Obtener el body de la respuesta
    const response = await currentBrowserView.webContents.debugger.sendCommand(
      'Network.getResponseBody',
      { requestId: params.requestId }
    );

    if (response && response.body) {
      console.log('[QWEN-NET] 📄 Response body obtenido:', response.body.length, 'bytes');
      processResponseBody(response.body, requestInfo);
    }
  } catch (err) {
    console.log('[QWEN-NET] ⚠️ No se pudo obtener body:', err.message);
  }

  activeRequestIds.delete(params.requestId);
}

/**
 * Procesa el body de una respuesta HTTP
 */
function processResponseBody(body, requestInfo) {
  try {
    // Si es SSE, procesar línea por línea
    if (requestInfo.contentType.includes('text/event-stream')) {
      const lines = body.split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.substring(5).trim();
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta?.content) {
              fullContent += parsed.delta.content;
            } else if (parsed.choices?.[0]?.delta?.content) {
              fullContent += parsed.choices[0].delta.content;
            } else if (parsed.content) {
              fullContent += parsed.content;
            }
          } catch (e) {
            // Puede ser texto plano
            if (data.length > 0 && data !== '[DONE]') {
              fullContent += data;
            }
          }
        }
      }
      
      if (fullContent.length > 0) {
        sendToRenderer(fullContent);
      }
    } 
    // Si es JSON normal
    else if (requestInfo.contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        let content = '';
        
        // Varios formatos posibles de QWEN
        if (parsed.response) content = parsed.response;
        else if (parsed.message?.content) content = parsed.message.content;
        else if (parsed.choices?.[0]?.message?.content) content = parsed.choices[0].message.content;
        else if (parsed.output?.text) content = parsed.output.text;
        else if (parsed.text) content = parsed.text;
        else if (parsed.content) content = parsed.content;
        
        if (content.length > 0) {
          sendToRenderer(content);
        }
      } catch (e) {
        console.log('[QWEN-NET] ⚠️ No es JSON válido');
      }
    }
    // Texto plano
    else if (body.length > 10) {
      sendToRenderer(body);
    }
  } catch (err) {
    console.error('[QWEN-NET] ⚠️ Error procesando body:', err.message);
  }
}

/**
 * Maneja mensajes SSE
 */
function handleSSEMessage(params) {
  try {
    const data = params.data;
    if (!data || data === '[DONE]') return;
    
    const parsed = JSON.parse(data);
    
    if (parsed.delta?.content) {
      qwenResponseBuffer += parsed.delta.content;
    }
    
    if (parsed.done === true || parsed.finish_reason === 'stop') {
      if (qwenResponseBuffer.length > 0) {
        sendToRenderer(qwenResponseBuffer);
        qwenResponseBuffer = '';
      }
    }
  } catch (e) {
    // No es JSON, podría ser texto plano
  }
}

/**
 * Procesa un frame WebSocket
 */
function handleWebSocketFrame(params, direction) {
  try {
    const payloadData = params.response?.payloadData;
    if (!payloadData) return;

    if (payloadData.length > 2) {
      console.log(`[QWEN-NET] ${direction === 'received' ? '📥' : '📤'} WS Frame (${payloadData.length} bytes)`);
    }

    try {
      const data = JSON.parse(payloadData);
      
      if (data.delta?.content) {
        qwenResponseBuffer += data.delta.content;
        console.log('[QWEN-NET] 📝 Delta:', data.delta.content.substring(0, 30));
      }

      if (data.done === true || data.finish_reason === 'stop' || data.choices?.[0]?.finish_reason === 'stop') {
        const fullResponse = qwenResponseBuffer;
        qwenResponseBuffer = '';
        
        if (fullResponse.length > 0) {
          sendToRenderer(fullResponse);
        }
      }

      // Formatos alternativos
      if (data.message?.content && !data.delta) {
        sendToRenderer(data.message.content);
      }
      if (data.text || data.output?.text) {
        sendToRenderer(data.text || data.output.text);
      }

    } catch (parseErr) {
      // No es JSON
    }

  } catch (err) {
    console.error('[QWEN-NET] ⚠️ Error procesando WS frame:', err.message);
  }
}

/**
 * Envía la respuesta al renderer
 */
function sendToRenderer(content) {
  if (!content || content.length === 0) return;
  
  console.log('[QWEN-NET] ✅ RESPUESTA COMPLETA:', content.length, 'caracteres');
  console.log('[QWEN-NET] 📝 Preview:', content.substring(0, 100));
  
  const codeInfo = detectCodeBlocks(content);
  
  if (currentMainWindow && !currentMainWindow.isDestroyed()) {
    currentMainWindow.webContents.send('qwen:response', {
      type: codeInfo.hasCode ? 'code' : 'text',
      content: content,
      state: 'complete',
      stream: false,
      isCode: codeInfo.hasCode,
      codeBlocks: codeInfo.blocks,
      source: 'network-interceptor'
    });
    
    console.log('[QWEN-NET] 📤 Enviado a renderer');
  }
}

/**
 * Detecta bloques de código en el texto
 */
function detectCodeBlocks(text) {
  if (!text) return { hasCode: false, blocks: [] };
  
  const blocks = [];
  const markdownPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = markdownPattern.exec(text)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2],
      format: 'markdown'
    });
  }
  
  const hasCode = blocks.length > 0 || 
    /\b(function|const|let|var|class|def|import|from|print\(|console\.log)\b/.test(text) ||
    /\b(Get-|Set-|New-|Write-Host|\$[A-Za-z])\b/.test(text);
  
  return { hasCode, blocks };
}

/**
 * Detiene el interceptor
 */
function stopQwenInterceptor() {
  try {
    if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && qwenDebuggerAttached) {
      currentBrowserView.webContents.debugger.removeAllListeners('message');
      try {
        currentBrowserView.webContents.debugger.detach();
      } catch (e) {}
      qwenDebuggerAttached = false;
      console.log('[QWEN-NET] ✅ Interceptor detenido');
    }
    
    currentBrowserView = null;
    currentMainWindow = null;
    qwenResponseBuffer = '';
    activeRequestIds.clear();
    
  } catch (err) {
    console.error('[QWEN-NET] ⚠️ Error deteniendo:', err.message);
  }
}

function isInterceptorActive() {
  return qwenDebuggerAttached && currentBrowserView && !currentBrowserView.webContents.isDestroyed();
}

module.exports = {
  setupQwenWebSocketInterceptor,
  stopQwenInterceptor,
  isInterceptorActive
};
