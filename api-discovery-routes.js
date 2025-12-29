/**
 * ============================================================================
 * API DISCOVERY ROUTES - Endpoints para descubrimiento de APIs
 * ============================================================================
 */

const express = require('express');
const { APIDiscoveryService } = require('./api-discovery-service');

const router = express.Router();
const discoveryService = new APIDiscoveryService();

/**
 * GET /api/discovery/search
 * Buscar APIs por consulta
 *
 * Query params:
 * - query: string (requerido)
 * - free: boolean (opcional, default: false)
 * - https: boolean (opcional)
 * - cors: boolean (opcional)
 */
router.get('/search', (req, res) => {
  try {
    const { query, free, https, cors } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter required',
        message: 'Proporciona una consulta de búsqueda en "query"'
      });
    }

    let results = discoveryService.search(query);

    // Aplicar filtros
    if (free === 'true') {
      results = results.filter(api => api.auth === 'No');
    }

    if (https === 'true') {
      results = results.filter(api => api.https);
    }

    if (cors === 'true') {
      results = results.filter(api => api.cors);
    }

    res.json({
      success: true,
      query,
      count: results.length,
      apis: results
    });
  } catch (error) {
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/category/:category
 * Obtener todas las APIs de una categoría
 */
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const apis = discoveryService.getByCategory(category);

    res.json({
      success: true,
      category,
      count: apis.length,
      apis
    });
  } catch (error) {
    res.status(500).json({
      error: 'Category fetch failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/categories
 * Obtener todas las categorías disponibles
 */
router.get('/categories', (req, res) => {
  try {
    const categories = discoveryService.getAllCategories();

    res.json({
      success: true,
      categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Categories fetch failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/free
 * Obtener todas las APIs gratuitas (sin autenticación)
 */
router.get('/free', (req, res) => {
  try {
    const { query } = req.query;
    const apis = discoveryService.getFreeAPIs(query);

    res.json({
      success: true,
      freeCount: apis.length,
      totalCount: discoveryService.apis.length,
      percentageFree: Math.round((apis.length / discoveryService.apis.length) * 100),
      apis
    });
  } catch (error) {
    res.status(500).json({
      error: 'Free APIs fetch failed',
      message: error.message
    });
  }
});

/**
 * POST /api/discovery/filter
 * Filtrar APIs por características específicas
 */
router.post('/filter', (req, res) => {
  try {
    const { https, cors, requiresAuth, category } = req.body;

    const apis = discoveryService.filterByFeatures({
      https: https !== undefined ? https : undefined,
      cors: cors !== undefined ? cors : undefined,
      requiresAuth: requiresAuth !== undefined ? requiresAuth : undefined,
      category
    });

    res.json({
      success: true,
      filters: { https, cors, requiresAuth, category },
      count: apis.length,
      apis
    });
  } catch (error) {
    res.status(500).json({
      error: 'Filter failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/alternatives/:service
 * Obtener alternativas gratuitas para un servicio específico
 */
router.get('/alternatives/:service', (req, res) => {
  try {
    const { service } = req.params;
    const { preferFree, preferHTTPS, preferCORS } = req.query;

    const alternatives = discoveryService.getAlternatives(service, {
      preferFree: preferFree === 'true',
      preferHTTPS: preferHTTPS === 'true',
      preferCORS: preferCORS === 'true'
    });

    res.json({
      success: true,
      service,
      count: alternatives.length,
      apis: alternatives
    });
  } catch (error) {
    res.status(500).json({
      error: 'Alternatives fetch failed',
      message: error.message
    });
  }
});

/**
 * POST /api/discovery/recommend
 * Obtener recomendaciones de APIs para una tarea
 */
router.post('/recommend', (req, res) => {
  try {
    const { task } = req.body;

    if (!task) {
      return res.status(400).json({
        error: 'Task is required',
        message: 'Proporciona una descripción de la tarea'
      });
    }

    const recommendations = discoveryService.getRecommendations(task);

    res.json({
      success: true,
      task,
      count: recommendations.length,
      apis: recommendations
    });
  } catch (error) {
    res.status(500).json({
      error: 'Recommendation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/stats
 * Obtener estadísticas de la base de datos
 */
router.get('/stats', (req, res) => {
  try {
    const stats = discoveryService.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Stats fetch failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/system-instruction
 * Obtener instrucciones del sistema para modelos IA
 */
router.get('/system-instruction', (req, res) => {
  try {
    const instruction = discoveryService.getSystemInstruction();

    res.json({
      success: true,
      instruction,
      markdown: instruction
    });
  } catch (error) {
    res.status(500).json({
      error: 'Instruction fetch failed',
      message: error.message
    });
  }
});

/**
 * GET /api/discovery/all
 * Obtener TODAS las APIs (para caché local)
 */
router.get('/all', (req, res) => {
  try {
    const apis = discoveryService.apis;

    res.json({
      success: true,
      count: apis.length,
      categories: discoveryService.categories.size,
      apis
    });
  } catch (error) {
    res.status(500).json({
      error: 'All APIs fetch failed',
      message: error.message
    });
  }
});

module.exports = router;
