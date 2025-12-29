const { ipcRenderer } = require('electron');
const path = require('path');

// Núcleo de conexión con Qwen para Sandra IA
class QwenConnectionCore {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.model = 'qwen2.5:7b';
    this.isConnected = false;
    this.chatHistory = [];
    
    // Verificar conexión al inicializar
    this.checkConnection();
  }

  // Verificar si Ollama está disponible
  async checkConnection() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      this.isConnected = response.ok;
      
      if (this.isConnected) {
        console.log('✅ Conexión con Qwen a través de Ollama establecida');
        
        // Emitir evento de conexión exitosa
        if (window && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('qwenConnectionStatus', {
            detail: { connected: true, model: this.model }
          }));
        }
      } else {
        console.log('❌ No se puede conectar con Ollama');
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('Error verificando conexión con Ollama:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Enviar mensaje a Qwen y recibir respuesta
  async sendMessage(message, options = {}) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        throw new Error('No hay conexión con Ollama');
      }
    }

    try {
      // Añadir mensaje del usuario al historial
      this.chatHistory.push({ role: 'user', content: message });
      
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.chatHistory,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2048,
            keep_alive: options.keep_alive || '5m'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const assistantResponse = data.message.content;
      
      // Añadir respuesta del asistente al historial
      this.chatHistory.push({ role: 'assistant', content: assistantResponse });
      
      // Mantener solo los últimos 20 mensajes para no sobrecargar la memoria
      if (this.chatHistory.length > 20) {
        this.chatHistory = this.chatHistory.slice(-20);
      }
      
      return assistantResponse;
    } catch (error) {
      console.error('Error al comunicarse con Qwen:', error);
      throw error;
    }
  }

  // Reiniciar historial de chat
  resetChatHistory() {
    this.chatHistory = [];
  }

  // Obtener modelos disponibles
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Error al obtener modelos: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error obteniendo modelos:', error);
      return [];
    }
  }

  // Cargar contexto desde memoria persistente
  async loadContext() {
    try {
      // Intentar cargar desde el sistema de archivos si está disponible
      if (window && window.sandra && window.sandra.fs) {
        const context = await window.sandra.fs.loadQwenContext();
        if (context && context.chatHistory) {
          this.chatHistory = context.chatHistory;
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar contexto previo:', error);
    }
  }

  // Guardar contexto en memoria persistente
  async saveContext() {
    try {
      // Guardar en el sistema de archivos si está disponible
      if (window && window.sandra && window.sandra.fs) {
        await window.sandra.fs.saveQwenContext({
          chatHistory: this.chatHistory,
          model: this.model,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('No se pudo guardar contexto:', error);
    }
  }
}

// Inicializar la conexión cuando el DOM esté listo
let qwenCore = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    qwenCore = new QwenConnectionCore();
  });
} else {
  qwenCore = new QwenConnectionCore();
}

// Hacer disponible globalmente para otros módulos
window.QwenConnectionCore = QwenConnectionCore;
window.qwenCore = qwenCore;

// Función para enviar mensaje directamente
window.sendQwenMessage = async function(message, options = {}) {
  if (!qwenCore) {
    qwenCore = new QwenConnectionCore();
  }
  
  return await qwenCore.sendMessage(message, options);
};

// Función para verificar estado de conexión
window.checkQwenConnection = async function() {
  if (!qwenCore) {
    qwenCore = new QwenConnectionCore();
  }
  
  return await qwenCore.checkConnection();
};

console.log('✅ Núcleo de conexión con Qwen inicializado');
console.log('✅ Disponible: window.qwenCore, window.sendQwenMessage, window.checkQwenConnection');

// Exportar para uso en módulos Node.js si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QwenConnectionCore };
}