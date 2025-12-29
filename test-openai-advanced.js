#!/usr/bin/env node

/**
 * TEST OPENAI ADVANCED - Ajusta parámetros según el modelo
 *
 * Algunos modelos como GPT-5.2 y O3 usan max_completion_tokens en lugar de max_tokens
 */

require('dotenv').config();
const fs = require('fs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const results = {
  openai: {
    working: [],
    failed: [],
  }
};

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔄 PRUEBAS OPENAI AVANZADAS - AJUSTES DE PARÁMETROS          ║');
console.log('║  Algunos modelos requieren parámetros específicos              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

if (!OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY no configurada');
  process.exit(1);
}

async function testModel(modelId, name, description, useCompletionTokens = false) {
  try {
    console.log(`⏳ Probando: ${name} (${modelId})`);

    const body = {
      model: modelId,
      messages: [{
        role: 'user',
        content: 'Hola, ¿estás funcionando? Responde brevemente.'
      }],
      temperature: 0.3
    };

    // Algunos modelos usan max_completion_tokens
    if (useCompletionTokens) {
      body.max_completion_tokens = 100;
    } else {
      body.max_tokens = 100;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      console.log(`   ✅ FUNCIONA - "${content.substring(0, 50)}..."\n`);

      results.openai.working.push({
        model: modelId,
        name: name,
        description: description,
        response: content.substring(0, 150),
        uses_completion_tokens: useCompletionTokens
      });
      return true;
    } else {
      const error = data.error?.message || 'Unknown error';
      console.log(`   ❌ ERROR: ${error}\n`);

      results.openai.failed.push({
        model: modelId,
        name: name,
        error: error
      });
      return false;
    }
  } catch (error) {
    console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);

    results.openai.failed.push({
      model: modelId,
      name: name,
      error: error.message
    });
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Probar modelos con max_tokens
  console.log('📋 MODELOS CON max_tokens (estándar):\n');
  await testModel('gpt-4o', 'GPT-4o', 'GPT-4 Optimized', false);

  // Pequeña pausa
  await new Promise(r => setTimeout(r, 1000));

  // Probar modelos con max_completion_tokens
  console.log('📋 MODELOS CON max_completion_tokens (nuevo formato):\n');
  await testModel('gpt-5.2-2025-12-11', 'GPT-5.2 (2025-12-11)', 'Latest GPT-5.2', true);
  await new Promise(r => setTimeout(r, 1000));

  await testModel('gpt-5.2-pro', 'GPT-5.2 Pro', 'Professional variant', true);
  await new Promise(r => setTimeout(r, 1000));

  await testModel('o3-2025-04-16', 'O3 (2025-04-16)', 'Reasoning model O3', true);
  await new Promise(r => setTimeout(r, 1000));

  // Codex - probablemente no funcione en chat completions
  console.log('📋 MODELOS CODEX (Agents):\n');
  await testModel('gpt-5.1-codex-max', 'GPT-5.1 Codex Max', 'Codex agent', true);

  // Reporte
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESULTADO FINAL                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ MODELOS FUNCIONANDO: ${results.openai.working.length}\n`);
  results.openai.working.forEach(m => {
    console.log(`   • ${m.name} (${m.model})`);
    console.log(`     Parámetro: ${m.uses_completion_tokens ? 'max_completion_tokens' : 'max_tokens'}`);
  });

  if (results.openai.failed.length > 0) {
    console.log(`\n❌ MODELOS CON ERROR: ${results.openai.failed.length}\n`);
    results.openai.failed.forEach(m => {
      console.log(`   • ${m.name} (${m.model})`);
      console.log(`     Error: ${m.error}`);
    });
  }

  // Guardar reporte
  fs.writeFileSync('./test-openai-advanced-report.json', JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado: test-openai-advanced-report.json\n`);

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📋 MODELOS PARA AGREGAR A CONFIGURACIÓN:\n');
  console.log('const PROVIDERS = {');
  console.log('  openai: {');
  console.log('    name: "ChatGPT",');
  console.log('    models: {');

  results.openai.working.forEach(m => {
    console.log(`      '${m.model}': { name: '${m.name}', context: 128000, speed: 'balanced', tested: true },`);
  });

  console.log('    }');
  console.log('  }');
  console.log('}\n');
}

runTests().catch(console.error);
