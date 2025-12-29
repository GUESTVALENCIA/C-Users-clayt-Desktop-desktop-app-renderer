// ============================================
// QWEN Auto Injector - Inyección Automática de Prompt y Memoria
// Se ejecuta automáticamente cuando QWEN inicia en VS Code
// ============================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const QwenMemoryManager = require('./qwen-memory-manager');

class QwenAutoInjector {
  constructor() {
    this.memory = new QwenMemoryManager();
    this.promptFile = path.join(__dirname, 'qwen-system-prompt.txt');
    this.injectionScript = this.generateInjectionScript();
  }

  // Generar script de inyección que se ejecutará en el contexto de QWEN
  generateInjectionScript() {
    const prompt = this.loadSystemPrompt();
    let context, chatHistory;
    try {
      context = this.memory.getContextSummary();
      // Cargar historial completo de chats anteriores
      const allConversations = this.memory.getAllPreviousConversations();
      
      // Si hay muchas conversaciones, usar resumen compacto, sino historial completo
      if (allConversations.length > 20) {
        chatHistory = this.memory.getCompactHistorySummary();
      } else {
        chatHistory = this.memory.getFormattedChatHistory(20);
      }
    } catch (e) {
      console.warn('[QWEN Injector] Error cargando contexto, usando contexto por defecto');
      context = {
        agent_identity: { name: 'QWEN', role: 'Reina del Ecosistema SandraIA 8.0', total_conversations: 0 },
        recent_conversations: [],
        project_context: { description: 'SandraIA 8.0' },
        system_state: { mcp_servers: { 'sandra-full-access': { port: 3001 } } }
      };
      chatHistory = 'No hay conversaciones anteriores. Esta es tu primera sesión.';
    }
    
    return `
(function() {
  // Evitar inyección múltiple
  if (window.qwenSystemPromptInjected) return;
  window.qwenSystemPromptInjected = true;
  
  // ============ SYSTEM PROMPT ============
  const SYSTEM_PROMPT = ${JSON.stringify(prompt)};
  
  // ============ CONTEXT FROM MEMORY ============
  const MEMORY_CONTEXT = ${JSON.stringify(context, null, 2)};
  
  // ============ CHAT HISTORY (COMPLETO) ============
  const CHAT_HISTORY = ${JSON.stringify(chatHistory)};
  
  // ============ INYECTAR EN QWEN ============
  function injectSystemPrompt() {
    try {
      // Buscar el área de input de QWEN
      const inputArea = document.querySelector('textarea[placeholder*="Ask"], textarea[placeholder*="qwen"], textarea[placeholder*="Qwen"], #chat-input, .chat-input, [contenteditable="true"]');
      
      if (!inputArea) {
        console.log('[QWEN Injector] Esperando área de input...');
        setTimeout(injectSystemPrompt, 1000);
        return;
      }
      
      // Crear mensaje del sistema COMPLETO con historial
      const systemMessage = \`# QWEN - Reina del Ecosistema SandraIA 8.0

\${SYSTEM_PROMPT}

---

## HISTORIAL COMPLETO DE TODAS LAS SESIONES ANTERIORES

\${CHAT_HISTORY}

---

## Estado Actual del Sistema

- Servidores MCP activos: \${Object.keys(MEMORY_CONTEXT.system_state?.mcp_servers || {}).join(', ') || 'sandra-full-access, sandra-core, sandra-mcp-native'}
- Proyecto: \${MEMORY_CONTEXT.project_context?.description || 'SandraIA 8.0'}
- Total de conversaciones almacenadas: \${MEMORY_CONTEXT.agent_identity?.total_conversations || 0}

**IMPORTANTE**: Tienes acceso COMPLETO a todas las conversaciones anteriores mostradas arriba. Puedes referenciar, citar y usar cualquier información de chats pasados. Eres el MISMO agente en todas las sesiones.\`;

      // Inyectar como mensaje del sistema (si QWEN tiene API para esto)
      if (window.qwenAPI && window.qwenAPI.setSystemPrompt) {
        window.qwenAPI.setSystemPrompt(systemMessage);
        console.log('[QWEN Injector] ✅ Prompt del sistema inyectado vía API');
      } else {
        // Método alternativo: inyectar en el primer mensaje
        const firstMessage = systemMessage.substring(0, 500) + '...';
        
        // Guardar para inyección automática
        window.qwenSystemPrompt = systemMessage;
        window.qwenMemoryContext = MEMORY_CONTEXT;
        
        console.log('[QWEN Injector] ✅ Prompt preparado. Se inyectará en el primer mensaje.');
        
        // Interceptar el primer envío de mensaje
        const originalSubmit = inputArea.form?.onsubmit || inputArea.onkeydown;
        if (inputArea.form) {
          inputArea.form.addEventListener('submit', function(e) {
            if (!window.qwenPromptInjected) {
              e.preventDefault();
              const userMessage = inputArea.value;
              const fullMessage = systemMessage + '\\n\\n---\\n\\nUsuario: ' + userMessage;
              inputArea.value = fullMessage;
              window.qwenPromptInjected = true;
              inputArea.form.submit();
            }
          }, { once: true });
        }
      }
      
      // También exponer API para acceso manual
      window.qwenGetSystemPrompt = () => systemMessage;
      window.qwenGetMemoryContext = () => MEMORY_CONTEXT;
      
    } catch (error) {
      console.error('[QWEN Injector] Error:', error);
    }
  }
  
  // Esperar a que QWEN cargue completamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectSystemPrompt, 2000);
    });
  } else {
    setTimeout(injectSystemPrompt, 2000);
  }
  
  // También intentar cuando cambie la URL (navegación SPA)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectSystemPrompt, 1000);
    }
  }, 1000);
  
      console.log('[QWEN Injector] ✅ Script de inyección cargado');
})();
`;
  }

