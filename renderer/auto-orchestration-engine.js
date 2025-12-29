/**
 * AUTO ORCHESTRATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Motor de orquestación multi-modelo que coordina:
 * - Consultas paralelas a múltiples modelos
 * - Interceptación de respuestas en tiempo real
 * - Síntesis inteligente de resultados
 * - Integración con MCP para proposals y consenso
 * ═══════════════════════════════════════════════════════════════════════════
 */

class AutoOrchestrationEngine {
  constructor() {
    this.activeQueries = new Map();
    this.responses = new Map();
    this.models = {
      embedded: [
        { id: 'chatgpt', name: 'ChatGPT Plus', icon: '🤖', speed: 'balanced' },
        { id: 'qwen', name: 'QWEN 3', icon: '🧠', speed: 'ultra' },
        { id: 'gemini', name: 'Gemini Pro', icon: '✨', speed: 'balanced' },
        { id: 'deepseek', name: 'DeepSeek', icon: '🔍', speed: 'balanced' }
      ],
      api: [
        { id: 'groq-llama3.3', name: 'Llama 3.3 70B', icon: '⚡', speed: 'ultra' },
        { id: 'groq-llama3.1', name: 'Llama 3.1 8B', icon: '🚀', speed: 'ultra' },
        { id: 'groq-qwen3', name: 'Qwen 3 32B', icon: '🎯', speed: 'balanced' }
      ]
    };
  }

