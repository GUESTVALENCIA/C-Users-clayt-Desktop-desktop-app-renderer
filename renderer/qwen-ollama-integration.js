// Integración de Qwen con Ollama

// Función para enviar un mensaje a Ollama y recibir la respuesta
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si Ollama está disponible
  async function checkOllamaConnection() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        console.log('✅ Conexión con Ollama establecida');
        document.getElementById('status').textContent = 'Conectado a Ollama';
        document.getElementById('status').style.color = 'green';
        return true;
      } else {
        console.log('❌ Ollama no está disponible');
        document.getElementById('status').textContent = 'Ollama no está disponible';
        document.getElementById('status').style.color = 'red';
        return false;
      }
    } catch (error) {
      console.error('Error al conectar con Ollama:', error);
      document.getElementById('status').textContent = 'Error de conexión';
      document.getElementById('status').style.color = 'red';
      return false;
    }
  }

  // Función para enviar mensaje a Qwen a través de Ollama
  async function sendMessageToQwen(message) {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          messages: [{
            role: 'user',
            content: message
          }],
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Error al comunicarse con Ollama:', error);
      throw error;
    }
  }

  // Configurar el botón de envío
  const sendButton = document.getElementById('sendButton');
  const messageInput = document.getElementById('messageInput');
  const chatOutput = document.getElementById('chatOutput');

  if (sendButton && messageInput && chatOutput) {
    sendButton.addEventListener('click', async () => {
      const message = messageInput.value.trim();
      if (!message) return;

      // Añadir mensaje del usuario al chat
      chatOutput.innerHTML += `<div class="user-message"><strong>Tú:</strong> ${message}</div>`;
      messageInput.value = '';
      
      try {
        // Mostrar indicador de carga
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'assistant-message';
        loadingMessage.id = 'loading';
        loadingMessage.innerHTML = '<strong>Qwen:</strong> Escribiendo...';
        chatOutput.appendChild(loadingMessage);
        
        // Obtener respuesta de Qwen
        const response = await sendMessageToQwen(message);
        
        // Remover indicador de carga y añadir respuesta
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.remove();
        }
        
        chatOutput.innerHTML += `<div class="assistant-message"><strong>Qwen:</strong> ${response}</div>`;
        
        // Hacer scroll hacia abajo
        chatOutput.scrollTop = chatOutput.scrollHeight;
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        chatOutput.innerHTML += `<div class="error-message"><strong>Error:</strong> ${error.message}</div>`;
      }
    });

    // Permitir enviar con Enter
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });
  }

  // Verificar conexión al cargar
  checkOllamaConnection();
});

// Función para enviar un mensaje a Qwen (puede ser llamada desde otros módulos)
window.sendMessageToQwen = async function(message) {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        messages: [{
          role: 'user',
          content: message
        }],
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error al comunicarse con Ollama:', error);
    throw error;
  }
};