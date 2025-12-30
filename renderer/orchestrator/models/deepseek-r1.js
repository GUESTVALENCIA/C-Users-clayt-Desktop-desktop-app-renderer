/**
 * DEEPSEEK-R1 — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Modelo de razonamiento y código para:
 * - Pipelines de video
 * - Generación de artefactos
 * - Lógica compleja
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-reasoner'; // o 'deepseek-chat'

/**
 * Ejecutar pipeline o tarea compleja
 */
async function execute(pipeline, payload, callback) {
  if (!API_KEY) {
    console.warn('[DEEPSEEK-R1] ⚠️ API_KEY no configurada, usando fallback');
    return tryOllamaFallback(pipeline, payload, callback);
  }

  try {
    console.log('[DEEPSEEK-R1] 🧠 Ejecutando pipeline:', pipeline.name || 'unknown');

    const prompt = buildPrompt(pipeline, payload);

    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en razonamiento y generación de código. Responde de forma directa y útil.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Respuesta vacía de DeepSeek-R1');
    }

    console.log('[DEEPSEEK-R1] ✅ Respuesta recibida');

    callback({
      model: 'deepseek-r1',
      result: content,
      pipeline: pipeline.name,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[DEEPSEEK-R1] ❌ Error:', error.message);
    
    // Fallback a Ollama
    return tryOllamaFallback(pipeline, payload, callback);
  }
}

/**
 * Construir prompt según el pipeline
 */
function buildPrompt(pipeline, payload) {
  const { text = '', canvasData } = payload;

  switch (pipeline.name) {
    case 'video':
      return `Genera un pipeline de video para: ${text}. 
              Incluye pasos de: 1) Generación de frames, 2) Composición, 3) Audio, 4) Renderizado.
              ${canvasData ? 'Basado en el lienzo proporcionado.' : ''}`;

    case 'artefact':
      return `Genera un artefacto (código/JSON/binario) para: ${text}.
              Proporciona la estructura completa y lista para usar.`;

    default:
      return `Ejecuta la tarea: ${text}`;
  }
}

/**
 * Fallback a Ollama local
 */
async function tryOllamaFallback(pipeline, payload, callback) {
  try {
    console.log('[DEEPSEEK-R1] 🔄 Intentando Ollama fallback...');

    const prompt = buildPrompt(pipeline, payload);

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'deepseek-r1:latest', // o 'deepseek-coder:latest'
      prompt: prompt,
      stream: false
    }, {
      timeout: 60000
    });

    const content = response.data?.response || '';

    if (content) {
      console.log('[DEEPSEEK-R1] ✅ Fallback Ollama exitoso');
      callback({
        model: 'deepseek-r1 (ollama)',
        result: content,
        pipeline: pipeline.name,
        timestamp: Date.now()
      });
    } else {
      throw new Error('Ollama no disponible');
    }
  } catch (error) {
    console.error('[DEEPSEEK-R1] ❌ Fallback Ollama falló:', error.message);
    callback({
      error: 'deepseek-r1 y ollama fallaron',
      detail: error.message
    });
  }
}

module.exports = {
  execute
};

