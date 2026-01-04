// 🤖 CHATGPT INTEGRATOR — para cuando quieras usarlo
// Funciona igual que Claude/Qwen

async function sendToChatGPT(prompt, options = {}) {
  try {
    const { useChatGPT } = await import('../../tools/chatgpt_local/chatgpt-integration.js');
    const res = await useChatGPT(prompt, options);
    return res;
  } catch (e) {
    return { success: false, error: e.message || 'ChatGPT no disponible' };
  }
}

function autoChatGPTHandler(item) {
  // Ejemplo: usar para creatividad
  if (item.type === 'text' && /escribe.*cuento|poema|historia/i.test(item.content)) {
    sendToChatGPT(`Escribe un breve: ${item.content}`).then(res => {
      if (res.success) {
        window.sandraMemory?.store(`chatgpt-${item.id}`, JSON.stringify(res));
      }
    });
  }
}

module.exports = { sendToChatGPT, autoChatGPTHandler };
exports.sendToChatGPT = sendToChatGPT;
exports.autoChatGPTHandler = autoChatGPTHandler;