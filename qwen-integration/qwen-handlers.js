/**
 * QWEN INTEGRATION HANDLERS - SOLUCIÓN CORREGIDA
 * 
 * El problema: Qwen usa React y manipular el DOM directamente no funciona
 * porque React no detecta los cambios (usa eventos sintéticos).
 * 
 * La solución: Usar Object.getOwnPropertyDescriptor para acceder al 
 * native setter del input y forzar a React a detectar el cambio.
 */

const { BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Variables globales
let qwenBrowserView = null;
let qwenCookieInterval = null;
let mainWindow = null;

// Función para inicializar con referencia a mainWindow
function initQwenHandlers(mw) {
  mainWindow = mw;
}

// ============ GUARDAR COOKIES ============
async function saveQwenCookies(qwenSession, cookiesPath) {
  try {
    const cookies = await qwenSession.cookies.get({ domain: '.qwenlm.ai' });
    const cookies2 = await qwenSession.cookies.get({ domain: 'qwenlm.ai' });
    const cookies3 = await qwenSession.cookies.get({ domain: 'chat.qwenlm.ai' });
    const allCookies = [...cookies, ...cookies2, ...cookies3];
    
    if (allCookies.length > 0) {
      await fs.promises.writeFile(cookiesPath, JSON.stringify(allCookies, null, 2));
      console.log(`[QWEN] 💾 ${allCookies.length} cookies guardadas`);
    }
  } catch (e) {
    console.warn('[QWEN] ⚠️ Error guardando cookies:', e.message);
  }
}

// ============ CARGAR COOKIES ============
async function loadQwenCookies(qwenSession, cookiesPath) {
  try {
    if (fs.existsSync(cookiesPath)) {
      const cookiesData = await fs.promises.readFile(cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesData);
      console.log(`[QWEN] 📦 Cargando ${cookies.length} cookies...`);
      
      for (const cookie of cookies) {
        try {
          await qwenSession.cookies.set({
            url: cookie.url || 'https://qwenlm.ai',
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure !== false,
            httpOnly: cookie.httpOnly !== false,
            expirationDate: cookie.expirationDate
          });
        } catch (e) {
          // Ignorar cookies inválidas
        }
      }
      console.log('[QWEN] ✅ Cookies cargadas');
      return true;
    }
  } catch (e) {
    console.warn('[QWEN] ⚠️ Error cargando cookies:', e.message);
  }
  return false;
}

// ============ CÓDIGO JAVASCRIPT PARA INYECTAR EN QWEN ============
const QWEN_INJECT_SCRIPT = `
(function() {
  if (window.__QWEN_STUDIO_INJECTED__) return;
  window.__QWEN_STUDIO_INJECTED__ = true;

  console.log('[QWEN-Studio] 🎯 Script de integración inyectado');

  // Almacenar última respuesta
  window.__QWEN_LAST_RESPONSE__ = null;
  window.__QWEN_STATE__ = 'idle'; // idle, thinking, responding, complete

  // ============ FUNCIÓN PARA ENVIAR MENSAJE (COMPATIBLE CON REACT) ============
  window.__QWEN_SEND_MESSAGE__ = async function(message) {
    console.log('[QWEN-Studio] 📤 Enviando mensaje:', message.substring(0, 50) + '...');
    
    // Estrategia 1: Buscar textarea/input
    const inputSelectors = [
      'textarea[placeholder]',
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"]'
    ];

    let inputElement = null;
    for (const selector of inputSelectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        inputElement = el;
        break;
      }
    }

    if (!inputElement) {
      console.error('[QWEN-Studio] ❌ No se encontró input');
      return { success: false, error: 'Input no encontrado' };
    }

    console.log('[QWEN-Studio] ✅ Input encontrado:', inputElement.tagName);

    try {
      // Enfocar el input
      inputElement.focus();
      await new Promise(r => setTimeout(r, 100));

      // *** MÉTODO CORRECTO PARA REACT ***
      // Obtener el native value setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement?.prototype || window.HTMLInputElement.prototype, 
        'value'
      )?.set;

      if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
        // Usar el setter nativo para que React detecte el cambio
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(inputElement, message);
        } else {
          inputElement.value = message;
        }

        // Disparar evento input que React puede capturar
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        inputElement.dispatchEvent(inputEvent);

        // También disparar change
        const changeEvent = new Event('change', { bubbles: true });
        inputElement.dispatchEvent(changeEvent);

      } else if (inputElement.getAttribute('contenteditable') === 'true') {
        // Para contenteditable
        inputElement.textContent = message;
        inputElement.innerHTML = message;
        
        // Disparar eventos
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: message
        });
        inputElement.dispatchEvent(inputEvent);
      }

      console.log('[QWEN-Studio] ✅ Texto inyectado');
      await new Promise(r => setTimeout(r, 200));

      // Buscar y hacer clic en el botón de enviar
      const sendButton = findSendButton();
      if (sendButton) {
        console.log('[QWEN-Studio] 🔘 Clic en botón enviar');
        sendButton.click();
        return { success: true, method: 'button_click' };
      }

      // Alternativa: enviar con Enter
      console.log('[QWEN-Studio] ⌨️ Enviando con Enter');
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      inputElement.dispatchEvent(enterEvent);
      
      return { success: true, method: 'enter_key' };

    } catch (error) {
      console.error('[QWEN-Studio] ❌ Error:', error);
      return { success: false, error: error.message };
    }
  };

  // ============ BUSCAR BOTÓN DE ENVIAR ============
  function findSendButton() {
    const selectors = [
      'button[type="submit"]:not([disabled])',
      'button[aria-label*="send" i]:not([disabled])',
      'button[aria-label*="enviar" i]:not([disabled])',
      'button svg[class*="send" i]',
      'button:has(svg):not([disabled])'
    ];

    for (const selector of selectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn && btn.offsetParent !== null && !btn.disabled) {
          // Verificar que tenga un SVG (icono de enviar)
          if (btn.querySelector('svg') || btn.textContent.toLowerCase().includes('send')) {
            return btn;
          }
        }
      } catch (e) {}
    }

    // Buscar cualquier botón cerca del input
    const inputContainer = document.querySelector('textarea, [contenteditable="true"]')?.closest('form, div');
    if (inputContainer) {
      const buttons = inputContainer.querySelectorAll('button:not([disabled])');
      for (const btn of buttons) {
        if (btn.querySelector('svg') && btn.offsetParent !== null) {
          return btn;
        }
      }
    }

    return null;
  }

  // ============ OBSERVAR RESPUESTAS ============
  function setupResponseObserver() {
    let lastResponseText = '';
    
    const observer = new MutationObserver((mutations) => {
      // Buscar contenedor de mensajes
      const messageContainers = document.querySelectorAll('[class*="message"], [class*="response"], [class*="chat"]');
      
      for (const container of messageContainers) {
        const text = container.textContent || '';
        if (text.length > lastResponseText.length && text !== lastResponseText) {
          // Detectar si es respuesta del asistente
          if (container.querySelector('[class*="assistant"]') || 
              container.closest('[class*="assistant"]') ||
              !container.querySelector('[class*="user"]')) {
            
            lastResponseText = text;
            window.__QWEN_LAST_RESPONSE__ = text;
            window.__QWEN_STATE__ = 'responding';
            
            // Notificar a Electron
            if (window.__QWEN_ON_RESPONSE__) {
              window.__QWEN_ON_RESPONSE__({
                type: 'response_update',
                text: text,
                state: 'responding'
              });
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('[QWEN-Studio] 👀 Observador de respuestas configurado');
  }

  // ============ VERIFICAR ESTADO DE LOGIN ============
  window.__QWEN_CHECK_LOGIN__ = function() {
    // Verificar si hay elementos de usuario logueado
    const loginIndicators = [
      document.querySelector('[class*="avatar"]'),
      document.querySelector('[class*="user-menu"]'),
      document.querySelector('[class*="profile"]'),
      document.querySelector('img[alt*="avatar" i]')
    ];

    const logoutIndicators = [
      document.querySelector('button[class*="login" i]'),
      document.querySelector('a[href*="login" i]'),
      document.querySelector('[class*="sign-in" i]')
    ];

    const isLoggedIn = loginIndicators.some(el => el !== null) && 
                       !logoutIndicators.some(el => el !== null);

    return {
      isLoggedIn: isLoggedIn,
      url: window.location.href,
      hasAvatar: !!loginIndicators[0],
      hasLoginButton: !!logoutIndicators[0]
    };
  };

  // Configurar observador cuando la página esté lista
  if (document.readyState === 'complete') {
    setupResponseObserver();
  } else {
    window.addEventListener('load', setupResponseObserver);
  }

  console.log('[QWEN-Studio] ✅ Integración lista');
})();
`;



// ============ HANDLER: TOGGLE QWEN PANEL ============
function registerQwenToggleHandler(app) {
  ipcMain.handle('qwen:toggle', async (_e, params) => {
    const show = typeof params === 'object' ? params.show : params;
    console.log('[QWEN] Toggle:', show ? 'SHOW' : 'HIDE');

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Ventana no disponible' };
    }

    if (show) {
      // MOSTRAR QWEN
      if (!qwenBrowserView) {
        console.log('[QWEN] Creando BrowserView...');

        const qwenSession = session.fromPartition('persist:qwen3');
        const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');

        qwenBrowserView = new BrowserView({
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            sandbox: true,
            session: qwenSession
          }
        });

        // Cargar cookies guardadas
        await loadQwenCookies(qwenSession, cookiesPath);

        // Cargar URL
        qwenBrowserView.webContents.loadURL('https://chat.qwenlm.ai');
        console.log('[QWEN] 🔄 Cargando chat.qwenlm.ai...');

        // Cuando termine de cargar
        qwenBrowserView.webContents.on('did-finish-load', async () => {
          console.log('[QWEN] ✅ Página cargada');
          
          // Guardar cookies
          await saveQwenCookies(qwenSession, cookiesPath);

          // Inyectar script de integración
          setTimeout(async () => {
            if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
              try {
                await qwenBrowserView.webContents.executeJavaScript(QWEN_INJECT_SCRIPT);
                console.log('[QWEN] ✅ Script inyectado');
              } catch (e) {
                console.error('[QWEN] ⚠️ Error inyectando script:', e.message);
              }
            }
          }, 2000);
        });

        // Error de carga
        qwenBrowserView.webContents.on('did-fail-load', (e, code, desc, url) => {
          console.error('[QWEN] ❌ Error:', code, desc, url);
        });

        // Guardar cookies al navegar
        qwenBrowserView.webContents.on('did-navigate', async (e, url) => {
          console.log('[QWEN] 🧭 Navegado a:', url);
          await saveQwenCookies(qwenSession, cookiesPath);
        });

        // Guardar cookies periódicamente
        if (qwenCookieInterval) clearInterval(qwenCookieInterval);
        qwenCookieInterval = setInterval(async () => {
          if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
            await saveQwenCookies(qwenSession, cookiesPath);
          }
        }, 30000);
      }

      // Asignar al mainWindow
      mainWindow.setBrowserView(qwenBrowserView);

      // Configurar posición (panel lateral derecho 40%)
      const updateBounds = () => {
        if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) return;
        if (!mainWindow || mainWindow.isDestroyed()) return;

        const [width, height] = mainWindow.getContentSize();
        const panelWidth = Math.floor(width * 0.4);
        
        qwenBrowserView.setBounds({
          x: width - panelWidth,
          y: 0,
          width: panelWidth,
          height: height
        });
      };

      updateBounds();
      mainWindow.on('resize', updateBounds);

      return { success: true, visible: true };

    } else {
      // OCULTAR QWEN
      if (qwenBrowserView) {
        mainWindow.setBrowserView(null);
        console.log('[QWEN] Panel ocultado');
      }
      return { success: true, visible: false };
    }
  });
}

