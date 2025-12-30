/**
 * QWEN UI COMPONENT - CHAT WIDGET
 * 
 * Este archivo contiene el código HTML y JavaScript para integrar
 * el widget de chat de QWEN en tu aplicación.
 * 
 * Incluye:
 * - Botón de Login/Logout
 * - Estado de conexión
 * - Input para enviar mensajes
 * - Visualización de respuestas
 */

// ============ ESTILOS CSS ============
const QWEN_STYLES = `
<style>
  .qwen-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .qwen-toggle-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qwen-toggle-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .qwen-toggle-btn svg {
    width: 28px;
    height: 28px;
    fill: white;
  }

  .qwen-panel {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 350px;
    max-height: 500px;
    background: #1a1a2e;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    display: none;
    flex-direction: column;
    overflow: hidden;
  }

  .qwen-panel.active {
    display: flex;
  }

  .qwen-header {
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .qwen-header-title {
    color: white;
    font-weight: 600;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .qwen-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .qwen-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4444;
  }

  .qwen-status-dot.connected {
    background: #00c853;
  }

  .qwen-login-btn, .qwen-logout-btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .qwen-login-btn {
    background: white;
    color: #667eea;
  }

  .qwen-login-btn:hover {
    background: #f0f0f0;
  }

  .qwen-logout-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .qwen-logout-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .qwen-messages {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    max-height: 300px;
  }

  .qwen-message {
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: 12px;
    max-width: 85%;
    word-wrap: break-word;
  }

  .qwen-message.user {
    background: #667eea;
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 4px;
  }

  .qwen-message.assistant {
    background: #2a2a4a;
    color: #e0e0e0;
    border-bottom-left-radius: 4px;
  }

  .qwen-input-area {
    padding: 12px;
    background: #16162a;
    display: flex;
    gap: 8px;
  }

  .qwen-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #3a3a5a;
    border-radius: 8px;
    background: #2a2a4a;
    color: white;
    font-size: 14px;
    outline: none;
  }

  .qwen-input:focus {
    border-color: #667eea;
  }

  .qwen-input::placeholder {
    color: #8a8aa0;
  }

  .qwen-send-btn {
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .qwen-send-btn:hover {
    opacity: 0.9;
  }

  .qwen-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
`;

// ============ HTML DEL WIDGET ============
const QWEN_HTML = `
<div class="qwen-widget" id="qwen-widget">
  <!-- Botón flotante -->
  <button class="qwen-toggle-btn" id="qwen-toggle-btn" title="Abrir QWEN">
    <svg viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  </button>

  <!-- Panel de chat -->
  <div class="qwen-panel" id="qwen-panel">
    <!-- Header -->
    <div class="qwen-header">
      <div class="qwen-header-title">
        <span>🤖</span>
        <span>QWEN Chat</span>
      </div>
      <div class="qwen-status">
        <span class="qwen-status-dot" id="qwen-status-dot"></span>
        <button class="qwen-login-btn" id="qwen-login-btn" style="display: block;">Login</button>
        <button class="qwen-logout-btn" id="qwen-logout-btn" style="display: none;">Logout</button>
      </div>
    </div>

    <!-- Mensajes -->
    <div class="qwen-messages" id="qwen-messages">
      <div class="qwen-message assistant">
        ¡Hola! Soy QWEN. ¿En qué puedo ayudarte?
      </div>
    </div>

    <!-- Input -->
    <div class="qwen-input-area">
      <input 
        type="text" 
        class="qwen-input" 
        id="qwen-input" 
        placeholder="Escribe tu mensaje..."
        disabled
      />
      <button class="qwen-send-btn" id="qwen-send-btn" disabled>
        Enviar
      </button>
    </div>
  </div>
</div>
`;

