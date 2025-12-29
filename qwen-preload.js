// qwen-preload.js - Preload para StudioLab con integración completa de Qwen y MCP

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
            model: options.model || 'qwen2.5:7b',
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
    },
    
    // Cargar historial de chat
    loadChatHistory: async () => {
      try {
        const context = await window.sandra.fs.loadQwenContext();
        return context.chatHistory || [];
      } catch (error) {
        console.error('Error cargando historial de chat:', error);
        return [];
      }
    },
    
    // Guardar historial de chat
    saveChatHistory: async (history) => {
      try {
        await window.sandra.fs.saveQwenContext({ chatHistory: history });
      } catch (error) {
        console.error('Error guardando historial de chat:', error);
        throw error;
      }
    }
  },
  
  // Funciones de MCP
  mcp: {
    // Llamar a un servicio MCP
    callService: async (service, params) => {
      try {
        const result = await ipcRenderer.invoke('service-call', service, params);
        return result;
      } catch (error) {
        console.error('Error en llamada MCP:', error);
        throw error;
      }
    },
    
    // Cambiar ruta de la aplicación
    changeRoute: async (route) => {
      try {
        const result = await ipcRenderer.invoke('load-route', route);
        return result;
      } catch (error) {
        console.error('Error cambiando ruta:', error);
        throw error;
      }
    },
    
    // Llamar a herramientas MCP directamente
    callMCPTool: async (server, tool, args) => {
      try {
        const response = await fetch('http://localhost:19875/call', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tool: `${server}_${tool}`,
            params: args
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error MCP: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error en herramienta MCP:', error);
        throw error;
      }
    },
    
    // Verificar estado de MCP
    checkMCPStatus: async () => {
      try {
        const response = await fetch('http://localhost:19875/tools');
        return response.ok;
      } catch (error) {
        console.error('Error verificando estado de MCP:', error);
        return false;
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

// Funciones globales para la aplicación
window.loadQwenIntegration = async () => {
  try {
    // Verificar conexión con Ollama
    const isConnected = await window.sandra.qwen.checkConnection();
    
    // Verificar estado de MCP
    const isMCPConnected = await window.sandra.mcp.checkMCPStatus();
    
    // Disparar evento de estado
    window.dispatchEvent(new CustomEvent('qwenStatus', {
      detail: { 
        connected: isConnected,
        mcpConnected: isMCPConnected
      }
    }));
    
    return { ollama: isConnected, mcp: isMCPConnected };
  } catch (error) {
    console.error('Error verificando conexión con Qwen:', error);
    return { ollama: false, mcp: false };
  }
};

console.log('✅ Preload de Qwen para Sandra IA cargado');
console.log('✅ Disponible en window.sandra con funciones seguras');

// Verificar conexión con Ollama al cargar
window.addEventListener('load', async () => {
  try {
    await window.loadQwenIntegration();
  } catch (error) {
    console.error('Error verificando conexión con Qwen:', error);
  }
});