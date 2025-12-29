#!/usr/bin/env node

/**
 * TEST OPENAI MODELS - Análisis de modelos específicos de OpenAI
 *
 * Prueba SOLO los modelos que el usuario ha seleccionado:
 * - gpt-5.2-2025-12-11
 * - gpt-5.2-pro
 * - gpt-5.1-codex-max
 * - o3-2025-04-16
 * - gpt-4o
 *
 * Documenta respuesta real o error específico
 */

require('dotenv').config();
const fs = require('fs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const results = {
  openai: {
    working: [],
    failed: [],
    metadata: {
      api_endpoint: 'https://api.openai.com/v1/chat/completions',
      tested_at: new Date().toISOString(),
      api_key_preview: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 20) + '...' : 'NOT SET'
    }
  }
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  PRUEBAS OPENAI - MODELOS SELECCIONADOS POR EL USUARIO        ║');
console.log('║  Solo probamos los modelos que requiere - sin invención        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY no configurada en .env');
  process.exit(1);
}

console.log('✅ OpenAI API Key detectada');
console.log(`   Key (preview): ${OPENAI_API_KEY.substring(0, 20)}...`);
console.log(`   Length: ${OPENAI_API_KEY.length} caracteres\n`);

// ============================================================================
// OPENAI TESTS - MODELOS ESPECÍFICOS
// ============================================================================
async function testOpenAI() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PRUEBAS OPENAI - MODELOS SELECCIONADOS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Modelos específicos que el usuario requiere
  const modelsToTest = [
    {
      id: 'gpt-5.2-2025-12-11',
      name: 'GPT-5.2 (2025-12-11)',
      description: 'Latest GPT-5.2 variant'
    },
    {
      id: 'gpt-5.2-pro',
      name: 'GPT-5.2 Pro',
      description: 'Professional variant'
    },
    {
      id: 'gpt-5.1-codex-max',
      name: 'GPT-5.1 Codex Max',
      description: 'Codex agent - máxima capacidad'
    },
    {
      id: 'o3-2025-04-16',
      name: 'O3 (2025-04-16)',
      description: 'Reasoning model O3'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'GPT-4 Optimized'
    }
  ];

  console.log(`Modelos a probar: ${modelsToTest.length}\n`);

  for (const modelConfig of modelsToTest) {
    const modelId = modelConfig.id;

    try {
      console.log(`⏳ Probando: ${modelConfig.name} (${modelId})`);
      console.log(`   Descripción: ${modelConfig.description}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{
            role: 'user',
            content: 'Hola, ¿estás funcionando? Responde brevemente.'
          }],
          max_tokens: 100,
          temperature: 0.3
        })
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        const content = data.choices[0].message.content;
        const tokens = data.usage;

        console.log(`   ✅ FUNCIONA - Respuesta recibida`);
        console.log(`   Texto: "${content.substring(0, 60)}..."`);
        console.log(`   Tokens: ${tokens?.prompt_tokens} entrada, ${tokens?.completion_tokens} salida\n`);

        results.openai.working.push({
          model: modelId,
          name: modelConfig.name,
          description: modelConfig.description,
          response: content.substring(0, 150),
          tokens_used: tokens,
          timestamp: new Date().toISOString()
        });
      } else {
        const error = data.error?.message || data.error?.type || 'Unknown error';
        const code = data.error?.code || response.status;

        console.log(`   ❌ ERROR (${code}): ${error}\n`);

        results.openai.failed.push({
          model: modelId,
          name: modelConfig.name,
          error: error,
          error_code: code,
          full_error: data.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPCIÓN: ${error.message}`);
      console.log(`   Tipo: ${error.name}\n`);

      results.openai.failed.push({
        model: modelId,
        name: modelConfig.name,
        error: error.message,
        error_type: error.name,
        timestamp: new Date().toISOString()
      });
    }

    // Pequeña pausa entre requests
    await new Promise(r => setTimeout(r, 1000));
  }
}

// ============================================================================
// GENERAR REPORTE FINAL
// ============================================================================
function generateReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 REPORTE FINAL - MODELOS OPENAI FUNCIONALES                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`🟢 OPENAI - MODELOS FUNCIONANDO: ${results.openai.working.length}/5\n`);

  if (results.openai.working.length > 0) {
    results.openai.working.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ✅ ${m.name} (${m.model})`);
      console.log(`      Respuesta: "${m.response.substring(0, 50)}..."`);
      console.log(`      Tokens: ${m.tokens_used?.prompt_tokens}/${m.tokens_used?.completion_tokens}`);
    });
  } else {
    console.log('   ⚠️  Ningún modelo respondió correctamente\n');
  }

  if (results.openai.failed.length > 0) {
    console.log(`\n🔴 OPENAI - MODELOS CON ERROR: ${results.openai.failed.length}/5\n`);
    results.openai.failed.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ❌ ${m.name} (${m.model})`);
      console.log(`      Error: ${m.error}`);
      console.log(`      Código: ${m.error_code}`);
    });
  }

  // Guardar reporte
  const reportPath = './test-openai-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);

  // Resumen para actualizar PROVIDERS
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 MODELOS A AGREGAR AL ARCHIVO DE CONFIGURACIÓN:\n');

  if (results.openai.working.length > 0) {
    console.log('PROVIDERS.openai.models = {');
    results.openai.working.forEach(m => {
      console.log(`  '${m.model}': { name: '${m.name}', context: 128000, speed: 'balanced', tested: true },`);
    });
    console.log('}');
  } else {
    console.log('⚠️  No hay modelos para agregar (ninguno respondió)');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================
async function runAllTests() {
  try {
    await testOpenAI();
    generateReport();
    process.exit(results.openai.working.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

runAllTests();
