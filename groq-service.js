/**
 * ============================================================================
 * GROQ SERVICE - Integración completa de Groq API (GRATIS + ULTRA RÁPIDO)
 * ============================================================================
 *
 * Groq ofrece:
 * - Modelos LLM ultra rápidos
 * - Tier gratis con límites generosos
 * - Excelente para chat, búsqueda, resumen
 * - API compatible con OpenAI
 */

const https = require('https');

class GroqService {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || process.env.API_KEY_GROQ;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.isAvailable = !!this.apiKey;

    // Modelos disponibles en Groq
    this.models = {
      'mixtral-8x7b-32768': {
        name: 'Mixtral 8x7B',
        description: 'Modelo multimodal rápido, excelente para chat',
        maxTokens: 32768,
        costTier: 'free',
        speed: 'ultra-fast',
        useCase: 'chat, análisis, resumen'
      },
      'llama2-70b-4096': {
        name: 'Llama 2 70B',
        description: 'Modelo grande, perfecto para tareas complejas',
        maxTokens: 4096,
        costTier: 'free',
        speed: 'fast',
        useCase: 'análisis, código, escritura'
      },
      'gemma-7b-it': {
        name: 'Gemma 7B IT',
        description: 'Modelo instruction-tuned, rápido y eficiente',
        maxTokens: 8192,
        costTier: 'free',
        speed: 'ultra-fast',
        useCase: 'instrucciones, Q&A, tareas cortas'
      }
    };

    if (this.isAvailable) {
      console.log('[Groq] ✅ API disponible - Listo para usar');
    } else {
      console.warn('[Groq] ⚠️ API key no configurada');
    }
  }

  /**
   * Hacer request HTTP a Groq API
   */
  async makeRequest(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseURL}${endpoint}`);
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`Groq API Error (${res.statusCode}): ${parsed.error?.message || data}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Chat completions (no streaming)
   */
  async chat(message, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Groq API no configurada');
    }

    const {
      model = 'mixtral-8x7b-32768',
      temperature = 0.7,
      maxTokens = 1024,
      systemPrompt = 'Eres un asistente IA útil y profesional.'
    } = options;

    try {
      const response = await this.makeRequest('POST', '/chat/completions', {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature,
        max_tokens: maxTokens
      });

      return {
        success: true,
        model,
        content: response.choices[0].message.content,
        usage: response.usage,
        finishReason: response.choices[0].finish_reason,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Groq] Error en chat:', error.message);
      return {
        success: false,
        error: error.message,
        model
      };
    }
  }

  /**
   * Chat múltiple (conversación)
   */
  async chatMultiple(messages, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Groq API no configurada');
    }

    const {
      model = 'mixtral-8x7b-32768',
      temperature = 0.7,
      maxTokens = 1024
    } = options;

    try {
      // Asegurar formato correcto de mensajes
      const formattedMessages = messages.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || msg.message || msg
      }));

      const response = await this.makeRequest('POST', '/chat/completions', {
        model,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens
      });

      return {
        success: true,
        model,
        content: response.choices[0].message.content,
        usage: response.usage,
        finishReason: response.choices[0].finish_reason
      };
    } catch (error) {
      console.error('[Groq] Error en chat múltiple:', error.message);
      return {
        success: false,
        error: error.message,
        model
      };
    }
  }

  /**
   * Obtener lista de modelos disponibles
   */
  getAvailableModels() {
    return Object.entries(this.models).map(([id, config]) => ({
      id,
      ...config
    }));
  }

  /**
   * Obtener detalles de un modelo
   */
  getModelInfo(modelId) {
    return this.models[modelId] || null;
  }

  /**
   * Análisis rápido de texto
   */
  async analyzeText(text, analysisType = 'general') {
    const prompts = {
      sentiment: 'Analiza el sentimiento del siguiente texto. Responde solo con: POSITIVO, NEGATIVO o NEUTRAL\n\n',
      summary: 'Resume el siguiente texto en máximo 3 oraciones:\n\n',
      keywords: 'Extrae las 5 palabras clave más importantes del siguiente texto:\n\n',
      language: 'Detecta el idioma del siguiente texto:\n\n',
      general: 'Analiza el siguiente texto:\n\n'
    };

    const prompt = prompts[analysisType] || prompts.general;

    return this.chat(prompt + text, {
      model: 'gemma-7b-it',
      maxTokens: 256
    });
  }

  /**
   * Traducción rápida
   */
  async translate(text, targetLanguage) {
    return this.chat(
      `Traduce el siguiente texto al ${targetLanguage}:\n\n${text}`,
      {
        model: 'gemma-7b-it',
        maxTokens: 512
      }
    );
  }

  /**
   * Generación de código
   */
  async generateCode(description, language = 'javascript') {
    return this.chat(
      `Escribe ${language} para: ${description}\n\nSolo código, sin explicaciones.`,
      {
        model: 'mixtral-8x7b-32768',
        maxTokens: 2048,
        temperature: 0.3
      }
    );
  }

  /**
   * Búsqueda y respuesta
   */
  async searchAndAnswer(query) {
    return this.chat(
      `Responde la siguiente pregunta de forma clara y concisa:\n\n${query}`,
      {
        model: 'mixtral-8x7b-32768',
        maxTokens: 1024
      }
    );
  }

  /**
   * Brainstorming de ideas
   */
  async brainstorm(topic, count = 5) {
    const response = await this.chat(
      `Genera ${count} ideas creativas sobre: ${topic}`,
      {
        model: 'mixtral-8x7b-32768',
        maxTokens: 1024,
        temperature: 0.9
      }
    );

    return response;
  }

  /**
   * Test de conectividad
   */
  async testConnection() {
    if (!this.isAvailable) {
      return {
        available: false,
        error: 'API key no configurada',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.chat('Responde solo con "OK"', {
        maxTokens: 10
      });

      return {
        available: true,
        success: result.success,
        response: result.content,
        models: this.getAvailableModels().length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtener estadísticas de uso
   */
  getStats() {
    return {
      isAvailable: this.isAvailable,
      apiKey: this.isAvailable ? 'configured' : 'not configured',
      baseURL: this.baseURL,
      modelsAvailable: this.getAvailableModels().length,
      models: this.getAvailableModels().map(m => m.id)
    };
  }
}

module.exports = { GroqService };