  /**
   * Modo MÚLTIPLE: Consultar múltiples modelos en paralelo
   */
  async executeMultipleMode(messageText, options = {}) {
    const queryId = `query_${Date.now()}`;
    console.log(`[AUTO] 🔗 Iniciando modo MÚLTIPLE (ID: ${queryId})`);

    this.activeQueries.set(queryId, {
      message: messageText,
      startTime: Date.now(),
      status: 'executing',
      responses: new Map()
    });

    // Mostrar UI de orquestación
    this.showOrchestrationUI(queryId, messageText);

    try {
      // Realizar consultas paralelas
      const parallelResults = await this.executeParallelQueries(queryId, messageText);

      // Sintetizar respuestas
      const synthesized = await this.synthesizeResponses(queryId, parallelResults);

      // Mostrar resultado final
      this.displaySynthesizedResult(queryId, synthesized);

      // Enviar propuesta al MCP (si está conectado)
      await this.sendProposalToMCP(queryId, messageText, synthesized, parallelResults);

      return {
        success: true,
        queryId,
        synthesized,
        individual: parallelResults
      };

    } catch (error) {
      console.error(`[AUTO] ❌ Error en modo MÚLTIPLE:`, error);
      window.addTerminalLine(`❌ Error en orquestación: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecutar consultas paralelas contra múltiples modelos
   */
  async executeParallelQueries(queryId, messageText) {
    const results = {
      embedded: [],
      api: []
    };

    // Preparar promesas para modelos embebidos
    const embeddedPromises = this.models.embedded.map(model =>
      this.queryEmbeddedModel(queryId, model, messageText)
    );

    // Preparar promesas para APIs
    const apiPromises = this.models.api.map(model =>
      this.queryAPIModel(queryId, model, messageText)
    );

    // Ejecutar TODO en paralelo
    console.log(`[AUTO] 📤 Enviando consultas a ${embeddedPromises.length + apiPromises.length} modelos...`);

    try {
      const embeddedResults = await Promise.allSettled(embeddedPromises);
      const apiResults = await Promise.allSettled(apiPromises);

      results.embedded = embeddedResults.map((r, i) => ({
        model: this.models.embedded[i],
        status: r.status,
        response: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason?.message : null
      }));

      results.api = apiResults.map((r, i) => ({
        model: this.models.api[i],
        status: r.status,
        response: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason?.message : null
      }));

      // Registrar resultados
      this.responses.set(queryId, results);

      // Log resumen
      const successful = [
        ...results.embedded.filter(r => r.status === 'fulfilled'),
        ...results.api.filter(r => r.status === 'fulfilled')
      ];
      console.log(`[AUTO] ✅ ${successful.length} respuestas recibidas`);

      return results;

    } catch (error) {
      console.error('[AUTO] Error en consultas paralelas:', error);
      throw error;
    }
  }

  /**
   * Consultar modelo embebido (BrowserView)
   */
  async queryEmbeddedModel(queryId, model, messageText) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout en ${model.name}`));
      }, 60000); // 60 segundos timeout

      try {
        console.log(`[AUTO] 📨 Enviando a ${model.name}...`);
        window.addTerminalLine(`  📤 → ${model.icon} ${model.name}`);

        // Usar window.aiModels para enviar mensaje
        if (window.aiModels) {
          // Registrar callback para respuesta
          const responseHandler = (data) => {
            if (data.modelId === model.id) {
              clearTimeout(timeout);
              window.aiModels.offResponse(model.id, responseHandler);
              console.log(`[AUTO] 📨 Respuesta de ${model.name} recibida`);
              resolve({
                model: model.id,
                name: model.name,
                response: data.response,
                timestamp: Date.now()
              });
            }
          };

          window.aiModels.onResponse(responseHandler);

          // Enviar mensaje al modelo embebido
          window.aiModels.sendMessage(model.id, messageText)
            .catch(error => {
              clearTimeout(timeout);
              reject(error);
            });
        } else {
          clearTimeout(timeout);
          reject(new Error('window.aiModels no disponible'));
        }

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Consultar modelo API (Groq, OpenAI, etc.)
   */
  async queryAPIModel(queryId, model, messageText) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout en ${model.name}`));
      }, 30000); // 30 segundos timeout

      try {
        console.log(`[AUTO] 🌐 Enviando a API ${model.name}...`);
        window.addTerminalLine(`  📤 → ${model.icon} ${model.name}`);

        // Usar window.electron.ipcRenderer para llamar API
        if (window.electron && window.electron.ipcRenderer) {
          // Determinar proveedor basado en model.id
          let provider = 'groq';
          let modelId = model.id;

          if (model.id.startsWith('groq-')) {
            provider = 'groq';
            // Convertir groq-llama3.3 a llama-3.3-70b-versatile, etc.
            const modelMap = {
              'groq-llama3.3': 'llama-3.3-70b-versatile',
              'groq-llama3.1': 'llama-3.1-8b-instant',
              'groq-qwen3': 'qwen/qwen3-32b'
            };
            modelId = modelMap[model.id] || 'llama-3.3-70b-versatile';
          }

          window.electron.ipcRenderer.invoke('ai:chat', {
            provider,
            model: modelId,
            messages: [
              {
                role: 'user',
                content: messageText
              }
            ]
          }).then(response => {
            clearTimeout(timeout);
            console.log(`[AUTO] 📨 Respuesta de API ${model.name} recibida`);
            resolve({
              model: model.id,
              name: model.name,
              response: response?.content || response?.text || String(response),
              timestamp: Date.now()
            });
          }).catch(error => {
            clearTimeout(timeout);
            reject(error);
          });

        } else {
          clearTimeout(timeout);
          reject(new Error('electron.ipcRenderer no disponible'));
        }

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Sintetizar respuestas de múltiples modelos
   */
  async synthesizeResponses(queryId, results) {
    console.log('[AUTO] 🧠 Sintetizando respuestas...');
    window.addTerminalLine('  🧠 Sintetizando respuestas de múltiples modelos...');

    const successfulResponses = [
      ...results.embedded.filter(r => r.status === 'fulfilled'),
      ...results.api.filter(r => r.status === 'fulfilled')
    ].map(r => r.response);

    if (successfulResponses.length === 0) {
      throw new Error('No se recibieron respuestas válidas');
    }

    // Extraer puntos clave de cada respuesta
    const keyPoints = successfulResponses.map(response => {
      // Tomar primeras 3 líneas como resumen
      const lines = response.split('\n').slice(0, 3).filter(l => l.trim());
      return lines.join(' ');
    });

    // Síntesis simple (en producción usaría un modelo sintetizador)
    const synthesized = {
      summary: `Análisis basado en ${successfulResponses.length} modelos`,
      keyPoints,
      fullResponses: successfulResponses,
      modelsUsed: [
        ...results.embedded.filter(r => r.status === 'fulfilled').map(r => r.model.name),
        ...results.api.filter(r => r.status === 'fulfilled').map(r => r.model.name)
      ],
      timestamp: Date.now(),
      consensus: this.calculateConsensus(keyPoints)
    };

    console.log('[AUTO] ✅ Síntesis completada');
    return synthesized;
  }

  /**
   * Calcular consenso entre respuestas
   */
  calculateConsensus(keyPoints) {
    if (keyPoints.length === 0) return { level: 'none', message: 'Sin respuestas' };
    if (keyPoints.length === 1) return { level: 'single', message: 'Una única respuesta' };

    // Verificar similitud de las primeras líneas
    const firstWords = keyPoints.map(p => p.split(' ')[0]);
    const uniqueWords = new Set(firstWords).size;
    const similarity = 1 - (uniqueWords / firstWords.length);

    if (similarity > 0.7) {
      return { level: 'high', message: `Alto consenso (${Math.round(similarity * 100)}%)` };
    } else if (similarity > 0.4) {
      return { level: 'medium', message: `Consenso moderado (${Math.round(similarity * 100)}%)` };
    } else {
      return { level: 'low', message: `Bajo consenso (${Math.round(similarity * 100)}%)` };
    }
  }

  /**
   * Mostrar UI de orquestación en tiempo real
   */
  showOrchestrationUI(queryId, messageText) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    // Crear panel de orquestación
    const orchestrationPanel = document.createElement('div');
    orchestrationPanel.id = `orchestration-${queryId}`;
    orchestrationPanel.className = 'orchestration-panel';
    orchestrationPanel.innerHTML = `
      <div class="orchestration-header">
        <span>🔗 Orquestación Multi-Modelo</span>
        <button onclick="document.getElementById('orchestration-${queryId}').remove()" style="background: none; border: none; color: #0ff; cursor: pointer;">✕</button>
      </div>
      <div class="orchestration-content">
        <div class="orchestration-query">
          <strong>Consulta:</strong> ${messageText.substring(0, 100)}...
        </div>
        <div class="orchestration-models" id="models-${queryId}">
          <div style="text-align: center; padding: 20px;">⏳ Consultando modelos...</div>
        </div>
      </div>
    `;

    canvas.appendChild(orchestrationPanel);

    // Agregar estilos si no existen
    if (!document.getElementById('orchestration-styles')) {
      const styles = document.createElement('style');
      styles.id = 'orchestration-styles';
      styles.textContent = `
        .orchestration-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 400px;
          background: rgba(0, 20, 40, 0.95);
          border: 2px solid #0ff;
          border-radius: 8px;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
          z-index: 10000;
          font-family: 'JetBrains Mono', monospace;
        }
        .orchestration-header {
          background: rgba(0, 100, 150, 0.5);
          padding: 10px;
          border-bottom: 1px solid #0ff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #0ff;
        }
        .orchestration-content {
          padding: 15px;
          max-height: 400px;
          overflow-y: auto;
        }
        .orchestration-query {
          color: #0f0;
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0, 50, 0, 0.3);
          border-radius: 4px;
        }
        .orchestration-models {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .model-status {
          padding: 10px;
          border-radius: 4px;
          background: rgba(0, 50, 50, 0.3);
          border-left: 3px solid #0ff;
          font-size: 0.9em;
        }
        .model-status.success {
          border-left-color: #0f0;
          color: #0f0;
        }
        .model-status.error {
          border-left-color: #f00;
          color: #f00;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  /**
   * Mostrar resultado sintetizado
   */
  displaySynthesizedResult(queryId, synthesized) {
    const modelsDiv = document.getElementById(`models-${queryId}`);
    if (!modelsDiv) return;

    // Mostrar estado de cada modelo
    const statusHTML = synthesized.modelsUsed
      .map(name => `<div class="model-status success">✅ ${name}</div>`)
      .join('');

    modelsDiv.innerHTML = `
      <div style="color: #0ff; margin-bottom: 10px;">Resultados:</div>
      ${statusHTML}
      <div style="color: ${synthesized.consensus.level === 'high' ? '#0f0' : '#ff0'}; margin-top: 10px; padding: 10px; background: rgba(50, 50, 0, 0.3); border-radius: 4px;">
        🎯 ${synthesized.consensus.message}
      </div>
    `;

    // Log completo
    console.log('[AUTO] 📊 Resultado sintetizado:', synthesized);
  }

  /**
   * Enviar propuesta al MCP
   */
  async sendProposalToMCP(queryId, originalMessage, synthesized, allResponses) {
    if (!window.mcpAPI) {
      console.warn('[AUTO] window.mcpAPI no disponible - saltando envío a MCP');
      return;
    }

    try {
      console.log('[AUTO] 📨 Enviando propuesta al MCP Universal...');

      const proposal = {
        title: `AUTO Synthesis: ${originalMessage.substring(0, 50)}`,
        description: synthesized.summary,
        changes: {
          synthesized_response: synthesized.summary,
          key_points: synthesized.keyPoints,
          models_consulted: synthesized.modelsUsed,
          consensus_level: synthesized.consensus.level
        },
        reasoning: `Orquestación automática de ${synthesized.modelsUsed.length} modelos con consenso ${synthesized.consensus.level}`,
        priority: 'normal'
      };

      // Enviar al MCP
      const result = await window.mcpAPI.sendProposal(proposal);
      console.log('[AUTO] ✅ Propuesta enviada al MCP:', result);
      window.addTerminalLine(`✅ Propuesta enviada al MCP (ID: ${result?.id || 'pending'})`);

    } catch (error) {
      console.error('[AUTO] Error enviando a MCP:', error);
    }
  }
}

// Crear instancia global
window.autoOrchestrationEngine = new AutoOrchestrationEngine();
