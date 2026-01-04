// 🤖 CHATGPT INTEGRATION — versión ligera (sin Selenium)
// Igual que claude-integration.js, pero para ChatGPT

const { exec } = require('child_process');
const path = require('path');

const CHATGPT_WRAPPER = path.resolve(__dirname, 'chatgpt_wrapper.py');

function isPythonAvailable() {
  return new Promise((resolve) => {
    exec('python --version', (err) => {
      resolve(!err);
    });
  });
}

async function useChatGPT(prompt, options = {}) {
  const { chatId = null, fallbackToQwen = true, timeout = 120000 } = options;

  try {
    const hasPython = await isPythonAvailable();
    if (!hasPython) throw new Error("Python no disponible → usando Qwen");

    // Llamar a wrapper Python
    const args = ['send_message', prompt];
    if (chatId) args.unshift('--chat-id', chatId);

    const cmd = `python "${CHATGPT_WRAPPER}" ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    
    return new Promise((resolve, reject) => {
      const child = exec(cmd, { timeout, maxBuffer: 1024 * 1024 * 10 });
      let stdout = '', stderr = '';

      child.stdout?.on('data', d => stdout += d);
      child.stderr?.on('data', d => stderr += d);

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (e) {
            resolve({ error: `JSON falló: ${stdout}` });
          }
        } else {
          resolve({ error: `Exit ${code}: ${stderr || stdout}` });
        }
      });

      child.on('error', (err) => resolve({ error: `Exec: ${err.message}` }));
    });

  } catch (e) {
    console.warn(`⚠️ ChatGPT falló: ${e.message}`);
    if (fallbackToQwen && typeof window.qwenChat === 'function') {
      const qwenRes = await window.qwenChat(prompt);
      return { success: true, source: 'qwen', answer: qwenRes };
    }
    return { success: false, error: e.message };
  }
}

module.exports = { useChatGPT };
exports.useChatGPT = useChatGPT;