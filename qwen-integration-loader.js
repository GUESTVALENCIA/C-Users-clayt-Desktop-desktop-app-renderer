// Cargador de integración de Qwen para Sandra IA

// Este archivo se encarga de cargar y gestionar la conexión con Qwen
// en la aplicación principal de Electron

class QwenIntegrationLoader {
  constructor() {
    this.isLoaded = false;
    this.qwenCore = null;
    this.statusCallbacks = [];
  }

  // Cargar el núcleo de conexión con Qwen
  async loadQwenCore() {
    try {
      // Verificar si ya está cargado
      if (this.isLoaded && this.qwenCore) {
        console.log('✅ Núcleo de Qwen ya está cargado');
        return this.qwenCore;
      }

      // Cargar dinámicamente el script de conexión
      const script = document.createElement('script');
      script.src = './qwen-connection-core.js';
      document.head.appendChild(script);

      // Esperar a que se cargue completamente
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        
        // Timeout por si acaso
        setTimeout(() => reject(new Error('Timeout cargando Qwen Core')), 5000);
      });

      // Esperar a que se inicialice el objeto
      await this.waitForQwenCore();

      this.qwenCore = window.qwenCore;
      this.isLoaded = true;

      console.log('✅ Núcleo de Qwen cargado exitosamente');
      
      // Notificar a todos los callbacks de estado
      this.statusCallbacks.forEach(callback => {
        callback({ success: true, qwenCore: this.qwenCore });
      });
      
      return this.qwenCore;
    } catch (error) {
      console.error('❌ Error cargando núcleo de Qwen:', error);
      
      // Notificar error a callbacks
      this.statusCallbacks.forEach(callback => {
        callback({ success: false, error: error });
      });
      
      throw error;
    }
  }

  // Esperar a que el objeto qwenCore esté disponible
  async waitForQwenCore() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo
      
      const checkInterval = setInterval(() => {
        if (window.qwenCore) {
          clearInterval(checkInterval);
          resolve(window.qwenCore);
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            reject(new Error('No se pudo cargar qwenCore después de múltiples intentos'));
          }
        }
      }, 100);
    });
  }

  // Enviar mensaje a Qwen a través del núcleo
  async sendMessage(message, options = {}) {
    if (!this.isLoaded) {
      await this.loadQwenCore();
    }
    
    if (!this.qwenCore) {
      throw new Error('Núcleo de Qwen no está disponible');
    }
    
    return await this.qwenCore.sendMessage(message, options);
  }

  // Verificar estado de conexión
  async checkConnection() {
    if (!this.isLoaded) {
      await this.loadQwenCore();
    }
    
    if (!this.qwenCore) {
      return false;
    }
    
    return await this.qwenCore.checkConnection();
  }

  // Añadir callback para notificaciones de estado
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusCallbacks.push(callback);
    }
  }

  // Obtener instancia del núcleo
  getQwenCore() {
    return this.qwenCore;
  }
}

// Crear instancia global
const qwenIntegration = new QwenIntegrationLoader();

// Hacer disponible globalmente
window.qwenIntegration = qwenIntegration;
window.loadQwenIntegration = async function() {
  return await qwenIntegration.loadQwenCore();
};

// Auto-cargar si es posible
if (document.readyState !== 'loading') {
  // Cargar después de un breve retraso para asegurar que todo esté listo
  setTimeout(() => {
    if (!qwenIntegration.isLoaded) {
      qwenIntegration.loadQwenCore().catch(console.error);
    }
  }, 1000);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (!qwenIntegration.isLoaded) {
        qwenIntegration.loadQwenCore().catch(console.error);
      }
    }, 1000);
  });
}

console.log('✅ Cargador de integración de Qwen inicializado');
console.log('✅ Disponible: window.qwenIntegration, window.loadQwenIntegration');

// Exportar si se usa en un entorno Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QwenIntegrationLoader, qwenIntegration };
}