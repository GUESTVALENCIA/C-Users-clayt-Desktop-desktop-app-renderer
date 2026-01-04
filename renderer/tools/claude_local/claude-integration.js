// 🧠 CLAUDE INTEGRATION — para Sandra Studio
// Copia este archivo a: renderer/orchestrator/claude-bridge.js
// Luego: import { useClaude } from './orchestrator/claude-bridge.js';

const { exec } = require('child_process');
const path = require('path');

const CLAUDE_WRAPPER = path.resolve(__dirname, '../tools/claude_local/claude_wrapper.py');

// 🧪 Probar si Python está accesible desde Node
function isPythonAvailable() {
  return new Promise((resolve) => {
    exec('python --version', (err) => {
      resolve(!err);
    });
  });
}

// 🧠 Usa Claude con fallback automático a Qwen
async function useClaude(prompt, options = {}) {
  const { 
    chatId = null, 
    attachments = [], 
    fallbackToQwen = true,
    timeout = 120000 
  } = options;

  try {
    const hasPython = await isPythonAvailable();
    if (!hasPython) {
      throw new Error("Python no disponible → usando Qwen");
    }

    // 1. Crear chat si no hay ID
    let currentChatId = chatId;
    if (!currentChatId) {
      const createRes = await runPython(['create_chat']);
      if (createRes.error) throw new Error(createRes.error);
      currentChatId = createRes.chat_id;
      if (!currentChatId) throw new Error("No se pudo crear chat en Claude");
    }

    // 2. Enviar mensaje
    const sendRes = await runPython(['send_message', currentChatId, prompt]);
    if (sendRes.error || !sendRes.answer) {
      throw new Error(`Claude error: ${sendRes.error || 'no answer'}`);
    }

    return {
      success: true,
      source: 'claude',
      chatId: currentChatId,
      answer: sendRes.answer,
      model: 'claude-3-5-sonnet' // ajustable
    };

  } catch (e) {
    console.warn(`⚠️ Claude falló: ${e.message}`);
    
    if (fallbackToQwen && typeof window.qwenChat === 'function') {
      console.log("🔄 Fallback a Qwen...");
      try {
        const qwenRes = await window.qwenChat(prompt);
        return {
          success: true,
          source: 'qwen',
          answer: qwenRes,
          chatId: chatId,
          model: 'qwen-max'
        };
      } catch (qe) {
        return { success: false, error: `Ambos fallaron: ${e.message} + ${qe.message}` };
      }
    }

    return { success: false, error: e.message, chatId: chatId };
  }
}

// 🐍 Ejecuta wrapper Python con timeout y captura JSON
function runPython(args) {
  return new Promise((resolve, reject) => {
    const cmd = `python "${CLAUDE_WRAPPER}" ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    
    const child = exec(cmd, { timeout: 120000, maxBuffer: 1024 * 1024 * 10 }); // 10 MB
    
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data; });
    child.stderr?.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          resolve({ error: `JSON parse failed: ${stdout || stderr}` });
        }
      } else {
        resolve({ error: `Exit ${code}: ${stderr || stdout}` });
      }
    });

    child.on('error', (err) => {
      resolve({ error: `Exec error: ${err.message}` });
    });
  });
}

// 🧩 Export
module.exports = { useClaude, runPython };
exports.useClaude = useClaude;