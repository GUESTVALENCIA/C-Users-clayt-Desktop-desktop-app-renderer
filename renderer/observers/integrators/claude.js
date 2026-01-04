// 🧠 CLAUDE INTEGRATOR — para documentos largos y PDFs
// Usa el cliente Python ya configurado

async function sendToClaude(docItem, options = {}) {
  if (!docItem.extractedText || docItem.extractedText.length < 20) {
    return { error: 'Texto demasiado corto' };
  }

  const { action = 'resume', maxLength = 200 } = options;
  let prompt = '';

  switch (action) {
    case 'resume':
      prompt = `Resume este documento en máximo ${maxLength} palabras:\n\n${docItem.extractedText}`;
      break;
    case 'explain':
      prompt = `Explica este documento como si fuera para un principiante:\n\n${docItem.extractedText}`;
      break;
    case 'extract':
      prompt = `Extrae los puntos clave en formato lista:\n\n${docItem.extractedText}`;
      break;
    default:
      prompt = docItem.extractedText;
  }

  console.log(`🧠 Enviando ${docItem.type} a Claude (${docItem.extractedText.length} chars)`);

  try {
    // Usar el bridge ya creado
    const { useClaude } = await import('../..//tools/claude_local/claude-integration.js');
    const res = await useClaude(prompt, { fallbackToQwen: false });
    
    if (res.success) {
      return {
        success: true,
        source: 'claude',
        answer: res.answer,
        original: docItem,
        timestamp: Date.now()
      };
    } else {
      throw new Error(res.error);
    }
  } catch (e) {
    console.warn('Claude falló, intentando con Qwen...', e.message);
    try {
      const { useClaude } = await import('../..//tools/claude_local/claude-integration.js');
      const res = await useClaude(prompt, { fallbackToQwen: true });
      return res;
    } catch (e2) {
      return { error: `Ambos fallaron: ${e.message} / ${e2.message}` };
    }
  }
}

// Auto-procesamiento
function autoClaudeHandler(docItem) {
  if (docItem.type === 'pdf' || docItem.extractedText?.length > 500) {
    sendToClaude(docItem, { action: 'resume' }).then(result => {
      if (result.success) {
        window.sandraMemory?.store(`claude-doc-${docItem.id}`, JSON.stringify(result));
      }
    });
  }
}

module.exports = { sendToClaude, autoClaudeHandler };
exports.sendToClaude = sendToClaude;
exports.autoClaudeHandler = autoClaudeHandler;