// ============================================================================
// AUTO ORCHESTRATOR - Multi-Agent Consensus System
// ============================================================================
// Orquesta consultas paralelas a múltiples modelos de IA y sintetiza
// la mejor respuesta basada en pesos y análisis de calidad

// Note: Using native fetch API (available in Node 18+)

class AutoOrchestrator {
  constructor() {
    this.activeQueries = new Map();
    // Pesos para cada modelo (basados en calidad general)
    this.weights = {
      chatgpt: 0.25,      // ChatGPT Plus (mejor para código)
      qwen: 0.20,         // QWEN (versátil)
      gemini: 0.20,       // Gemini (multimodal)
      deepseek: 0.15,     // DeepSeek (especializado)
      groq: 0.10,         // Groq (rápido, gratis)
      kimi: 0.10          // Kimi (chino native)
    };

    // Configuración de APIs gratuitas
    this.groqApiKey = process.env.GROQ_API_KEY;

    console.log('[AUTO] ✅ Auto Orchestrator inicializado');
  }

  /**
   * Consulta central que coordina todos los modelos
   * @param {string} userMessage - Mensaje del usuario
   * @param {MCPClient} mcpClient - Cliente MCP para proposals
   * @param {AIModelsManager} aiModels - Manager de modelos embebidos
   * @param {BrowserWindow} mainWindow - Ventana para comunicación
   * @returns {Promise<{synthesized: string, confidence: number, modelResponses: object}>}
   */
  async query(userMessage, mcpClient, aiModels, mainWindow) {
    const queryId = `query_${Date.now()}`;
    console.log(`[AUTO] 🚀 Iniciando consulta multi-modelo (ID: ${queryId})...`);

    // Notificar al renderer que se inició
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto:queryStarted', { queryId, message: userMessage });
    }

    const responses = {};
    const startTime = Date.now();

    // PARALLELIZAR: Enviar a todos los modelos simultáneamente
    const queryPromises = [
      this._queryEmbeddedModel('chatgpt', userMessage, aiModels, mainWindow),
      this._queryEmbeddedModel('qwen', userMessage, aiModels, mainWindow),
      this._queryEmbeddedModel('gemini', userMessage, aiModels, mainWindow),
      this._queryEmbeddedModel('deepseek', userMessage, aiModels, mainWindow),
      this._queryGroqAPI(userMessage),
      this._queryKimiAPI(userMessage)
    ];

    // Esperar a todas con Promise.allSettled para que una falla no bloquee las otras
    const results = await Promise.allSettled(queryPromises);

    // Procesar resultados
    const modelNames = ['chatgpt', 'qwen', 'gemini', 'deepseek', 'groq', 'kimi'];
    const validResponses = [];

    results.forEach((result, index) => {
      const modelName = modelNames[index];
      if (result.status === 'fulfilled' && result.value) {
        responses[modelName] = result.value.response;
        validResponses.push({
          model: modelName,
          response: result.value.response,
          quality: result.value.quality || 0.5,
          weight: this.weights[modelName]
        });
        console.log(`[AUTO] ✅ ${modelName}: ${result.value.response.substring(0, 50)}...`);
      } else {
        console.log(`[AUTO] ⚠️ ${modelName}: Error o timeout`);
        responses[modelName] = null;
      }
    });

    // Sintetizar respuesta
    const synthesized = this._synthesizeResponses(validResponses);
    const confidence = this._calculateConfidence(validResponses);
    const duration = Date.now() - startTime;

    console.log(`[AUTO] 🧠 Síntesis completada en ${duration}ms (confianza: ${confidence.toFixed(2)})`);

    // Crear propuesta para MCP
    const proposal = {
      project: 'current-project',
      agent: 'studiolab-auto',
      title: `AUTO Response: ${userMessage.substring(0, 50)}...`,
      description: `Multi-modelo consensus response synthesized from ${validResponses.length} models`,
      changes: {
        synthesized_response: synthesized,
        model_breakdown: Object.keys(responses).reduce((acc, model) => {
          acc[model] = responses[model] ? responses[model].substring(0, 200) : null;
          return acc;
        }, {})
      },
      reasoning: `Synthesized from ${validResponses.length} parallel model queries. Average confidence: ${confidence.toFixed(2)}. Model weights: ${JSON.stringify(this.weights)}`
    };

    // Enviar propuesta al MCP Universal
    if (mcpClient && mcpClient.isConnected) {
      try {
        await mcpClient.sendProposal(proposal);
        console.log(`[AUTO] 📤 Propuesta enviada al MCP Universal`);
      } catch (error) {
        console.error(`[AUTO] ⚠️ Error enviando propuesta al MCP:`, error.message);
      }
    }

