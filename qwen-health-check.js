// ============================================
// qwen-health-check.js
// Sistema de verificación de disponibilidad de QWEN BrowserView
// ============================================

/**
 * Verifica que el BrowserView de QWEN está completamente listo
 * @param {BrowserView} browserView - BrowserView de QWEN
 * @param {number} timeout - Timeout en ms (default 20000)
 * @returns {Promise<boolean>}
 */
async function verifyQWENReady(browserView, timeout = 20000) {
  if (!browserView || !browserView.webContents) {
    throw new Error('BrowserView not available or invalid');
  }

  return Promise.race([
    new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = Math.ceil(timeout / 500); // 1 intento cada 500ms

      const interval = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(interval);
          reject(new Error(`BrowserView not ready after ${attempts * 500}ms`));
          return;
        }

        try {
          // Test 1: ¿Existe el DOM?
          const hasDom = await browserView.webContents.executeJavaScript(
            'typeof document !== "undefined" && document.body !== null'
          );

          if (!hasDom) {
            if (attempts % 10 === 0) {
              console.log(`[Health Check] ⏳ Attempt ${attempts}/${maxAttempts} - waiting for DOM`);
            }
            return;
          }

          // Test 2: ¿Está el contenido cargado?
          const hasContent = await browserView.webContents.executeJavaScript(
            'document.readyState === "complete" || document.readyState === "interactive"'
          );

          if (!hasContent) {
            if (attempts % 10 === 0) {
              console.log(`[Health Check] ⏳ Attempt ${attempts}/${maxAttempts} - waiting for content`);
            }
            return;
          }

          // Test 3: ¿Hay elementos interactivos?
          const hasInputs = await browserView.webContents.executeJavaScript(
            'document.querySelectorAll("input, textarea, [contenteditable]").length > 0'
          );

          if (hasInputs) {
            // ✅ TODO LISTO
            clearInterval(interval);
            const loadTime = attempts * 500;
            console.log(`[Health Check] ✅ QWEN Ready after ${loadTime}ms`);
            resolve(true);
            return;
          }

          if (attempts % 10 === 0) {
            console.log(`[Health Check] ⏳ Attempt ${attempts}/${maxAttempts} - waiting for inputs`);
          }
        } catch (e) {
          // Ignorar errores temporales - reintentar
          if (attempts % 20 === 0) {
            console.log(`[Health Check] ⚠️ Temporary error (attempt ${attempts}): ${e.message}`);
          }
        }
      }, 500); // Revisar cada 500ms
    }),

    new Promise((_r, reject) =>
      setTimeout(() => {
        reject(new Error(`BrowserView not ready after ${timeout}ms`));
      }, timeout)
    )
  ]);
}

/**
 * Envía un mensaje a QWEN con reintentos y exponential backoff
 * @param {BrowserView} browserView - BrowserView de QWEN
 * @param {string} message - Mensaje a enviar
 * @param {number} maxRetries - Máximo de reintentos
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendMessageWithRetry(browserView, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[QWEN] Intento ${attempt}/${maxRetries}...`);

      // 1. Health Check - con timeout dinámico
      const checkTimeout = attempt === 1 ? 20000 : 30000; // Más tiempo en reintentos
      console.log(`[QWEN] Verificando disponibilidad (timeout: ${checkTimeout}ms)...`);
      await verifyQWENReady(browserView, checkTimeout);
      console.log(`[QWEN] ✅ BrowserView disponible`);

      // 2. Inyectar y enviar mensaje
      const injectCode = `
        (function() {
          try {
            // Buscar input de mensaje (múltiples estrategias)
            let input = null;
            const strategies = [
              () => document.querySelector('[placeholder*="Cuéntame"]'),
              () => document.querySelector('[placeholder*="pregunta"]'),
              () => document.querySelector('[placeholder*="mensaje"]'),
              () => document.querySelector('[contenteditable="true"]'),
              () => document.querySelector('textarea'),
              () => document.querySelector('input[type="text"]:last-of-type'),
              () => document.querySelector('input[type="text"]')
            ];

            for (const strategy of strategies) {
              const found = strategy();
              if (found) {
                input = found;
                break;
              }
            }

            if (!input) {
              return { success: false, error: 'Input no encontrado con ninguna estrategia' };
            }

            // Establecer foco
            input.focus();

            // Asignar texto - múltiples métodos para máxima compatibilidad
            input.value = "${message.replace(/"/g, '\\"')}";
            input.textContent = "${message.replace(/"/g, '\\"')}";
            input.innerText = "${message.replace(/"/g, '\\"')}";

            // Disparar eventos en orden correcto
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            // Disparar KeyboardEvent para Enter
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true
            });
            input.dispatchEvent(enterEvent);

            // También intentar keypress y keyup para máxima compatibilidad
            input.dispatchEvent(new KeyboardEvent('keypress', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              bubbles: true
            }));
            input.dispatchEvent(new KeyboardEvent('keyup', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              bubbles: true
            }));

            return { success: true, message: 'Mensaje inyectado y enviado' };
          } catch (err) {
            return { success: false, error: err.message };
          }
        })();
      `;

      console.log(`[QWEN] Inyectando mensaje (${message.length} caracteres)...`);
      const result = await browserView.webContents.executeJavaScript(injectCode);

      if (result && result.success) {
        console.log(`[QWEN] ✅ Éxito en intento ${attempt}`);
        return { success: true, message: result.message };
      } else {
        const errorMsg = result?.error || 'Error desconocido';
        console.error(`[QWEN] ❌ Inyección falló en intento ${attempt}: ${errorMsg}`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s...
          console.log(`[QWEN] ⏳ Reintentando en ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    } catch (error) {
      console.error(`[QWEN] ❌ Error en intento ${attempt}:`, error.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s...
        console.log(`[QWEN] ⏳ Reintentando en ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        // Último intento falló
        return {
          success: false,
          error: error.message || 'Failed to send message after all retries'
        };
      }
    }
  }

  throw new Error('Failed to send message after all retries');
}

module.exports = {
  verifyQWENReady,
  sendMessageWithRetry
};
