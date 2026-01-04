// 🧠 OBSERVER 2.0 — Core Engine
// Detecta cambios en el DOM, extrae elementos, procesa y envía a integrators.
// Uso: startObserver('#chat-container', { onMessage, onCode, onMedia });

class ObserverCore {
  constructor(containerSelector, handlers = {}) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) throw new Error(`Container not found: ${containerSelector}`);
    
    this.handlers = {
      onMessage: handlers.onMessage || (() => {}),
      onCode: handlers.onCode || (() => {}),
      onMedia: handlers.onMedia || (() => {}),
      onDocument: handlers.onDocument || (() => {}),
    };

    this.seenMessages = new Set(); // Evita duplicados
    this.observer = null;
  }

  start() {
    // 1. Procesar lo que ya existe
    this.processExisting();

    // 2. Observar cambios futuros
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processNode(node);
            }
          });
        }
      }
    });

    this.observer.observe(this.container, {
      childList: true,
      subtree: true
    });

    console.log('✅ Observer 2.0 activado en', this.container);
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      console.log('⏹️ Observer detenido');
    }
  }

  processExisting() {
    const allNodes = this.container.querySelectorAll('*');
    allNodes.forEach(node => this.processNode(node, true));
  }

  processNode(node, isInitial = false) {
    // Saltar si ya lo procesamos
    const id = node.id || node.dataset.obsId || `${node.tagName}-${node.className}-${node.textContent?.slice(0,20)}`;
    if (this.seenMessages.has(id) && !isInitial) return;
    this.seenMessages.add(id);
    node.dataset.obsId = id;

    // Detectar tipo de nodo
    if (this.isCodeBlock(node)) {
      this.extractCode(node, id);
    } else if (this.isMediaElement(node)) {
      this.extractMedia(node, id);
    } else if (this.isDocumentButton(node)) {
      this.extractDocument(node, id);
    } else if (this.isChatMessage(node)) {
      this.extractText(node, id);
    }
  }

  // 🔍 Detectores
  isCodeBlock(node) {
    return node.tagName === 'PRE' || 
           (node.querySelector('code') && node.textContent.trim().length > 20) ||
           node.classList.contains('code-block') ||
           node.style.fontFamily?.includes('monospace');
  }

  isMediaElement(node) {
    return node.tagName === 'IMG' || 
           node.tagName === 'VIDEO' || 
           node.tagName === 'AUDIO' ||
           (node.tagName === 'BUTTON' && /video|image|audio/i.test(node.textContent));
  }

  isDocumentButton(node) {
    return node.tagName === 'BUTTON' && 
           /pdf|document|txt|csv|zip/i.test(node.textContent || node.title || '');
  }

  isChatMessage(node) {
    return node.classList.contains('message') ||
           node.classList.contains('chat-bubble') ||
           (node.parentElement && node.parentElement.classList.contains('chat'));
  }

  // 🧩 Extractores
  extractCode(node, id) {
    let code = '';
    let lang = 'plaintext';

    // Método 1: <pre><code class="language-js">...</code></pre>
    const codeTag = node.querySelector('code');
    if (codeTag) {
      code = codeTag.textContent || codeTag.innerText;
      const cls = codeTag.className || '';
      const match = cls.match(/language-(\w+)/);
      if (match) lang = match[1];
    } else {
      // Método 2: contenido directo
      code = node.textContent || node.innerText;
    }

    if (code.trim().length > 5) {
      const item = { id, type: 'code', lang, content: code.trim(), sourceNode: node };
      this.handlers.onCode(item);
      this.sendToMemory(item);
    }
  }

  extractMedia(node, id) {
    let url = '';
    let type = 'unknown';

    if (node.tagName === 'IMG') {
      url = node.src;
      type = 'image';
    } else if (node.tagName === 'VIDEO') {
      url = node.src || (node.querySelector('source')?.src);
      type = 'video';
    } else if (node.tagName === 'AUDIO') {
      url = node.src || (node.querySelector('source')?.src);
      type = 'audio';
    } else if (node.tagName === 'BUTTON') {
      // Botón de generación → esperar elemento generado
      setTimeout(() => {
        const newMedia = node.parentElement?.querySelector('img,video,audio');
        if (newMedia) this.extractMedia(newMedia, `${id}-generated`);
      }, 500);
      return;
    }

    if (url) {
      const item = { id, type, url, sourceNode: node };
      this.handlers.onMedia(item);
      this.sendToMemory(item);
    }
  }

  extractDocument(node, id) {
    const text = (node.textContent || node.title || '').toLowerCase();
    let type = 'document';
    if (text.includes('pdf')) type = 'pdf';
    if (text.includes('txt')) type = 'txt';
    if (text.includes('csv')) type = 'csv';
    if (text.includes('zip')) type = 'zip';

    const item = { id, type, label: node.textContent, sourceNode: node };
    this.handlers.onDocument(item);
    this.sendToMemory(item);
  }

  extractText(node, id) {
    let text = node.textContent || node.innerText;
    // Limpiar espacios y saltos múltiples
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length > 10 && !this.isNoise(node, text)) {
      const item = { id, type: 'text', content: text, sourceNode: node };
      this.handlers.onMessage(item);
      this.sendToMemory(item);
    }
  }

  isNoise(node, text) {
    return text.length < 10 || 
           /loading|enviando|.../i.test(text) ||
           node.classList.contains('loading') ||
           getComputedStyle(node).opacity === '0';
  }

  sendToMemory(item) {
    if (window.sandraMemory && typeof window.sandraMemory.store === 'function') {
      window.sandraMemory.store(`obs-${item.id}`, JSON.stringify(item));
    }
  }
}

// Export
function startObserver(containerSelector, handlers) {
  const obs = new ObserverCore(containerSelector, handlers);
  obs.start();
  return obs;
}

module.exports = { startObserver, ObserverCore };
exports.startObserver = startObserver;