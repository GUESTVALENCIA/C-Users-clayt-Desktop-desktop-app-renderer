#!/usr/bin/env node

/**
 * TEST ALL MODELS - Análisis exhaustivo de modelos reales
 *
 * Prueba CADA modelo en CADA proveedor y documenta:
 * - Qué modelo responde
 * - Qué proveedor funciona
 * - Qué errores aparecen
 *
 * SOLO incluye en la lista final los modelos que funcionan
 */

require('dotenv').config();
const fs = require('fs');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const results = {
  groq: { working: [], failed: [] },
  anthropic: { working: [], failed: [] },
  gemini: { working: [], failed: [] },
  openrouter: { working: [], failed: [] },
  timestamp: new Date().toISOString()
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  ANÁLISIS EXHAUSTIVO: PRUEBAS DE MODELOS REALES 2025          ║');
console.log('║  Solo incluiremos modelos que responden correctamente          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// GROQ TESTS
// ============================================================================
async function testGroq() {
  if (!GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY no configurada\n');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS GROQ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const modelsToTest = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
    'groq/compound',
    'groq/compound-mini',
    'whisper-large-v3',
    'whisper-large-v3-turbo',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'moonshotai/kimi-k2-instruct-0905',
    'qwen/qwen3-32b'
  ];

  for (const modelId of modelsToTest) {
    try {
      console.log(`⏳ Probando: ${modelId}`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hola, ¿estás funcionando?' }],
          max_tokens: 50,
          temperature: 0.3
        })
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;
        console.log(`   ✅ FUNCIONA - Respuesta: "${content.substring(0, 50)}..."\n`);
        results.groq.working.push({
          model: modelId,
          name: modelId.replace('meta-llama/', '').replace('openai/', '').replace('moonshotai/', '').replace('qwen/', ''),
          response: content.substring(0, 100)
        });
      } else {
        const error = data.error?.message || 'Unknown error';
        console.log(`   ❌ ERROR: ${error}\n`);
        results.groq.failed.push({ model: modelId, error });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);
      results.groq.failed.push({ model: modelId, error: error.message });
    }

    // Pequeña pausa entre requests
    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================================
// ANTHROPIC TESTS
// ============================================================================
async function testAnthropic() {
  if (!ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY no configurada\n');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS ANTHROPIC/CLAUDE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const modelsToTest = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20250219',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];

  for (const modelId of modelsToTest) {
    try {
      console.log(`⏳ Probando: ${modelId}`);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hola, ¿estás funcionando?' }]
        })
      });

      const data = await response.json();

      if (response.ok && data.content && data.content[0]) {
        const content = data.content[0].text;
        console.log(`   ✅ FUNCIONA - Respuesta: "${content.substring(0, 50)}..."\n`);
        results.anthropic.working.push({
          model: modelId,
          name: modelId,
          response: content.substring(0, 100)
        });
      } else {
        const error = data.error?.message || 'Unknown error';
        console.log(`   ❌ ERROR: ${error}\n`);
        results.anthropic.failed.push({ model: modelId, error });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);
      results.anthropic.failed.push({ model: modelId, error: error.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================================
// GEMINI TESTS
// ============================================================================
async function testGemini() {
  if (!GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY no configurada\n');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS GEMINI');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const modelsToTest = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2-5-flash',
    'gemini-2-5-flash-lite',
    'gemini-2-5-pro',
    'gemini-2-0-flash',
    'gemini-2-0-flash-lite',
    'gemini-1-5-pro',
    'gemini-1-5-flash'
  ];

  for (const modelId of modelsToTest) {
    try {
      console.log(`⏳ Probando: ${modelId}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hola, ¿estás funcionando?' }] }],
            generationConfig: { maxOutputTokens: 50 }
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const content = data.candidates[0].content.parts[0].text;
        console.log(`   ✅ FUNCIONA - Respuesta: "${content.substring(0, 50)}..."\n`);
        results.gemini.working.push({
          model: modelId,
          name: modelId,
          response: content.substring(0, 100)
        });
      } else {
        const error = data.error?.message || 'Unknown error';
        console.log(`   ❌ ERROR: ${error}\n`);
        results.gemini.failed.push({ model: modelId, error });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);
      results.gemini.failed.push({ model: modelId, error: error.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================================
// OPENROUTER TESTS
// ============================================================================
async function testOpenRouter() {
  if (!OPENROUTER_API_KEY) {
    console.log('❌ OPENROUTER_API_KEY no configurada\n');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS OPENROUTER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const modelsToTest = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku',
    'google/gemini-3-pro',
    'google/gemini-3-flash',
    'qwen/qwen-max',
    'qwen/qwen-turbo'
  ];

  for (const modelId of modelsToTest) {
    try {
      console.log(`⏳ Probando: ${modelId}`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hola, ¿estás funcionando?' }],
          max_tokens: 50
        })
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;
        console.log(`   ✅ FUNCIONA - Respuesta: "${content.substring(0, 50)}..."\n`);
        results.openrouter.working.push({
          model: modelId,
          name: modelId,
          response: content.substring(0, 100)
        });
      } else {
        const error = data.error?.message || 'Unknown error';
        console.log(`   ❌ ERROR: ${error}\n`);
        results.openrouter.failed.push({ model: modelId, error });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);
      results.openrouter.failed.push({ model: modelId, error: error.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================================
// GENERAR REPORTE FINAL
// ============================================================================
function generateReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 REPORTE FINAL - MODELOS QUE FUNCIONAN                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('🟢 GROQ - MODELOS FUNCIONANDO:', results.groq.working.length);
  results.groq.working.forEach(m => {
    console.log(`   ✅ ${m.model}`);
  });

  console.log('\n🟢 ANTHROPIC - MODELOS FUNCIONANDO:', results.anthropic.working.length);
  results.anthropic.working.forEach(m => {
    console.log(`   ✅ ${m.model}`);
  });

  console.log('\n🟢 GEMINI - MODELOS FUNCIONANDO:', results.gemini.working.length);
  results.gemini.working.forEach(m => {
    console.log(`   ✅ ${m.model}`);
  });

  console.log('\n🟢 OPENROUTER - MODELOS FUNCIONANDO:', results.openrouter.working.length);
  results.openrouter.working.forEach(m => {
    console.log(`   ✅ ${m.model}`);
  });

  // Guardar reporte
  const reportPath = './test-models-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ℹ️  Usa estos modelos EN LA LISTA - son los que realmente funcionan');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================
async function runAllTests() {
  try {
    await testGroq();
    await testAnthropic();
    await testGemini();
    await testOpenRouter();
    generateReport();
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

runAllTests();
