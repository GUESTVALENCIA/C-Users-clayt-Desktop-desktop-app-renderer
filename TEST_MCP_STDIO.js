// Script de prueba para verificar que el servidor MCP stdio funciona correctamente
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'qwen-mcp-stdio-server.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      console.log('RESPONSE:', line);
      try {
        const parsed = JSON.parse(line);
        console.log('PARSED:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('PARSE ERROR:', e.message);
      }
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

// Enviar request de initialize
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('Sending initialize...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

setTimeout(() => {
  // Enviar request de tools/list
  const listRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  console.log('Sending tools/list...');
  server.stdin.write(JSON.stringify(listRequest) + '\n');
}, 1000);

setTimeout(() => {
  // Enviar request de tools/call para list_files
  const callRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list_files',
      arguments: {
        dirPath: process.cwd()
      }
    }
  };
  
  console.log('Sending tools/call (list_files)...');
  server.stdin.write(JSON.stringify(callRequest) + '\n');
}, 2000);

setTimeout(() => {
  server.kill();
  process.exit(0);
}, 5000);

