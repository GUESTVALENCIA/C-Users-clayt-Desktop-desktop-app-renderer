// Script para probar la conexión a los servidores MCP

async function testMCPConnection() {
  console.log('Probando conexión a servidores MCP...');
  
  // Probar conexión al servidor MCP principal
  try {
    const response = await fetch('http://localhost:19875/tools');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Servidor MCP Principal (19875) RESPONDIENDO');
      console.log('Herramientas disponibles:', data.tools);
      return true;
    } else {
      console.log('❌ Servidor MCP Principal (19875) NO RESPONDIENDO - Código:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Servidor MCP Principal (19875) NO RESPONDIENDO - Error:', error.message);
    return false;
  }
}

async function testMCPNeonConnection() {
  // Probar conexión al servidor MCP Neon
  try {
    const response = await fetch('http://localhost:8765/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mcp: true,
        calls: [{
          server: 'reina',
          tool: 'get_memory',
          arguments: { session_id: 'test', key: 'test' }
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Servidor MCP Neon (8765) RESPONDIENDO');
      console.log('Respuesta:', data);
      return true;
    } else {
      console.log('❌ Servidor MCP Neon (8765) NO RESPONDIENDO - Código:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Servidor MCP Neon (8765) NO RESPONDIENDO - Error:', error.message);
    return false;
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('Iniciando pruebas de conexión...');
  
  const mcpResult = await testMCPConnection();
  const neonResult = await testMCPNeonConnection();
  
  console.log('\nResumen:');
  console.log('MCP Principal:', mcpResult ? 'FUNCIONANDO' : 'NO FUNCIONANDO');
  console.log('MCP Neon:', neonResult ? 'FUNCIONANDO' : 'NO FUNCIONANDO');
  
  return { mcp: mcpResult, neon: neonResult };
}

// Ejecutar las pruebas
runTests().then(results => {
  console.log('\nPruebas completadas');
}).catch(error => {
  console.error('Error en las pruebas:', error);
});