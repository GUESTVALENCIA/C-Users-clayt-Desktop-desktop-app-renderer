#!/usr/bin/env node

/**
 * TEST KIMI K2 - Validación de API
 * ═══════════════════════════════════════════════════════════════════════
 * Prueba del modelo Kimi K2 de Moonshot AI
 * ═══════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const KIMI_API_KEY = process.env.KIMI_API_KEY;

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║  🎯 TEST KIMI K2 API - Moonshot AI                        ║');
console.log('╚═════════════════════════════════════════════════════════════╝\n');

if (!KIMI_API_KEY) {
  console.error('❌ ERROR: KIMI_API_KEY no configurada en .env');
  process.exit(1);
}

// Mostrar API key de forma segura
const masked = KIMI_API_KEY.substring(0, 10) + '...' + KIMI_API_KEY.substring(KIMI_API_KEY.length - 5);
console.log(`API Key: ${masked}`);
console.log('Intentando conectar a Kimi K2...\n');

(async () => {
  try {
    console.log('⏳ Probando Kimi K2 con endpoint OpenAI-compatible...\n');

    // Intentar con OpenAI-compatible API (endpoint común para Kimi)
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',  // Modelo estándar de Moonshot
        messages: [{
          role: 'user',
          content: '¿Hola? ¿Estás funcionando? Responde brevemente con "Sí, funcionando" si me recibiste.'
        }],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message?.content;
      console.log('\n✅ KIMI K2 FUNCIONA CORRECTAMENTE');
      console.log(`\n📨 Respuesta:\n"${content}"\n`);
      console.log('✓ Parámetros válidos:');
      console.log('  - Endpoint: https://api.moonshot.cn/v1/chat/completions');
      console.log('  - Modelo: moonshot-v1-32k');
      console.log('  - Temperature: flexible');
      console.log('  - Max tokens: 100+\n');

      // Información adicional
      if (data.usage) {
        console.log('📊 Estadísticas:');
        console.log(`  - Input tokens: ${data.usage.prompt_tokens}`);
        console.log(`  - Output tokens: ${data.usage.completion_tokens}`);
        console.log(`  - Total: ${data.usage.total_tokens}\n`);
      }

      // Salida JSON para captura
      const result = {
        status: 'success',
        model: 'moonshot-v1-32k',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        response: content,
        usage: data.usage,
        timestamp: new Date().toISOString()
      };

      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('JSON RESULT:');
      console.log(JSON.stringify(result, null, 2));

      process.exit(0);

    } else {
      const error = data.error?.message || 'Unknown error';
      console.error(`\n❌ Error: ${error}\n`);

      if (response.status === 401) {
        console.error('⚠️  La API key parece ser inválida o expirada');
        console.error('   Verifica que KIMI_API_KEY sea correcta en .env');
      } else if (response.status === 404) {
        console.error('⚠️  Endpoint no encontrado');
        console.error('   Kimi K2 podría usar un endpoint diferente');
      } else if (response.status === 429) {
        console.error('⚠️  Rate limit alcanzado');
        console.error('   Espera unos minutos e intenta de nuevo');
      }

      console.log('\nRespuesta completa del servidor:');
      console.log(JSON.stringify(data, null, 2));

      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Error de conexión: ${error.message}\n`);
    console.error('Esto podría significar:');
    console.error('  1. Sin conexión a internet');
    console.error('  2. Endpoint incorrecto');
    console.error('  3. El servidor está caído\n');

    // Intentar endpoint alternativo
    console.log('Intentando endpoint alternativo (OpenRouter)...\n');

    try {
      // OpenRouter también soporta Kimi K2
      const altResponse = await fetch('https://openrouter.io/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIMI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshot/kimi-v1-32k',
          messages: [{
            role: 'user',
            content: 'Hola, ¿funciona?'
          }],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      const altData = await altResponse.json();

      if (altResponse.ok && altData.choices && altData.choices[0]?.message?.content) {
        console.log('✅ KIMI K2 FUNCIONA VÍA OPENROUTER');
        console.log(`\nRespuesta: "${altData.choices[0].message.content}"\n`);
        process.exit(0);
      }
    } catch (altError) {
      // Fallthrough
    }

    process.exit(1);
  }
})();
