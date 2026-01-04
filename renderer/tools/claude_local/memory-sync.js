// 🧠 MEMORY SYNC — sincroniza memoria entre Qwen, Claude y DeepSeek
// Usa tu sistema existente `sandraMemory`

class MemorySync {
  constructor() {
    this.models = ['qwen', 'claude', 'deepseek'];
  }

  // Guarda un mensaje en todos los modelos (formato común)
  storeMessage(role, content, metadata = {}) {
    const entry = {
      role, // 'user' o 'assistant'
      content,
      model: metadata.model || 'unknown',
      timestamp: Date.now(),
      context: metadata.context || {}
    };

    // Formato para Qwen
    if (window.qwenMemory) {
      window.qwenMemory.push(entry);
    }

    // Formato para Claude (chat_id + historial)
    if (metadata.chatId && window.claudeChats) {
      if (!window.claudeChats[metadata.chatId]) {
        window.claudeChats[metadata.chatId] = [];
      }
      window.claudeChats[metadata.chatId].push(entry);
    }

    // Tu memoria persistente
    if (window.sandraMemory?.store) {
      const key = `chat-${Date.now()}-${role}`;
      window.sandraMemory.store(key, JSON.stringify(entry));
    }

    return entry;
  }

  // Recupera historial unificado
  getUnifiedHistory(options = {}) {
    const { limit = 10, model = null } = options;
    
    let history = [];

    // Desde tu memoria persistente
    if (window.sandraMemory?.list) {
      const allKeys = window.sandraMemory.list();
      const chatKeys = allKeys.filter(k => k.startsWith('chat-'));
      const entries = chatKeys
        .map(k => {
          try {
            return JSON.parse(window.sandraMemory.get(k));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      history = entries;
    }

    // Filtrar por modelo si se pide
    if (model) {
      history = history.filter(e => e.model === model);
    }

    return history;
  }

  // Formatea para Qwen (lista de { role, content })
  formatForQwen(history) {
    return history.map(e => ({
      role: e.role === 'assistant' ? 'assistant' : 'user',
      content: e.content
    }));
  }

  // Formatea para Claude (solo texto concatenado)
  formatForClaude(history) {
    return history
      .map(e => `${e.role === 'user' ? '👤' : '🤖'}: ${e.content}`)
      .join('\n\n');
  }
}

// Instancia global
const memorySync = new MemorySync();

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
  if (!window.sandraMemory) {
    window.sandraMemory = {
      store: (key, value) => localStorage.setItem(key, value),
      get: (key) => localStorage.getItem(key),
      list: () => Object.keys(localStorage).filter(k => k.startsWith('obs-') || k.startsWith('chat-')),
      clear: () => {
        Object.keys(localStorage)
          .filter(k => k.startsWith('obs-') || k.startsWith('chat-'))
          .forEach(k => localStorage.removeItem(k));
      }
    };
  }

  if (!window.claudeChats) window.claudeChats = {};
  if (!window.qwenMemory) window.qwenMemory = [];
});

// Export
module.exports = { memorySync, MemorySync };
exports.memorySync = memorySync;