// ============================================================================
// MCP UNIVERSAL CLIENT - WebSocket Streaming
// ============================================================================
// Conecta StudioLab con el servidor MCP universal para sincronización
// en tiempo real con VS Code, Cursor, Antigravity y otros editores

const WebSocket = require('ws');

class MCPClient {
  constructor(serverUrl = 'wss://pwa-imbf.onrender.com') {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectInterval = 5000;
    this.isConnected = false;
  }

  /**
   * Conectar al servidor MCP con autenticación JWT
   * @param {string} authToken - Token JWT para autenticación
   * @returns {Promise<void>}
   */
  connect(authToken) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        this.ws.on('open', () => {
          console.log('[MCP] ✅ Conectado al servidor universal:', this.serverUrl);
          this.isConnected = true;
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const event = JSON.parse(data.toString());
            this.handleEvent(event);
          } catch (error) {
            console.error('[MCP] Error parseando mensaje:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('[MCP] ⚠️ Desconectado, reintentando en', this.reconnectInterval / 1000, 's...');
          this.isConnected = false;
          setTimeout(() => this.connect(authToken), this.reconnectInterval);
        });

        this.ws.on('error', (error) => {
          console.error('[MCP] ❌ Error de WebSocket:', error.message);
          reject(error);
        });
      } catch (error) {
        console.error('[MCP] ❌ Error en construcción:', error);
        reject(error);
      }
    });
  }

  /**
   * Enviar propuesta de cambios al servidor MCP
   * Otros agentes recibirán esta propuesta en tiempo real
   */
  async sendProposal(data) {
    if (!this.isConnected) {
      console.warn('[MCP] No conectado, propuesta no enviada');
      return;
    }

    const payload = {
      type: 'PROPOSAL_CREATED',
      project: data.project || 'default',
      agent: 'studiolab-auto',
      timestamp: Date.now(),
      data: {
        title: data.title || 'Sin título',
        description: data.description || '',
        changes: data.changes || {},
        reasoning: data.reasoning || ''
      }
    };

    this.send(payload);
    console.log('[MCP] 📤 Propuesta enviada:', payload.data.title);
  }

  /**
   * Enviar review de una propuesta
   */
  async sendReview(proposalId, rating, feedback) {
    if (!this.isConnected) {
      console.warn('[MCP] No conectado, review no enviado');
      return;
    }

    this.send({
      type: 'REVIEW_SUBMITTED',
      data: {
        proposalId,
        rating,
        feedback,
        agent: 'studiolab-auto',
        timestamp: Date.now()
      }
    });

    console.log(`[MCP] 📝 Review enviado (${rating}/10)`);
  }

  /**
   * Transmitir progreso de implementación en tiempo real
   * Otros agentes ven exactamente qué está pasando EN ESTE MOMENTO
   */
  streamImplementation(data) {
    if (!this.isConnected) {
      console.warn('[MCP] No conectado, progreso no enviado');
      return;
    }

    this.send({
      type: 'IMPLEMENTATION_PROGRESS',
      data: {
        ...data,
        agent: 'studiolab-auto',
        timestamp: Date.now()
      }
    });
  }

  /**
   * Registrar listener para eventos del servidor
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remover listener
   */
  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Manejar eventos recibidos del servidor
   */
  handleEvent(event) {
    console.log(`[MCP] 📥 Evento recibido:`, event.type);

    // Ejecutar callbacks locales
    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach(cb => {
      try {
        cb(event.data);
      } catch (error) {
        console.error('[MCP] Error en callback:', error);
      }
    });

    // Broadcast a renderer process vía IPC (main → renderer)
    if (global.mainWindow && global.mainWindow.webContents) {
      global.mainWindow.webContents.send('mcp:event', event);
    }
  }

  /**
   * Enviar cualquier payload al servidor
   */
  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[MCP] WebSocket no está abierto');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('[MCP] Error enviando payload:', error);
      return false;
    }
  }

  /**
   * Latido periódico para mantener conexión viva
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * Desconectar del servidor
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
      console.log('[MCP] ✅ Desconectado');
    }
  }
}

module.exports = { MCPClient };
