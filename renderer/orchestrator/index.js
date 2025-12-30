/**
 * ORCHESTRATOR INDEX — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Router central que elige el modelo correcto según la acción
 * - Qwen3-Max: texto puro
 * - Qwen-VL: visión + lienzo
 * - DeepSeek-R1: código + razonamiento
 * ═══════════════════════════════════════════════════════════════════════════
 */

const qwen3 = require('./models/qwen3-max');
const qwenVL = require('./models/qwen-vl');
const deepseek = require('./models/deepseek-r1');
const imageGen = require('../generators/image');
const videoGen = require('../generators/video');
const artefactGen = require('../generators/artefact');

/**
 * 🧠 Router inteligente: elige modelo según acción
 */
function routeAction(payload, callback) {
  const { button, text, type } = payload;

  console.log('[ORCHESTRATOR] 🎯 Ruteando acción:', { button, type });

  // 🔘 Botones → modelos específicos
  if (button === 'cameraBtn') {
    return qwenVL.analyzeAndGenerate('image', payload, callback);
  }

  if (button === 'videoGenBtn') {
    return deepseek.execute(videoGen.pipeline, payload, callback);
  }

  if (button === 'artefactBtn') {
    return artefactGen.create(payload, callback);
  }

  if (button === 'micBtn') {
    // Voz → texto → Qwen3-Max
    return qwen3.generate(text || 'Transcripción de voz', callback);
  }

  if (button === 'uploadBtn') {
    // Archivo → Qwen-VL para análisis
    return qwenVL.analyzeAndGenerate('file', payload, callback);
  }

  // 💬 Chat → Qwen3-Max (puro, sin modificaciones)
  if (type === 'chat-message') {
    return qwen3.generate(text, callback);
  }

  // 🔄 Default: Qwen3-Max
  console.warn('[ORCHESTRATOR] ⚠️ Acción no reconocida, usando Qwen3-Max por defecto');
  return qwen3.generate(text || 'Consulta', callback);
}

/**
 * Manejar mensaje de chat
 */
function handleChat(payload, callback) {
  console.log('[ORCHESTRATOR] 💬 Procesando chat:', payload.text?.substring(0, 50));
  
  // Extraer texto limpio (sin metadata innecesaria)
  const text = payload.text || '';
  
  // Enviar a Qwen3-Max
  qwen3.generate(text, (response) => {
    callback({
      success: true,
      model: 'qwen3-max',
      response: response.text || response,
      timestamp: Date.now()
    });
  });
}

/**
 * Manejar acción de botón
 */
function handleButton(payload, callback) {
  console.log('[ORCHESTRATOR] 🔘 Procesando botón:', payload.button);
  
  routeAction(payload, (result) => {
    callback({
      success: true,
      button: payload.button,
      result,
      timestamp: Date.now()
    });
  });
}

module.exports = {
  handleChat,
  handleButton,
  routeAction
};

