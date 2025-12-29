// ============================================
// MCP SERVER - IGUAL QUE VS CODE EXTENSION
// Puerto 19875 - Herramientas para QWEN
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const MCP_PORT = 19875;

// ============ MEMORIA PERSISTENTE ============
const MEMORY_FILE = path.join(__dirname, 'memory.json');

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

// ============ HERRAMIENTAS MCP ============
const tools = {
  // Memoria
  memory_store: async ({ key, value, tags }) => {
    const mem = loadMemory();
    mem[key] = { value, tags: tags || [], timestamp: Date.now() };
    saveMemory(mem);
    return { success: true, key };
  },
  
  memory_get: async ({ key }) => {
    const mem = loadMemory();
    return mem[key] || { error: 'Key not found' };
  },

  memory_list: async () => {
    return { success: true, data: loadMemory() };
  },
  
  memory_search: async ({ query }) => {
    const mem = loadMemory();
    const results = Object.entries(mem).filter(([k, v]) => 
      k.includes(query) || 
      (v.value && v.value.toString().includes(query)) ||
      (v.tags && v.tags.some(t => t.includes(query)))
    );
    return { success: true, results: Object.fromEntries(results) };
  },
  
  // Sistema de archivos
  read_file: async ({ filePath }) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  write_file: async ({ filePath, content }) => {
    try {
      fs.writeFileSync(filePath, content);
      return { success: true, filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  list_files: async ({ dirPath }) => {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = items.map(i => ({
        name: i.name,
        isDirectory: i.isDirectory(),
        path: path.join(dirPath, i.name)
      }));
      return { success: true, files };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  // Comandos
  execute_command: async ({ command }) => {
    return new Promise((resolve) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout || '',
          stderr: stderr || '',
          error: error?.message
        });
      });
    });
  }
};


// ============ SERVIDOR HTTP ============
let server = null;

function startMCPServer() {
  if (server) return MCP_PORT;
  
  server = http.createServer(async (req, res) => {
    // CORS para que QWEN web pueda acceder
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // GET /tools - Lista herramientas
    if (req.method === 'GET' && req.url === '/tools') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tools: Object.keys(tools) }));
      return;
    }
    
    // GET /memory - Ver memoria
    if (req.method === 'GET' && req.url === '/memory') {
      const result = await tools.memory_list();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    
    // POST /call - Ejecutar herramienta
    if (req.method === 'POST' && req.url === '/call') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { tool, params } = JSON.parse(body);
          if (!tools[tool]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Tool not found: ${tool}` }));
            return;
          }
          const result = await tools[tool](params || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    res.writeHead(404);
    res.end('Not found');
  });
  
  server.listen(MCP_PORT, '127.0.0.1', () => {
    console.log(`✅ MCP Server: http://127.0.0.1:${MCP_PORT}`);
  });
  
  return MCP_PORT;
}

function stopMCPServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startMCPServer, stopMCPServer, tools, MCP_PORT };
