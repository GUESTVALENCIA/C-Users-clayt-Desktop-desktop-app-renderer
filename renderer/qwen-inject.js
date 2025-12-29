(() => {
  // Injected into the QWEN webview partition to estimate tokens and send IPC
  const { ipcRenderer } = require('electron');

  function estimateTokens() {
    try {
      const text = document.body?.innerText || '';
      return Math.ceil(text.length / 4);
    } catch {
      return 0;
    }
  }

  const send = () => ipcRenderer.invoke('qwen:contextUsage', { tokens: estimateTokens() }).catch(() => {});

  const observer = new MutationObserver(() => send());
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true, characterData: true });
  setInterval(send, 5000);

  window.addEventListener('DOMContentLoaded', send);
})();
