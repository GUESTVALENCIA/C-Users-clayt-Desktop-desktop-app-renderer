// qwen-integration.js - Integración de Qwen con StudioLab 8.0 Pro

// Verificar si estamos en el entorno de Electron
const isElectron = window.require && window.sandraAPI;

// Configuración de Qwen
const qwenConfig = {
  model: 'qwen2.5:7b',
  endpoint: 'http://localhost:11434',
  maxTokens: 2048,
  temperature: 0.7
};

// Función para enviar mensaje a Qwen a través de Ollama
async function sendQwenMessage(message, options = {}) {
  if (isElectron && window.sandraAPI) {
    // Usar la API de Electron si está disponible
    try {
      return await window.sandraAPI.sendMessage(message, {
        model: options.model || qwenConfig.model
      });
    } catch (error) {
      console.error('Error usando API de Electron:', error);
      // Fallback a la API directa
      return await sendQwenMessageDirect(message, options);
    }
  } else {
    // Usar la API directa si no estamos en Electron
    return await sendQwenMessageDirect(message, options);
  }
}

// Función para enviar mensaje directamente a Ollama
async function sendQwenMessageDirect(message, options = {}) {
  try {
    const response = await fetch(`${qwenConfig.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || qwenConfig.model,
        messages: [{
          role: 'user',
          content: message
        }],
        stream: false,
        options: {
          temperature: options.temperature || qwenConfig.temperature,
          num_ctx: options.maxTokens || qwenConfig.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error comunicándose con Ollama:', error);
    throw error;
  }
}

// Función para verificar si Ollama está disponible
async function checkQwenConnection() {
  if (isElectron && window.sandraAPI) {
    try {
      return await window.sandraAPI.checkOllama();
    } catch (error) {
      console.error('Error verificando conexión con Ollama:', error);
      return false;
    }
  } else {
    try {
      const response = await fetch(`${qwenConfig.endpoint}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Error verificando conexión con Ollama:', error);
      return false;
    }
  }
}

// Función para integrar con la interfaz existente
function integrateWithUI() {
  // Verificar si hay un elemento de chat en la página
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  
  if (messageInput && sendBtn) {
    // Reemplazar la funcionalidad de envío existente
    const originalSendMessage = window.sendMessage || function() {};
    
    window.sendMessage = async function() {
      const message = messageInput.value.trim();
      if (!message) return;
      
      // Deshabilitar botón de enviar mientras se procesa
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span>...</span>';
      
      try {
        // Agregar mensaje del usuario a la interfaz
        if (window.addMessage) {
          window.addMessage('user', message);
        }
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Enviar mensaje a Qwen y obtener respuesta
        const response = await sendQwenMessage(message);
        
        // Agregar respuesta de Qwen a la interfaz
        if (window.addMessage) {
          window.addMessage('assistant', response);
        }
      } catch (error) {
        console.error('Error al enviar mensaje a Qwen:', error);
        
        // Mostrar error en la interfaz
        if (window.addMessage) {
          window.addMessage('assistant', `❌ Error al comunicarse con Qwen: ${error.message}`);
        }
      } finally {
        // Restaurar botón de enviar
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>↑</span>';
      }
    };
    
    // Configurar evento de click para el botón de enviar
    sendBtn.onclick = window.sendMessage;
    
    // Configurar evento de teclado para Enter
    messageInput.onkeydown = function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendMessage();
      }
    };
    
    console.log('✅ Integración con UI completada');
  }
  
  // Actualizar estado de conexión en la interfaz
  updateConnectionStatus();
}

// Función para actualizar el estado de conexión en la interfaz
async function updateConnectionStatus() {
  try {
    const isConnected = await checkQwenConnection();
    
    const statusBadge = document.querySelector('.status-badge');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusBadge && statusDot) {
      if (isConnected) {
        statusBadge.innerHTML = '<div class="status-dot"></div><span>Qwen Local</span>';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
        statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        statusBadge.style.color = '#10b981';
        statusDot.style.background = '#10b981';
      } else {
        statusBadge.innerHTML = '<div class="status-dot"></div><span>Qwen Offline</span>';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        statusBadge.style.color = '#ef4444';
        statusDot.style.background = '#ef4444';
      }
    }
  } catch (error) {
    console.error('Error actualizando estado de conexión:', error);
  }
}

// Inicializar la integración cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    integrateWithUI();
  });
} else {
  integrateWithUI();
}

// Exportar funciones para uso en otros módulos
window.qwenIntegration = {
  sendQwenMessage,
  checkQwenConnection,
  integrateWithUI,
  updateConnectionStatus,
  config: qwenConfig
};

console.log('✅ Integración de Qwen con StudioLab cargada');

// Verificar conexión cada 30 segundos
setInterval(async () => {
  await updateConnectionStatus();
}, 30000);