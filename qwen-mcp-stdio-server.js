#!/usr/bin/env node
// ============================================
// MCP SERVER STDIO PARA QWEN APP OFICIAL
// Conecta el servidor HTTP (puerto 19875) con stdio para la app de QWEN
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const MCP_HTTP_PORT = 19875;
const MEMORY_FILE = path.join(__dirname, 'memory.json');

// ============ PROTOCOLO MCP STDIO ============
// Implementación básica del protocolo MCP sobre stdio

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

// ============ HERRAMIENTAS DIRECTAS (sin pasar por HTTP, más rápido) ============
const tools = {
  // Memoria
  memory_store: async (params) => {
    const { key, value, tags } = params;
    const mem = loadMemory();
    mem[key] = { value, tags: tags || [], timestamp: Date.now() };
    saveMemory(mem);
    return { success: true, key };
  },
  
  memory_get: async (params) => {
    const { key } = params;
    const mem = loadMemory();
    return mem[key] || { error: 'Key not found' };
  },

  memory_list: async () => {
    return { success: true, data: loadMemory() };
  },
  
  memory_search: async (params) => {
    const { query } = params;
    const mem = loadMemory();
    const results = Object.entries(mem).filter(([k, v]) => 
      k.includes(query) || 
      (v.value && v.value.toString().includes(query)) ||
      (v.tags && v.tags.some(t => t.includes(query)))
    );
    return { success: true, results: Object.fromEntries(results) };
  },
  
  // Sistema de archivos - ACCESO COMPLETO AL PC
  read_file: async (params) => {
    try {
      const { filePath } = params;
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  
  write_file: async (params) => {
    try {
      const { filePath, content } = params;
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
      if (!dirPath) {
        return { success: false, error: 'dirPath is required' };
      }
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
  
  // Ejecutar comandos - ACCESO COMPLETO AL PC
  execute_command: async (params) => {
    const { command } = params;
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

  // Ejecutar código Python
  execute_python: async (params) => {
    const { code } = params;
    const tempFile = path.join(__dirname, '.temp_code.py');
    try {
      fs.writeFileSync(tempFile, code, 'utf8');
      const result = await execAsync(`python "${tempFile}"`, { timeout: 30000, maxBuffer: 1024 * 1024 * 10 });
      fs.unlinkSync(tempFile);
      return { success: true, output: result.stdout, error: result.stderr };
    } catch (e) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return { success: false, error: e.message, output: e.stdout || '', stderr: e.stderr || '' };
    }
  },

  // Ejecutar código Node.js
  execute_node: async (params) => {
    const { code } = params;
    const tempFile = path.join(__dirname, '.temp_code.js');
    try {
      fs.writeFileSync(tempFile, code, 'utf8');
      const result = await execAsync(`node "${tempFile}"`, { timeout: 30000, maxBuffer: 1024 * 1024 * 10 });
      fs.unlinkSync(tempFile);
      return { success: true, output: result.stdout, error: result.stderr };
    } catch (e) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return { success: false, error: e.message, output: e.stdout || '', stderr: e.stderr || '' };
    }
  }
};

// ============ PROTOCOLO MCP STDIO (JSON-RPC 2.0) ============
// Lee de stdin, escribe en stdout según protocolo MCP

let buffer = '';
let initialized = false;

process.stdin.setEncoding('utf8');

process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString('utf8');
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    try {
      const request = JSON.parse(trimmedLine);
      
      // Solo procesar requests con method
      if (request.method) {
        // Si tiene id, es una request (necesita respuesta)
        if (request.id !== undefined) {
          await handleRequest(request);
        } else {
          // Es una notificación (no necesita respuesta)
          if (request.method === 'notifications/initialized') {
            // Ya estamos inicializados, no hacer nada
          }
        }
      }
    } catch (e) {
      // Si hay un id en el request, responder con error
      try {
        const parsed = JSON.parse(trimmedLine);
        if (parsed.id !== undefined) {
          sendResponse({ 
            jsonrpc: '2.0', 
            id: parsed.id, 
            error: { code: -32700, message: 'Parse error: ' + e.message } 
          });
        }
      } catch (e2) {
        // Ignorar errores adicionales de parseo
      }
    }
  }
});

async function handleRequest(request) {
  const { method, params, id } = request;
  
  // Si no está inicializado, solo aceptar 'initialize'
  if (!initialized && method !== 'initialize') {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: { code: -32002, message: 'Server not initialized' }
    });
    return;
  }
  
  try {
    let result;
    
    switch (method) {
      case 'initialize':
        initialized = true;
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'sandra-full-access-mcp',
            version: '1.0.0'
          }
        };
        break;
        
      case 'tools/list':
        result = {
          tools: [
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
                  filePath: { type: 'string', description: 'Ruta completa del archivo' },
                  content: { type: 'string', description: 'Contenido del archivo' }
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
                  dirPath: { type: 'string', description: 'Ruta del directorio' }
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
                  command: { type: 'string', description: 'Comando a ejecutar' }
                },
                required: ['command']
              }
            },
            {
              name: 'execute_python',
              description: 'Ejecutar código Python',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Código Python a ejecutar' }
                },
                required: ['code']
              }
            },
            {
              name: 'execute_node',
              description: 'Ejecutar código Node.js',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Código Node.js a ejecutar' }
                },
                required: ['code']
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
          ]
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = params;
        if (!tools[name]) {
          throw new Error(`Tool not found: ${name}`);
        }
        
        // Ejecutar la herramienta
        const toolResult = await tools[name](args || {});
        
        // Formatear resultado según protocolo MCP
        // MCP espera un objeto con 'content' que contiene un array de objetos con 'type' y 'text'
        if (toolResult && typeof toolResult === 'object') {
          // Si ya tiene formato correcto, usarlo
          if (toolResult.content) {
            result = toolResult;
          } else {
            // Convertir a formato MCP
            const resultText = JSON.stringify(toolResult, null, 2);
            result = {
              content: [
                {
                  type: 'text',
                  text: resultText
                }
              ]
            };
          }
        } else {
          // Resultado primitivo (string, number, etc.)
          result = {
            content: [
              {
                type: 'text',
                text: String(toolResult)
              }
            ]
          };
        }
        break;
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    sendResponse({ jsonrpc: '2.0', id, result });
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message || 'Internal error'
      }
    });
  }
}

function sendResponse(response) {
  const output = JSON.stringify(response) + '\n';
  process.stdout.write(output);
}

// Manejar cierre
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

