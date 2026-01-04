// 🎻 AUTO-ORCHESTRATION ENGINE 2.0 — con ChatGPT
// Decide en tiempo real qué modelo usar, combina respuestas, y aprende.

class OrchestrationEngine {
  constructor() {
    this.modelStats = this.loadStats(); // Aprende de aciertos/errores
    this.activeTasks = new Map();
  }

  // 🔍 Analiza el input y decide estrategia
  analyzeInput(input, context = {}) {
    const { text = '', attachments = [], buttons = [] } = input;

    const analysis = {
      length: text.length,
      hasCode: /(?:function|const|import|class|def|print\(|=>|{\s*[\w"])/.test(text),
      codeLang: this.detectLanguage(text),
      hasPDF: attachments.some(a => a.type === 'pdf'),
      hasImage: attachments.some(a => a.type === 'image'),
      hasVideo: attachments.some(a => a.type === 'video'),
      buttons: buttons.map(b => b.type),
      complexity: this.estimateComplexity(text)
    };

    // Estrategia por defecto
    let strategy = {
      primary: 'qwen',
      secondary: null,
      parallel: [],
      postProcess: null
    };

    // 🧠 Lógica de decisión actualizada
    if (analysis.hasPDF || analysis.length > 800) {
      strategy = { primary: 'claude', secondary: 'qwen', postProcess: 'compare' };
    } else if (analysis.hasCode || analysis.codeLang !== 'plaintext') {
      strategy = { primary: 'qwen', postProcess: 'code-review' };
    } else if (analysis.hasImage && analysis.text) {
      strategy = { primary: 'deepseek', secondary: 'qwen', postProcess: 'enrich' };
    } else if (analysis.hasVideo) {
      strategy = { primary: 'claude', parallel: ['qwen'], postProcess: 'summarize+analyze' };
    } else if (/escribe.*cuento|poema|historia|creativo/i.test(text)) {
      strategy = { primary: 'chatgpt', secondary: 'claude' };
    } else if (analysis.complexity > 0.7) {
      strategy = { parallel: ['qwen', 'claude', 'chatgpt'], postProcess: 'vote' };
    }

    return { analysis, strategy };
  }

  detectLanguage(text) {
    const lower = text.toLowerCase();
    if (/import.*from|export.*from|console\.log|=>/.test(lower)) return 'javascript';
    if (/def\s+\w+\(|import\s+\w+|print\(/.test(lower)) return 'python';
    if (/^\s*SELECT\s+.*FROM\s+/i.test(lower)) return 'sql';
    return 'plaintext';
  }

  estimateComplexity(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const questions = (text.match(/\?/g) || []).length;
    const technicalWords = (text.match(/\b(api|model|function|class|query|algorithm)\b/gi) || []).length;
    return Math.min(1, (words / 100 + questions * 0.3 + technicalWords * 0.2) / 5);
  }

  // 🚀 Ejecuta la estrategia
  async execute(input, options = {}) {
    const { analysis, strategy } = this.analyzeInput(input);
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    console.log(`🎻 Orquestación iniciada [${taskId}]:`, strategy);

    try {
      let result;

      if (strategy.parallel && strategy.parallel.length > 0) {
        result = await this.runParallel(taskId, strategy.parallel, input, strategy.postProcess);
      } else {
        result = await this.runPrimarySecondary(taskId, strategy, input);
      }

      // Aprender de resultado
      this.recordOutcome(taskId, strategy, result.success);

      return {
        ...result,
        taskId,
        analysis,
        strategy,
        timestamp: Date.now()
      };

    } catch (e) {
      return { success: false, error: e.message, taskId };
    }
  }

  async runPrimarySecondary(taskId, strategy, input) {
    // Primario
    let primaryRes;
    try {
      primaryRes = await this.callModel(strategy.primary, input);
    } catch (e) {
      console.warn(`🟡 Primario ${strategy.primary} falló:`, e.message);
      if (strategy.secondary) {
        primaryRes = await this.callModel(strategy.secondary, input);
        primaryRes.source = `${strategy.secondary} (fallback)`;
      } else {
        throw e;
      }
    }

    // Post-procesamiento
    if (strategy.postProcess === 'code-review' && primaryRes.success) {
      const review = await this.callModel('qwen', {
        text: `Revisa este código y sugiere mejoras:\n\`\`\`\n${primaryRes.answer}\n\`\`\``
      });
      if (review.success) {
        primaryRes.answer += `\n\n🔍 Revisión:\n${review.answer}`;
      }
    }

    return primaryRes;
  }

  async runParallel(taskId, models, input, postProcess) {
    const promises = models.map(model =>
      this.callModel(model, input).catch(e => ({
        success: false,
        error: e.message,
        source: model
      }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success);

    if (successful.length === 0) {
      throw new Error(`Todos los modelos fallaron: ${results.map(r => r.error).join('; ')}`);
    }

    // Post-procesamiento
    if (postProcess === 'vote') {
      return this.voteResults(successful);
    } else if (postProcess === 'enrich') {
      return this.enrichResults(successful);
    } else {
      return successful[0]; // primero que respondió bien
    }
  }

  async callModel(modelName, input) {
    const timeout = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let res;

      switch (modelName) {
        case 'qwen':
          if (typeof window.qwenChat === 'function') {
            const answer = await window.qwenChat(input.text);
            res = { success: true, answer, source: 'qwen' };
          } else {
            throw new Error('Qwen no disponible');
          }
          break;

        case 'claude':
          const { useClaude } = await import('./tools/claude_local/claude-integration.js');
          res = await useClaude(input.text, { timeout: 120 });
          break;

        case 'deepseek':
          if (typeof window.deepSeekChat === 'function') {
            const answer = await window.deepSeekChat(input.text);
            res = { success: true, answer, source: 'deepseek' };
          } else {
            throw new Error('DeepSeek no disponible');
          }
          break;

        case 'chatgpt':
          const { useChatGPT } = await import('./tools/chatgpt_local/chatgpt-integration.js');
          res = await useChatGPT(input.text, { timeout: 120 });
          break;

        default:
          throw new Error(`Modelo desconocido: ${modelName}`);
      }

      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  voteResults(results) {
    // Por ahora: el más largo (asume más detalle)
    return results.reduce((a, b) => a.answer.length > b.answer.length ? a : b);
  }

  enrichResults(results) {
    // Combina: DeepSeek (visión) + Qwen (técnico)
    const deepseek = results.find(r => r.source === 'deepseek');
    const qwen = results.find(r => r.source === 'qwen');

    if (deepseek && qwen) {
      return {
        success: true,
        source: 'deepseek+qwen',
        answer: `${deepseek.answer}\n\n---\n🔍 Análisis técnico:\n${qwen.answer}`
      };
    }
    return results[0];
  }

  // 📊 Aprendizaje continuo
  loadStats() {
    try {
      const data = localStorage.getItem('orchestration-stats');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  recordOutcome(taskId, strategy, success) {
    const key = strategy.primary || strategy.parallel?.join('+') || 'unknown';
    if (!this.modelStats[key]) this.modelStats[key] = { success: 0, failure: 0 };

    if (success) {
      this.modelStats[key].success++;
    } else {
      this.modelStats[key].failure++;
    }

    try {
      localStorage.setItem('orchestration-stats', JSON.stringify(this.modelStats));
    } catch (e) {
      console.warn('No se pudo guardar stats:', e);
    }
  }

  // 🎯 API pública
  async process(text, attachments = [], buttons = []) {
    return this.execute({ text, attachments, buttons });
  }
}

// Instancia global
const orchestrationEngine = new OrchestrationEngine();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { orchestrationEngine, OrchestrationEngine };
}
if (typeof exports !== 'undefined') {
  exports.orchestrationEngine = orchestrationEngine;
}
// Browser global
if (typeof window !== 'undefined') {
  window.orchestrationEngine = orchestrationEngine;
}