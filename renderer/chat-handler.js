/**
 * CHAT HANDLER — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Manejo limpio del chat con:
 * - Envío de mensajes a Sandra/QWEN
 * - Recepción de respuestas
 * - Integración con lienzo
 * - Sin observadores que describan todo el contenido
 * ═══════════════════════════════════════════════════════════════════════════
 */

(() => {
  'use strict';

  // Buscar elementos del chat
  const chatLog = document.getElementById('chatLog') || 
                  document.querySelector('.chat-log') ||
                  document.querySelector('#chatContainer');
  
  const input = document.getElementById('userInput') || 
                document.getElementById('messageInput') ||
                document.querySelector('input[type="text"]');
  
  const sendBtn = document.getElementById('sendBtn') || 
                  document.querySelector('.send-btn');

  if (!chatLog || !input) {
    console.warn('[CHAT] ⚠️ Elementos del chat no encontrados, reintentando...');
    setTimeout(() => {
      // Reintentar después de 1 segundo
      if (document.readyState === 'complete') {
        console.warn('[CHAT] ⚠️ Elementos del chat aún no disponibles');
      }
    }, 1000);
    return;
  }

  // 📝 Añadir mensaje al chat
  function addMsg(text, from = 'you', metadata = {}) {
    const div = document.createElement('div');
    div.className = `msg ${from}`;
    
    // Si es HTML, usar innerHTML, sino textContent
    if (metadata.isHTML) {
      div.innerHTML = text;
    } else {
      div.textContent = text;
    }

    // Añadir timestamp si se solicita
    if (metadata.showTimestamp) {
      const time = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const timeSpan = document.createElement('span');
      timeSpan.className = 'msg-time';
      timeSpan.textContent = ` ${time}`;
      timeSpan.style.opacity = '0.6';
      timeSpan.style.fontSize = '0.85em';
      div.appendChild(timeSpan);
    }

    chatLog.appendChild(div);
    
    // Scroll automático
    chatLog.scrollTop = chatLog.scrollHeight;

    // Notificar a Sandra (opcional)
    if (metadata.notifySandra) {
      notifySandraMessageAdded(from, text);
    }
  }

  // 📤 Enviar mensaje
  function sendMessage() {
    const text = input.value.trim();
    if (!text) {
      console.log('[CHAT] ⏭️ Mensaje vacío, ignorando');
      return;
    }

    // Añadir mensaje del usuario al chat
    addMsg(text, 'you', { showTimestamp: true });

    // Limpiar input
    input.value = '';
    updateSendButton();

    // Construir payload limpio (SOLO texto, sin describir botones ni UI)
    const payload = {
      type: 'chat-message',
      text: text, // Solo el texto, nada más
      timestamp: Date.now(),
      context: 'canvas+chat',
      metadata: {
        hasCanvas: window.canvasAPI ? true : false,
        canvasState: window.canvasAPI ? window.canvasAPI.getState() : null
      }
    };

    // 📡 Enviar a Sandra/QWEN
    console.log('[CHAT] 📤 Enviando mensaje:', text.substring(0, 50) + '...');

    let sent = false;

    // Método 1: window.sandraAPI
    if (window.sandraAPI && typeof window.sandraAPI.sendChat === 'function') {
      window.sandraAPI.sendChat(payload);
      sent = true;
    }

    // Método 2: window.electronAPI
    if (window.electronAPI && typeof window.electronAPI.sendChat === 'function') {
      window.electronAPI.sendChat(payload);
      sent = true;
    }

    // Método 3: window.ipcRenderer
    if (window.ipcRenderer && typeof window.ipcRenderer.send === 'function') {
      window.ipcRenderer.send('sandra:chat', payload);
      sent = true;
    }

    // Método 4: CustomEvent (fallback)
    if (!sent) {
      const event = new CustomEvent('sandra:chat-message', { detail: payload });
      document.dispatchEvent(event);
      console.log('[CHAT] 📢 Enviado vía CustomEvent (fallback)');
    }

    // Mostrar indicador de "pensando"
    showThinkingIndicator();
  }

  // 💭 Mostrar indicador de "pensando"
  function showThinkingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'thinking-indicator';
    indicator.className = 'msg sandra thinking';
    indicator.innerHTML = '<span class="thinking-dots">🤔 Pensando</span>';
    chatLog.appendChild(indicator);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Animación de puntos
    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      const dotsText = '.'.repeat(dots);
      indicator.querySelector('.thinking-dots').textContent = `🤔 Pensando${dotsText}`;
    }, 500);

    // Guardar interval para limpiarlo después
    indicator._thinkingInterval = interval;
  }

  // ✅ Ocultar indicador de "pensando"
  function hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) {
      if (indicator._thinkingInterval) {
        clearInterval(indicator._thinkingInterval);
      }
      indicator.remove();
    }
  }

  // 📥 Recibir respuesta de Sandra/QWEN
  function receiveResponse(text, isStreaming = false) {
    // Ocultar indicador de pensando
    hideThinkingIndicator();

    // Si es streaming, actualizar mensaje existente o crear uno nuevo
    if (isStreaming) {
      let streamingMsg = document.querySelector('.sandra-streaming-message');
      
      if (!streamingMsg) {
        streamingMsg = document.createElement('div');
        streamingMsg.className = 'msg sandra sandra-streaming-message';
        chatLog.appendChild(streamingMsg);
      }

      streamingMsg.innerHTML = text.replace(/\n/g, '<br>');
      chatLog.scrollTop = chatLog.scrollHeight;
    } else {
      // Mensaje completo
      addMsg(text, 'sandra', { 
        showTimestamp: true,
        isHTML: true 
      });

      // Limpiar clase de streaming si existe
      const streamingMsg = document.querySelector('.sandra-streaming-message');
      if (streamingMsg) {
        streamingMsg.classList.remove('sandra-streaming-message');
      }
    }
  }

  // 🔄 Actualizar estado del botón de envío
  function updateSendButton() {
    if (sendBtn) {
      sendBtn.disabled = !input.value.trim();
    }
  }

  // 📡 Notificar a Sandra que se añadió un mensaje (opcional)
  function notifySandraMessageAdded(from, text) {
    // Solo notificar si es necesario para sincronización
    // No enviar el contenido completo, solo metadata
    if (window.sandraAPI && typeof window.sandraAPI.messageAdded === 'function') {
      window.sandraAPI.messageAdded({
        from,
        length: text.length,
        timestamp: Date.now()
      });
    }
  }

  // 🎧 Escuchar respuestas de Sandra/QWEN
  function setupResponseListener() {
    // Listener 1: window.sandraAPI.onResponse
    if (window.sandraAPI && typeof window.sandraAPI.onResponse === 'function') {
      window.sandraAPI.onResponse((data) => {
        if (data.type === 'text' && data.content) {
          receiveResponse(data.content, data.stream || false);
        }
      });
    }

    // Listener 2: CustomEvent
    document.addEventListener('sandra:chat-response', (e) => {
      const { text, streaming } = e.detail;
      receiveResponse(text, streaming);
    });

    // Listener 3: IPC (si está disponible)
    if (window.ipcRenderer) {
      window.ipcRenderer.on('sandra:reply', (event, data) => {
        receiveResponse(data.text || data.content || '', data.streaming || false);
      });
    }
  }

  // ⌨️ Event listeners
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', updateSendButton);

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // Inicializar
  setupResponseListener();
  updateSendButton();

  // 🌐 Exponer API global
  window.chatAPI = {
    send: sendMessage,
    addMsg: addMsg,
    receiveResponse: receiveResponse,
    clear: () => {
      if (chatLog) {
        chatLog.innerHTML = '';
      }
    }
  };

  // Mensaje de bienvenida
  setTimeout(() => {
    addMsg('Hola, Cley ❤️ ¿Qué creamos hoy?', 'sandra', { showTimestamp: false });
  }, 500);

  console.log('[CHAT] ✅ Chat Handler inicializado');
})();

