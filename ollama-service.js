// Servicio para conectar con Ollama (OpenAI SDK removido - no se usa)
class OllamaService {
  constructor() {
    // Configurar la URL base para Ollama
    this.baseUrl = 'http://localhost:11434';
    this.model = 'qwen2.5:7b';
  }

  // Método para enviar mensajes al modelo Qwen
  async sendMessage(message, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              'role': 'user',
              'content': message
            }
          ],
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2048
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

  // Método para verificar si Ollama está disponible
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Error al verificar conexión con Ollama:', error);
      return false;
    }
  }
}

module.exports = OllamaService;