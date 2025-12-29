// ============================================================================
// RESPONSE CACHE SYSTEM - Optimización de respuestas
// ============================================================================
// Cachea respuestas para evitar consultas redundantes
// Invalida automáticamente después de TTL

class ResponseCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 3600000; // 1 hora por defecto
    this.maxSize = options.maxSize || 100; // Máximo 100 entradas
    this.compressionEnabled = options.compression !== false;

    console.log(`[Cache] ✅ Inicializado (TTL: ${this.ttl}ms, Max: ${this.maxSize})`);
  }

  /**
   * Generar hash de entrada para cacheado
   * @param {string} query - Consulta del usuario
   * @param {array} models - Modelos usados
   * @returns {string} Hash único
   */
  _generateKey(query, models = []) {
    const normalized = query.toLowerCase().trim();
    const modelStr = models.sort().join('|');
    // Crear hash simple
    return `${normalized}:${modelStr}`;
  }

  /**
   * Obtener respuesta cacheada
   * @param {string} query - Consulta
   * @param {array} models - Modelos
   * @returns {object|null} Respuesta cacheada o null
   */
  get(query, models = []) {
    const key = this._generateKey(query, models);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      console.log(`[Cache] ⏱️ Entrada expirada: ${key.substring(0, 30)}...`);
      return null;
    }

    entry.hits++;
    console.log(`[Cache] ✅ Hit #${entry.hits} para: ${query.substring(0, 40)}...`);
    return entry.data;
  }

  /**
   * Guardar respuesta en cache
   * @param {string} query - Consulta
   * @param {array} models - Modelos usados
   * @param {object} response - Respuesta a cachear
   */
  set(query, models = [], response) {
    // Limite de tamaño
    if (this.cache.size >= this.maxSize) {
      // Eliminar entrada con menos hits
      let minHits = Infinity;
      let minKey = null;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.hits < minHits) {
          minHits = entry.hits;
          minKey = key;
        }
      }
      if (minKey) {
        this.cache.delete(minKey);
        console.log(`[Cache] 🗑️ Removida entrada con baja hit rate`);
      }
    }

    const key = this._generateKey(query, models);
    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
      hits: 0,
      size: this._estimateSize(response)
    });

    console.log(`[Cache] 💾 Guardado: ${query.substring(0, 40)}... (${this.cache.size}/${this.maxSize})`);
  }

  /**
   * Estimar tamaño de objeto en MB
   */
  _estimateSize(obj) {
    const json = JSON.stringify(obj);
    return (json.length / 1024 / 1024).toFixed(2);
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    let totalHits = 0;
    let totalSize = 0;
    const entries = [];

    for (const [key, entry] of this.cache.entries()) {
      totalHits += entry.hits;
      totalSize += parseFloat(entry.size);
      entries.push({
        key: key.substring(0, 50),
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
        size: entry.size
      });
    }

    return {
      totalEntries: this.cache.size,
      totalHits,
      totalSize: totalSize.toFixed(2),
      efficiency: totalHits > 0 ? (totalHits / this.cache.size).toFixed(2) : 0,
      entries: entries.sort((a, b) => b.hits - a.hits)
    };
  }

  /**
   * Limpiar cache completamente
   */
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] 🧹 Limpiado - ${count} entradas eliminadas`);
  }

  /**
   * Limpiar entradas expiradas
   */
  prune() {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    console.log(`[Cache] 🗑️ Poda completada - ${removed} entradas eliminadas`);
    return removed;
  }

  /**
   * Invalidar entrada específica
   */
  invalidate(query, models = []) {
    const key = this._generateKey(query, models);
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[Cache] ❌ Invalidada: ${query.substring(0, 40)}...`);
    }
    return deleted;
  }

  /**
   * Invalidar por patrón
   */
  invalidatePattern(pattern) {
    let removed = 0;
    const regex = new RegExp(pattern, 'i');

    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    console.log(`[Cache] ❌ Invalidadas ${removed} entradas que coinciden con: ${pattern}`);
    return removed;
  }
}

module.exports = { ResponseCache };
