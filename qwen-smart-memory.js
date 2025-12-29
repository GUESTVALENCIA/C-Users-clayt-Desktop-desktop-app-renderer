// ============================================
// QWEN Smart Memory - Detección Automática de Información Importante
// Detecta y guarda automáticamente información importante de las conversaciones
// ============================================

const QwenMemoryManager = require('./qwen-memory-manager');

class QwenSmartMemory {
  constructor() {
    this.memory = new QwenMemoryManager();
    this.importantKeywords = [
      'contraseña', 'password', 'api key', 'token', 'secret', 'credencial',
      'decisión', 'decisión importante', 'acuerdo', 'promesa', 'compromiso',
      'proyecto nuevo', 'feature nueva', 'funcionalidad', 'cambio importante',
      'bug crítico', 'error crítico', 'problema importante',
      'deadline', 'fecha límite', 'fecha importante', 'reunión',
      'contacto', 'email importante', 'teléfono', 'dirección',
      'configuración', 'config', 'setting importante',
      'código importante', 'solución', 'fix importante'
    ];
    
    this.patterns = [
      // Patrones de información importante
      /(?:importante|crítico|crucial|esencial|vital|fundamental|clave)/i,
      /(?:decision|decisión|acuerdo|compromiso|promesa)/i,
      /(?:configuración|config|setting)/i,
      /(?:bug|error|problema).*(?:crítico|importante|grave)/i,
      /(?:fecha|deadline|fecha límite)/i,
      /(?:API|key|token|secret|password|contraseña)/i,
      /(?:proyecto|feature|funcionalidad).*(?:nuevo|nueva|importante)/i,
      /(?:contacto|email|teléfono).*(?:importante)/i,
      /(?:código|solución|fix).*(?:importante)/i
    ];
  }

  // Detectar si un mensaje contiene información importante
  detectImportantInformation(message) {
    if (!message || typeof message !== 'string') return null;
    
    const lowerMessage = message.toLowerCase();
    const importance = {
      score: 0,
      keywords: [],
      type: null,
      extract: null
    };
    
    // Verificar keywords
    this.importantKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        importance.score += 2;
        importance.keywords.push(keyword);
      }
    });
    
    // Verificar patrones
    this.patterns.forEach(pattern => {
      if (pattern.test(message)) {
        importance.score += 3;
      }
    });
    
    // Detectar tipos específicos de información
    if (/\b(api[_\s]?key|token|secret|password|contraseña)\s*[=:]\s*[\w\-]+/i.test(message)) {
      importance.type = 'credencial';
      importance.score += 10; // Muy importante
      importance.extract = message.match(/\b(api[_\s]?key|token|secret|password|contraseña)\s*[=:]\s*[\w\-]+/i)?.[0];
    }
    
    if (/\b(decision|decisión|acuerdo|compromiso)\b.*\b(?:sobre|de|sobre|respecto)\b/i.test(message)) {
      importance.type = 'decisión';
      importance.score += 8;
      importance.extract = message.match(/\b(decision|decisión|acuerdo|compromiso)\b.*/i)?.[0];
    }
    
    if (/\b(configuración|config|setting)\b.*\b(?:importante|crítica|clave)\b/i.test(message)) {
      importance.type = 'configuración';
      importance.score += 7;
      importance.extract = message.match(/\b(configuración|config|setting)\b.*/i)?.[0];
    }
    
    if (/\b(fecha|deadline|fecha límite)\b.*\d{1,2}[\/\-]\d{1,2}/i.test(message)) {
      importance.type = 'fecha';
      importance.score += 6;
      importance.extract = message.match(/\b(fecha|deadline|fecha límite)\b.*\d{1,2}[\/\-]\d{1,2}/i)?.[0];
    }
    
    // Si el score es suficiente, es importante
    if (importance.score >= 5) {
      return importance;
    }
    
    return null;
  }

  // Guardar automáticamente información importante
  async autoSaveImportantInfo(message, role = 'assistant') {
    const importance = this.detectImportantInformation(message);
    
    if (!importance) {
      return { saved: false, reason: 'No se detectó información importante' };
    }
    
    try {
      // Extraer el texto relevante (primeros 500 caracteres alrededor de la info importante)
      const extractStart = Math.max(0, message.indexOf(importance.extract || importance.keywords[0]) - 200);
      const extractEnd = Math.min(message.length, extractStart + 500);
      const extractedText = message.substring(extractStart, extractEnd);
      
      // Crear key única basada en tipo y timestamp
      const key = `important_${importance.type || 'info'}_${Date.now()}`;
      const tags = [
        'auto-saved',
        'important',
        importance.type || 'general',
        ...importance.keywords
      ];
      
      // Guardar en memoria
      const result = this.memory.saveCurrentSessionMessage(role, extractedText, {
        topics: tags,
        importance: importance.score,
        type: importance.type,
        extracted: importance.extract
      });
      
      // También guardar en memoria explícita si existe el método
      try {
        if (this.memory.tools && this.memory.tools.memory_store) {
          await this.memory.tools.memory_store({
            key: key,
            value: extractedText,
            tags: tags
          });
        }
      } catch (e) {
        // Si no existe el método, continuar
      }
      
      return {
        saved: true,
        key: key,
        type: importance.type,
        score: importance.score,
        extract: importance.extract,
        tags: tags
      };
      
    } catch (error) {
      console.error('[QWEN Smart Memory] Error guardando info importante:', error);
      return { saved: false, error: error.message };
    }
  }

  // Analizar conversación completa y detectar información importante
  analyzeConversation(conversation) {
    const importantItems = [];
    
    if (!conversation || !conversation.messages) return importantItems;
    
    conversation.messages.forEach(msg => {
      const importance = this.detectImportantInformation(msg.content);
      if (importance) {
        importantItems.push({
          message: msg.content.substring(0, 200),
          role: msg.role,
          importance: importance,
          timestamp: msg.timestamp || new Date().toISOString()
        });
      }
    });
    
    return importantItems;
  }
}

module.exports = QwenSmartMemory;

