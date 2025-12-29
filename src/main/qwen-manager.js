/**
 * qwen-manager.js
 *
 * Gestiona el almacenamiento persistente de sesiones QWEN
 * Equivalente a vscode.ExtensionContext.globalState pero para Electron
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class QwenSessionManager {
  constructor() {
    // Determinar ubicación del archivo de sesión
    this.sessionDir = path.join(
      process.env.APPDATA || process.env.HOME,
      'StudioLab',
      'sessions'
    );

    this.sessionFile = path.join(this.sessionDir, 'qwen-session.json');

    // Asegurar que el directorio existe
    this.ensureSessionDirectory();

    // Cargar configuración inicial
    this.loadSessionData();
  }

  /**
   * Asegurar que el directorio de sesiones existe
   */
  ensureSessionDirectory() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
        console.log(`[QwenSessionManager] ✅ Directorio creado: ${this.sessionDir}`);
      }
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error creando directorio:`, error);
    }
  }

  /**
   * Cargar datos de sesión
   */
  loadSessionData() {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        // Crear archivo por defecto
        const defaultSession = {
          url: 'https://qwenlm.ai/',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(this.sessionFile, JSON.stringify(defaultSession, null, 2));
        this.sessionData = defaultSession;
        console.log(`[QwenSessionManager] ✅ Sesión por defecto creada`);
      } else {
        const data = fs.readFileSync(this.sessionFile, 'utf8');
        this.sessionData = JSON.parse(data);
        console.log(`[QwenSessionManager] ✅ Sesión cargada`);
      }
    } catch (error) {
      console.warn(`[QwenSessionManager] ⚠️ Error cargando sesión:`, error.message);
      this.sessionData = {
        url: 'https://qwenlm.ai/',
        createdAt: new Date().toISOString()
      };
    }
  }

  /**
   * Obtener URL de sesión guardada
   */
  getSessionUrl() {
    return this.sessionData?.url || 'https://qwenlm.ai/';
  }

  /**
   * Guardar URL de sesión
   */
  saveSessionUrl(url) {
    try {
      this.sessionData = {
        ...this.sessionData,
        url: url,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(this.sessionData, null, 2)
      );

      console.log(`[QwenSessionManager] ✅ Sesión guardada: ${url}`);
      return true;
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error guardando sesión:`, error);
      return false;
    }
  }

  /**
   * Obtener toda la sesión
   */
  getFullSession() {
    return this.sessionData;
  }

  /**
   * Actualizar datos de sesión
   */
  updateSession(data) {
    try {
      this.sessionData = {
        ...this.sessionData,
        ...data,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(this.sessionData, null, 2)
      );

      console.log(`[QwenSessionManager] ✅ Sesión actualizada`);
      return true;
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error actualizando sesión:`, error);
      return false;
    }
  }

  /**
   * Limpiar sesión (logout)
   */
  clearSession() {
    try {
      this.sessionData = {
        url: 'https://qwenlm.ai/',
        clearedAt: new Date().toISOString()
      };

      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(this.sessionData, null, 2)
      );

      console.log(`[QwenSessionManager] ✅ Sesión borrada`);
      return true;
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error borrando sesión:`, error);
      return false;
    }
  }

  /**
   * Obtener información del almacenamiento
   */
  getStorageInfo() {
    return {
      sessionDir: this.sessionDir,
      sessionFile: this.sessionFile,
      fileSize: fs.existsSync(this.sessionFile)
        ? fs.statSync(this.sessionFile).size
        : 0,
      exists: fs.existsSync(this.sessionFile)
    };
  }

  /**
   * Exportar sesión (para backup)
   */
  exportSession() {
    try {
      return JSON.stringify(this.sessionData, null, 2);
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error exportando sesión:`, error);
      return null;
    }
  }

  /**
   * Importar sesión (para restaurar)
   */
  importSession(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.updateSession(data);
      console.log(`[QwenSessionManager] ✅ Sesión importada`);
      return true;
    } catch (error) {
      console.error(`[QwenSessionManager] ❌ Error importando sesión:`, error);
      return false;
    }
  }
}

module.exports = { QwenSessionManager };