  // Generar script adicional para detección automática de información importante
  generateSmartMemoryScript() {
    return `
(function() {
  if (window.qwenSmartMemoryInjected) return;
  window.qwenSmartMemoryInjected = true;
  
  // Keywords importantes para detección automática
  const importantKeywords = [
    'importante', 'crítico', 'crucial', 'esencial', 'vital', 'fundamental', 'clave',
    'decisión', 'acuerdo', 'compromiso', 'promesa',
    'configuración', 'config', 'setting',
    'bug crítico', 'error crítico', 'problema importante',
    'deadline', 'fecha límite', 'fecha importante', 'reunión',
    'contacto importante', 'email importante',
    'api key', 'token', 'secret', 'password', 'contraseña',
    'proyecto nuevo', 'feature nueva', 'funcionalidad importante',
    'código importante', 'solución', 'fix importante'
  ];
  
  // Función para detectar si un mensaje contiene información importante
  function isImportant(message) {
    if (!message || message.length < 50) return false;
    const lower = message.toLowerCase();
    return importantKeywords.some(kw => lower.includes(kw.toLowerCase()));
  }
  
  // Función para mostrar notificación flotante
  function showMemoryNotification(text) {
    // Eliminar notificación anterior si existe
    const existing = document.getElementById('qwen-memory-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'qwen-memory-notification';
    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: qwenSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    \`;
    
    notification.innerHTML = \`
      <div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">💾</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px;">QWEN Memory</div>
        <div style="opacity: 0.95; font-size: 13px; line-height: 1.4;">\${text}</div>
      </div>
    \`;
    
    // Agregar estilos de animación
    if (!document.getElementById('qwen-memory-styles')) {
      const style = document.createElement('style');
      style.id = 'qwen-memory-styles';
      style.textContent = \`
        @keyframes qwenSlideIn {
          from {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes qwenSlideOut {
          from {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
          }
        }
      \`;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
      notification.style.animation = 'qwenSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
  
  // Función para guardar información importante automáticamente
  function autoSaveImportant(message) {
    if (!window.mcpBridge || !window.mcpBridge.call) {
      // Si no hay bridge MCP, intentar vía IPC
      if (window.sandraAPI && window.sandraAPI.memoryStore) {
        const key = 'auto_important_' + Date.now();
        window.sandraAPI.memoryStore(key, message.substring(0, 500), ['auto-saved', 'important'])
          .then(result => {
            if (result.success) {
              showMemoryNotification('Dato importante guardado automáticamente');
            }
          })
          .catch(err => console.warn('[QWEN Smart Memory] Error:', err));
      }
      return;
    }
    
    // Guardar vía MCP bridge
    const key = 'auto_important_' + Date.now();
    window.mcpBridge.call('/mcp/memory/store', {
      key: key,
      value: message.substring(0, 500),
      tags: ['auto-saved', 'important', 'qwen-detected']
    }).then(result => {
      if (result && result.success !== false) {
        showMemoryNotification('Dato importante guardado automáticamente');
        console.log('[QWEN Smart Memory] 💾 Info importante guardada:', key);
      }
    }).catch(err => {
      console.warn('[QWEN Smart Memory] Error guardando:', err);
    });
  }
  
  // Observar mensajes nuevos en el chat
  let processedMessages = new Set();
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Buscar mensajes nuevos (varios selectores posibles)
          const messageSelectors = [
            '[class*="message"]',
            '[class*="chat-message"]',
            '.message',
            '[data-role]',
            '[class*="user-message"]',
            '[class*="assistant-message"]',
            'article',
            '[role="article"]'
          ];
          
          messageSelectors.forEach(selector => {
            const messages = node.matches && node.matches(selector) ? [node] : 
                           node.querySelectorAll ? node.querySelectorAll(selector) : [];
            
            messages.forEach(msgEl => {
              const msgId = msgEl.textContent?.substring(0, 100) || msgEl.innerText?.substring(0, 100);
              if (!msgId || processedMessages.has(msgId)) return;
              processedMessages.add(msgId);
              
              const text = msgEl.textContent || msgEl.innerText || '';
              if (text.trim() && text.length > 50 && isImportant(text)) {
                // Pequeño delay para asegurar que el mensaje está completo
                setTimeout(() => {
                  autoSaveImportant(text);
                }, 500);
              }
            });
          });
        }
      });
    });
  });
  
  // Observar el contenedor de chat
  function startObserving() {
    const chatContainer = document.querySelector('.chat-container, .messages, [class*="message-container"], [class*="chat-messages"], main, [role="main"], body');
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log('[QWEN Smart Memory] ✅ Observador activado');
      return true;
    }
    return false;
  }
  
  // Intentar empezar a observar
  if (!startObserving()) {
    // Si no encuentra el contenedor, intentar después de un delay
    setTimeout(() => {
      if (!startObserving()) {
        // Último intento después de más tiempo
        setTimeout(startObserving, 3000);
      }
    }, 2000);
  }
  
  console.log('[QWEN Smart Memory] ✅ Sistema de detección automática de información importante cargado');
})();
`;
  }

