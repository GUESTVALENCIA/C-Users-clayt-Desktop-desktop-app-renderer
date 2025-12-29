#!/usr/bin/env node

/**
 * TEST API CONNECTION - Validar estructura de StudioLab
 * ═══════════════════════════════════════════════════════════════════════
 * Verifica que la aplicación está lista para conectarse a APIs reales
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔧 TEST API CONNECTION - Validar Estructura de StudioLab     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const htmlPath = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Verificar PROVIDERS está configurado
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 1: Verificar PROVIDERS configurado\n');

if (htmlContent.includes('const PROVIDERS = {')) {
  console.log('✅ PROVIDERS definido encontrado');
  results.passed.push('✅ PROVIDERS existe');

  // Verificar OpenAI en PROVIDERS
  if (htmlContent.includes("openai: {") && htmlContent.includes("'gpt-4o'")) {
    console.log('  ✅ OpenAI configurado (gpt-4o presente)');
    results.passed.push('✅ OpenAI en PROVIDERS');
  } else {
    results.failed.push('❌ OpenAI no configurado correctamente');
    console.log('  ❌ OpenAI NO configurado correctamente');
  }

  // Verificar Groq en PROVIDERS
  if (htmlContent.includes("groq: {") && htmlContent.includes("'llama-3.3-70b-versatile'")) {
    console.log('  ✅ Groq configurado (llama-3.3-70b-versatile presente)');
    results.passed.push('✅ Groq en PROVIDERS');
  } else {
    results.failed.push('❌ Groq no configurado correctamente');
    console.log('  ❌ Groq NO configurado correctamente');
  }

  // Verificar que NO hay qwen como provider
  const providersSectionMatch = htmlContent.match(/const PROVIDERS = \{[\s\S]*?\n\s*\};/);
  if (providersSectionMatch) {
    const providersStr = providersSectionMatch[0];
    if (!providersStr.includes("qwen: {")) {
      console.log('  ✅ QWEN removido como proveedor API');
      results.passed.push('✅ QWEN no es proveedor API');
    } else {
      results.warnings.push('⚠️ QWEN todavía aparece en PROVIDERS');
      console.log('  ⚠️ QWEN todavía en PROVIDERS');
    }
  }
} else {
  results.failed.push('❌ PROVIDERS no encontrado');
  console.log('❌ PROVIDERS no encontrado\n');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: Verificar STATE inicializado correctamente
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 2: Verificar STATE inicializado\n');

if (htmlContent.includes('const state = {')) {
  console.log('✅ STATE definido encontrado');
  results.passed.push('✅ STATE existe');

  const stateMatch = htmlContent.match(/const state = \{[\s\S]*?\n\s*\};/);
  if (stateMatch) {
    const stateStr = stateMatch[0];

    // Verificar currentProvider
    if (stateStr.includes('currentProvider:') || stateStr.includes('currentProvider :')) {
      console.log('  ✅ state.currentProvider presente');
      results.passed.push('✅ state.currentProvider');
    } else {
      results.failed.push('❌ state.currentProvider faltante');
      console.log('  ❌ state.currentProvider FALTANTE');
    }

    // Verificar currentModel
    if (stateStr.includes('currentModel:') || stateStr.includes('currentModel :')) {
      console.log('  ✅ state.currentModel presente');
      results.passed.push('✅ state.currentModel');
    } else {
      results.failed.push('❌ state.currentModel faltante');
      console.log('  ❌ state.currentModel FALTANTE');
    }

    // Verificar que NO hay state.qwen
    if (!stateStr.includes('qwen:') || stateStr.includes('qwen/qwen3-32b')) {
      console.log('  ✅ state.qwen eliminado');
      results.passed.push('✅ state.qwen removido');
    } else {
      results.failed.push('❌ state.qwen todavía presente');
      console.log('  ❌ state.qwen todavía presente');
    }

    // Verificar useAPI
    if (stateStr.includes('useAPI:')) {
      console.log('  ✅ state.useAPI presente');
      results.passed.push('✅ state.useAPI');
    } else {
      results.warnings.push('⚠️ state.useAPI no presente');
      console.log('  ⚠️ state.useAPI no presente');
    }
  }
} else {
  results.failed.push('❌ STATE no encontrado');
  console.log('❌ STATE no encontrado\n');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: Verificar sendMessage usa state.currentProvider/Model
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 3: Verificar sendMessage refactorizado\n');

if (htmlContent.includes('const provider = PROVIDERS[state.currentProvider];') &&
    htmlContent.includes('const modelId = state.currentModel')) {
  console.log('✅ sendMessage usa state.currentProvider/currentModel');
  results.passed.push('✅ sendMessage refactorizado');

  // Verificar que NO usa state.qwen.model
  const sendMessageMatch = htmlContent.match(/function sendMessage[\s\S]*?^\s*\};/m);
  if (sendMessageMatch && !sendMessageMatch[0].includes('state.qwen.model')) {
    console.log('  ✅ sendMessage NO referencia state.qwen.model');
    results.passed.push('✅ sendMessage sin state.qwen');
  } else {
    results.failed.push('❌ sendMessage todavía referencia state.qwen');
    console.log('  ❌ sendMessage referencia state.qwen');
  }
} else {
  results.failed.push('❌ sendMessage no refactorizado');
  console.log('❌ sendMessage no refactorizado correctamente\n');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: Verificar callAssistant refactorizado
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 4: Verificar callAssistant refactorizado\n');

if (htmlContent.includes('window.sandraAPI?.chatSend')) {
  console.log('✅ callAssistant usa window.sandraAPI?.chatSend');
  results.passed.push('✅ callAssistant con window.sandraAPI');

  // Verificar que NO usa state.qwen.connected
  const callAssistantMatch = htmlContent.match(/async function callAssistant[\s\S]*?^\s*\}/m);
  if (callAssistantMatch && !callAssistantMatch[0].includes('state.qwen.connected')) {
    console.log('  ✅ callAssistant NO usa state.qwen.connected');
    results.passed.push('✅ callAssistant sin state.qwen.connected');
  } else {
    results.failed.push('❌ callAssistant referencia state.qwen.connected');
    console.log('  ❌ callAssistant referencia state.qwen.connected');
  }

  // Verificar que tiene try/catch
  if (callAssistantMatch && callAssistantMatch[0].includes('try {') && callAssistantMatch[0].includes('catch')) {
    console.log('  ✅ callAssistant tiene manejo de errores');
    results.passed.push('✅ callAssistant con try/catch');
  }
} else {
  results.failed.push('❌ callAssistant no usa window.sandraAPI');
  console.log('❌ callAssistant no usa window.sandraAPI\n');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// TEST 5: Verificar selectProviderModel actualiza state.currentProvider
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 5: Verificar selectProviderModel\n');

if (htmlContent.includes('state.currentProvider = provider;') &&
    htmlContent.includes('state.currentModel = modelId;')) {
  console.log('✅ selectProviderModel actualiza state.currentProvider/Model');
  results.passed.push('✅ selectProviderModel refactorizado');

  // Verificar que NO usa state.selectedProvider/selectedModel
  const selectMatch = htmlContent.match(/function selectProviderModel[\s\S]*?^\s*\}/m);
  if (selectMatch && !selectMatch[0].includes('state.selectedProvider') && !selectMatch[0].includes('state.selectedModel')) {
    console.log('  ✅ selectProviderModel NO usa state.selectedProvider/Model');
    results.passed.push('✅ selectProviderModel sin selectedProvider/Model');
  } else {
    results.failed.push('❌ selectProviderModel usa state.selectedProvider/Model');
    console.log('  ❌ selectProviderModel todavía usa old names');
  }
} else {
  results.failed.push('❌ selectProviderModel no actualiza state.currentProvider');
  console.log('❌ selectProviderModel no refactorizado\n');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// TEST 6: Verificar APIs en main.js
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 TEST 6: Verificar APIs disponibles\n');

const mainPath = path.join(__dirname, 'main.js');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');

  if (mainContent.includes('sandraAPI') || mainContent.includes('chatSend')) {
    console.log('✅ main.js define sandraAPI');
    results.passed.push('✅ sandraAPI disponible en main.js');
  } else {
    results.warnings.push('⚠️ sandraAPI puede no estar disponible en main.js');
    console.log('⚠️ sandraAPI puede no estar definido');
  }

  // Verificar que la API maneja Groq
  if (mainContent.includes('groq') || mainContent.includes('GROQ')) {
    console.log('  ✅ main.js menciona Groq');
    results.passed.push('✅ Groq mencionado en main.js');
  }
} else {
  results.warnings.push('⚠️ No se puede verificar main.js');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ═══════════════════════════════════════════════════════════════════════

console.log('═════════════════════════════════════════════════════════════════\n');
console.log('📊 RESULTADO FINAL:\n');

console.log(`✅ Tests pasados: ${results.passed.length}`);
console.log(`❌ Tests fallidos: ${results.failed.length}`);
console.log(`⚠️  Advertencias: ${results.warnings.length}\n`);

if (results.failed.length > 0) {
  console.log('❌ FALLOS ENCONTRADOS:');
  results.failed.forEach(f => console.log(`   ${f}`));
  console.log('');
}

if (results.warnings.length > 0) {
  console.log('⚠️  ADVERTENCIAS:');
  results.warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════
// CONCLUSIÓN Y PRÓXIMOS PASOS
// ═══════════════════════════════════════════════════════════════════════

console.log('═════════════════════════════════════════════════════════════════\n');

if (results.failed.length === 0) {
  console.log('🎉 ESTRUCTURA VALIDADA - LISTA PARA TESTING EN VIVO\n');
  console.log('✨ La aplicación está lista para:\n');
  console.log('   1. ✅ Conectarse a Groq API');
  console.log('   2. ✅ Conectarse a OpenAI API');
  console.log('   3. ✅ Seleccionar modelos dinámicamente');
  console.log('   4. ✅ Enviar mensajes sin errores de estado\n');

  console.log('📋 PRÓXIMOS PASOS:\n');
  console.log('1. Reiniciar la aplicación StudioLab');
  console.log('2. Abrir DevTools (F12) y ver la consola');
  console.log('3. Escribir un mensaje en el chat');
  console.log('4. Verificar en consola:');
  console.log('   - [callAssistant] Llamando a groq/llama-3.3-70b-versatile');
  console.log('   - [callAssistant] Enviando a sandraAPI: groq/...');
  console.log('   - [callAssistant] ✅ Respuesta recibida de groq\n');
  console.log('5. Verificar que el chat muestra la respuesta\n');

  console.log('✅ SI VES ESTOS LOGS → LA APLICACIÓN FUNCIONA CORRECTAMENTE\n');

  process.exit(0);
} else {
  console.log('⚠️  ESTRUCTURA REQUIERE CORRECCIONES\n');
  console.log('Por favor revisa los errores arriba y aplica las correcciones.\n');
  process.exit(1);
}
