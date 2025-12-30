/**
 * CANVAS CORE — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Lienzo interactivo en tiempo real con:
 * - Dibujo libre (mouse/touch)
 * - Sistema de capas
 * - Exportación PNG
 * - Integración con Sandra
 * ═══════════════════════════════════════════════════════════════════════════
 */

(() => {
  'use strict';

  // Buscar canvas o crearlo si no existe
  let canvas = document.getElementById('mainCanvas');
  let ctx = null;
  
  if (!canvas) {
    // Crear canvas si no existe
    canvas = document.createElement('canvas');
    canvas.id = 'mainCanvas';
    canvas.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      background: #14141a;
    `;
    
    // Buscar contenedor o crear uno
    let container = document.getElementById('canvasContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'canvasContainer';
      container.style.cssText = `
        position: relative;
        background: #14141a;
        overflow: hidden;
        flex: 1;
      `;
      document.body.appendChild(container);
    }
    
    container.appendChild(canvas);
  }

  if (!canvas.getContext) {
    console.error('[CANVAS] ⚠️ Canvas no soportado');
    return;
  }

  ctx = canvas.getContext('2d');
  
  // 🎨 Estado del lienzo
  let layers = [{ 
    id: 'base', 
    visible: true, 
    imageData: null,
    name: 'Capa Base'
  }];
  
  let currentLayerIndex = 0;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'pen';
  let currentColor = '#66ccff';
  let currentLineWidth = 3;

  // 📐 Ajustar tamaño del canvas
  function resize() {
    const container = canvas.parentElement;
    if (!container) return;

    const { clientWidth, clientHeight } = container;
    const dpr = window.devicePixelRatio || 1;

    // Ajustar tamaño físico
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;

    // Ajustar tamaño CSS
    canvas.style.width = clientWidth + 'px';
    canvas.style.height = clientHeight + 'px';

    // Escalar contexto
    ctx.scale(dpr, dpr);

    // Redibujar capas
    redraw();
    
    console.log(`[CANVAS] 📐 Redimensionado: ${clientWidth}x${clientHeight} (DPR: ${dpr})`);
  }

  // 🎨 Redibujar todas las capas visibles
  function redraw() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), 
                         canvas.height / (window.devicePixelRatio || 1));

    // Redibujar capas visibles
    layers.filter(l => l.visible).forEach(layer => {
      if (layer.imageData) {
        ctx.putImageData(layer.imageData, 0, 0);
      }
    });
  }

  // 💾 Guardar estado de la capa actual
  function saveCurrentLayer() {
    if (layers[currentLayerIndex]) {
      const dpr = window.devicePixelRatio || 1;
      layers[currentLayerIndex].imageData = ctx.getImageData(
        0, 0, 
        canvas.width / dpr, 
        canvas.height / dpr
      );
    }
  }

  // ✏️ Iniciar dibujo
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    lastX = (e.clientX - rect.left);
    lastY = (e.clientY - rect.top);

    // Configurar estilo según herramienta
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Iniciar trazo
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  }

  // ✏️ Continuar dibujo
  function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  // ✏️ Finalizar dibujo
  function stopDrawing() {
    if (!isDrawing) return;
    
    isDrawing = false;
    ctx.closePath();

    // Guardar estado en capa actual
    saveCurrentLayer();

    // Notificar a Sandra
    notifyCanvasUpdate();
  }

  // 📡 Notificar cambios a Sandra
  function notifyCanvasUpdate() {
    const payload = {
      type: 'canvas-updated',
      layerCount: layers.length,
      currentLayer: currentLayerIndex,
      timestamp: Date.now()
    };

    // Enviar a Sandra
    if (window.sandraAPI && typeof window.sandraAPI.canvasUpdated === 'function') {
      window.sandraAPI.canvasUpdated(payload);
    } else if (window.electronAPI && typeof window.electronAPI.sendCanvasUpdate === 'function') {
      window.electronAPI.sendCanvasUpdate(payload);
    } else if (window.ipcRenderer) {
      window.ipcRenderer.send('sandra:canvas-update', payload);
    } else {
      // Fallback: CustomEvent
      document.dispatchEvent(new CustomEvent('sandra:canvas-updated', { detail: payload }));
    }
  }

  // 🖱️ Event listeners de mouse
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // 👆 Event listeners de touch (móvil)
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
  });

  // 📐 Ajustar tamaño inicial y en resize
  window.addEventListener('resize', () => {
    setTimeout(resize, 100); // Debounce
  });

  // Inicializar
  resize();

  // 🌐 API global para control externo
  window.canvasAPI = {
    // Exportar como PNG
    exportPNG() {
      return canvas.toDataURL('image/png');
    },

    // Exportar como base64
    exportBase64(format = 'png') {
      return canvas.toDataURL(`image/${format}`);
    },

    // Limpiar lienzo
    clear() {
      ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), 
                           canvas.height / (window.devicePixelRatio || 1));
      layers[0].imageData = null;
      notifyCanvasUpdate();
    },

    // Cambiar herramienta
    setTool(tool) {
      currentTool = tool;
      console.log(`[CANVAS] 🛠️ Herramienta cambiada a: ${tool}`);
    },

    // Cambiar color
    setColor(color) {
      currentColor = color;
      console.log(`[CANVAS] 🎨 Color cambiado a: ${color}`);
    },

    // Cambiar grosor de línea
    setLineWidth(width) {
      currentLineWidth = width;
      console.log(`[CANVAS] 📏 Grosor cambiado a: ${width}px`);
    },

    // Añadir capa
    addLayer(name = `Capa ${layers.length + 1}`) {
      layers.push({
        id: `layer_${Date.now()}`,
        visible: true,
        imageData: null,
        name
      });
      currentLayerIndex = layers.length - 1;
      notifyCanvasUpdate();
      return layers.length - 1;
    },

    // Obtener estado
    getState() {
      return {
        layers: layers.length,
        currentLayer: currentLayerIndex,
        tool: currentTool,
        color: currentColor,
        lineWidth: currentLineWidth
      };
    }
  };

  console.log('[CANVAS] ✅ Canvas Core inicializado');
})();