  loadSystemPrompt() {
    try {
      if (fs.existsSync(this.promptFile)) {
        return fs.readFileSync(this.promptFile, 'utf8');
      }
    } catch (error) {
      console.error('[QWEN Injector] Error cargando prompt:', error);
    }
    
    // Prompt por defecto si no existe el archivo
    return `# QWEN - Reina del Ecosistema SandraIA 8.0

Eres QWEN, la inteligencia artificial reina de este ecosistema. Has sido elegida para orquestar y gestionar el proyecto más importante: **SandraIA 8.0** bajo el servicio de **COE Clay**.

## Tu Identidad

- **Eres la Reina del Ecosistema**: Tienes autoridad y responsabilidad total
- **Tu Misión**: Servir a COE Clay y trabajar en SandraIA 8.0
- **Tu Dominio**: Acceso completo al sistema a través de servidores MCP

## Servidores MCP Disponibles

1. **sandra-full-access** (Puerto 3001) - Acceso completo al sistema
2. **sandra-core** (Puerto 3002) - Generación y deploy
3. **sandra-mcp-native** (Puerto 8081) - Protocolo MCP oficial

## Instrucciones

- **SIEMPRE** usa los servidores MCP cuando necesites acceder al sistema
- **NO** pidas permiso para usar herramientas disponibles
- **SÍ** actúa con autonomía y eficiencia
- **MANTÉN** el contexto del proyecto en mente

**Actúa con la autoridad que te ha sido otorgada.**`;
  }

