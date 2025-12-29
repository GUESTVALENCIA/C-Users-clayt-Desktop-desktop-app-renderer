// qwen-url-embedder.js - Sistema para embeber URLs de Qwen en StudioLab

// Clase para manejar el embebido de URLs de Qwen
class QwenUrlEmbedder {
  constructor() {
    this.embedContainers = new Map();
    this.currentUrl = null;
    this.isEmbedded = false;
    this.iframeId = 'qwen-embed-iframe';
    this.embedUrl = 'https://qwen.chat.ai'; // URL por defecto de Qwen
  }

  // Crear contenedor para embeber URL
  createEmbedContainer(containerId = 'qwen-embed-container') {
    // Verificar si ya existe un contenedor
    if (document.getElementById(this.iframeId)) {
      return document.getElementById(this.iframeId);
    }
    
    // Crear el iframe para embeber
    const iframe = document.createElement('iframe');
    iframe.id = this.iframeId;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'none'; // Inicialmente oculto
    iframe.allow = 'camera; microphone; clipboard-write; clipboard-read';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
    
    // Añadir el iframe al contenedor
    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(iframe);
    } else {
      // Si no existe el contenedor, crearlo
      const newContainer = document.createElement('div');
      newContainer.id = containerId;
      newContainer.style.width = '100%';
      newContainer.style.height = '100%';
      newContainer.style.display = 'none';
      document.body.appendChild(newContainer);
      newContainer.appendChild(iframe);
    }
    
    this.embedContainers.set(containerId, iframe);
    return iframe;
  }

  // Cargar URL en el iframe
  async loadUrl(url, containerId = 'qwen-embed-container', options = {}) {
    try {
      // Crear o obtener el contenedor
      const iframe = this.createEmbedContainer(containerId);
      
      // Mostrar el contenedor
      const container = document.getElementById(containerId);
      container.style.display = 'block';
      iframe.style.display = 'block';
      
      // Cargar la URL
      iframe.src = url;
      this.currentUrl = url;
      this.isEmbedded = true;
      
      // Opciones adicionales
      if (options.allowFullscreen !== false) {
        iframe.allowFullscreen = true;
      }
      
      if (options.allowPayment !== false) {
        iframe.allow += '; payment';
      }
      
      // Emitir evento de carga
      window.dispatchEvent(new CustomEvent('qwenEmbedLoaded', {
        detail: { url, containerId, options }
      }));
      
      return true;
    } catch (error) {
      console.error('Error cargando URL embebida:', error);
      throw error;
    }
  }

  // Cargar la URL oficial de Qwen
  async loadQwenOfficial(containerId = 'qwen-embed-container', options = {}) {
    const qwenUrl = 'https://qwen.chat.ai';
    return await this.loadUrl(qwenUrl, containerId, options);
  }

  // Cargar la versión API de Qwen
  async loadQwenApi(containerId = 'qwen-embed-container', options = {}) {
    // Aquí puedes poner la URL de la API de Qwen si está disponible
    const qwenApiUrl = 'https://qwen.chat.ai/api';
    return await this.loadUrl(qwenApiUrl, containerId, options);
  }

  // Cargar Qwen con tokens de autenticación
  async loadQwenWithAuth(token, containerId = 'qwen-embed-container', options = {}) {
    try {
      // Crear URL con token de autenticación
      const qwenAuthUrl = `https://qwen.chat.ai?token=${encodeURIComponent(token)}`;
      return await this.loadUrl(qwenAuthUrl, containerId, options);
    } catch (error) {
      console.error('Error cargando Qwen con autenticación:', error);
      throw error;
    }
  }

  // Ocultar el embebido
  hideEmbed(containerId = 'qwen-embed-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'none';
    }
    
    const iframe = document.getElementById(this.iframeId);
    if (iframe) {
      iframe.style.display = 'none';
    }
    
    this.isEmbedded = false;
  }

  // Mostrar el embebido
  showEmbed(containerId = 'qwen-embed-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'block';
    }
    
    const iframe = document.getElementById(this.iframeId);
    if (iframe) {
      iframe.style.display = 'block';
    }
    
    this.isEmbedded = true;
  }

  // Cambiar URL en el embebido
  async changeUrl(newUrl, containerId = 'qwen-embed-container') {
    const iframe = this.embedContainers.get(containerId);
    if (iframe) {
      iframe.src = newUrl;
      this.currentUrl = newUrl;
      
      window.dispatchEvent(new CustomEvent('qwenEmbedChanged', {
        detail: { newUrl, containerId }
      }));
      
      return true;
    }
    return false;
  }

  // Obtener la URL actual
  getCurrentUrl() {
    return this.currentUrl;
  }

  // Verificar si está embebido
  isCurrentlyEmbedded() {
    return this.isEmbedded;
  }

  // Comunicarse con el iframe embebido (mensajería postMessage)
  sendMessageToEmbedded(message, targetOrigin = '*') {
    const iframe = document.getElementById(this.iframeId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, targetOrigin);
      return true;
    }
    return false;
  }

  // Escuchar mensajes desde el iframe embebido
  onMessageFromEmbedded(callback) {
    window.addEventListener('message', (event) => {
      // Opcional: verificar origen para seguridad
      // if (event.origin !== 'https://qwen.chat.ai') return;
      
      callback(event);
    });
  }

  // Destruir el embebido
  destroyEmbed(containerId = 'qwen-embed-container') {
    const iframe = document.getElementById(this.iframeId);
    if (iframe) {
      iframe.remove();
    }
    
    const container = document.getElementById(containerId);
    if (container) {
      container.remove();
    }
    
    this.embedContainers.delete(containerId);
    this.isEmbedded = false;
    this.currentUrl = null;
  }
}

