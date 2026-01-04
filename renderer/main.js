// 🚀 SANDRA STUDIO — Punto de entrada principal (con voz)
// Todo listo: Observer, Orquestación, Memoria, Claude, Qwen, Voz.

console.log('🧠 Iniciando Sandra Studio con voz...');

// 1. Memoria persistente
const { memorySync } = require('./tools/claude_local/memory-sync.js');
window.memorySync = memorySync;

// 2. Orquestación inteligente
const { orchestrationEngine } = require('./auto-orchestration-engine.js');
window.orchestrationEngine = orchestrationEngine;

// 3. Observer 2.0
const { startSandraObserver } = require('./observers');
window.startSandraObserver = startSandraObserver;

// 4. UI de adjuntos
const { createAttachmentUI } = require('./tools/claude_local/attachment-ui.js');
window.createAttachmentUI = createAttachmentUI;

// 5. Voz (STT/TTS local)
const { voiceEngine } = require('./tools/voice/stt-tts.js');
window.voiceEngine = voiceEngine;

// 6. Integrar voz en orquestación
require('./tools/voice/orchestration-voice.js');

// 7. Integración MCP con servidor en Render
const mcpIntegration = require('./mcp-integration.js');
window.mcpIntegration = mcpIntegration;

// 7. Funciones de modelo (sustituir con tus implementaciones reales)
window.qwenChat = async (prompt) => {
  console.log('🌀 Qwen llamado con:', prompt.slice(0, 50));
  return `Respuesta de Qwen para: ${prompt.slice(0, 30)}...`;
};

window.deepSeekChat = async (prompt) => {
  console.log('🖼️ DeepSeek llamado con:', prompt.slice(0, 50));
  return `Respuesta de DeepSeek para: ${prompt.slice(0, 30)}...`;
};

// 8. Iniciar automáticamente
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Sandra Studio con voz cargado');
  
  // Iniciar Observer
  try {
    window.sandraObserver = startSandraObserver('.chat-messages, #chat-container, .messages');
  } catch (e) {
    console.warn('⚠️ Observer no pudo iniciarse:', e.message);
  }

  // Iniciar UI de adjuntos
  try {
    createAttachmentUI('.input-area, #input-container, .chat-input');
  } catch (e) {
    console.warn('📎 UI de adjuntos no disponible:', e.message);
  }

  // Activar barge-in por defecto
  voiceEngine.enableBargeIn();
});

// API pública mejorada
window.sandra = {
  memory: memorySync,
  orchestrate: orchestrationEngine.process.bind(orchestrationEngine),
  orchestrateAudio: orchestrationEngine.processAudio?.bind(orchestrationEngine),
  speak: orchestrationEngine.speakResponse?.bind(orchestrationEngine),
  voice: voiceEngine,
  observer: startSandraObserver,
  attach: createAttachmentUI
};

console.log('✨ ¡Sandra Studio con voz listo para usar!');