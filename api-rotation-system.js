/**
 * ============================================================================
 * API ROTATION SYSTEM - Gestión de credenciales con rotación automática
 * ============================================================================
 *
 * Sistema de rotación de APIs que:
 * 1. Guarda múltiples claves de cada proveedor
 * 2. Rota entre ellas automáticamente
 * 3. Marca las que fallen para evitar reutilización
 * 4. Cifra las credenciales en almacenamiento
 * 5. Proporciona fallbacks y redundancia
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class APIRotationSystem {
  constructor(options = {}) {
    this.encryptionKey = options.encryptionKey || process.env.API_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.rotationFile = options.rotationFile || path.join(process.env.HOME || process.env.USERPROFILE, '.studiolab', 'api-rotation.json');
    this.rotationInterval = options.rotationInterval || 3600000; // 1 hora por defecto
    this.failureThreshold = options.failureThreshold || 3; // 3 fallos antes de marcar como inútil

    this.apiRegistry = {
      groq: [],
      anthropic: [],
      openai: [],
      gemini: [],
      neon: [],
      openrouter: [],
      huggingface: [],
      cohere: []
    };

    this.rotationState = {};
    this.failureTracker = {};

    // Cargar credenciales desde variables de entorno
    this.loadFromEnvironment();

    // Cargar estado de rotación anterior si existe
    this.loadRotationState();

    // Iniciar rotación automática
    this.startAutoRotation();
  }

  /**
   * Generar clave de encriptación si no existe
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encriptar texto
   */
  encrypt(text) {
    if (!text) return null;

    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex');
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(text, 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (e) {
      console.error('[APIRotation] Error encriptando:', e.message);
      return null;
    }
  }

  /**
   * Desencriptar texto
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;

    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = Buffer.from(this.encryptionKey, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (e) {
      console.error('[APIRotation] Error desencriptando:', e.message);
      return null;
    }
  }

  /**
   * Cargar APIs desde variables de entorno
   */
  loadFromEnvironment() {
    console.log('[APIRotation] 📥 Cargando APIs desde variables de entorno...');

    // GROQ_API_KEY (múltiples separadas por coma)
    const groqKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').filter(k => k.trim());
    groqKeys.forEach((key, i) => {
      this.addAPI('groq', key.trim(), `Groq Key ${i + 1}`);
    });

    // ANTHROPIC_API_KEY
    const anthropicKeys = (process.env.ANTHROPIC_API_KEYS || process.env.ANTHROPIC_API_KEY || '').split(',').filter(k => k.trim());
    anthropicKeys.forEach((key, i) => {
      this.addAPI('anthropic', key.trim(), `Anthropic Key ${i + 1}`);
    });

    // OPENAI_API_KEY
    const openaiKeys = (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || '').split(',').filter(k => k.trim());
    openaiKeys.forEach((key, i) => {
      this.addAPI('openai', key.trim(), `OpenAI Key ${i + 1}`);
    });

    // GEMINI_API_KEY
    const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').filter(k => k.trim());
    geminiKeys.forEach((key, i) => {
      this.addAPI('gemini', key.trim(), `Gemini Key ${i + 1}`);
    });

    // DATABASE_URL (NEON)
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      this.addAPI('neon', dbUrl, 'Primary Database');
    }

    // OPENROUTER_API_KEY
    const openrouterKeys = (process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '').split(',').filter(k => k.trim());
    openrouterKeys.forEach((key, i) => {
      this.addAPI('openrouter', key.trim(), `OpenRouter Key ${i + 1}`);
    });

    console.log(`[APIRotation] ✅ Cargas completadas:`);
    Object.entries(this.apiRegistry).forEach(([provider, keys]) => {
      if (keys.length > 0) {
        console.log(`   - ${provider}: ${keys.length} clave(s)`);
      }
    });
  }

  /**
   * Agregar una API al registro
   */
  addAPI(provider, apiKey, label = '') {
    if (!this.apiRegistry[provider]) {
      this.apiRegistry[provider] = [];
    }

    if (!apiKey) return;

    this.apiRegistry[provider].push({
      id: crypto.randomBytes(8).toString('hex'),
      provider,
      apiKey: this.encrypt(apiKey),
      label: label || `${provider}-${Date.now()}`,
      addedAt: new Date().toISOString(),
      failureCount: 0,
      lastUsed: null,
      status: 'active' // active, disabled, testing
    });
  }

  /**
   * Obtener API actual (con rotación automática)
   */
  getAPI(provider, options = {}) {
    const { returnDecrypted = true, forceNext = false } = options;

    if (!this.apiRegistry[provider] || this.apiRegistry[provider].length === 0) {
      throw new Error(`❌ No hay APIs configuradas para ${provider}`);
    }

    // Inicializar estado de rotación si no existe
    if (!this.rotationState[provider]) {
      this.rotationState[provider] = {
        currentIndex: 0,
        rotations: 0,
        lastRotation: Date.now()
      };
    }

    let apis = this.apiRegistry[provider].filter(a => a.status === 'active');

    if (apis.length === 0) {
      throw new Error(`❌ No hay APIs activas para ${provider}`);
    }

    // Obtener próximo índice
    let index = this.rotationState[provider].currentIndex;
    if (forceNext) {
      index = (index + 1) % apis.length;
      this.rotationState[provider].currentIndex = index;
      this.rotationState[provider].rotations++;
      this.rotationState[provider].lastRotation = Date.now();
    }

    const apiEntry = apis[index % apis.length];

    return {
      ...apiEntry,
      apiKey: returnDecrypted ? this.decrypt(apiEntry.apiKey) : apiEntry.apiKey,
      rotationInfo: {
        currentIndex: index,
        totalAvailable: apis.length,
        totalRotations: this.rotationState[provider].rotations
      }
    };
  }

  /**
   * Reportar fallo de API
   */
  reportFailure(provider, apiId, error = '') {
    const api = this.apiRegistry[provider]?.find(a => a.id === apiId);

    if (!api) {
      console.warn(`[APIRotation] ⚠️ API ${apiId} no encontrada`);
      return;
    }

    api.failureCount++;
    api.lastError = error;
    api.lastErrorTime = new Date().toISOString();

    console.warn(`[APIRotation] ⚠️ Fallo en ${provider} (${api.label}): ${error}`);
    console.warn(`   Fallos: ${api.failureCount}/${this.failureThreshold}`);

    // Deshabilitar si excede umbral
    if (api.failureCount >= this.failureThreshold) {
      api.status = 'disabled';
      console.error(`[APIRotation] ❌ ${provider} (${api.label}) DESHABILITADA`);

      // Rotar a siguiente
      this.rotateAPI(provider);
    }

    this.saveRotationState();
  }

  /**
   * Reportar éxito de API
   */
  reportSuccess(provider, apiId) {
    const api = this.apiRegistry[provider]?.find(a => a.id === apiId);

    if (!api) return;

    api.lastUsed = new Date().toISOString();
    api.failureCount = Math.max(0, api.failureCount - 1); // Decrementar contador
    api.status = 'active';

    console.log(`[APIRotation] ✅ Éxito en ${provider} (${api.label})`);
    this.saveRotationState();
  }

  /**
   * Rotar manualmente a siguiente API
   */
  rotateAPI(provider) {
    if (!this.rotationState[provider]) {
      this.rotationState[provider] = { currentIndex: 0, rotations: 0, lastRotation: Date.now() };
    }

    const apis = this.apiRegistry[provider].filter(a => a.status === 'active');
    if (apis.length > 0) {
      this.rotationState[provider].currentIndex = (this.rotationState[provider].currentIndex + 1) % apis.length;
      this.rotationState[provider].rotations++;
      this.rotationState[provider].lastRotation = Date.now();

      const nextAPI = this.getAPI(provider);
      console.log(`[APIRotation] 🔄 Rotación a siguiente ${provider}: ${nextAPI.label}`);

      this.saveRotationState();
      return nextAPI;
    }

    throw new Error(`❌ No hay APIs disponibles para ${provider}`);
  }

  /**
   * Iniciar rotación automática
   */
  startAutoRotation() {
    console.log('[APIRotation] ⏰ Rotación automática iniciada (intervalo: ' + Math.round(this.rotationInterval / 60000) + ' minutos)');

    setInterval(() => {
      Object.keys(this.apiRegistry).forEach(provider => {
        if (this.apiRegistry[provider].length > 1) {
          try {
            this.rotateAPI(provider);
          } catch (e) {
            console.warn(`[APIRotation] No se pudo rotar ${provider}:`, e.message);
          }
        }
      });
    }, this.rotationInterval);
  }

  /**
   * Guardar estado de rotación
   */
  saveRotationState() {
    try {
      const dir = path.dirname(this.rotationFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.rotationFile,
        JSON.stringify(
          {
            rotationState: this.rotationState,
            registrySummary: Object.entries(this.apiRegistry).reduce((acc, [provider, apis]) => {
              acc[provider] = {
                total: apis.length,
                active: apis.filter(a => a.status === 'active').length,
                disabled: apis.filter(a => a.status === 'disabled').length
              };
              return acc;
            }, {}),
            lastSaved: new Date().toISOString()
          },
          null,
          2
        )
      );
    } catch (e) {
      console.error('[APIRotation] Error guardando estado:', e.message);
    }
  }

  /**
   * Cargar estado de rotación anterior
   */
  loadRotationState() {
    try {
      if (fs.existsSync(this.rotationFile)) {
        const data = JSON.parse(fs.readFileSync(this.rotationFile, 'utf-8'));
        this.rotationState = data.rotationState || {};
        console.log('[APIRotation] 📂 Estado de rotación anterior cargado');
      }
    } catch (e) {
      console.warn('[APIRotation] No se pudo cargar estado anterior:', e.message);
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const stats = {};

    Object.entries(this.apiRegistry).forEach(([provider, apis]) => {
      stats[provider] = {
        total: apis.length,
        active: apis.filter(a => a.status === 'active').length,
        disabled: apis.filter(a => a.status === 'disabled').length,
        testing: apis.filter(a => a.status === 'testing').length,
        averageFailureRate: apis.length > 0
          ? (apis.reduce((sum, a) => sum + a.failureCount, 0) / apis.length).toFixed(2)
          : 0,
        rotation: this.rotationState[provider] || null
      };
    });

    return stats;
  }

  /**
   * Obtener reporte de salud
   */
  getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      providers: {},
      warnings: [],
      recommendations: []
    };

    Object.entries(this.apiRegistry).forEach(([provider, apis]) => {
      const active = apis.filter(a => a.status === 'active');
      const disabled = apis.filter(a => a.status === 'disabled');

      report.providers[provider] = {
        available: active.length,
        total: apis.length,
        apis: active.map(a => ({
          label: a.label,
          failures: a.failureCount,
          lastUsed: a.lastUsed,
          addedAt: a.addedAt
        }))
      };

      if (active.length === 0) {
        report.warnings.push(`❌ ${provider}: NO HAY APIs ACTIVAS`);
        report.recommendations.push(`Agregar nueva clave de ${provider} a .env`);
      } else if (active.length === 1) {
        report.warnings.push(`⚠️ ${provider}: Solo 1 API activa (sin redundancia)`);
        report.recommendations.push(`Agregar API alternativa de ${provider} para redundancia`);
      }

      if (disabled.length > 0) {
        report.recommendations.push(`${provider}: ${disabled.length} API(s) deshabilitada(s), considere rotarlas`);
      }
    });

    return report;
  }
}

module.exports = { APIRotationSystem };
