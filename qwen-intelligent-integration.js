// qwen-intelligent-integration.js - Integración inteligente de Qwen con selección automática de modelos

// Cargar el selector de modelos
const { modelSelector, selectModelForInput, detectInputType } = require('./model-selector');

// Clase principal de integración inteligente
class QwenIntelligentIntegration {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.currentModel = 'qwen2.5:7b';
    this.isConnected = false;
    this.chatHistory = [];
    this.tokenUsage = {};
    
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
            detail: { connected: true, model: this.currentModel }
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

  // Seleccionar modelo inteligentemente basado en la entrada
  selectModelForInput(input, requirements = {}) {
    // Detectar el tipo de entrada
    const inputAnalysis = detectInputType(input);
    
    // Seleccionar modelo basado en el análisis
    const selectedModel = selectModelForInput(input, {
      ...requirements,
      taskType: inputAnalysis.taskType,
      hasImage: inputAnalysis.hasImage
    });
    
    console.log(`🤖 Modelo seleccionado: ${selectedModel.name} (Tarea: ${inputAnalysis.taskType})`);
    
    // Actualizar modelo actual
    this.currentModel = selectedModel.name;
    
    return selectedModel;
  }

  // Enviar mensaje a Qwen con selección inteligente de modelo
  async sendMessage(message, options = {}) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        throw new Error('No hay conexión con Ollama');
      }
    }

    try {
      // Seleccionar modelo inteligentemente
      const selectedModel = this.selectModelForInput(message, options);
      
      // Añadir mensaje del usuario al historial
      this.chatHistory.push({ role: 'user', content: message });
      
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel.name,
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
      
      // Calcular uso de tokens (aproximado)
      const tokensUsed = Math.ceil(assistantResponse.length / 4); // Aproximación grosera
      modelSelector.updateTokenUsage(selectedModel.name, tokensUsed);
      
      // Mantener solo los últimos 20 mensajes para no sobrecargar la memoria
      if (this.chatHistory.length > 20) {
        this.chatHistory = this.chatHistory.slice(-20);
      }
      
      return {
        response: assistantResponse,
        modelUsed: selectedModel.name,
        taskType: detectInputType(message).taskType,
        tokensUsed: tokensUsed
      };
    } catch (error) {
      console.error('Error al comunicarse con Qwen:', error);
      throw error;
    }
  }

  // Enviar mensaje con imagen (si se detecta imagen en el input)
  async sendMessageWithImage(imageData, message = '') {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        throw new Error('No hay conexión con Ollama');
      }
    }

    // Seleccionar modelo de visión
    const visionModel = modelSelector.getVisionModels()[0];
    if (!visionModel) {
      throw new Error('No hay modelos de visión disponibles');
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: visionModel.name,
          prompt: message,
          images: [imageData], // imageData debe ser una cadena base64
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const assistantResponse = data.response;
      
      // Añadir al historial
      this.chatHistory.push({ 
        role: 'user', 
        content: message,
        images: [imageData]
      });
      this.chatHistory.push({ role: 'assistant', content: assistantResponse });
      
      // Calcular uso de tokens
      const tokensUsed = Math.ceil(assistantResponse.length / 4);
      modelSelector.updateTokenUsage(visionModel.name, tokensUsed);
      
      return {
        response: assistantResponse,
        modelUsed: visionModel.name,
        taskType: 'vision',
        tokensUsed: tokensUsed
      };
    } catch (error) {
      console.error('Error al comunicarse con Qwen (imagen):', error);
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

  // Obtener información sobre el uso de tokens
  getTokenUsage() {
    return this.tokenUsage;
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
          model: this.currentModel,
          timestamp: Date.now(),
          tokenUsage: this.tokenUsage
        });
      }
    } catch (error) {
      console.warn('No se pudo guardar contexto:', error);
    }
  }
}

// Inicializar la integración cuando el DOM esté listo
let qwenIntegration = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    qwenIntegration = new QwenIntelligentIntegration();
  });
} else {
  qwenIntegration = new QwenIntelligentIntegration();
}

// Hacer disponible globalmente para otros módulos
window.QwenIntelligentIntegration = QwenIntelligentIntegration;
window.qwenIntegration = qwenIntegration;

// Función para enviar mensaje directamente con selección inteligente
window.sendQwenMessage = async function(message, options = {}) {
  if (!qwenIntegration) {
    qwenIntegration = new QwenIntelligentIntegration();
  }
  
  return await qwenIntegration.sendMessage(message, options);
};

// Función para enviar mensaje con imagen
window.sendQwenMessageWithImage = async function(imageData, message = '') {
  if (!qwenIntegration) {
    qwenIntegration = new QwenIntelligentIntegration();
  }
  
  return await qwenIntegration.sendMessageWithImage(imageData, message);
};

// Función para verificar estado de conexión
window.checkQwenConnection = async function() {
  if (!qwenIntegration) {
    qwenIntegration = new QwenIntelligentIntegration();
  }
  
  return await qwenIntegration.checkConnection();
};

// Función para seleccionar modelo inteligentemente
window.selectModelForInput = function(input, requirements = {}) {
  return qwenIntegration.selectModelForInput(input, requirements);
};

// Función para detectar tipo de entrada
window.detectInputType = function(input) {
  return detectInputType(input);
};

console.log('✅ Integración inteligente de Qwen inicializada');
console.log('✅ Disponible: window.qwenIntegration, window.sendQwenMessage, window.selectModelForInput');

// Exportar para uso en módulos Node.js si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QwenIntelligentIntegration, qwenIntegration };
}