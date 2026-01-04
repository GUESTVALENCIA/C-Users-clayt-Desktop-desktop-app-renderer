// 🌀 QWEN INTEGRATOR — recibe código limpio y lo envía
const { cleanCodeBlock } = require('../processors/code');

function sendToQwen(codeItem, options = {}) {
  const { code, lang } = cleanCodeBlock(codeItem.content, codeItem.lang);
  
  if (code.length < 5) return Promise.resolve(null);

  const prompt = options.enhance 
    ? `Analiza y mejora este código ${lang}:\n\`\`\`${lang}\n${code}\n\`\`\``
    : `Explica este código ${lang}:\n\`\`\`${lang}\n${code}\n\`\`\``;

  console.log(`🌀 Enviando a Qwen (${lang}):`, prompt.slice(0, 50) + '...');

  // Tu función existente — la llamamos si existe
  if (typeof window.qwenChat === 'function') {
    return window.qwenChat(prompt);
  } else if (typeof window.sendWithActiveModel === 'function') {
    return window.sendWithActiveModel(prompt);
  } else {
    return Promise.reject(new Error('Qwen no disponible'));
  }
}

// Auto-ejecución si se configura
function autoQwenHandler(codeItem) {
  if (codeItem.lang && codeItem.lang !== 'plaintext') {
    sendToQwen(codeItem).then(response => {
      if (response) {
        // Guardar respuesta en memoria
        window.sandraMemory?.store(`qwen-response-${codeItem.id}`, JSON.stringify({
          input: codeItem,
          output: response,
          timestamp: Date.now()
        }));
      }
    }).catch(err => console.warn('Qwen falló:', err));
  }
}

module.exports = { sendToQwen, autoQwenHandler };
exports.sendToQwen = sendToQwen;
exports.autoQwenHandler = autoQwenHandler;