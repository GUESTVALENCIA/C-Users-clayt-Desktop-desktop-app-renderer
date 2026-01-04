// 🐳 ELECTRON + DOCKER BRIDGE — Inteligente y resiliente
const { ipcRenderer } = require('electron');
const axios = require('axios').default;

class DockerBridge {
  constructor() {
    this.dockerUrl = 'http://localhost:8080';
    this.localUrl = 'http://localhost:8000'; // Tu Sandra Ultimate local
    this.isDockerAvailable = false;
    this.healthCheck();
  }

  // 🔍 Verificar si Docker está corriendo
  async healthCheck() {
    try {
      const res = await axios.get(`${this.dockerUrl}/health`, { timeout: 2000 });
      this.isDockerAvailable = res.data.status === 'ok';
      console.log(`🐳 Docker ${this.isDockerAvailable ? 'disponible' : 'no disponible'}`);
    } catch (e) {
      this.isDockerAvailable = false;
      console.warn('🐳 Docker no disponible, usando fallback local');
    }
  }

  // 🚀 Orquestar con estrategia inteligente
  async orchestrate(text, context = {}) {
    // 1. Intentar Docker primero
    if (this.isDockerAvailable) {
      try {
        const res = await axios.post(
          `${this.dockerUrl}/api/orchestrate`,
          { text, context },
          {
            headers: { 'Authorization': `Bearer ${this.getJWTToken()}` },
            timeout: 30000
          }
        );
        return { ...res.data, source: 'docker' };
      } catch (e) {
        console.warn('🐳 Docker falló, intentando local...', e.message);
      }
    }

    // 2. Fallback a local (tu Sandra Ultimate)
    try {
      const localRes = await axios.post(
        `${this.localUrl}/api/orchestrate`,
        { text, context },
        { timeout: 30000 }
      );
      return { ...localRes.data, source: 'local' };
    } catch (e) {
      // 3. Fallback a función directa (tu app actual)
      if (window.sandra?.orchestrate) {
        return await window.sandra.orchestrate(text, context);
      }
      throw new Error('Ningún servicio disponible');
    }
  }

  // 🔐 JWT Token (almacenado seguro)
  getJWTToken() {
    return localStorage.getItem('sandra_jwt') || this.generateDefaultToken();
  }

  generateDefaultToken() {
    // Token temporal (en producción: usar IPC para obtenerlo del main)
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbGV5IiwiaWF0IjoxNzA0MDYwODAwfQ.7tYs6vG8X3';
  }

  // 🎛️ Control de Docker desde la UI
  async startDocker() {
    return ipcRenderer.invoke('docker:start');
  }

  async stopDocker() {
    return ipcRenderer.invoke('docker:stop');
  }

  getStatus() {
    return { docker: this.isDockerAvailable, local: true };
  }
}

// Instancia global
const dockerBridge = new DockerBridge();

// API pública
window.sandraDocker = dockerBridge;

// Reemplazar el orquestador global
if (window.sandra) {
  const originalOrchestrate = window.sandra.orchestrate;
  window.sandra.orchestrate = async (text, context) => {
    try {
      return await dockerBridge.orchestrate(text, context);
    } catch (e) {
      console.error('Bridge falló, usando original:', e.message);
      return originalOrchestrate ? originalOrchestrate(text, context) : { success: false, error: e.message };
    }
  };
}

console.log('🐳 Electron-Docker Bridge activado');

module.exports = { DockerBridge, dockerBridge };