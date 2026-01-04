// 🎻 + 🎙️ Integración voz-orquestación
// Añade soporte para audio en el motor principal

const { voiceEngine } = require('./stt-tts.js');

// Extiende el orquestador
function enhanceOrchestrationWithVoice(orchestrationEngine) {
  // Nuevo método: procesa audio directamente
  orchestrationEngine.processAudio = async function(audioPath, options = {}) {
    console.log('🎤 Procesando audio:', audioPath);
    
    try {
      return await voiceEngine.processVoiceInput(audioPath);
    } catch (e) {
      return { success: false, error: `Voz falló: ${e.message}` };
    }
  };

  // Nuevo método: responde con voz
  orchestrationEngine.speakResponse = async function(response, options = {}) {
    if (response.success && response.answer) {
      try {
        await voiceEngine.speak(response.answer, options);
        return { ...response, spoken: true };
      } catch (e) {
        return { ...response, spoken: false, speakError: e.message };
      }
    }
    return response;
  };

  console.log('🎙️ Soporte de voz añadido al orquestador');
}

// Aplicar si el orquestador está disponible
if (window.orchestrationEngine) {
  enhanceOrchestrationWithVoice(window.orchestrationEngine);
} else {
  // Esperar a que se cargue
  document.addEventListener('DOMContentLoaded', () => {
    if (window.orchestrationEngine) {
      enhanceOrchestrationWithVoice(window.orchestrationEngine);
    }
  });
}

module.exports = { enhanceOrchestrationWithVoice };
exports.enhanceOrchestrationWithVoice = enhanceOrchestrationWithVoice;