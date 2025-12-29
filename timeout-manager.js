// ============================================================================
// TIMEOUT MANAGER - Timeouts dinámicos e inteligentes
// ============================================================================
// Ajusta timeouts basado en velocidad de respuesta de cada modelo

class TimeoutManager {
  constructor(options = {}) {
    this.baseTimeout = options.baseTimeout || 30000; // 30s base
    this.modelStats = new Map();
    this.minTimeout = options.minTimeout || 5000; // 5s mínimo
    this.maxTimeout = options.maxTimeout || 60000; // 60s máximo

    console.log(`[Timeouts] ✅ Inicializado (Base: ${this.baseTimeout}ms)`);
  }

  /**
   * Registrar tiempo de respuesta de un modelo
   * @param {string} modelId - ID del modelo
   * @param {number} responseTime - Tiempo en ms
   * @param {boolean} success - Si fue exitoso
   */
  recordResponse(modelId, responseTime, success = true) {
    if (!this.modelStats.has(modelId)) {
      this.modelStats.set(modelId, {
        responses: [],
        avgTime: 0,
        successRate: 1.0,
        totalRequests: 0,
        failedRequests: 0
      });
    }

    const stats = this.modelStats.get(modelId);
    stats.responses.push(responseTime);
    stats.totalRequests++;

    if (!success) {
      stats.failedRequests++;
    }

    // Mantener últimas 100 respuestas
    if (stats.responses.length > 100) {
      stats.responses.shift();
    }

    // Recalcular estadísticas
    this._updateStats(modelId);

    console.log(
      `[Timeouts] 📊 ${modelId}: ${responseTime}ms ` +
      `(avg: ${stats.avgTime}ms, success: ${(stats.successRate * 100).toFixed(1)}%)`
    );
  }

  /**
   * Calcular timeout recomendado para modelo
   * @param {string} modelId - ID del modelo
   * @returns {number} Timeout en ms
   */
  getTimeout(modelId) {
    if (!this.modelStats.has(modelId)) {
      // Primera vez: usar timeout base
      return this.baseTimeout;
    }

    const stats = this.modelStats.get(modelId);

    // Fórmula: promedio * factor de seguridad / tasa de éxito
    const factor = 1.5; // 50% de margen sobre promedio
    let timeout = stats.avgTime * factor;

    // Ajustar por tasa de éxito
    if (stats.successRate < 0.8) {
      timeout *= 1.2; // Si hay muchas fallas, aumentar timeout
    }

    // Aplicar límites
    timeout = Math.max(this.minTimeout, Math.min(this.maxTimeout, timeout));

    return Math.ceil(timeout);
  }

  /**
   * Recalcular estadísticas del modelo
   */
  _updateStats(modelId) {
    const stats = this.modelStats.get(modelId);

    // Promedio de tiempos
    stats.avgTime = Math.round(
      stats.responses.reduce((a, b) => a + b, 0) / stats.responses.length
    );

    // Tasa de éxito
    stats.successRate = (stats.totalRequests - stats.failedRequests) / stats.totalRequests || 1.0;
  }

  /**
   * Obtener timeouts para todos los modelos
   */
  getAllTimeouts() {
    const models = ['chatgpt', 'qwen', 'gemini', 'deepseek', 'groq', 'kimi'];
    const timeouts = {};

    for (const model of models) {
      timeouts[model] = this.getTimeout(model);
    }

    return timeouts;
  }

  /**
   * Obtener estadísticas de un modelo
   */
  getStats(modelId) {
    if (!this.modelStats.has(modelId)) {
      return null;
    }

    const stats = this.modelStats.get(modelId);
    return {
      modelId,
      avgResponseTime: stats.avgTime,
      successRate: (stats.successRate * 100).toFixed(1) + '%',
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      recommendedTimeout: this.getTimeout(modelId),
      recentTimes: stats.responses.slice(-5)
    };
  }

  /**
   * Obtener reporte general
   */
  getReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseTimeout: this.baseTimeout,
      models: []
    };

    for (const [modelId, stats] of this.modelStats.entries()) {
      report.models.push({
        modelId,
        avgTime: stats.avgTime,
        successRate: (stats.successRate * 100).toFixed(1) + '%',
        timeout: this.getTimeout(modelId),
        requests: stats.totalRequests
      });
    }

    return report;
  }

  /**
   * Resetear estadísticas de un modelo
   */
  reset(modelId) {
    if (this.modelStats.has(modelId)) {
      this.modelStats.delete(modelId);
      console.log(`[Timeouts] 🔄 Estadísticas de ${modelId} reseteadas`);
    }
  }

  /**
   * Resetear todo
   */
  resetAll() {
    this.modelStats.clear();
    console.log(`[Timeouts] 🔄 Todos los estadísticas reseteadas`);
  }
}

module.exports = { TimeoutManager };
