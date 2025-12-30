/**
 * SMART BUTTON OBSERVER — Cley | Sandra-IA-8.0-Pro
 * ═══════════════════════════════════════════════════════════════════════════
 * Observer inteligente que SOLO observa botones con funcionalidad multimodal
 * - Evita repeticiones (idempotente)
 * - Ignora texto del chat y contenido irrelevante
 * - Envía payloads ligeros y estructurados
 * - 100% compatible con Electron + Sandra
 * ═══════════════════════════════════════════════════════════════════════════
 */

(() => {
  'use strict';

  // 🎯 Botones objetivo (solo estos serán observados)
  const TARGET_BUTTONS = [
    'cameraBtn',        // 📷 generación de imagen/video
    'artefactBtn',      // 🧩 generación de artefactos
    'videoGenBtn',      // 🎥 generación de video
    'micBtn',           // 🎙️ dictado/voz (no STT continuo)
    'uploadBtn',        // ➕ archivo adjunto
    'sendBtn'           // ➤ solo si está *habilitado* (evita falsos triggers)
  ];

  // 🔒 Control de idempotencia
  let lastAction = { id: null, ts: 0, hash: null };
  const DEBOUNCE_MS = 300;
  const MIN_TIME_BETWEEN_SAME_ACTION = 1000; // 1 segundo mínimo entre misma acción

  // 📤 Función de envío limpia al orquestador (Sandra/MCP)
  function emitAction(buttonId, type = 'click', metadata = {}) {
    const now = Date.now();
    
    // Verificar debounce
    if (lastAction.id === buttonId && now - lastAction.ts < DEBOUNCE_MS) {
      console.log(`[OBSERVER] ⏭️ Debounce: ignorando ${buttonId} (${now - lastAction.ts}ms)`);
      return;
    }

    // Verificar tiempo mínimo entre misma acción
    if (lastAction.id === buttonId && now - lastAction.ts < MIN_TIME_BETWEEN_SAME_ACTION) {
      console.log(`[OBSERVER] ⏭️ Rate limit: ignorando ${buttonId} repetido`);
      return;
    }

    // Generar hash del estado del botón para evitar duplicados
    const button = document.getElementById(buttonId);
    if (!button) {
      console.warn(`[OBSERVER] ⚠️ Botón ${buttonId} no encontrado`);
      return;
    }

    const buttonState = {
      id: buttonId,
      disabled: button.disabled,
      classList: Array.from(button.classList).join(','),
      text: button.textContent?.trim() || button.innerText?.trim() || ''
    };
    const currentHash = JSON.stringify(buttonState);

    // Si el hash es igual al anterior, ignorar (mismo estado)
    if (lastAction.hash === currentHash && lastAction.id === buttonId) {
      console.log(`[OBSERVER] ⏭️ Estado idéntico: ignorando ${buttonId}`);
      return;
    }

    // Actualizar último estado
    lastAction = { 
      id: buttonId, 
      ts: now, 
      hash: currentHash 
    };

    // Construir payload limpio
    const payload = {
      event: 'button-action',
      button: buttonId,
      action: type,
      timestamp: now,
      context: 'sandra_studio_ultimate',
      model_hint: getModelHint(buttonId),
      metadata: {
        disabled: button.disabled,
        ...metadata
      }
    };

    // 📡 Enviar a Sandra/Orquestador
    console.log('[OBSERVER] ✅', payload);

    // Intentar múltiples métodos de IPC
    let sent = false;

    // Método 1: window.sandraAPI (si existe)
    if (window.sandraAPI && typeof window.sandraAPI.handleButton === 'function') {
      window.sandraAPI.handleButton(payload);
      sent = true;
    }

    // Método 2: window.electronAPI (Electron IPC)
    if (window.electronAPI && typeof window.electronAPI.sendButtonEvent === 'function') {
      window.electronAPI.sendButtonEvent(payload);
      sent = true;
    }

    // Método 3: window.ipcRenderer (Electron directo)
    if (window.ipcRenderer && typeof window.ipcRenderer.send === 'function') {
      window.ipcRenderer.send('sandra:button', payload);
      sent = true;
    }

    // Método 4: CustomEvent (fallback)
    if (!sent) {
      const event = new CustomEvent('sandra:button-action', { detail: payload });
      document.dispatchEvent(event);
      console.log('[OBSERVER] 📢 Enviado vía CustomEvent (fallback)');
    }
  }

  // 🧠 Determinar qué modelo usar según el botón
  function getModelHint(buttonId) {
    const modelMap = {
      'cameraBtn': 'qwen-vl',      // Visión para imágenes
      'videoGenBtn': 'deepseek-r1', // Razonamiento para video
      'artefactBtn': 'deepseek-r1', // Código para artefactos
      'micBtn': 'qwen3-max',        // Texto para voz
      'uploadBtn': 'qwen-vl',       // Visión para archivos
      'sendBtn': 'qwen3-max'        // Texto para chat
    };
    return modelMap[buttonId] || 'qwen3-max';
  }

  // 🔍 Configuración del observer ligero (solo atributos relevantes)
  let observer = null;

  function initObserver() {
    // Desconectar observer anterior si existe
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // Buscar contenedor del chat o usar body
    const root = document.querySelector('#chatView') || 
                 document.querySelector('#chatContainer') || 
                 document.querySelector('.chat-container') ||
                 document.body;

    if (!root) {
      console.warn('[OBSERVER] ⚠️ No se encontró contenedor, reintentando en 1s...');
      setTimeout(initObserver, 1000);
      return;
    }

    // Crear observer que solo escucha cambios en atributos específicos
    observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        // Solo procesar cambios de atributos (no texto, no children)
        if (mut.type !== 'attributes') continue;

        const el = mut.target;
        
        // Verificar que sea un botón objetivo
        if (!el.id || !TARGET_BUTTONS.includes(el.id)) continue;

        // Caso 1: clic detectado (por algún proxy/evento)
        if (mut.attributeName === 'data-click') {
          emitAction(el.id, 'click');
          el.removeAttribute('data-click'); // limpieza inmediata
        }

        // Caso 2: estado cambiado (ej. sendBtn.disabled → false)
        if (mut.attributeName === 'disabled' && !el.disabled) {
          // Solo emitir si el botón se habilita (no cuando se deshabilita)
          emitAction(el.id, 'enabled');
        }

        // Caso 3: clase cambiada (ej. loading → ready)
        if (mut.attributeName === 'class') {
          const hasLoading = el.classList.contains('loading');
          const hadLoading = mut.oldValue?.includes('loading');
          
          // Si deja de estar en loading, es que terminó
          if (hadLoading && !hasLoading) {
            emitAction(el.id, 'ready');
          }
        }
      }
    });

    // Configurar observer: solo atributos, no contenido
    observer.observe(root, {
      subtree: true,              // Observar hijos
      attributes: true,           // Observar cambios de atributos
      attributeFilter: ['data-click', 'disabled', 'class', 'aria-busy'], // Solo estos atributos
      attributeOldValue: true     // Guardar valor anterior para comparar
    });

    console.log('[OBSERVER] ✅ Observer inicializado en:', root.id || 'body');

    // 💡 Añadir event listeners directos a los botones (más confiable que solo observer)
    TARGET_BUTTONS.forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn._smartObserverAttached) {
        btn._smartObserverAttached = true;
        
        // Listener de clic
        btn.addEventListener('click', (e) => {
          // Solo procesar si el botón no está deshabilitado
          if (!btn.disabled) {
            btn.setAttribute('data-click', Date.now().toString());
            emitAction(id, 'click', { 
              clientX: e.clientX, 
              clientY: e.clientY 
            });
          }
        }, { passive: true, once: false });

        // Listener de focus (para teclado)
        btn.addEventListener('focus', () => {
          if (!btn.disabled) {
            emitAction(id, 'focused');
          }
        }, { passive: true });
      }
    });

    console.log('[OBSERVER] ✅ Event listeners añadidos a', TARGET_BUTTONS.length, 'botones');
  }

  // 🔄 Reiniciar limpio si ya existía
  if (window.__smartObserver) {
    console.log('[OBSERVER] 🔄 Reiniciando observer anterior...');
    window.__smartObserver.disconnect();
  }

  // 🚀 Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initObserver, 500); // Pequeño delay para asegurar que los botones existan
    });
  } else {
    setTimeout(initObserver, 500);
  }

  // Exponer API global para control manual
  window.__smartObserver = {
    disconnect: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
    reconnect: initObserver,
    emitAction: emitAction,
    getLastAction: () => ({ ...lastAction })
  };

  console.log('[OBSERVER] 🚀 Smart Button Observer cargado');
})();

