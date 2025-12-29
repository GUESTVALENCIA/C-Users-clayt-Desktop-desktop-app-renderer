// ============================================
// TEST COMPLETO - QWEN + MCP + MEMORIA PERSISTENTE
// ============================================

const http = require('http');

const MCP_PORT = 19875;
const NEON_PORT = 8765;
const QWEN_PORT = 8085;

console.log('🧪 Iniciando pruebas completas del sistema QWEN...\n');

// Función helper para hacer requests HTTP
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testMCPServer() {
  console.log('1️⃣  Probando MCP Server (puerto 19875)...');
  try {
    const result = await httpRequest({
      hostname: 'localhost',
      port: MCP_PORT,
      path: '/tools',
      method: 'GET'
    });
    
    if (result.status === 200 && result.data.tools) {
      console.log(`   ✅ MCP Server funcionando`);
      console.log(`   📦 Herramientas disponibles: ${result.data.tools.join(', ')}`);
      return true;
    } else {
      console.log(`   ❌ MCP Server no responde correctamente`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ MCP Server no disponible: ${error.message}`);
    return false;
  }
}

async function testMCPServerTools() {
  console.log('\n2️⃣  Probando herramientas MCP (fuera del workspace)...');
  try {
    // Probar listar archivos en el escritorio (fuera del workspace)
    const desktopPath = process.platform === 'win32' 
      ? 'C:\\Users\\clayt\\Desktop' 
      : '~/Desktop';
    
    const result = await httpRequest({
      hostname: 'localhost',
      port: MCP_PORT,
      path: '/call',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tool: 'list_files',
      params: { dirPath: desktopPath }
    });
    
    if (result.status === 200 && result.data.success && result.data.files) {
      console.log(`   ✅ Acceso a archivos fuera del workspace funcionando`);
      console.log(`   📁 Archivos encontrados en Desktop: ${result.data.files.length}`);
      if (result.data.files.length > 0) {
        console.log(`   📄 Primeros archivos: ${result.data.files.slice(0, 3).map(f => f.name).join(', ')}`);
      }
      return true;
    } else {
      console.log(`   ⚠️  Respuesta: ${JSON.stringify(result.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error probando herramientas: ${error.message}`);
    return false;
  }
}

async function testNeonServer() {
  console.log('\n3️⃣  Probando MCP Server NEON (puerto 8765)...');
  try {
    const result = await httpRequest({
      hostname: 'localhost',
      port: NEON_PORT,
      path: '/mcp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      mcp: true,
      calls: [{
        server: 'reina',
        tool: 'get_memory',
        arguments: { session_id: 'test', key: 'test' }
      }]
    });
    
    if (result.status === 200) {
      console.log(`   ✅ MCP Server NEON funcionando`);
      console.log(`   💾 Memoria NEON accesible`);
      return true;
    } else {
      console.log(`   ⚠️  NEON responde pero con estado ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ⚠️  MCP Server NEON no disponible (opcional): ${error.message}`);
    console.log(`   ℹ️  Esto es normal si no se ha iniciado aún`);
    return false;
  }
}

async function testQWENGateway() {
  console.log('\n4️⃣  Probando QWEN Omni Gateway (puerto 8085)...');
  try {
    const result = await httpRequest({
      hostname: 'localhost',
      port: QWEN_PORT,
      path: '/health',
      method: 'GET'
    });
    
    if (result.status === 200) {
      console.log(`   ✅ QWEN Gateway funcionando`);
      return true;
    } else {
      console.log(`   ⚠️  QWEN Gateway responde pero con estado ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ⚠️  QWEN Gateway no disponible: ${error.message}`);
    console.log(`   ℹ️  Esto es normal si no se ha iniciado aún`);
    return false;
  }
}

async function testMemoryStorage() {
  console.log('\n5️⃣  Probando almacenamiento de memoria...');
  try {
    // Guardar test
    const saveResult = await httpRequest({
      hostname: 'localhost',
      port: MCP_PORT,
      path: '/call',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tool: 'memory_store',
      params: { 
        key: 'test_qwen_connection', 
        value: { test: true, timestamp: Date.now() },
        tags: ['test', 'qwen']
      }
    });
    
    if (saveResult.status === 200 && saveResult.data.success) {
      console.log(`   ✅ Memoria guardada correctamente`);
      
      // Recuperar test
      const getResult = await httpRequest({
        hostname: 'localhost',
        port: MCP_PORT,
        path: '/call',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tool: 'memory_get',
        params: { key: 'test_qwen_connection' }
      });
      
      if (getResult.status === 200 && getResult.data.value) {
        console.log(`   ✅ Memoria recuperada correctamente`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log(`   ❌ Error probando memoria: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 PRUEBAS DEL SISTEMA QWEN + MCP');
  console.log('='.repeat(60));
  
  const results = {
    mcpServer: await testMCPServer(),
    mcpTools: await testMCPServerTools(),
    neonServer: await testNeonServer(),
    qwenGateway: await testQWENGateway(),
    memory: await testMemoryStorage()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  
  const critical = ['mcpServer', 'mcpTools', 'memory'];
  const optional = ['neonServer', 'qwenGateway'];
  
  let allCriticalOk = true;
  critical.forEach(test => {
    const status = results[test] ? '✅' : '❌';
    const req = results[test] ? '' : ' (REQUERIDO)';
    console.log(`${status} ${test}: ${results[test] ? 'OK' : 'FALLO'}${req}`);
    if (!results[test]) allCriticalOk = false;
  });
  
  optional.forEach(test => {
    const status = results[test] ? '✅' : '⚠️';
    console.log(`${status} ${test}: ${results[test] ? 'OK' : 'Opcional (no iniciado)'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  if (allCriticalOk) {
    console.log('✅ SISTEMA LISTO: QWEN puede trabajar fuera del workspace');
    console.log('✅ Todos los componentes críticos funcionando');
    console.log('\n💡 Para probar con QWEN:');
    console.log('   1. Abre la aplicación (npm start)');
    console.log('   2. Haz clic en el botón QWEN');
    console.log('   3. Escribe: "Lista los archivos en mi Desktop"');
    console.log('   4. QWEN debería poder acceder usando window.mcpBridge.listFiles()');
  } else {
    console.log('❌ HAY PROBLEMAS: Revisa los componentes que fallaron');
    console.log('⚠️  Asegúrate de que la aplicación esté corriendo (npm start)');
  }
  console.log('='.repeat(60));
  
  return allCriticalOk;
}

// Ejecutar pruebas
runAllTests().catch(console.error);