// ============ HANDLER: ENVIAR MENSAJE ============
function registerQwenSendMessageHandler() {
  ipcMain.handle('qwen:sendMessage', async (_e, { message }) => {
    if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
      return { success: false, error: 'QWEN no está abierto. Abre el panel primero.' };
    }

    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Mensaje inválido' };
    }

    console.log(`[QWEN] 📤 Enviando: "${message.substring(0, 50)}..."`);

    try {
      // Usar la función inyectada para enviar el mensaje
      const result = await qwenBrowserView.webContents.executeJavaScript(`
        (async function() {
          if (typeof window.__QWEN_SEND_MESSAGE__ !== 'function') {
            return { success: false, error: 'Script de integración no cargado' };
          }
          return await window.__QWEN_SEND_MESSAGE__(${JSON.stringify(message)});
        })();
      `);

      console.log('[QWEN] Resultado:', result);
      return result;

    } catch (error) {
      console.error('[QWEN] ❌ Error:', error.message);
      return { success: false, error: error.message };
    }
  });
}

// ============ HANDLER: VERIFICAR LOGIN ============
function registerQwenLoginCheckHandler() {
  ipcMain.handle('qwen:checkLogin', async () => {
    if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
      return { success: false, isLoggedIn: false, error: 'Panel no abierto' };
    }

    try {
      const result = await qwenBrowserView.webContents.executeJavaScript(`
        (function() {
          if (typeof window.__QWEN_CHECK_LOGIN__ === 'function') {
            return window.__QWEN_CHECK_LOGIN__();
          }
          return { isLoggedIn: false, error: 'Script no cargado' };
        })();
      `);

      return { success: true, ...result };
    } catch (e) {
      return { success: false, isLoggedIn: false, error: e.message };
    }
  });
}

