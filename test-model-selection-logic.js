#!/usr/bin/env node

/**
 * TEST MODEL SELECTION LOGIC - Validación de lógica de modelos
 * ═══════════════════════════════════════════════════════════════════════
 * Verifica que cada modelo se selecciona correctamente y responde
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 TEST MODEL SELECTION LOGIC - Validación Completa          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const htmlPath = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const results = {
  providers: {},
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: []
};

// ═══════════════════════════════════════════════════════════════════════
// EXTRAER PROVIDERS DEL HTML
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 1: Extraer configuración de PROVIDERS\n');

// Buscar const PROVIDERS = { ... }
const providersMatch = htmlContent.match(/const PROVIDERS = \{[\s\S]*?\n\s*\};/);
if (!providersMatch) {
  console.error('❌ No se encontró PROVIDERS en HTML');
  process.exit(1);
}

// Extraer providers individuales
const providers = ['openai', 'groq', 'anthropic', 'gemini', 'qwen'];
const modelCounts = {};

providers.forEach(provider => {
  // Contar modelos en PROVIDERS
  const regex = new RegExp(`'([^']+)':\\s*\\{\\s*name:`, 'g');
  const providersSection = htmlContent.match(new RegExp(`${provider}:\\s*\\{([^}]*models:[^}]*\\}[^}]*)`));

  if (providersSection) {
    const modelsMatch = providersSection[1].match(/models:\s*\{([\s\S]*?)\}/);
    if (modelsMatch) {
      const models = modelsMatch[1].match(/'([^']+)':/g) || [];
      modelCounts[provider] = models.length;
    }
  }
});

console.log('✅ PROVIDERS encontrado\n');
console.log('📊 Modelos por proveedor:\n');

Object.entries(modelCounts).forEach(([provider, count]) => {
  console.log(`   ${provider.toUpperCase()}: ${count} modelo(s)`);
});

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR CONSISTENCIA DE STATE
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 2: Verificar consistencia de STATE\n');

// Buscar inicialización de state
const stateInitMatch = htmlContent.match(/const state = \{[\s\S]*?\};/);
if (!stateInitMatch) {
  console.error('❌ STATE no encontrado');
  results.issues.push('STATE no encontrado');
  results.failed++;
} else {
  const stateStr = stateInitMatch[0];

  // Verificar properties críticos
  const checks = [
    { name: 'currentProvider', regex: /currentProvider:\s*/ },
    { name: 'currentModel', regex: /currentModel:\s*/ },
    { name: 'useAPI', regex: /useAPI:\s*/ }
  ];

  checks.forEach(check => {
    if (check.regex.test(stateStr)) {
      console.log(`   ✅ ${check.name} presente`);
      results.passed++;
    } else {
      console.log(`   ❌ ${check.name} FALTANTE`);
      results.issues.push(`STATE property ${check.name} no encontrado`);
      results.failed++;
    }
  });

  // Verificar que NO hay state.selectedProvider
  if (stateStr.includes('selectedProvider:') || stateStr.includes('selectedModel:')) {
    console.log('   ⚠️  WARNING: state.selectedProvider/selectedModel todavía presente');
    results.warnings++;
    results.issues.push('Encontrado state.selectedProvider/selectedModel (debe ser currentProvider/currentModel)');
  } else {
    console.log('   ✅ No hay referencias a selectedProvider/selectedModel (BIEN)');
    results.passed++;
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR FUNCIONES DE SELECCIÓN
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 3: Verificar funciones de selección de modelos\n');

const functions = [
  { name: 'initProviderButtons', pattern: /function initProviderButtons\(\)/ },
  { name: 'toggleProviderDropdown', pattern: /function toggleProviderDropdown\(provider/ },
  { name: 'selectProviderModel', pattern: /function selectProviderModel\(provider/ }
];

functions.forEach(func => {
  if (func.pattern.test(htmlContent)) {
    console.log(`   ✅ ${func.name} presente`);
    results.passed++;

    // Verificar que usa state.currentProvider
    const funcMatch = htmlContent.match(new RegExp(`function ${func.name}[\\s\\S]*?^\\s*\\}`, 'm'));
    if (funcMatch && funcMatch[0].includes('state.currentProvider')) {
      console.log(`      ✅ Usa state.currentProvider`);
      results.passed++;
    } else if (funcMatch && funcMatch[0].includes('state.selectedProvider')) {
      console.log(`      ❌ USA DEPRECATED state.selectedProvider`);
      results.issues.push(`${func.name} usa state.selectedProvider (debe ser currentProvider)`);
      results.failed++;
    }
  } else {
    console.log(`   ❌ ${func.name} NO ENCONTRADO`);
    results.issues.push(`Función ${func.name} no encontrada`);
    results.failed++;
  }
});

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR MODELOS EN HTML vs PROVIDERS
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 4: Verificar correspondencia modelos HTML ↔ PROVIDERS\n');

// Extraer modelos del HTML (radio buttons)
const radioPattern = /name="([a-z]+)-model"\s+value="([^"]+)"/g;
const htmlModels = {};
let match;

while ((match = radioPattern.exec(htmlContent)) !== null) {
  const provider = match[1];
  const modelId = match[2];

  if (!htmlModels[provider]) {
    htmlModels[provider] = [];
  }
  htmlModels[provider].push(modelId);
}

console.log('📋 Modelos en HTML radio buttons:\n');

Object.entries(htmlModels).forEach(([provider, models]) => {
  console.log(`   ${provider.toUpperCase()}: ${models.length} modelo(s)`);
  models.forEach(model => {
    console.log(`      - ${model}`);
  });
});

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR INCONSISTENCIAS
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 5: Detectar inconsistencias\n');

let inconsistencies = 0;

// Verificar que cada modelo en HTML está en PROVIDERS
const providersJson = extractProvidersAsJson(htmlContent);

Object.entries(htmlModels).forEach(([provider, models]) => {
  models.forEach(modelId => {
    // Buscar este modelo en PROVIDERS
    if (!providersJson[provider] || !providersJson[provider].models[modelId]) {
      console.log(`   ❌ INCONSISTENCIA: HTML radio tiene ${provider}/${modelId} pero NO está en PROVIDERS`);
      results.issues.push(`Modelo ${provider}/${modelId} en HTML pero no en PROVIDERS`);
      results.failed++;
      inconsistencies++;
    }
  });
});

if (inconsistencies === 0) {
  console.log('   ✅ Todos los modelos en HTML están en PROVIDERS (BIEN)');
  results.passed++;
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR LÓGICA DE CALLASSISTANT
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 6: Verificar que callAssistant usa modelos correctamente\n');

const callAssistantMatch = htmlContent.match(/async function callAssistant[\s\S]*?^\s*\}/m);
if (callAssistantMatch) {
  const callAssistantStr = callAssistantMatch[0];

  if (callAssistantStr.includes('state.currentProvider') && callAssistantStr.includes('state.currentModel')) {
    console.log('   ✅ callAssistant usa state.currentProvider y state.currentModel');
    results.passed++;
  } else {
    console.log('   ❌ callAssistant NO usa state.currentProvider/Model correctamente');
    results.issues.push('callAssistant no usa state.currentProvider/Model');
    results.failed++;
  }

  if (callAssistantStr.includes('window.sandraAPI?.chatSend')) {
    console.log('   ✅ callAssistant usa window.sandraAPI.chatSend');
    results.passed++;
  } else {
    console.log('   ❌ callAssistant NO usa window.sandraAPI.chatSend');
    results.issues.push('callAssistant no usa window.sandraAPI.chatSend');
    results.failed++;
  }
} else {
  console.log('   ❌ callAssistant no encontrado');
  results.failed++;
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// VERIFICAR LOGS DE DEBUGGING
// ═══════════════════════════════════════════════════════════════════════

console.log('🔍 STEP 7: Verificar logs para debugging\n');

const selectModelMatch = htmlContent.match(/function selectProviderModel[\s\S]*?^    \}/m);
if (selectModelMatch) {
  const funcStr = selectModelMatch[0];
  const logChecks = [
    { name: '[Provider] Cambio de modelo:', essential: true },
    { name: 'ANTES:', essential: true },
    { name: 'DESPUÉS:', essential: true },
    { name: '✅ Botón iluminado', essential: true },
    { name: '⭕ Botón apagado', essential: true }
  ];

  logChecks.forEach(check => {
    if (funcStr.includes(check.name)) {
      console.log(`   ✅ Log presente: "${check.name}"`);
      results.passed++;
    } else if (check.essential) {
      console.log(`   ❌ Log FALTANTE: "${check.name}"`);
      results.failed++;
    }
  });
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ═══════════════════════════════════════════════════════════════════════

console.log('═════════════════════════════════════════════════════════════════\n');
console.log('📊 RESULTADO FINAL:\n');

console.log(`✅ Tests pasados: ${results.passed}`);
console.log(`❌ Tests fallidos: ${results.failed}`);
console.log(`⚠️  Advertencias: ${results.warnings}\n`);

if (results.issues.length > 0) {
  console.log('❌ ISSUES ENCONTRADOS:\n');
  results.issues.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue}`);
  });
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════
// RECOMENDACIONES
// ═══════════════════════════════════════════════════════════════════════

console.log('═════════════════════════════════════════════════════════════════\n');

if (results.failed === 0 && results.warnings === 0) {
  console.log('🎉 LÓGICA DE MODELOS CORRECTA - LISTA PARA TESTING EN VIVO\n');
  console.log('✨ Pasos siguientes:\n');
  console.log('1. Reiniciar StudioLab (npm start)');
  console.log('2. Abrir DevTools (F12)');
  console.log('3. Probar cambiar entre modelos:');
  console.log('   - Click en botón Groq → debe iluminar Groq, apagar otros');
  console.log('   - Click en botón OpenAI → debe iluminar OpenAI, apagar otros');
  console.log('   - Selecciona modelo específico → debe cambiar estado correctamente');
  console.log('4. Escribir un mensaje → debe responder el modelo seleccionado');
  console.log('5. Verificar en Console que los logs son correctos:\n');
  console.log('   ✅ [Provider] Cambio de modelo:');
  console.log('      ANTES: groq/...');
  console.log('      DESPUÉS: openai/...');
  console.log('   ✅ Botón iluminado: openai');
  console.log('   ⭕ Botón apagado: groq\n');
  console.log('Si ves estos logs exactamente, la lógica funciona perfectamente.\n');
  process.exit(0);
} else {
  console.log('⚠️  REQUIERE CORRECCIONES\n');
  console.log('Problemas encontrados:');
  results.issues.forEach(issue => {
    console.log(`   - ${issue}`);
  });
  console.log('\nArregla estos issues y ejecuta el test de nuevo.\n');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function extractProvidersAsJson(html) {
  const providersMatch = html.match(/const PROVIDERS = \{([\s\S]*?)\n\s*\};/);
  if (!providersMatch) return {};

  const providersStr = providersMatch[1];
  const result = {};

  // Parsing simple
  const providerMatches = providersStr.match(/([a-z]+):\s*\{([^}]*models:\s*\{([^}]*)\}[^}]*)\}/g) || [];

  providerMatches.forEach(match => {
    const providerName = match.match(/^([a-z]+):/)[1];
    const modelsMatch = match.match(/models:\s*\{([\s\S]*?)\}/);

    if (modelsMatch) {
      const modelIds = modelsMatch[1].match(/'([^']+)':/g) || [];
      result[providerName] = {
        models: {}
      };

      modelIds.forEach(modelStr => {
        const modelId = modelStr.replace(/[':]/g, '');
        result[providerName].models[modelId] = { name: modelId };
      });
    }
  });

  return result;
}
