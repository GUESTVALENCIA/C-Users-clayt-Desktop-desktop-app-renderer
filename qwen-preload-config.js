// Archivo de preconfiguración para la integración de Qwen en Electron

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Configuración de seguridad para el preCarga (preload) de Electron
contextBridge.exposeInMainWorld('sandra', {
  // Funciones de sistema de archivos
  fs: {
    // Leer archivos
    readFile: async (filePath) => {
      try {
        const result = await ipcRenderer.invoke('fs-read-file', filePath);
        return result;
      } catch (error) {
        console.error('Error leyendo archivo:', error);
        throw error;
      }
    },
    
    // Escribir archivos
    writeFile: async (filePath, content) => {
      try {
        const result = await ipcRenderer.invoke('fs-write-file', filePath, content);
        return result;
      } catch (error) {
        console.error('Error escribiendo archivo:', error);
        throw error;
      }
    },
    
    // Listar archivos
    listFiles: async (dirPath) => {
      try {
        const result = await ipcRenderer.invoke('fs-list-files', dirPath);
        return result;
      } catch (error) {
        console.error('Error listando archivos:', error);
        throw error;
      }
    },
    
    // Guardar contexto de Qwen
    saveQwenContext: async (context) => {
      try {
        const contextPath = path.join(require('os').homedir(), '.sandra', 'qwen-context.json');
        const fs = require('fs').promises;
        
        // Asegurar que el directorio existe
        const dir = path.dirname(contextPath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
        return { success: true, path: contextPath };
      } catch (error) {
        console.error('Error guardando contexto de Qwen:', error);
        throw error;
      }
    },
    
    // Cargar contexto de Qwen
    loadQwenContext: async () => {
      try {
        const contextPath = path.join(require('os').homedir(), '.sandra', 'qwen-context.json');
        const fs = require('fs').promises;
        
        const content = await fs.readFile(contextPath, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Archivo no existe, devolver contexto vacío
          return { chatHistory: [] };
        }
        console.error('Error cargando contexto de Qwen:', error);
        throw error;
      }
    }
  },
  
  // Funciones de comunicación con Qwen
  qwen: {
    // Verificar conexión
    checkConnection: async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
      } catch (error) {
        console.error('Error verificando conexión con Qwen:', error);
        return false;
      }
    },
    
    // Enviar mensaje
    sendMessage: async (message, options = {}) => {
      try {
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen2.5:7b',
            messages: [{ role: 'user', content: message }],
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
        console.error('Error comunicándose con Qwen:', error);
        throw error;
      }
    }
  },
  
  // Funciones de sistema
  system: {
    // Obtener información del sistema
    getInfo: () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electron: process.versions.electron
      };
    },
    
    // Ejecutar comando (limitado por seguridad)
    executeCommand: async (command) => {
      // Por seguridad, esta función está limitada
      // Solo se permiten comandos específicos
      if (!command.startsWith('ollama')) {
        throw new Error('Comando no permitido por razones de seguridad');
      }
      
      try {
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
      } catch (error) {
        console.error('Error ejecutando comando:', error);
        throw error;
      }
    }
  },
  
  // Funciones de utilidad
  utils: {
    // Esperar (delay)
    delay: (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Formatear fecha
    formatDate: (date) => {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
    }
  }
});

console.log('✅ Preconfiguración de Qwen para Sandra IA cargada');
console.log('✅ Disponible en window.sandra con funciones seguras');

// Verificar conexión con Ollama al cargar
window.addEventListener('load', async () => {
  try {
    const isConnected = await window.sandra.qwen.checkConnection();
    console.log(isConnected ? '✅ Conexión con Qwen activa' : '⚠️ Qwen no disponible');
    
    // Disparar evento de estado
    window.dispatchEvent(new CustomEvent('qwenStatus', {
      detail: { connected: isConnected }
    }));
  } catch (error) {
    console.error('Error verificando conexión con Qwen:', error);
  }
});