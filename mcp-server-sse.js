// ============================================
// MCP SERVER SSE PARA CHATGPT DESKTOP
// Servidor MCP con transporte SSE (Server-Sent Events)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const MEMORY_FILE = path.join(__dirname, 'memory.json');

// ============ MEMORIA ============
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

// ============ HERRAMIENTAS ============
const tools = {
  read_file: async (params) => {
    try {
      const { filePath } = params || {};
      if (!filePath) return { success: false, error: 'filePath is required' };
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  write_file: async (params) => {
    try {
      const { filePath, content } = params || {};
      if (!filePath || content === undefined) {
        return { success: false, error: 'filePath and content are required' };
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  list_files: async (params) => {
    try {
      const { dirPath } = params || {};
      if (!dirPath) return { success: false, error: 'dirPath is required' };
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = items.map(i => ({
        name: i.name,
        isDirectory: i.isDirectory(),
        path: path.join(dirPath, i.name)
      }));
      return { success: true, files, count: files.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  execute_command: async (params) => {
    const { command } = params || {};
    if (!command) return { success: false, error: 'command is required' };
    return new Promise((resolve) => {
      exec(command, { timeout: 30000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout || '',
          stderr: stderr || '',
          output: stdout || stderr || '',
          error: error?.message
        });
      });
    });
  },

  memory_store: async (params) => {
    const { key, value, tags } = params || {};
    if (!key || value === undefined) {
      return { success: false, error: 'key and value are required' };
    }
    const mem = loadMemory();
    mem[key] = { value, tags: tags || [], timestamp: Date.now() };
    saveMemory(mem);
    return { success: true, key };
  },
  
  memory_get: async (params) => {
    const { key } = params || {};
    if (!key) return { success: false, error: 'key is required' };
    const mem = loadMemory();
    return mem[key] || { error: 'Key not found' };
  },

  memory_list: async () => {
    return { success: true, data: loadMemory() };
  },
  
  memory_search: async (params) => {
    const { query } = params || {};
    if (!query) return { success: false, error: 'query is required' };
    const mem = loadMemory();
    const results = Object.entries(mem).filter(([k, v]) => 
      k.includes(query) || 
      (v.value && v.value.toString().includes(query)) ||
      (v.tags && v.tags.some(t => t.includes(query)))
    );
    return { success: true, results: Object.fromEntries(results) };
  }
};

// Lista de herramientas para tools/list
const toolDefinitions = [
  {
    name: 'read_file',
    description: 'Leer archivo del sistema de archivos',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Ruta completa del archivo' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'write_file',
    description: 'Escribir archivo en el sistema de archivos',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'Listar archivos y directorios',
    inputSchema: {
      type: 'object',
      properties: {
        dirPath: { type: 'string' }
      },
      required: ['dirPath']
    }
  },
  {
    name: 'execute_command',
    description: 'Ejecutar comando en el sistema (CMD/PowerShell)',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' }
      },
      required: ['command']
    }
  },
  {
    name: 'memory_store',
    description: 'Guardar en memoria persistente',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'memory_get',
    description: 'Obtener de memoria persistente',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' }
      },
      required: ['key']
    }
  },
  {
    name: 'memory_list',
    description: 'Listar toda la memoria',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'memory_search',
    description: 'Buscar en memoria',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  }
];

// Función para manejar requests MCP
async function handleMCPRequest(request, res) {
  try {
    if (request.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'sandra-full-access-mcp',
            version: '1.0.0'
          }
        }
      };
      res.write(`data: ${JSON.stringify(response)}\n\n`);
    } else if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: toolDefinitions
        }
      };
      res.write(`data: ${JSON.stringify(response)}\n\n`);
    } else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params || {};
      if (!tools[name]) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `Tool not found: ${name}` }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        return;
      }
      
      try {
        const toolResult = await tools[name](args || {});
        const resultText = JSON.stringify(toolResult);
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: resultText
              }
            ]
          }
        };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      }
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (request.id !== undefined) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error'
        }
      };
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    }
  }
}

// ============ SERVIDOR HTTP CON SSE ============
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Endpoint SSE para MCP
  if (url.pathname === '/sse/' || url.pathname === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Enviar mensaje inicial
    res.write(`: connected\n\n`);
    
    // Para SSE, ChatGPT envía requests como POST con JSON en el body
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        if (body) {
          try {
            const request = JSON.parse(body);
            await handleMCPRequest(request, res);
          } catch (e) {
            console.error('Error parsing request:', e);
          }
        }
      });
    } else {
      // GET request - mantener conexión abierta con heartbeat
      const heartbeat = setInterval(() => {
        try {
          res.write(`: heartbeat\n\n`);
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);
      
      req.on('close', () => {
        clearInterval(heartbeat);
      });
    }
    
    return;
  }
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MCP Server SSE corriendo en http://localhost:${PORT}/sse/`);
  console.log(`   Usa esta URL en ChatGPT Desktop: http://localhost:${PORT}/sse/`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
