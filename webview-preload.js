// ============================================================================
// WEBVIEW PRELOAD - Inyecta MCP Tools en webviews de QWEN y ChatGPT
// ============================================================================

const MCP_PORT = 19875;
const MCP_URL = `http://localhost:${MCP_PORT}`;

// Exponer API de herramientas MCP al contexto del webview
window.mcpTools = {
  // Leer archivo local
  async readFile(filePath) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'read_file', params: { filePath } })
    });
    return response.json();
  },

  // Escribir archivo local
  async writeFile(filePath, content) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'write_file', params: { filePath, content } })
    });
    return response.json();
  },

  // Listar directorio
  async listDir(dirPath) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'list_files', params: { dirPath } })
    });
    return response.json();
  },

  // Ejecutar comando del sistema
  async executeCommand(command) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'execute_command', params: { command } })
    });
    return response.json();
  },

  // Ejecutar código JavaScript
  async executeCode(code, language = 'javascript') {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'execute_code', params: { code, language } })
    });
    return response.json();
  },

  // Memoria persistente
  async memoryStore(key, value, tags = []) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'memory_store', params: { key, value, tags } })
    });
    return response.json();
  },

  async memoryGet(key) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'memory_get', params: { key } })
    });
    return response.json();
  },

  async memorySearch(query) {
    const response = await fetch(`${MCP_URL}/tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'memory_search', params: { query } })
    });
    return response.json();
  }
};

// Notificar que MCP está disponible
console.log('✅ MCP Tools inyectados en webview');
console.log('📦 Herramientas disponibles: window.mcpTools');