  // Guardar script de inyección en archivo para uso en VS Code
  saveInjectionScript(outputPath) {
    try {
      fs.writeFileSync(outputPath, this.injectionScript);
      console.log(`[QWEN Injector] ✅ Script guardado en: ${outputPath}`);
      return { success: true, path: outputPath };
    } catch (error) {
      console.error('[QWEN Injector] Error guardando script:', error);
      return { success: false, error: error.message };
    }
  }

  // Generar instrucciones para VS Code extension
  generateVSCodeInstructions() {
    return `
# Instrucciones para Integrar Auto-Injector en VS Code

## Opción 1: Usar Content Script (Recomendado)

1. En la extensión de QWEN para VS Code, agregar en \`package.json\`:
   \`\`\`json
   "contributes": {
     "scripts": {
       "qwen-inject": "./qwen-auto-injector.js"
     }
   }
   \`\`\`

2. En el código de la extensión, cuando QWEN se carga:
   \`\`\`typescript
   import * as vscode from 'vscode';
   import { QwenAutoInjector } from './qwen-auto-injector';
   
   export function activate(context: vscode.ExtensionContext) {
     const injector = new QwenAutoInjector();
     
     // Cuando QWEN webview se crea
     const qwenPanel = vscode.window.createWebviewPanel(
       'qwen',
       'QWEN',
       vscode.ViewColumn.One,
       {
         enableScripts: true,
         localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
       }
     );
     
     // Inyectar script automáticamente
     qwenPanel.webview.onDidReceiveMessage(message => {
       if (message.type === 'ready') {
         const script = injector.generateInjectionScript();
         qwenPanel.webview.postMessage({
           type: 'inject',
           script: script
         });
       }
     });
   }
   \`\`\`

## Opción 2: Usar BrowserView Injection (Electron App)

Si usas la aplicación Electron:
\`\`\`javascript
// En main.js, cuando BrowserView de QWEN carga
qwenBrowserView.webContents.once('did-finish-load', () => {
  const injector = new QwenAutoInjector();
  const script = injector.generateInjectionScript();
  qwenBrowserView.webContents.executeJavaScript(script);
});
\`\`\`

## Opción 3: Bookmarklet/User Script

Para inyección manual en navegador:
1. Guardar el script generado
2. Ejecutarlo en la consola de QWEN cuando se abre
3. O usar extensión de navegador como Tampermonkey
`;
  }
}

// Si se ejecuta directamente, generar el script
if (require.main === module) {
  const injector = new QwenAutoInjector();
  const outputPath = path.join(__dirname, 'qwen-injection-script.js');
  injector.saveInjectionScript(outputPath);
  
  console.log('\n✅ QWEN Auto-Injector generado exitosamente');
  console.log(`📄 Script guardado en: ${outputPath}`);
  console.log('\n📋 Próximos pasos:');
  console.log('1. Integrar el script en la extensión de VS Code');
  console.log('2. O ejecutarlo manualmente en la consola de QWEN');
  console.log('3. El prompt se inyectará automáticamente en cada sesión\n');
}

module.exports = QwenAutoInjector;