// ============ HANDLER: ABRIR LOGIN EN POPUP ============
function registerQwenLoginHandler(app) {
  ipcMain.handle('qwen:login', async () => {
    console.log('[QWEN] Abriendo ventana de login...');

    const { BrowserWindow } = require('electron');
    const qwenSession = session.fromPartition('persist:qwen3');

    // Crear ventana de login
    const loginWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: qwenSession
      }
    });

    loginWindow.loadURL('https://qwenlm.ai/auth/login');

    // Cuando navegue al chat (login exitoso)
    loginWindow.webContents.on('did-navigate', async (e, url) => {
      console.log('[QWEN-Login] Navegado a:', url);
      
      if (url.includes('chat.qwenlm.ai') || url === 'https://qwenlm.ai/') {
        console.log('[QWEN-Login] ✅ Login exitoso');
        
        // Guardar cookies
        const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');
        await saveQwenCookies(qwenSession, cookiesPath);

        // Recargar BrowserView si existe
        if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
          qwenBrowserView.webContents.reload();
        }

        // Cerrar ventana de login
        setTimeout(() => loginWindow.close(), 500);
      }
    });

    return { success: true, message: 'Ventana de login abierta' };
  });
}

// ============ HANDLER: LOGOUT ============
function registerQwenLogoutHandler(app) {
  ipcMain.handle('qwen:logout', async () => {
    console.log('[QWEN] Cerrando sesión...');

    const qwenSession = session.fromPartition('persist:qwen3');

    // Limpiar cookies
    try {
      await qwenSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'sessionstorage']
      });
      
      // Eliminar archivo de cookies
      const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');
      if (fs.existsSync(cookiesPath)) {
        fs.unlinkSync(cookiesPath);
      }

      // Recargar BrowserView
      if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
        qwenBrowserView.webContents.reload();
      }

      console.log('[QWEN] ✅ Sesión cerrada');
      return { success: true };
    } catch (e) {
      console.error('[QWEN] ❌ Error:', e.message);
      return { success: false, error: e.message };
    }
  });
}

// ============ HANDLER: OBTENER ÚLTIMA RESPUESTA ============
function registerQwenGetResponseHandler() {
  ipcMain.handle('qwen:getResponse', async () => {
    if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
      return { success: false, response: null };
    }

    try {
      const result = await qwenBrowserView.webContents.executeJavaScript(`
        (function() {
          return {
            response: window.__QWEN_LAST_RESPONSE__ || null,
            state: window.__QWEN_STATE__ || 'unknown'
          };
        })();
      `);

      return { success: true, ...result };
    } catch (e) {
      return { success: false, response: null, error: e.message };
    }
  });
}

// ============ EXPORTAR FUNCIÓN DE REGISTRO ============
function registerAllQwenHandlers(app, mw) {
  mainWindow = mw;
  
  registerQwenToggleHandler(app);
  registerQwenSendMessageHandler();
  registerQwenLoginCheckHandler();
  registerQwenLoginHandler(app);
  registerQwenLogoutHandler(app);
  registerQwenGetResponseHandler();

  console.log('[QWEN] ✅ Todos los handlers registrados');
}

module.exports = {
  registerAllQwenHandlers,
  initQwenHandlers,
  QWEN_INJECT_SCRIPT
};
