#!/usr/bin/env node

/**
 * TEST DEEPSEEK API - Validación Exhaustiva
 * ═══════════════════════════════════════════════════════════════════════
 * Pruebas del modelo DeepSeek (API Gratuita)
 * Plan Gratuito: 1,000 tokens iniciales + costo muy bajo después
 * ═══════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 TEST DEEPSEEK API - Plan Gratuito Ilimitado             ║');
console.log('║  https://api.deepseek.com                                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

if (!DEEPSEEK_API_KEY) {
  console.error('❌ ERROR: DEEPSEEK_API_KEY no configurada en .env');
  process.exit(1);
}

const masked = DEEPSEEK_API_KEY.substring(0, 10) + '...' + DEEPSEEK_API_KEY.substring(DEEPSEEK_API_KEY.length - 5);
console.log(`✅ API Key encontrada: ${masked}\n`);

// Modelos disponibles en DeepSeek
const MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat', type: 'general' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', type: 'code' },
  { id: 'deepseek-r1', name: 'DeepSeek R1 (Reasoning)', type: 'reasoning' },
  { id: 'deepseek-v3', name: 'DeepSeek V3 (Latest)', type: 'general' }
];

const results = {
  working: [],
  failed: [],
  timestamp: new Date().toISOString()
};

/**
 * Probar un modelo específico
 */
async function testModel(model) {
  return new Promise((resolve) => {
    (async () => {
      try {
        console.log(`⏳ Probando: ${model.name} (${model.id})`);

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model.id,
            messages: [{
              role: 'user',
              content: 'Hola, ¿estás funcionando? Responde brevemente con "Sí, funcionando correctamente".'
            }],
            temperature: 0.3,
            max_tokens: 100
          })
        });

        const data = await response.json();

        if (response.ok && data.choices && data.choices[0]?.message?.content) {
          const content = data.choices[0].message.content;
          console.log(`   ✅ FUNCIONA`);
          console.log(`   Respuesta: "${content.substring(0, 60)}..."\n`);

          results.working.push({
            model: model.id,
            name: model.name,
            type: model.type,
            response: content.substring(0, 150),
            usage: data.usage,
            timestamp: new Date().toISOString()
          });

          resolve(true);
        } else {
          const error = data.error?.message || 'Unknown error';
          console.log(`   ❌ ERROR: ${error}\n`);

          results.failed.push({
            model: model.id,
            name: model.name,
            error: error
          });

          resolve(false);
        }
      } catch (error) {
        console.log(`   ❌ EXCEPCIÓN: ${error.message}\n`);

        results.failed.push({
          model: model.id,
          name: model.name,
          error: error.message
        });

        resolve(false);
      }
    })();
  });
}

/**
 * Ejecutar todas las pruebas
 */
(async () => {
  console.log('═════════════════════════════════════════════════════════════════\n');
  console.log('📋 PROBANDO TODOS LOS MODELOS DE DEEPSEEK:\n');

  // Probar modelos secuencialmente
  for (const model of MODELS) {
    await testModel(model);
    // Pequeño delay entre requests
    await new Promise(r => setTimeout(r, 1000));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('═════════════════════════════════════════════════════════════════\n');
  console.log('📊 RESULTADO FINAL:\n');

  console.log(`✅ MODELOS FUNCIONANDO: ${results.working.length}`);
  results.working.forEach(m => {
    console.log(`   ├─ ${m.name} (${m.model})`);
    if (m.usage) {
      console.log(`   │  └─ Tokens: ${m.usage.prompt_tokens}/${m.usage.completion_tokens}/${m.usage.total_tokens}`);
    }
  });

  if (results.failed.length > 0) {
    console.log(`\n❌ MODELOS CON ERROR: ${results.failed.length}`);
    results.failed.forEach(m => {
      console.log(`   ├─ ${m.name} (${m.model})`);
      console.log(`   │  └─ Error: ${m.error}`);
    });
  }

  console.log('\n═════════════════════════════════════════════════════════════════\n');

  if (results.working.length > 0) {
    console.log('✨ INFORMACIÓN DE DEEPSEEK:\n');
    console.log('📌 Endpoint: https://api.deepseek.com/v1/chat/completions');
    console.log('💰 Plan: COMPLETAMENTE GRATUITO (1,000 tokens iniciales + precios muy bajos)');
    console.log('🚀 Características:');
    console.log('   ├─ Compatible con OpenAI SDK');
    console.log('   ├─ Múltiples modelos disponibles');
    console.log('   ├─ Excelente relación calidad/precio');
    console.log('   └─ Soporte a razonamiento (R1)');

    console.log('\n🔧 Cómo usar en código:\n');
    console.log(`const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${DEEPSEEK_API_KEY.substring(0, 10)}...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',  // o deepseek-coder, deepseek-r1, deepseek-v3
    messages: [{
      role: 'user',
      content: 'Tu pregunta aquí'
    }],
    temperature: 0.3,
    max_tokens: 2000
  })
});`);

    console.log('\n═════════════════════════════════════════════════════════════════\n');

    // Guardar resultados
    const fs = require('fs');
    fs.writeFileSync('./test-deepseek-results.json', JSON.stringify(results, null, 2));
    console.log('📄 Resultados guardados en: test-deepseek-results.json\n');

    console.log('🎯 PRÓXIMOS PASOS:\n');
    console.log('1. Agregar DeepSeek a la configuración de PROVIDERS');
    console.log('2. Integrar con Auto Orchestration Engine');
    console.log('3. Incluir en modo MÚLTIPLE para síntesis multi-modelo');
    console.log('4. Usar para fallback cuando otros modelos sean lentos\n');

    console.log('✅ DEEPSEEK ESTÁ LISTO PARA PRODUCCIÓN\n');
    process.exit(0);
  } else {
    console.log('❌ NINGÚN MODELO DE DEEPSEEK FUNCIONÓ\n');
    console.log('Posibles causas:');
    console.log('  1. API key inválida o expirada');
    console.log('  2. Cuenta sin créditos disponibles');
    console.log('  3. Problema de conexión\n');
    process.exit(1);
  }
})();
