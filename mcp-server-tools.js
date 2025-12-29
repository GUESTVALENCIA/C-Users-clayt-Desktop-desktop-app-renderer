// ============================================================================
// MCP SERVER - HERRAMIENTAS GENÉRICAS (SIN INTERMEDIACIÓN)
// ============================================================================
// Proporciona herramientas para cualquier modelo de IA
// NO es intermediario de chat, solo proveedor de funcionalidades

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const MCP_PORT = 19875;
const MEMORY_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\clayt', '.sandra-memory.json');
const STATE_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\clayt', '.sandra-state.json');

// ============================================================================
// MEMORIA PERSISTENTE
// ============================================================================
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) { console.error('Error loading memory:', e); }
  return { entries: [], context: '', chatHistory: [], lastUpdated: new Date().toISOString() };
}

function saveMemory(memory) {
  memory.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
}

// ============================================================================
// HERRAMIENTAS GENÉRICAS
// ============================================================================
const tools = {
  // Memoria y Contexto
  memory_store: async ({ key, value, tags = [] }) => {
    const memory = loadMemory();
    memory.entries.push({
      key,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
    saveMemory(memory);
    return { success: true, message: 'Datos guardados en memoria' };
  },

  memory_get: async ({ key }) => {
    const memory = loadMemory();
    const entry = memory.entries.find(e => e.key === key);
    return { success: true, data: entry ? entry.value : null };
  },

  memory_search: async ({ query }) => {
    const memory = loadMemory();
    const results = memory.entries.filter(e =>
      JSON.stringify(e).toLowerCase().includes(query.toLowerCase())
    );
    return { success: true, results };
  },

  memory_list: async () => {
    const memory = loadMemory();
    return { success: true, entries: memory.entries };
  },

  memory_clear: async () => {
    saveMemory({ entries: [], context: '', chatHistory: [], lastUpdated: new Date().toISOString() });
    return { success: true, message: 'Memoria limpiada' };
  },

  // Sistema de Archivos
  fs_read: async ({ filePath }) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  fs_write: async ({ filePath, content }) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, message: 'Archivo escrito' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  fs_list: async ({ dirPath }) => {
    try {
      const files = fs.readdirSync(dirPath);
      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  fs_delete: async ({ filePath }) => {
    try {
      fs.unlinkSync(filePath);
      return { success: true, message: 'Archivo eliminado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Ejecución de Comandos
  cmd_execute: async ({ command, cwd }) => {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      return { success: true, output: stdout, error: stderr };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Ejecución de Código
  code_execute: async ({ code, language }) => {
    try {
      if (language === 'javascript' || language === 'js') {
        // ADVERTENCIA: eval es peligroso, solo para desarrollo
        const result = eval(code);
        return { success: true, result: String(result) };
      }
      return { success: false, error: `Lenguaje no soportado: ${language}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Estado del Sistema
  system_status: async () => {
    return {
      success: true,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
  },

  // Información de Herramientas
  tools_list: async () => {
    return {
      success: true,
      tools: Object.keys(tools).map(name => ({
        name,
        description: `Tool: ${name}`,
        available: true
      }))
    };
  }
};

// ============================================================================
// SERVIDOR HTTP
// ============================================================================
let server = null;

function startMCPServer() {
  if (server) return MCP_PORT;

  server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { method, params } = body ? JSON.parse(body) : {};

        if (req.url === '/tools' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(await tools.tools_list()));
        } else if ((req.url === '/call' || req.url === '/tool') && req.method === 'POST') {
          // Soportar ambos formatos: { method, params } y { tool, params }
          const toolName = method || body.tool;
          const tool = tools[toolName];
          if (!tool) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Tool not found: ${toolName}` }));
          } else {
            const result = await tool(params || {});
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  });

  server.listen(MCP_PORT, () => {
    console.log(`\n✅ MCP Server iniciado en puerto ${MCP_PORT}`);
    console.log('📦 Herramientas disponibles:');
    console.log('   - memory_store, memory_get, memory_search, memory_list');
    console.log('   - fs_read, fs_write, fs_list, fs_delete');
    console.log('   - cmd_execute (comandos del sistema)');
    console.log('   - code_execute (JavaScript)');
    console.log('   - system_status');
    console.log('   - tools_list\n');
  });

  return MCP_PORT;
}

function stopMCPServer() {
  if (server) {
    server.close();
    server = null;
    console.log('❌ MCP Server detenido');
  }
}

module.exports = {
  startMCPServer,
  stopMCPServer,
  tools,
  MCP_PORT
};
