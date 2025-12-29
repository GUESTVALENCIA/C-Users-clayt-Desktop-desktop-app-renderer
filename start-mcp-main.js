// Script para iniciar manualmente el servidor MCP principal

const mcpServer = require('./mcp-server.js');

console.log('Iniciando servidor MCP Principal en puerto:', mcpServer.MCP_PORT);

// Iniciar el servidor
const port = mcpServer.startMCPServer();

console.log(`Servidor MCP Principal iniciado en puerto: ${port}`);

// Mantener el proceso vivo
console.log('Servidor MCP Principal corriendo... Presiona Ctrl+C para detener');

process.on('SIGINT', () => {
  console.log('\nCerrando servidor MCP Principal...');
  if (typeof mcpServer.stopMCPServer === 'function') {
    mcpServer.stopMCPServer();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nCerrando servidor MCP Principal...');
  if (typeof mcpServer.stopMCPServer === 'function') {
    mcpServer.stopMCPServer();
  }
  process.exit(0);
});