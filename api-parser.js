/**
 * ============================================================================
 * API Parser - Extrae todas las APIs del repo public-apis/README.md
 * ============================================================================
 *
 * Este script lee el README.md de public-apis, extrae todas las APIs
 * y las exporta como JSON para cargar en NEON PostgreSQL
 */

const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, 'public-apis', 'README.md');
const OUTPUT_PATH = path.join(__dirname, 'public-apis-database.json');

class APIParser {
  constructor() {
    this.apis = [];
    this.categories = [];
  }

  /**
   * Parse README.md y extraer todas las APIs
   */
  parse() {
    console.log('[Parser] Leyendo README.md...');

    try {
      const content = fs.readFileSync(README_PATH, 'utf-8');
      const lines = content.split('\n');

      let currentCategory = null;
      let inTable = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detectar categoría (### CategoryName)
        if (line.startsWith('### ') && !line.includes('Index')) {
          currentCategory = line.replace('### ', '').trim();
          if (!this.categories.includes(currentCategory)) {
            this.categories.push(currentCategory);
          }
          inTable = false;
        }

        // Detectar inicio de tabla
        if (line.includes('| API | Description') ||
            line.includes('|:---|:---|:---|:---|:---|')) {
          inTable = true;
          continue;
        }

        // Procesar líneas de tabla
        if (inTable && line.startsWith('|') && currentCategory) {
          const api = this.parseTableRow(line, currentCategory);
          if (api) {
            this.apis.push(api);
          }
        }

        // Detectar fin de tabla
        if (inTable && line.trim() === '' && i > 0 && !lines[i-1].startsWith('|')) {
          inTable = false;
        }
      }

      console.log(`✓ Parsed ${this.apis.length} APIs en ${this.categories.length} categorías`);
      return this.apis;
    } catch (error) {
      console.error('[Parser] Error:', error.message);
      return null;
    }
  }

  /**
   * Parse una fila de tabla y extraer datos de la API
   */
  parseTableRow(line, category) {
    // Format: | [Name](url) | Description | Auth | HTTPS | CORS |
    const parts = line.split('|').map(p => p.trim()).filter(p => p);

    if (parts.length < 5) return null;

    try {
      // Extraer nombre y URL
      const nameMatch = parts[0].match(/\[(.*?)\]\((.*?)\)/);
      if (!nameMatch) return null;

      const name = nameMatch[1];
      const url = nameMatch[2];
      const description = parts[1];
      const auth = parts[2];
      const https = parts[3].toLowerCase() === 'yes';
      const cors = parts[4].toLowerCase() === 'yes';

      return {
        id: `${category.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        url,
        description,
        category,
        auth: auth !== 'no' ? auth : null,
        https,
        cors,
        requiresKey: auth !== 'no',
        authType: auth,
        added: new Date().toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar APIs como JSON
   */
  save() {
    const data = {
      meta: {
        total: this.apis.length,
        categories: this.categories.length,
        generated: new Date().toISOString(),
        source: 'https://github.com/public-apis/public-apis'
      },
      apis: this.apis
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log(`✓ Guardado en ${OUTPUT_PATH}`);
    return data;
  }

  /**
   * Buscar APIs por criterios
   */
  search(query) {
    const q = query.toLowerCase();
    return this.apis.filter(api =>
      api.name.toLowerCase().includes(q) ||
      api.description.toLowerCase().includes(q) ||
      api.category.toLowerCase().includes(q)
    );
  }

  /**
   * Obtener APIs por categoría
   */
  getByCategory(category) {
    return this.apis.filter(api =>
      api.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Obtener APIs gratis (sin key requerida)
   */
  getFree() {
    return this.apis.filter(api => api.auth === 'No');
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      total: this.apis.length,
      categories: this.categories.length,
      freeAPIs: this.getFree().length,
      requiresAuth: this.apis.filter(api => api.requiresKey).length,
      https: this.apis.filter(api => api.https).length,
      cors: this.apis.filter(api => api.cors).length,
      byCategory: this.getByCategoryStats()
    };
  }

  getByCategoryStats() {
    const stats = {};
    this.categories.forEach(cat => {
      stats[cat] = this.getByCategory(cat).length;
    });
    return stats;
  }
}

// Main execution
if (require.main === module) {
  const parser = new APIParser();
  parser.parse();
  parser.save();

  console.log('\n📊 ESTADÍSTICAS:');
  console.log(JSON.stringify(parser.getStats(), null, 2));

  // Ejemplo de búsqueda
  console.log('\n🔍 Ejemplo búsqueda "weather":');
  const weatherAPIs = parser.search('weather');
  console.log(`Encontrados ${weatherAPIs.length} APIs relacionadas con weather`);
  weatherAPIs.slice(0, 3).forEach(api => {
    console.log(`  - ${api.name}: ${api.description}`);
  });
}

module.exports = { APIParser };
