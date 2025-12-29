// ============================================================================
// AI MODELS MANAGER - BrowserView Embedding System
// ============================================================================
// Maneja la carga y sincronización de múltiples modelos de IA en BrowserView
// Inspirado en: https://github.com/KingLeoJr/vscode-deepseek-web

const { BrowserView, session } = require('electron');

class AIModelsManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.views = new Map();
    this.activeViewId = null;
    this.responseInterceptors = new Map();

    console.log('[AI Models] ✅ Manager inicializado');
  }

  /**
   * Crear BrowserView para un modelo de IA
   * @param {string} modelId - ID único del modelo (chatgpt, qwen, gemini, deepseek)
   * @param {string} url - URL del chat web
   * @param {string} partition - Nombre de partición para persistencia de sesión
   */
  createModelView(modelId, url, partition) {
    // Si ya existe, devolverlo
    if (this.views.has(modelId)) {
      console.log(`[AI Models] ℹ️ ${modelId} ya existe`);
      return this.views.get(modelId);
    }

    console.log(`[AI Models] 📂 Creando BrowserView para ${modelId}...`);

    try {
      // Crear sesión persistente para este modelo
      // Esto permite mantener cookies y localStorage entre sesiones
      const modelSession = session.fromPartition(`persist:${partition}`);

      const view = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: undefined, // No usar preload para BrowserView
          webSecurity: false, // Permite OAuth popups y CORS
          allowRunningInsecureContent: true,
          enableRemoteModule: false,
          sandbox: false, // Necesario para algunos sitios
          partition: `persist:${partition}`,
          session: modelSession
        }
      });

      // Cargar la URL
      view.webContents.loadURL(url);

      // Configurar listeners para errores
      view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.warn(`[${modelId}] ⚠️ Error cargando:`, errorCode, errorDescription);
      });

      view.webContents.on('did-finish-load', () => {
        console.log(`[${modelId}] ✅ Cargado exitosamente`);
        // Inyectar script de interceptación de respuestas
        this.setupResponseInterceptor(view, modelId);
      });

      // Permitir popups para OAuth (Google, GitHub, etc.)
      view.webContents.setWindowOpenHandler(({ url }) => {
        console.log(`[${modelId}] 🔓 Popup permitido:`, url);
        return { action: 'allow' };
      });

      // Guardar view
      this.views.set(modelId, {
        id: modelId,
        view: view,
        url: url,
        partition: partition,
        visible: false,
        lastActivity: Date.now()
      });

      console.log(`[AI Models] ✅ ${modelId} creado con sesión persistente: persist:${partition}`);
      return view;
    } catch (error) {
      console.error(`[AI Models] ❌ Error creando ${modelId}:`, error);
      return null;
    }
  }

  /**
   * Inyectar script para interceptar respuestas del chat
   */
  setupResponseInterceptor(view, modelId) {
    const interceptorCode = `
      (function() {
        // Evitar inyecciones múltiples
        if (window.__aiResponseInterceptor__${modelId}) return;
        window.__aiResponseInterceptor__${modelId} = true;

        console.log('[Interceptor] ${modelId} interceptor activo');

        // MutationObserver para detectar nuevas respuestas en tiempo real
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node.nodeType !== 'SCRIPT') {
                // Buscar mensajes del asistente por atributos comunes
                const assistantSelectors = [
                  '[data-role="assistant"]',
                  '.assistant-message',
                  '.ai-response',
                  '[role="region"][aria-label*="assistant"]',
                  '.message-container.assistant',
                  '.chatbot-message',
                  '.bot-message'
                ];

                for (let selector of assistantSelectors) {
                  const assistantMsg = node.querySelector(selector);
                  if (assistantMsg && assistantMsg.innerText && assistantMsg.innerText.trim().length > 10) {
                    const responseText = assistantMsg.innerText;
                    console.log('[AI Response] ' + responseText.substring(0, 100) + '...');
                    break;
                  }
                }
              }
            });
          });
        });

        // Observar cambios en todo el documento
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: false
        });

        console.log('[Interceptor] ${modelId} observando respuestas');
      })();
    `;

    view.webContents.executeJavaScript(interceptorCode).catch(error => {
      console.warn(`[${modelId}] ⚠️ Error inyectando interceptor:`, error.message);
    });

    // Escuchar console messages para capturar respuestas
    view.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (message.startsWith('[AI Response]')) {
        const responseText = message.replace('[AI Response]', '').trim();
        this.handleModelResponse(modelId, responseText);
      }
    });
  }

  /**
   * Manejar respuesta interceptada de un modelo
   */
  handleModelResponse(modelId, responseText) {
    console.log(`[${modelId}] 📥 Respuesta interceptada:`, responseText.substring(0, 50) + '...');

    // Actualizar timestamp de actividad
    const modelData = this.views.get(modelId);
    if (modelData) {
      modelData.lastActivity = Date.now();
    }

    // Enviar a renderer vía IPC para procesamiento
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('ai-models:response', {
        modelId: modelId,
        response: responseText,
        timestamp: Date.now()
      });
    }

    // Ejecutar callbacks registrados
    const callbacks = this.responseInterceptors.get(modelId) || [];
    callbacks.forEach(cb => {
      try {
        cb(responseText);
      } catch (error) {
        console.error(`[${modelId}] ❌ Error en callback:`, error);
      }
    });
  }

  /**
   * Mostrar un modelo específico como panel lateral
   */
  showModel(modelId, width = 0.35) {
    const modelData = this.views.get(modelId);
    if (!modelData) {
      console.error(`[AI Models] ❌ Modelo ${modelId} no existe`);
      return { success: false, error: `Modelo ${modelId} no encontrado` };
    }

    try {
      // Ocultar vista previa si existe
      if (this.activeViewId && this.views.has(this.activeViewId)) {
        const prevView = this.views.get(this.activeViewId).view;
        if (prevView && !prevView.webContents.isDestroyed()) {
          this.mainWindow.setBrowserView(null);
        }
      }

      // Mostrar nueva vista
      const view = modelData.view;
      if (view && !view.webContents.isDestroyed()) {
        this.mainWindow.setBrowserView(view);

        // Calcular posición (panel lateral derecho)
        const { width: windowWidth, height: windowHeight } = this.mainWindow.getContentBounds();
        const panelWidth = Math.floor(windowWidth * width);

        view.setBounds({
          x: windowWidth - panelWidth,
          y: 44, // Alto de toolbar
          width: panelWidth,
          height: windowHeight - 44
        });

        this.activeViewId = modelId;
        modelData.visible = true;

        console.log(`[AI Models] ✅ Mostrando ${modelId} (${panelWidth}px ancho)`);
        return { success: true, message: `${modelId} visible` };
      } else {
        console.error(`[${modelId}] ❌ BrowserView destruido`);
        return { success: false, error: 'BrowserView destruido' };
      }
    } catch (error) {
      console.error(`[AI Models] ❌ Error mostrando ${modelId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ocultar el modelo activo
   */
  hideAll() {
    try {
      if (this.activeViewId && this.views.has(this.activeViewId)) {
        const modelData = this.views.get(this.activeViewId);
        if (modelData.view && !modelData.view.webContents.isDestroyed()) {
          this.mainWindow.setBrowserView(null);
          modelData.visible = false;
        }
      }

      this.activeViewId = null;
      console.log('[AI Models] ✅ Todos los modelos ocultos');
      return { success: true };
    } catch (error) {
      console.error('[AI Models] ❌ Error ocultando:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensaje a un modelo (inyectar en su interfaz)
   */
  async sendMessage(modelId, message) {
    const modelData = this.views.get(modelId);
    if (!modelData) {
      throw new Error(`Modelo ${modelId} no existe`);
    }

    const view = modelData.view;
    if (!view || view.webContents.isDestroyed()) {
      throw new Error(`BrowserView para ${modelId} está destruido`);
    }

    try {
      // Script que inyecta el mensaje en el input del chat
      const injectCode = `
        (async function() {
          // Buscar input de chat por selectores comunes
          const inputSelectors = [
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="message"]',
            'textarea[name="prompt"]',
            'textarea.chat-input',
            'input[type="text"]',
            'div[contenteditable="true"]',
            '#chat-input'
          ];

          let input = null;
          for (let selector of inputSelectors) {
            input = document.querySelector(selector);
            if (input && input.offsetHeight > 0) break;
          }

          if (!input) {
            console.error('[SendMessage] Input no encontrado');
            return false;
          }

          // Establecer el valor del mensaje
          if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            input.value = ${JSON.stringify(message)};
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (input.contentEditable === 'true') {
            input.innerText = ${JSON.stringify(message)};
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Buscar y hacer clic en botón de envío
          await new Promise(resolve => setTimeout(resolve, 100));

          const submitSelectors = [
            'button[type="submit"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="send"]',
            'button.send-button',
            'button.submit-button',
            '[role="button"][aria-label*="send"]'
          ];

          for (let selector of submitSelectors) {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetHeight > 0) {
              btn.click();
              console.log('[SendMessage] Mensaje enviado');
              return true;
            }
          }

          // Si no hay botón, intentar Enter
          input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true
          }));

          console.log('[SendMessage] Mensaje enviado con Enter');
          return true;
        })();
      `;

      await view.webContents.executeJavaScript(injectCode);
      console.log(`[${modelId}] 📤 Mensaje enviado:`, message.substring(0, 50));
      return true;
    } catch (error) {
      console.error(`[${modelId}] ❌ Error enviando mensaje:`, error);
      throw error;
    }
  }

  /**
   * Registrar callback para respuestas de un modelo
   */
  onResponse(modelId, callback) {
    if (!this.responseInterceptors.has(modelId)) {
      this.responseInterceptors.set(modelId, []);
    }
    this.responseInterceptors.get(modelId).push(callback);
  }

  /**
   * Obtener lista de modelos disponibles
   */
  listModels() {
    const models = [];
    this.views.forEach((data, modelId) => {
      models.push({
        id: modelId,
        url: data.url,
        partition: data.partition,
        visible: data.visible,
        lastActivity: data.lastActivity
      });
    });
    return models;
  }

  /**
   * Destruir un modelo (limpiar recursos)
   */
  destroyModel(modelId) {
    const modelData = this.views.get(modelId);
    if (!modelData) return;

    try {
      if (modelData.view && !modelData.view.webContents.isDestroyed()) {
        modelData.view.webContents.close();
      }
      this.views.delete(modelId);
      console.log(`[AI Models] ✅ ${modelId} destruido`);
    } catch (error) {
      console.error(`[AI Models] ❌ Error destruyendo ${modelId}:`, error);
    }
  }

  /**
   * Destruir todos los modelos
   */
  destroyAll() {
    this.views.forEach((data, modelId) => {
      this.destroyModel(modelId);
    });
    this.responseInterceptors.clear();
    console.log('[AI Models] ✅ Todos los modelos destruidos');
  }
}

module.exports = { AIModelsManager };
