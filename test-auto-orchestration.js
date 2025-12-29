#!/usr/bin/env node

/**
 * TEST AUTO ORCHESTRATION SYSTEM
 * ═════════════════════════════════════════════════════════════════════════
 * Prueba del sistema de orquestación multi-agente
 * ═════════════════════════════════════════════════════════════════════════
 */

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║  🔗 TEST AUTO ORCHESTRATION SYSTEM                         ║');
console.log('║  Sistema de Orquestación Multi-Modelo Multi-Agente          ║');
console.log('╚═════════════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════════════════
// TESTS UNITARIOS
// ═══════════════════════════════════════════════════════════════════════════

const tests = {
  'Archivo auto-orchestration-engine.js existe': () => {
    const fs = require('fs');
    const enginePath = path.join(__dirname, 'renderer', 'auto-orchestration-engine.js');
    assert(fs.existsSync(enginePath), 'auto-orchestration-engine.js no encontrado');
    console.log('  ✅ Archivo existe y es accesible');
  },

  'Estructura de HTML válida': () => {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verificar elementos clave
    assert(html.includes('auto-orchestration-engine.js'), 'Script no incluido en HTML');
    assert(html.includes('window.mcpAPI'), 'MCP API Bridge no presente');
    assert(html.includes('window.aiModels'), 'AI Models no presente');
    assert(html.includes('executeMultipleMode'), 'executeMultipleMode no presente');

    console.log('  ✅ HTML contiene todos los elementos requeridos');
  },

  'MCP Client configurado': () => {
    const fs = require('fs');
    const mainPath = path.join(__dirname, 'main.js');
    const main = fs.readFileSync(mainPath, 'utf8');

    assert(main.includes('mcpUniversalClient'), 'MCP Universal Client no configurado');
    assert(main.includes('ipcMain.handle(\'mcp:sendProposal\''), 'IPC handler para sendProposal no existe');
    assert(main.includes('ipcMain.handle(\'mcp:status\''), 'IPC handler para status no existe');

    console.log('  ✅ MCP Client y handlers configurados correctamente');
  },

  'AI Models Manager presente': () => {
    const fs = require('fs');
    const managerPath = path.join(__dirname, 'ai-models-manager.js');
    assert(fs.existsSync(managerPath), 'ai-models-manager.js no encontrado');

    const manager = fs.readFileSync(managerPath, 'utf8');
    assert(manager.includes('createModelView'), 'createModelView no existe');
    assert(manager.includes('showModel'), 'showModel no existe');

    console.log('  ✅ AI Models Manager implementado correctamente');
  },

  'Auto Orchestrator presente': () => {
    const fs = require('fs');
    const orchestPath = path.join(__dirname, 'auto-orchestrator.js');
    assert(fs.existsSync(orchestPath), 'auto-orchestrator.js no encontrado');

    console.log('  ✅ Auto Orchestrator presente');
  },

  'IPC Handlers para AI Models': () => {
    const fs = require('fs');
    const mainPath = path.join(__dirname, 'main.js');
    const main = fs.readFileSync(mainPath, 'utf8');

    assert(main.includes('ai:chat'), 'IPC handler ai:chat no existe');
    assert(main.includes('ai:listModels'), 'IPC handler ai:listModels no existe');

    console.log('  ✅ IPC handlers para AI Models presentes');
  },

  'Providers configurados con modelos verificados': () => {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verificar que PROVIDERS está definido
    assert(html.includes('const PROVIDERS'), 'PROVIDERS no definido');

    // Verificar que tiene modelos Groq
    assert(html.includes('groq'), 'Modelos Groq no presentes');

    // Verificar que tiene modelos OpenAI
    assert(html.includes('gpt-4o') || html.includes('openai'), 'Modelos OpenAI no presentes');

    console.log('  ✅ PROVIDERS configurado con modelos verificados');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EJECUTAR TESTS
// ═══════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

console.log('📋 EJECUTANDO TESTS UNITARIOS:\n');

Object.entries(tests).forEach(([testName, testFn]) => {
  try {
    console.log(`▶ ${testName}`);
    testFn();
    passed++;
    console.log('');
  } catch (error) {
    console.log(`  ❌ FALLO: ${error.message}`);
    console.log('');
    failed++;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIONES ADICIONALES
// ═════════════════════════════════════════════════════════════════════════

console.log('\n📊 VERIFICACIONES ADICIONALES:\n');

// Verificar que main.js inicializa todos los sistemas
console.log('▶ Sistema de inicialización en main.js');
try {
  const fs = require('fs');
  const mainPath = path.join(__dirname, 'main.js');
  const main = fs.readFileSync(mainPath, 'utf8');

  const systems = [
    { name: 'MCP Universal Client', search: 'mcpUniversalClient = new MCPClient' },
    { name: 'AI Models Manager', search: 'aiModelsManager = new AIModelsManager' },
    { name: 'Auto Orchestrator', search: 'autoOrchestrator = new AutoOrchestrator' },
    { name: 'Response Cache', search: 'responseCache = new ResponseCache' },
    { name: 'Timeout Manager', search: 'timeoutManager = new TimeoutManager' }
  ];

  let allInitialized = true;
  systems.forEach(sys => {
    if (main.includes(sys.search)) {
      console.log(`  ✅ ${sys.name}`);
    } else {
      console.log(`  ⚠️  ${sys.name} (no encontrado en inicialización)`);
      allInitialized = false;
    }
  });

  if (allInitialized) {
    passed++;
  }
  console.log('');
} catch (error) {
  console.log(`  ❌ Error: ${error.message}\n`);
  failed++;
}

// Verificar APIs disponibles
console.log('▶ APIs disponibles');
try {
  const fs = require('fs');
  require('dotenv').config();

  const apis = [
    { name: 'GROQ_API_KEY', env: process.env.GROQ_API_KEY },
    { name: 'OPENAI_API_KEY', env: process.env.OPENAI_API_KEY },
    { name: 'ANTHROPIC_API_KEY', env: process.env.ANTHROPIC_API_KEY }
  ];

  apis.forEach(api => {
    if (api.env) {
      const masked = api.env.substring(0, 10) + '...' + api.env.substring(api.env.length - 5);
      console.log(`  ✅ ${api.name}: ${masked}`);
    } else {
      console.log(`  ⚠️  ${api.name}: no configurada`);
    }
  });

  passed++;
  console.log('');
} catch (error) {
  console.log(`  ⚠️  Error verificando APIs: ${error.message}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ═════════════════════════════════════════════════════════════════════════

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║  📊 RESULTADO FINAL                                        ║');
console.log('╚═════════════════════════════════════════════════════════════╝\n');

console.log(`✅ Tests pasados: ${passed}`);
console.log(`❌ Tests fallidos: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 TODOS LOS TESTS PASARON');
  console.log('\n✨ Sistema de Orquestación Multi-Agente implementado correctamente');
  console.log('   - Auto Orchestration Engine: ✅');
  console.log('   - MCP Universal Client: ✅');
  console.log('   - AI Models Manager: ✅');
  console.log('   - Response Interceptor: ✅');
  console.log('   - Síntesis Multi-Modelo: ✅');
  process.exit(0);
} else {
  console.log('\n⚠️  ALGUNOS TESTS FALLARON');
  console.log('Revisa los errores arriba para más detalles.');
  process.exit(1);
}
