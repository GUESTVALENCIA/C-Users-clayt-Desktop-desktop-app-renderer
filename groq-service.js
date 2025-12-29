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

    // Modelos disponibles en Groq (actualizado 2025)
    this.models = {
      // Modelos de Texto (Alta Velocidad)
      'llama-3.3-70b-versatile': {
        name: 'Llama 3.3 70B',
        description: 'Modelo más potente, versátil para todas las tareas',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 280,
        speedUnit: 'tokens/sec',
        useCase: 'chat, análisis profundo, código complejo',
        modality: 'text',
        reasoning: false
      },
      'llama-3.1-8b-instant': {
        name: 'Llama 3.1 8B Instant',
        description: 'Modelo rápido y ligero para respuestas inmediatas',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 560,
        speedUnit: 'tokens/sec',
        useCase: 'chat rápido, Q&A, asistente',
        modality: 'text',
        reasoning: false
      },
      'openai/gpt-oss-120b': {
        name: 'GPT-OSS 120B',
        description: 'Modelo de razonamiento avanzado de OpenAI',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 500,
        speedUnit: 'tokens/sec',
        useCase: 'razonamiento, análisis complejo',
        modality: 'text',
        reasoning: true
      },
      'openai/gpt-oss-20b': {
        name: 'GPT-OSS 20B',
        description: 'Modelo rápido de razonamiento de OpenAI',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 1000,
        speedUnit: 'tokens/sec',
        useCase: 'razonamiento rápido',
        modality: 'text',
        reasoning: true
      },
      // Modelos de Visión/Multimodal (NUEVOS)
      'meta-llama/llama-4-scout-17b-16e-instruct': {
        name: 'Llama 4 Scout (Visión)',
        description: 'Modelo de visión compacto con 128K contexto',
        maxTokens: 8192,
        contextWindow: 131072,
        costTier: 'preview',
        speed: 'fast',
        speedUnit: 'tokens/sec',
        useCase: 'análisis de imágenes, OCR, descripción visual',
        modality: 'multimodal',
        reasoning: false,
        vision: true,
        maxImages: 5
      },
      'meta-llama/llama-4-maverick-17b-128e-instruct': {
        name: 'Llama 4 Maverick (Visión)',
        description: 'Modelo de visión potente con 128K contexto',
        maxTokens: 8192,
        contextWindow: 131072,
        costTier: 'preview',
        speed: 'fast',
        speedUnit: 'tokens/sec',
        useCase: 'análisis visual avanzado, complejas tareas con imágenes',
        modality: 'multimodal',
        reasoning: true,
        vision: true,
        maxImages: 5
      },
      // Modelos de Audio
      'whisper-large-v3': {
        name: 'Whisper Large V3',
        description: 'Transcripción de audio altamente precisa',
        maxTokens: null,
        contextWindow: null,
        costTier: 'paid',
        speed: 'variable',
        speedUnit: 'per hour',
        useCase: 'transcripción de audio, procesamiento de voz',
        modality: 'audio',
        reasoning: false
      },
      'whisper-large-v3-turbo': {
        name: 'Whisper Large V3 Turbo',
        description: 'Transcripción de audio rápida y eficiente',
        maxTokens: null,
        contextWindow: null,
        costTier: 'paid',
        speed: 'variable',
        speedUnit: 'per hour',
        useCase: 'transcripción rápida de audio',
        modality: 'audio',
        reasoning: false
      },
      // Modelos de Compuesto (Web Search + Code)
      'groq/compound': {
        name: 'Groq Compound',
        description: 'Sistema agentico con búsqueda web y ejecución de código',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 450,
        speedUnit: 'tokens/sec',
        useCase: 'búsqueda web, ejecución de código, tareas agenticas',
        modality: 'text',
        reasoning: false,
        tools: ['web_search', 'code_execution']
      },
      'groq/compound-mini': {
        name: 'Groq Compound Mini',
        description: 'Sistema agentico ligero',
        maxTokens: 8192,
        contextWindow: 8192,
        costTier: 'paid',
        speed: 450,
        speedUnit: 'tokens/sec',
        useCase: 'búsqueda web rápida, código simple',
        modality: 'text',
        reasoning: false,
        tools: ['web_search', 'code_execution']
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
   * Chat Multimodal - Soporta imágenes y texto
   */
  async chatWithVision(textMessage, imageUrls = [], options = {}) {
    if (!this.isAvailable) {
      throw new Error('Groq API no configurada');
    }

    const {
      model = 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature = 0.7,
      maxTokens = 2048,
      systemPrompt = 'Eres un asistente IA útil y profesional que analiza imágenes.'
    } = options;

    // Validar que el modelo soporta visión
    const modelInfo = this.models[model];
    if (!modelInfo || !modelInfo.vision) {
      throw new Error(`El modelo ${model} no soporta visión. Use Llama 4 Scout o Maverick.`);
    }

    // Validar cantidad de imágenes
    if (imageUrls.length > modelInfo.maxImages) {
      throw new Error(`Máximo ${modelInfo.maxImages} imágenes permitidas, se enviaron ${imageUrls.length}`);
    }

    try {
      // Construir contenido con imágenes
      const content = [
        { type: 'text', text: textMessage }
      ];

      // Agregar imágenes
      imageUrls.forEach(url => {
        content.push({
          type: 'image_url',
          image_url: { url }
        });
      });

      const response = await this.makeRequest('POST', '/chat/completions', {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
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
        imagesAnalyzed: imageUrls.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Groq] Error en chat with vision:', error.message);
      return {
        success: false,
        error: error.message,
        model
      };
    }
  }

  /**
   * Análisis Visual de Imagen (con descripción detallada)
   */
  async analyzeImage(imageUrl, analysisType = 'detailed', options = {}) {
    const prompts = {
      detailed: '¿Qué ves en esta imagen? Proporciona una descripción detallada y análisis.',
      ocr: 'Extrae todo el texto visible en esta imagen. Mantén el formato original si es posible.',
      objects: '¿Qué objetos principales ves en esta imagen? Enuméralos y describe cada uno.',
      scene: '¿Qué tipo de escena es esta? Describe la ubicación, contexto y elementos clave.',
      classification: '¿En qué categoría clasificarías esta imagen? (Ej: paisaje, retrato, documento, etc.)'
    };

    const prompt = prompts[analysisType] || prompts.detailed;

    return this.chatWithVision(prompt, [imageUrl], {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens: 1024,
      ...options
    });
  }

  /**
   * Procesamiento Multimodal AUTO - elige el modelo correcto automáticamente
   */
  async autoMultimodal(input, options = {}) {
    // Detectar tipo de input
    const hasImages = input.images && input.images.length > 0;
    const hasAudio = input.audio && input.audio.url;
    const hasText = input.text && input.text.length > 0;

    console.log(`[Groq AUTO] Analizando entrada: texto=${hasText}, imágenes=${hasImages}, audio=${hasAudio}`);

    try {
      // 1. Solo texto
      if (hasText && !hasImages && !hasAudio) {
        // Elegir modelo basado en complejidad del texto
        let model = 'llama-3.1-8b-instant'; // por defecto rápido

        if (input.text.length > 1000 || input.reasoningRequired) {
          model = input.complexReasoning
            ? 'openai/gpt-oss-120b'
            : 'llama-3.3-70b-versatile';
        }

        console.log(`[Groq AUTO] Seleccionado: ${model} (texto)`);
        const result = await this.chat(input.text, { model });
        return {
          ...result,
          selectedModel: model,
          detectedModality: 'text'
        };
      }

      // 2. Visión (imágenes + texto)
      if (hasImages && hasText) {
        const useAdvanced = input.images.length > 2 || input.text.length > 500;
        const model = useAdvanced
          ? 'meta-llama/llama-4-maverick-17b-128e-instruct'
          : 'meta-llama/llama-4-scout-17b-16e-instruct';

        console.log(`[Groq AUTO] Seleccionado: ${model} (visión multimodal)`);
        const result = await this.chatWithVision(input.text, input.images, { model });
        return {
          ...result,
          selectedModel: model,
          detectedModality: 'multimodal'
        };
      }

      throw new Error('Entrada inválida: debe contener texto, imágenes o audio');

    } catch (error) {
      console.error('[Groq AUTO] Error:', error.message);
      return {
        success: false,
        error: error.message,
        detectedModality: 'unknown'
      };
    }
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
        model: 'llama-3.1-8b-instant',
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