    // Notificar al renderer que se completó
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('auto:queryCompleted', {
        queryId,
        synthesized,
        confidence,
        modelResponses: responses,
        duration
      });
    }

    return {
      synthesized,
      confidence,
      modelResponses: responses,
      validResponseCount: validResponses.length,
      duration
    };
  }

  /**
   * Consultar modelo embebido (BrowserView)
   * Nota: Esta es una aproximación simplificada. En la práctica,
   * se necesitaría interceptar respuestas del BrowserView con callbacks
   */
  async _queryEmbeddedModel(modelId, message, aiModels, mainWindow) {
    return new Promise((resolve) => {
      try {
        // Enviar mensaje al modelo
        aiModels.sendMessage(modelId, message).catch(error => {
          console.error(`[AUTO] Error enviando a ${modelId}:`, error.message);
          resolve(null);
        });

        // Registrar callback para la respuesta (timeout después de 30 segundos)
        const timeoutId = setTimeout(() => {
          console.warn(`[AUTO] ⏱️ Timeout para ${modelId}`);
          resolve({
            response: `[Timeout esperando respuesta de ${modelId}]`,
            quality: 0.1
          });
        }, 30000);

        // Interceptar respuesta cuando el modelo responda
        aiModels.onResponse(modelId, (responseText) => {
          clearTimeout(timeoutId);
          console.log(`[AUTO] 📥 Respuesta de ${modelId} interceptada`);
          resolve({
            response: responseText,
            quality: this._calculateQuality(responseText)
          });
        });

      } catch (error) {
        console.error(`[AUTO] Error en _queryEmbeddedModel(${modelId}):`, error);
        resolve(null);
      }
    });
  }

  /**
   * Consultar API de Groq (gratis, sin límite de requests)
   */
  async _queryGroqAPI(message) {
    try {
      if (!this.groqApiKey) {
        console.warn('[AUTO] ⚠️ GROQ_API_KEY no configurado');
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768', // Modelo más rápido y capaz
            messages: [
              { role: 'system', content: 'You are a helpful assistant. Provide concise, accurate responses.' },
              { role: 'user', content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '';
      console.log('[AUTO] ✅ Respuesta Groq obtenida');

      return {
        response: responseText,
        quality: this._calculateQuality(responseText)
      };
    } catch (error) {
      console.error('[AUTO] ❌ Error en Groq API:', error.message);
      return null;
    }
  }

  /**
   * Consultar API de Kimi K2 (gratis en versión pública)
   * Nota: Kimi K2 es un modelo chino; puede requerir proxy
   */
  async _queryKimiAPI(message) {
    try {
      // Kimi K2 no tiene API pública disponible en este momento
      // Se puede usar como BrowserView en: https://kimi.moonshot.cn/
      // Por ahora, retornamos null y se intenta como BrowserView separado
      console.log('[AUTO] ℹ️ Kimi K2 no tiene API pública; se usa como BrowserView');
      return null;
    } catch (error) {
      console.error('[AUTO] Error en Kimi API:', error.message);
      return null;
    }
  }

  /**
   * Sintetizar respuestas de múltiples modelos
   * Algoritmo: Extrae puntos clave de cada respuesta y los combina
   */
  _synthesizeResponses(validResponses) {
    if (validResponses.length === 0) {
      return 'No se pudieron obtener respuestas de ningún modelo.';
    }

    if (validResponses.length === 1) {
      return validResponses[0].response;
    }

    // Algoritmo simplificado de síntesis:
    // 1. Encontrar respuesta más confiable (mejor quality score)
    // 2. Complementar con puntos únicos de otras respuestas

    const sorted = validResponses.sort((a, b) =>
      (b.quality * b.weight) - (a.quality * a.weight)
    );

    const primary = sorted[0].response;
    const secondaryPoints = sorted
      .slice(1, 3)
      .filter(r => r.quality > 0.3)
      .map(r => `\n[${r.model.toUpperCase()}]: ${r.response.substring(0, 150)}...`)
      .join('');

    return `${primary}${secondaryPoints ? '\n\n---\nPuntos adicionales:' + secondaryPoints : ''}`;
  }

  /**
   * Calcular confianza general de la síntesis
   */
  _calculateConfidence(validResponses) {
    if (validResponses.length === 0) return 0;

    const avgQuality = validResponses.reduce((sum, r) => sum + r.quality, 0) / validResponses.length;
    const responseCount = validResponses.length;
    const countScore = Math.min(responseCount / 6, 1.0); // Max 6 modelos

    return (avgQuality * 0.6) + (countScore * 0.4);
  }

  /**
   * Calcular calidad de una respuesta individual
   * Basado en: longitud, presencia de código, estructura, etc.
   */
  _calculateQuality(response) {
    if (!response || response.length === 0) return 0;

    let quality = 0.5; // Base

    // Favor respuestas más detalladas
    if (response.length > 200) quality += 0.2;
    if (response.length > 500) quality += 0.1;

    // Favor respuestas con código
    if (response.includes('```') || response.includes('function ') || response.includes('class ')) {
      quality += 0.15;
    }

    // Penalizar respuestas genéricas
    if (response.includes('[Timeout') || response.includes('[Error')) {
      quality = 0.1;
    }

    return Math.min(quality, 1.0);
  }

  /**
   * Obtener estado actual de consultas activas
   */
  getActiveQueries() {
    return Array.from(this.activeQueries.entries()).map(([id, data]) => ({
      id,
      startTime: data.startTime,
      duration: Date.now() - data.startTime,
      status: data.status
    }));
  }

  /**
   * Cancelar una consulta activa
   */
  cancelQuery(queryId) {
    if (this.activeQueries.has(queryId)) {
      this.activeQueries.delete(queryId);
      console.log(`[AUTO] ❌ Consulta ${queryId} cancelada`);
      return true;
    }
    return false;
  }
}

module.exports = { AutoOrchestrator };
