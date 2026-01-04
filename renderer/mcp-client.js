/**
 * Cliente MCP para aplicación de escritorio
 * Conecta con el servidor MCP en Render: https://pwa-imbf.onrender.com
 */

class MCPClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'https://pwa-imbf.onrender.com';
    this.wsUrl = config.wsUrl || 'wss://pwa-imbf.onrender.com';
    this.token = config.token || process.env.MCP_TOKEN || null;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
    this.isConnected = false;
    this.messageQueue = [];
    this.eventHandlers = {
      open: [],
      close: [],
      message: [],
      error: []
    };
  }

  /**
   * Conectar al servidor MCP vía WebSocket
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[MCP Client] Ya conectado');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Construir URL WebSocket
        let wsUrl = `${this.wsUrl}`;
        if (this.token) {
          wsUrl += `?token=${encodeURIComponent(this.token)}`;
        }

        console.log('[MCP Client] Conectando a:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = (event) => {
          console.log('[MCP Client] ✅ Conectado al servidor MCP');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Enviar mensajes en cola
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
          }

          this.emit('open', event);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[MCP Client] 📨 Mensaje recibido:', data);
            this.emit('message', data);
          } catch (error) {
            console.error('[MCP Client] Error parseando mensaje:', error);
            this.emit('error', { type: 'parse_error', error });
          }
        };

        this.ws.onerror = (error) => {
          console.error('[MCP Client] ❌ Error WebSocket:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[MCP Client] 🔌 Conexión cerrada:', event.code, event.reason);
          this.isConnected = false;
          this.emit('close', event);

          // Intentar reconectar si no fue un cierre intencional
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[MCP Client] 🔄 Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
          }
        };

      } catch (error) {
        console.error('[MCP Client] Error creando conexión:', error);
        reject(error);
      }
    });
  }

  /**
   * Desconectar del servidor MCP
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Desconexión manual');
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Enviar mensaje al servidor MCP
   */
  send(message) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[MCP Client] No conectado, encolando mensaje');
      this.messageQueue.push(message);
      return false;
    }

    try {
      const jsonMessage = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(jsonMessage);
      console.log('[MCP Client] 📤 Mensaje enviado:', message);
      return true;
    } catch (error) {
      console.error('[MCP Client] Error enviando mensaje:', error);
      return false;
    }
  }

  /**
   * Enviar mensaje de audio (STT)
   */
  sendAudio(audioData, format = 'linear16', sampleRate = 48000) {
    return this.send({
      route: 'conserje',
      action: 'audio',
      payload: {
        audio: audioData,
        format,
        sampleRate
      }
    });
  }

  /**
   * Enviar mensaje de texto
   */
  sendMessage(text, type = 'message') {
    return this.send({
      route: 'conserje',
      action: type,
      payload: {
        text,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Iniciar llamada conversacional
   */
  startCall(sessionId = null) {
    const callMessage = {
      route: 'conserje',
      action: 'message',
      payload: {
        type: 'ready',
        sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
    return this.send(callMessage);
  }

  /**
   * Reanudar sesión
   */
  resumeSession(sessionId) {
    return this.send({
      route: 'conserje',
      action: 'message',
      payload: {
        type: 'resume_session',
        sessionId
      }
    });
  }

  /**
   * Registrar manejador de eventos
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  /**
   * Remover manejador de eventos
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  /**
   * Emitir evento
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MCP Client] Error en handler de ${event}:`, error);
        }
      });
    }
  }

  /**
   * Verificar estado de conexión
   */
  getStatus() {
    return {
      connected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      serverUrl: this.serverUrl,
      wsUrl: this.wsUrl,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Exportar para uso en Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MCPClient;
}

// Exportar para uso en navegador (window)
if (typeof window !== 'undefined') {
  window.MCPClient = MCPClient;
}
