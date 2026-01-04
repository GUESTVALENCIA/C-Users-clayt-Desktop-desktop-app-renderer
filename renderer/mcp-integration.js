/**
 * Integración MCP para aplicación de escritorio
 * Conecta la aplicación con el servidor MCP en Render y gestiona llamadas conversacionales
 */

// Cargar MCPClient (soporta tanto Node.js como navegador)
let MCPClient;
if (typeof require !== 'undefined') {
  MCPClient = require('./mcp-client.js');
} else if (typeof window !== 'undefined' && window.MCPClient) {
  MCPClient = window.MCPClient;
} else {
  throw new Error('MCPClient no disponible. Asegúrate de cargar mcp-client.js primero.');
}

class MCPIntegration {
  constructor() {
    this.client = null;
    this.sessionId = null;
    this.isInitialized = false;
  }

  /**
   * Inicializar cliente MCP
   */
  async initialize(config = {}) {
    if (this.isInitialized) {
      console.log('[MCP Integration] Ya inicializado');
      return;
    }

    try {
      // Configuración del cliente MCP
      const mcpConfig = {
        serverUrl: config.serverUrl || process.env.MCP_SERVER_URL || 'https://pwa-imbf.onrender.com',
        wsUrl: config.wsUrl || process.env.MCP_WS_URL || 'wss://pwa-imbf.onrender.com',
        token: config.token || process.env.MCP_TOKEN || null
      };

      console.log('[MCP Integration] Inicializando cliente MCP...', mcpConfig);

      this.client = new MCPClient(mcpConfig);

      // Registrar manejadores de eventos
      this.setupEventHandlers();

      // Conectar al servidor
      await this.client.connect();

      this.isInitialized = true;
      console.log('[MCP Integration] ✅ Cliente MCP inicializado y conectado');

      return this.client;
    } catch (error) {
      console.error('[MCP Integration] ❌ Error inicializando:', error);
      throw error;
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  setupEventHandlers() {
    // Evento: Conexión abierta
    this.client.on('open', () => {
      console.log('[MCP Integration] Conexión establecida');
      this.emit('connected');
    });

    // Evento: Mensaje recibido
    this.client.on('message', (data) => {
      this.handleMessage(data);
    });

    // Evento: Error
    this.client.on('error', (error) => {
      console.error('[MCP Integration] Error:', error);
      this.emit('error', error);
    });

    // Evento: Conexión cerrada
    this.client.on('close', () => {
      console.log('[MCP Integration] Conexión cerrada');
      this.emit('disconnected');
    });
  }

  /**
   * Manejar mensajes recibidos del servidor
   */
  handleMessage(data) {
    console.log('[MCP Integration] Mensaje recibido:', data);

    // Procesar según el tipo de mensaje
    if (data.route === 'audio' && data.action === 'tts') {
      // Audio TTS recibido
      this.emit('audio', data.payload);
    } else if (data.route === 'conserje' && data.action === 'message') {
      // Mensaje de texto recibido
      if (data.payload.type === 'transcription_final') {
        this.emit('transcription', data.payload);
      } else if (data.payload.type === 'transcription_interim') {
        this.emit('transcription_interim', data.payload);
      } else {
        this.emit('message', data.payload);
      }
    } else if (data.type === 'connection_established') {
      // Conexión establecida
      this.sessionId = data.sessionId || data.agent_id;
      this.emit('session_established', { sessionId: this.sessionId });
    }
  }

  /**
   * Iniciar llamada conversacional
   */
  async startCall() {
    if (!this.client || !this.isInitialized) {
      await this.initialize();
    }

    // Generar sessionId si no existe
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    console.log('[MCP Integration] Iniciando llamada con sessionId:', this.sessionId);
    this.client.startCall(this.sessionId);
  }

  /**
   * Enviar audio al servidor (STT)
   */
  sendAudio(audioData, format = 'linear16', sampleRate = 48000) {
    if (!this.client || !this.isInitialized) {
      console.warn('[MCP Integration] Cliente no inicializado');
      return false;
    }

    return this.client.sendAudio(audioData, format, sampleRate);
  }

  /**
   * Enviar mensaje de texto
   */
  sendMessage(text) {
    if (!this.client || !this.isInitialized) {
      console.warn('[MCP Integration] Cliente no inicializado');
      return false;
    }

    return this.client.sendMessage(text);
  }

  /**
   * Reanudar sesión existente
   */
  resumeSession(sessionId) {
    if (!this.client || !this.isInitialized) {
      console.warn('[MCP Integration] Cliente no inicializado');
      return false;
    }

    this.sessionId = sessionId;
    return this.client.resumeSession(sessionId);
  }

  /**
   * Desconectar del servidor MCP
   */
  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.isInitialized = false;
      this.sessionId = null;
    }
  }

  /**
   * Obtener estado de la conexión
   */
  getStatus() {
    if (!this.client) {
      return { initialized: false, connected: false };
    }

    return {
      initialized: this.isInitialized,
      ...this.client.getStatus(),
      sessionId: this.sessionId
    };
  }

  /**
   * Sistema de eventos simple
   */
  eventHandlers = {};

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MCP Integration] Error en handler de ${event}:`, error);
        }
      });
    }
  }
}

// Crear instancia global
const mcpIntegration = new MCPIntegration();

// Exportar para uso en Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mcpIntegration;
  module.exports.MCPIntegration = MCPIntegration;
}

// Exportar para uso en navegador (window)
if (typeof window !== 'undefined') {
  window.mcpIntegration = mcpIntegration;
  window.MCPIntegration = MCPIntegration;
}