// ============ JAVASCRIPT DEL WIDGET ============
const QWEN_SCRIPT = `
<script>
(function() {
  // Referencias a elementos
  const toggleBtn = document.getElementById('qwen-toggle-btn');
  const panel = document.getElementById('qwen-panel');
  const loginBtn = document.getElementById('qwen-login-btn');
  const logoutBtn = document.getElementById('qwen-logout-btn');
  const statusDot = document.getElementById('qwen-status-dot');
  const messagesContainer = document.getElementById('qwen-messages');
  const input = document.getElementById('qwen-input');
  const sendBtn = document.getElementById('qwen-send-btn');

  let isLoggedIn = false;
  let isPanelOpen = false;

  // Toggle del panel
  toggleBtn.addEventListener('click', async () => {
    isPanelOpen = !isPanelOpen;
    panel.classList.toggle('active', isPanelOpen);
    
    if (isPanelOpen && window.qwenAPI) {
      await window.qwenAPI.toggle(true);
      checkLoginStatus();
    } else if (window.qwenAPI) {
      await window.qwenAPI.toggle(false);
    }
  });

  // Verificar estado de login
  async function checkLoginStatus() {
    if (!window.qwenAPI) {
      console.warn('qwenAPI no disponible');
      return;
    }

    try {
      const result = await window.qwenAPI.checkLogin();
      isLoggedIn = result.isLoggedIn;
      updateUI();
    } catch (e) {
      console.error('Error verificando login:', e);
    }
  }

  // Actualizar UI según estado
  function updateUI() {
    if (isLoggedIn) {
      statusDot.classList.add('connected');
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      input.disabled = false;
      sendBtn.disabled = false;
      input.placeholder = 'Escribe tu mensaje...';
    } else {
      statusDot.classList.remove('connected');
      loginBtn.style.display = 'block';
      logoutBtn.style.display = 'none';
      input.disabled = true;
      sendBtn.disabled = true;
      input.placeholder = 'Inicia sesión para chatear...';
    }
  }

  // Login
  loginBtn.addEventListener('click', async () => {
    if (!window.qwenAPI) return;
    
    try {
      loginBtn.textContent = 'Abriendo...';
      loginBtn.disabled = true;
      
      await window.qwenAPI.login();
      
      // Esperar un poco y verificar estado
      setTimeout(() => {
        checkLoginStatus();
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
      }, 3000);
    } catch (e) {
      console.error('Error en login:', e);
      loginBtn.textContent = 'Login';
      loginBtn.disabled = false;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    if (!window.qwenAPI) return;
    
    try {
      await window.qwenAPI.logout();
      isLoggedIn = false;
      updateUI();
      addMessage('Sistema: Sesión cerrada', 'assistant');
    } catch (e) {
      console.error('Error en logout:', e);
    }
  });

  // Enviar mensaje
  async function sendMessage() {
    const message = input.value.trim();
    if (!message || !isLoggedIn || !window.qwenAPI) return;

    // Mostrar mensaje del usuario
    addMessage(message, 'user');
    input.value = '';
    sendBtn.disabled = true;

    try {
      // Enviar a QWEN
      const result = await window.qwenAPI.sendMessage(message);
      
      if (result.success) {
        // Esperar respuesta
        setTimeout(async () => {
          const response = await window.qwenAPI.getResponse();
          if (response.response) {
            addMessage(response.response, 'assistant');
          }
          sendBtn.disabled = false;
        }, 2000);
      } else {
        addMessage('Error: ' + (result.error || 'No se pudo enviar'), 'assistant');
        sendBtn.disabled = false;
      }
    } catch (e) {
      addMessage('Error: ' + e.message, 'assistant');
      sendBtn.disabled = false;
    }
  }

  // Agregar mensaje al chat
  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = 'qwen-message ' + type;
    msg.textContent = text;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Verificar login inicial
  setTimeout(checkLoginStatus, 1000);
})();
</script>
`;

// ============ EXPORTAR ============
module.exports = {
  QWEN_STYLES,
  QWEN_HTML,
  QWEN_SCRIPT,
  // Función helper para obtener todo el código
  getFullWidget: () => QWEN_STYLES + QWEN_HTML + QWEN_SCRIPT
};
