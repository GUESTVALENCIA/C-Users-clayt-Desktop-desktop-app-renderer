require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

(async () => {
  console.log('⏳ Probando O3 (2025-04-16) con parámetros correctos...\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'o3-2025-04-16',
      messages: [{
        role: 'user',
        content: 'Hola, ¿estás funcionando? Responde brevemente.'
      }],
      max_completion_tokens: 100,
      temperature: 1
    })
  });

  const data = await response.json();

  if (response.ok && data.choices && data.choices[0]?.message?.content) {
    const content = data.choices[0].message.content;
    console.log('✅ O3 (2025-04-16) FUNCIONA');
    console.log(`Respuesta: "${content.substring(0, 80)}..."\n`);
    console.log('✓ Parámetros correctos:');
    console.log('  - max_completion_tokens: 100');
    console.log('  - temperature: 1 (solo soporta este valor)\n');
  } else {
    const error = data.error?.message || 'Unknown';
    console.log(`❌ Error: ${error}\n`);
  }
})();
