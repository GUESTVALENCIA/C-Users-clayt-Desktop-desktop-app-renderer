// Test script para verificar que el servidor MCP SSE funciona correctamente
const http = require('http');

const TEST_URL = 'http://localhost:8000/sse/';

console.log('🧪 Probando servidor MCP SSE...\n');

// Test 1: Verificar que el endpoint SSE existe
console.log('1. Probando conexión SSE...');
const req = http.get(TEST_URL, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Headers:`, res.headers);
  
  if (res.statusCode === 200 && res.headers['content-type']?.includes('text/event-stream')) {
    console.log('   ✅ Servidor SSE responde correctamente\n');
    
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              console.log('   📨 Mensaje recibido:', JSON.stringify(data, null, 2));
            } catch (e) {
              console.log('   📨 Mensaje (texto):', jsonStr);
            }
          }
        }
      }
    });
    
    res.on('end', () => {
      console.log('\n   ✅ Conexión SSE cerrada correctamente');
      process.exit(0);
    });
  } else {
    console.log('   ❌ El servidor no responde con SSE válido');
    process.exit(1);
  }
});

req.on('error', (e) => {
  console.error('   ❌ Error:', e.message);
  console.log('\n⚠️  Asegúrate de que el servidor esté corriendo:');
  console.log('   node mcp-server-sse.js');
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.log('   ⏱️  Timeout - El servidor no respondió en 5 segundos');
  req.destroy();
  process.exit(1);
});

