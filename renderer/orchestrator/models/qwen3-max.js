/**
 * QWEN3-MAX — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Modelo de texto puro, sin personalizaciones externas
 * - Solo texto, sin ideología
 * - Respuestas directas y útiles
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

// Configuración
const API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const MODEL = 'qwen-max'; // o 'qwen-plus', 'qwen-turbo'

/**
 * Generar respuesta de texto
 */
async function generate(prompt, callback) {
  if (!API_KEY) {
    console.error('[QWEN3-MAX] ❌ API_KEY no configurada');
    return callback({
      error: 'API_KEY no configurada',
      detail: 'Configura QWEN_API_KEY o DASHSCOPE_API_KEY en variables de entorno'
    });
  }

  try {
    console.log('[QWEN3-MAX] 📤 Enviando prompt:', prompt.substring(0, 50) + '...');

    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.8
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 segundos
      }
    );

    const content = response.data?.output?.choices?.[0]?.message?.content || 
                    response.data?.output?.text || 
                    '';

    if (!content) {
      throw new Error('Respuesta vacía de Qwen3-Max');
    }

    console.log('[QWEN3-MAX] ✅ Respuesta recibida:', content.substring(0, 50) + '...');

    callback({
      model: 'qwen3-max',
      text: content,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[QWEN3-MAX] ❌ Error:', error.message);
    
    // Si es error de API, intentar con Ollama local como fallback
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('[QWEN3-MAX] 🔄 Intentando fallback a Ollama local...');
      return tryOllamaFallback(prompt, callback);
    }

    callback({
      error: 'qwen3-max falló',
      detail: error.message,
      response: error.response?.data
    });
  }
}

/**
 * Fallback a Ollama local (si está disponible)
 */
async function tryOllamaFallback(prompt, callback) {
  try {
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'qwen2.5:latest', // o el modelo que tengas instalado
      prompt: prompt,
      stream: false
    }, {
      timeout: 30000
    });

    const content = ollamaResponse.data?.response || '';
    
    if (content) {
      console.log('[QWEN3-MAX] ✅ Fallback Ollama exitoso');
      callback({
        model: 'qwen3-max (ollama)',
        text: content,
        timestamp: Date.now()
      });
    } else {
      throw new Error('Ollama no disponible');
    }
  } catch (error) {
    console.error('[QWEN3-MAX] ❌ Fallback Ollama falló:', error.message);
    callback({
      error: 'qwen3-max y ollama fallaron',
      detail: error.message
    });
  }
}

module.exports = {
  generate
};

