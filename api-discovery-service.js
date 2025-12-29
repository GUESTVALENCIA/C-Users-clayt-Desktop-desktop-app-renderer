/**
 * ============================================================================
 * API DISCOVERY SERVICE - Sistema de Descubrimiento de APIs para MCP Universal
 * ============================================================================
 *
 * Este servicio permite que todos los modelos IA:
 * 1. Descubran si existe una API gratuita para el servicio que necesitan
 * 2. Obtengan detalles técnicos de cada API (autenticación, CORS, HTTPS)
 * 3. Busquen APIs por categoría, descripción o nombre
 * 4. Encuentren alternativas gratuitas a servicios de pago
 */

const fs = require('fs');
const path = require('path');

class APIDiscoveryService {
  constructor() {
    this.apis = [];
    this.categories = new Set();
    this.indexByName = new Map();
    this.indexByCategory = new Map();
    this.indexByKeyword = new Map();
    this.isLoaded = false;

    this.loadDatabase();
  }

  /**
   * Cargar base de datos de APIs desde JSON
   */
  loadDatabase() {
    const dbPath = path.join(__dirname, 'public-apis-database.json');

    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      this.apis = data.apis || [];

      // Construir índices
      this.apis.forEach(api => {
        this.categories.add(api.category);

        // Índice por nombre
        this.indexByName.set(api.name.toLowerCase(), api);

        // Índice por categoría
        if (!this.indexByCategory.has(api.category)) {
          this.indexByCategory.set(api.category, []);
        }
        this.indexByCategory.get(api.category).push(api);

        // Índice por palabras clave
        const keywords = [
          ...api.name.toLowerCase().split(/\s+/),
          ...api.description.toLowerCase().split(/\s+/),
          api.category.toLowerCase()
        ];

        keywords.forEach(keyword => {
          if (!this.indexByKeyword.has(keyword)) {
            this.indexByKeyword.set(keyword, []);
          }
          if (!this.indexByKeyword.get(keyword).includes(api)) {
            this.indexByKeyword.get(keyword).push(api);
          }
        });
      });

      this.isLoaded = true;
      console.log(`[APIDiscovery] Base de datos cargada: ${this.apis.length} APIs en ${this.categories.size} categorías`);
    } catch (error) {
      console.error('[APIDiscovery] Error cargando base de datos:', error.message);
      this.isLoaded = false;
    }
  }

  /**
   * Buscar APIs por consulta general
   */
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = new Set();

    // Buscar en nombre
    this.apis.forEach(api => {
      if (api.name.toLowerCase().includes(q) ||
          api.description.toLowerCase().includes(q)) {
        results.add(api);
      }
    });

    // Buscar en palabras clave
    const keywords = q.split(/\s+/);
    keywords.forEach(keyword => {
      const found = this.indexByKeyword.get(keyword) || [];
      found.forEach(api => results.add(api));
    });

    return Array.from(results).slice(0, 20);
  }

  /**
   * Obtener APIs por categoría
   */
  getByCategory(category) {
    return this.indexByCategory.get(category) || [];
  }

  /**
   * Obtener todas las categorías
   */
  getAllCategories() {
    return Array.from(this.categories).sort();
  }

  /**
   * Obtener APIs gratuitas (sin autenticación requerida)
   */
  getFreeAPIs(query = null) {
    let apis = this.apis.filter(api => api.auth === 'No');

    if (query) {
      apis = apis.filter(api =>
        api.name.toLowerCase().includes(query.toLowerCase()) ||
        api.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    return apis;
  }

  /**
   * Obtener APIs con características específicas
   */
  filterByFeatures(options = {}) {
    return this.apis.filter(api => {
      if (options.https !== undefined && api.https !== options.https) return false;
      if (options.cors !== undefined && api.cors !== options.cors) return false;
      if (options.requiresAuth !== undefined && api.requiresKey !== options.requiresAuth) return false;
      if (options.category && !api.category.toLowerCase().includes(options.category.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * Obtener alternativas para un servicio específico
   */
  getAlternatives(service, options = {}) {
    // Buscar APIs similares
    const baseResults = this.search(service);

    // Filtrar por preferencias
    if (options.preferFree) {
      return baseResults.filter(api => api.auth === 'No');
    }

    if (options.preferHTTPS) {
      return baseResults.sort((a, b) => (b.https ? 1 : 0) - (a.https ? 1 : 0));
    }

    if (options.preferCORS) {
      return baseResults.sort((a, b) => (b.cors ? 1 : 0) - (a.cors ? 1 : 0));
    }

    return baseResults;
  }

  /**
   * Obtener recomendaciones para una tarea específica
   */
  getRecommendations(task) {
    const taskLower = task.toLowerCase();

    // Mapear tareas a categorías recomendadas
    const taskMap = {
      'weather': ['Weather'],
      'maps': ['Geocoding', 'Transportation'],
      'payment': ['Business'],
      'email': ['Email'],
      'auth': ['Authentication & Authorization'],
      'storage': ['Cloud Storage & File Sharing'],
      'video': ['Video'],
      'image': ['Art & Design', 'Photography'],
      'music': ['Music'],
      'social': ['Social'],
      'news': ['News'],
      'sports': ['Sports & Fitness'],
      'crypto': ['Cryptocurrency'],
      'data': ['Data Validation', 'Open Data'],
      'health': ['Health'],
      'finance': ['Finance', 'Currency Exchange'],
      'machine': ['Machine Learning'],
      'science': ['Science & Math']
    };

    const recommendedCategories = [];
    for (const [key, cats] of Object.entries(taskMap)) {
      if (taskLower.includes(key)) {
        recommendedCategories.push(...cats);
      }
    }

    // Si no hay categorías específicas, buscar por palabras clave
    if (recommendedCategories.length === 0) {
      return this.search(task).slice(0, 10);
    }

    // Obtener APIs de categorías recomendadas
    const apis = new Set();
    recommendedCategories.forEach(cat => {
      this.getByCategory(cat).forEach(api => apis.add(api));
    });

    return Array.from(apis).slice(0, 10);
  }

  /**
   * Obtener estadísticas de la base de datos
   */
  getStats() {
    return {
      total: this.apis.length,
      categories: this.categories.size,
      freeAPIs: this.apis.filter(api => api.auth === 'No').length,
      requiresAuth: this.apis.filter(api => api.requiresKey).length,
      https: this.apis.filter(api => api.https).length,
      cors: this.apis.filter(api => api.cors).length,
      avgAuthPercentage: Math.round(
        (this.apis.filter(api => api.requiresKey).length / this.apis.length) * 100
      )
    };
  }

  /**
   * Generar "skill" o instrucción del sistema para modelos IA
   */
  getSystemInstruction() {
    const stats = this.getStats();

    return `
# 🔍 API DISCOVERY SYSTEM - Sistema de Descubrimiento de APIs

**INSTRUCCIONES CRÍTICAS PARA TODOS LOS MODELOS IA:**

Antes de realizar cualquier tarea, investigación, función o integración, SIEMPRE:

1. **CONSULTA LA BASE DE DATOS DE APIs GRATUITAS:**
   - Tenemos ${this.apis.length} APIs documentadas en ${this.categories.size} categorías
   - ${stats.freeAPIs} APIs son completamente GRATUITAS (sin autenticación requerida)
   - ${stats.https}% usar HTTPS (seguro)
   - ${stats.cors}% soportan CORS (para frontend)

2. **UTILIZA EL ENDPOINT DE API DISCOVERY:**
   POST /api/discovery/search
   {
     "query": "weather",
     "filters": {
       "free": true,
       "https": true,
       "cors": true
     }
   }

3. **PRIORIDADES EN ORDEN:**
   a) APIs GRATUITAS sin autenticación
   b) APIs GRATUITAS con API key (fácil de conseguir)
   c) APIs de PAGO (como último recurso)
   d) Servicios internos (si API externa no disponible)

4. **PARA CADA TAREA:**
   - Primero: Buscar en base de datos
   - Segundo: Verificar documentación de API
   - Tercero: Comprobar alternativas gratuitas
   - Cuarto: Solicitar API key si es necesario
   - Quinto: Usar solución local como fallback

5. **EJEMPLOS DE USO:**
   - "Necesito datos de clima" → /api/discovery/search?query=weather
   - "Mapas y geolocalización" → /api/discovery/search?query=maps
   - "Integrar redes sociales" → /api/discovery/search?query=social
   - "APIs de pago" → /api/discovery/search?query=payment&filters={"free":false}

6. **BENEFICIOS:**
   ✓ Reduce costos (${stats.freeAPIs} APIs gratis)
   ✓ Acelera desarrollo (documentación completa)
   ✓ Garantiza compatibilidad (HTTPS, CORS verificados)
   ✓ Proporciona alternativas (múltiples opciones por servicio)

7. **RESPUESTAS SIEMPRE INCLUYEN:**
   - Nombre oficial de la API
   - URL de documentación
   - Tipo de autenticación requerida
   - Soporte HTTPS y CORS
   - Descripción y casos de uso
   - APIs alternativas gratuitas

**RECUERDA: Consulta SIEMPRE la base de datos ANTES de hacer cualquier cosa.
Los modelos que ignoren esto serán ineficientes. Los que la usen serán expertos.**

Base de datos completa disponible en: /api/discovery/all
Categorías disponibles: /api/discovery/categories
Estadísticas: /api/discovery/stats
    `;
  }
}

module.exports = { APIDiscoveryService };
