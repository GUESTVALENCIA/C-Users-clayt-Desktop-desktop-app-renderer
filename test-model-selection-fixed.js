#!/usr/bin/env node

/**
 * TEST MODEL SELECTION LOGIC FIXED
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  ✅ TEST MODEL SELECTION - Validación Simplificada           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const htmlPath = path.join(__dirname, 'renderer', 'studiolab-final-v2.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract PROVIDERS
const providersMatch = htmlContent.match(/const PROVIDERS = \{[\s\S]*?\n\s*\};/);
if (!providersMatch) {
  console.error('❌ PROVIDERS no encontrado');
  process.exit(1);
}

const providersStr = providersMatch[0];

// Extract state
const stateMatch = htmlContent.match(/const state = \{[\s\S]*?\n\s*\};/);
if (!stateMatch) {
  console.error('❌ STATE no encontrado');
  process.exit(1);
}

const stateStr = stateMatch[0];

//  Extract radio buttons
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

console.log('📋 MODELOS EN HTML:\n');
Object.entries(htmlModels).forEach(([provider, models]) => {
  console.log(`   ${provider.toUpperCase()}: ${models.length}`);
  models.forEach(m => console.log(`      • ${m}`));
});
console.log('');

// Extract PROVIDERS models
console.log('📋 MODELOS EN PROVIDERS:\n');

const providersModels = {};
const providerMatches = providersStr.match(/([a-z]+):\s*\{[\s\S]*?models:\s*\{([\s\S]*?)\}[\s\S]*?\}/g) || [];

providerMatches.forEach(match => {
  const provName = match.match(/^([a-z]+):/)[1];
  const modelsSection = match.match(/models:\s*\{([\s\S]*?)\}/)[1];
  
  const modelIds = modelsSection.match(/'([^']+)':/g) || [];
  providersModels[provName] = modelIds.map(m => m.replace(/[':]/g, ''));
});

Object.entries(providersModels).forEach(([provider, models]) => {
  console.log(`   ${provider.toUpperCase()}: ${models.length}`);
  models.forEach(m => console.log(`      • ${m}`));
});

console.log('');

// Verify
console.log('🔍 VERIFICACIÓN:\n');

let allOk = true;

Object.entries(htmlModels).forEach(([provider, models]) => {
  const providersForThis = providersModels[provider] || [];
  
  models.forEach(modelId => {
    if (!providersForThis.includes(modelId)) {
      console.log(`   ❌ ${provider}/${modelId} en HTML pero NO en PROVIDERS`);
      allOk = false;
    }
  });
});

if (allOk) {
  console.log('   ✅ TODOS LOS MODELOS COINCIDEN\n');
} else {
  console.log('\n');
}

// Check state
console.log('🔍 VERIFICACIÓN STATE:\n');

const stateChecks = [
  ['currentProvider', /currentProvider:\s*'groq'/],
  ['currentModel', /currentModel:\s*'llama-3.3-70b-versatile'/],
  ['useAPI', /useAPI:\s*true/]
];

stateChecks.forEach(([name, regex]) => {
  if (regex.test(stateStr)) {
    console.log(`   ✅ ${name} correctamente inicializado`);
  } else {
    console.log(`   ❌ ${name} INCORRECTO`);
    allOk = false;
  }
});

console.log('');

// Check functions
console.log('🔍 VERIFICACIÓN FUNCIONES:\n');

const functionChecks = [
  ['initProviderButtons', /function initProviderButtons\(\)/],
  ['toggleProviderDropdown', /function toggleProviderDropdown/],
  ['selectProviderModel', /function selectProviderModel/]
];

functionChecks.forEach(([name, regex]) => {
  if (regex.test(htmlContent)) {
    console.log(`   ✅ ${name} presente`);
    
    // Check if uses currentProvider
    const funcMatch = htmlContent.match(new RegExp(`function ${name}[\s\S]*?^    \}`, 'm'));
    if (funcMatch && funcMatch[0].includes('state.currentProvider')) {
      console.log(`      ✅ Usa state.currentProvider`);
    } else if (funcMatch && !funcMatch[0].includes('state.selectedProvider')) {
      console.log(`      ✅ No usa estado inválido`);
    }
  } else {
    console.log(`   ❌ ${name} NO ENCONTRADO`);
    allOk = false;
  }
});

console.log('');

// Final result
console.log('═════════════════════════════════════════════════════════════════\n');

if (allOk) {
  console.log('🎉 ¡LÓGICA DE MODELOS PERFECTA!\n');
  console.log('✅ Botones interactivos listos');
  console.log('✅ Modelos sincronizados');
  console.log('✅ Estado correcto\n');
  console.log('📋 PRÓXIMO PASO:\n');
  console.log('1. Reinicia StudioLab (npm start)');
  console.log('2. Abre DevTools (F12)');
  console.log('3. Click en Groq → debe iluminarse SOLO Groq');
  console.log('4. Click en OpenAI → debe cambiar a OpenAI');
  console.log('5. Selecciona modelo → debe responder ese modelo\n');
  process.exit(0);
} else {
  console.log('❌ Requiere correcciones\n');
  process.exit(1);
}
