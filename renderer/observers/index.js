// 📦 OBSERVER 2.0 — Punto de entrada único
const { startObserver } = require('./core');
const { autoQwenHandler } = require('./integrators/qwen');

// Configuración por defecto para Sandra Studio
function startSandraObserver(containerSelector = '#chat-container') {
  return startObserver(containerSelector, {
    onCode: (item) => {
      console.log('🔹 Código detectado:', item.lang, `(${item.content.length} chars)`);
      autoQwenHandler(item); // Envía automáticamente a Qwen si es código válido
    },
    onMedia: (item) => {
      console.log('🖼️ Media detectado:', item.type, item.url);
    },
    onDocument: (item) => {
      console.log('📄 Documento detectado:', item.type, item.label);
    },
    onMessage: (item) => {
      console.log('💬 Texto detectado:', item.content.slice(0, 40) + '...');
    }
  });
}

// Export
module.exports = { startObserver, startSandraObserver };
exports.startObserver = startObserver;
exports.startSandraObserver = startSandraObserver;