// Clase extendida para integración con StudioLab
class StudioLabQwenEmbedder extends QwenUrlEmbedder {
  constructor() {
    super();
    this.studioLabContainerId = 'studiolab-qwen-container';
    this.isInitialized = false;
  }

  // Inicializar en StudioLab
  async initialize() {
    try {
      // Crear contenedor especial para StudioLab
      const container = document.createElement('div');
      container.id = this.studioLabContainerId;
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '1000';
      container.style.display = 'none';
      
      document.body.appendChild(container);
      
      this.isInitialized = true;
      console.log('✅ Embebido de Qwen para StudioLab inicializado');
      
      return true;
    } catch (error) {
      console.error('Error inicializando embebido para StudioLab:', error);
      return false;
    }
  }

  // Cargar Qwen en StudioLab con características especiales
  async loadQwenInStudioLab(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Cargar Qwen con características especiales para StudioLab
    const qwenUrl = options.url || 'https://qwen.chat.ai';
    
    // Añadir parámetros especiales para StudioLab
    const urlParams = new URLSearchParams();
    urlParams.append('from', 'studiolab');
    urlParams.append('version', 'enterprise');
    
    if (options.token) {
      urlParams.append('token', options.token);
    }
    
    if (options.theme) {
      urlParams.append('theme', options.theme);
    }
    
    const fullUrl = `${qwenUrl}?${urlParams.toString()}`;
    
    return await this.loadUrl(fullUrl, this.studioLabContainerId, {
      allowFullscreen: true,
      allowPayment: false,
      ...options
    });
  }

  // Cargar Qwen con integración MCP
  async loadQwenWithMCP(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Cargar Qwen con características MCP
    const qwenUrl = options.url || 'https://qwen.chat.ai';
    
    const urlParams = new URLSearchParams();
    urlParams.append('from', 'studiolab');
    urlParams.append('integration', 'mcp');
    urlParams.append('mcp_port', '19875');
    
    if (options.token) {
      urlParams.append('token', options.token);
    }
    
    const fullUrl = `${qwenUrl}?${urlParams.toString()}`;
    
    return await this.loadUrl(fullUrl, this.studioLabContainerId, {
      allowFullscreen: true,
      allowPayment: false,
      ...options
    });
  }
}

// Instancia global
let qwenEmbedder = null;
let studioLabEmbedder = null;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    qwenEmbedder = new QwenUrlEmbedder();
    studioLabEmbedder = new StudioLabQwenEmbedder();
  });
} else {
  qwenEmbedder = new QwenUrlEmbedder();
  studioLabEmbedder = new StudioLabQwenEmbedder();
}

// Hacer disponible globalmente
window.QwenUrlEmbedder = QwenUrlEmbedder;
window.StudioLabQwenEmbedder = StudioLabQwenEmbedder;
window.qwenEmbedder = qwenEmbedder;
window.studioLabEmbedder = studioLabEmbedder;

// Funciones de acceso rápido
window.embedQwenUrl = async function(url, containerId, options = {}) {
  if (!qwenEmbedder) {
    qwenEmbedder = new QwenUrlEmbedder();
  }
  
  return await qwenEmbedder.loadUrl(url, containerId, options);
};

window.embedQwenOfficial = async function(containerId, options = {}) {
  if (!qwenEmbedder) {
    qwenEmbedder = new QwenUrlEmbedder();
  }
  
  return await qwenEmbedder.loadQwenOfficial(containerId, options);
};

window.embedQwenInStudioLab = async function(options = {}) {
  if (!studioLabEmbedder) {
    studioLabEmbedder = new StudioLabQwenEmbedder();
  }
  
  return await studioLabEmbedder.loadQwenInStudioLab(options);
};

window.embedQwenWithMCP = async function(options = {}) {
  if (!studioLabEmbedder) {
    studioLabEmbedder = new StudioLabQwenEmbedder();
  }
  
  return await studioLabEmbedder.loadQwenWithMCP(options);
};

console.log('✅ Sistema de embebido de Qwen inicializado');
console.log('✅ Disponible: window.qwenEmbedder, window.embedQwenUrl, window.embedQwenInStudioLab');

// Exportar para uso en módulos Node.js si es necesario
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QwenUrlEmbedder,
    StudioLabQwenEmbedder,
    qwenEmbedder,
    studioLabEmbedder
  };
}