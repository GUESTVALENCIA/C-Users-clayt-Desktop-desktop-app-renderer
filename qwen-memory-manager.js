// ============================================
// QWEN Memory Manager - Gestor de Memoria Persistente
// Almacena y gestiona conversaciones, contexto y estado de QWEN
// ============================================

const fs = require('fs');
const path = require('path');
const os = require('os');

class QwenMemoryManager {
  constructor() {
    // Directorio base: ~/.qwen-code/memory
    this.baseDir = path.join(os.homedir(), '.qwen-code', 'memory');
    this.conversationsFile = path.join(this.baseDir, 'conversations.json');
    this.contextFile = path.join(this.baseDir, 'context.json');
    this.sessionSummaryFile = path.join(this.baseDir, 'session_summary.json');
    
    // Asegurar que el directorio existe
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  // ============ CONVERSACIONES ============
  
  saveConversation(conversation) {
    try {
      const conversations = this.loadConversations();
      
      // Agregar metadata si no existe
      if (!conversation.id) {
        conversation.id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!conversation.timestamp) {
        conversation.timestamp = new Date().toISOString();
      }
      
      conversations.conversations.push(conversation);
      
      // Mantener solo las últimas 100 conversaciones
      if (conversations.conversations.length > 100) {
        conversations.conversations = conversations.conversations.slice(-100);
      }
      
      // Actualizar contador
      if (!conversations.agent_identity) {
        conversations.agent_identity = {
          name: 'QWEN',
          role: 'Reina del Ecosistema SandraIA 8.0',
          created: new Date().toISOString(),
          total_conversations: 0,
          total_messages: 0
        };
      }
      
      conversations.agent_identity.total_conversations = conversations.conversations.length;
      conversations.agent_identity.total_messages += conversation.messages?.length || 0;
      conversations.agent_identity.last_activity = new Date().toISOString();
      
      fs.writeFileSync(this.conversationsFile, JSON.stringify(conversations, null, 2));
      return { success: true, conversation_id: conversation.id };
    } catch (error) {
      console.error('[QWEN Memory] Error guardando conversación:', error);
      return { success: false, error: error.message };
    }
  }

  loadConversations() {
    try {
      if (fs.existsSync(this.conversationsFile)) {
        const data = fs.readFileSync(this.conversationsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[QWEN Memory] Error cargando conversaciones:', error);
    }
    
    // Estructura inicial
    return {
      conversations: [],
      agent_identity: {
        name: 'QWEN',
        role: 'Reina del Ecosistema SandraIA 8.0',
        created: new Date().toISOString(),
        total_conversations: 0,
        total_messages: 0
      },
      context: {
        current_project: 'SandraIA 8.0',
        active_servers: ['sandra-full-access', 'sandra-core', 'sandra-mcp-native'],
        last_activity: new Date().toISOString()
      }
    };
  }

  getRecentConversations(limit = 10) {
    const conversations = this.loadConversations();
    return conversations.conversations.slice(-limit);
  }

  // ============ CONTEXTO ============
  
  saveContext(context) {
    try {
      const existing = this.loadContext();
      const updated = { ...existing, ...context, last_updated: new Date().toISOString() };
      fs.writeFileSync(this.contextFile, JSON.stringify(updated, null, 2));
      return { success: true };
    } catch (error) {
      console.error('[QWEN Memory] Error guardando contexto:', error);
      return { success: false, error: error.message };
    }
  }

  loadContext() {
    try {
      if (fs.existsSync(this.contextFile)) {
        const data = fs.readFileSync(this.contextFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[QWEN Memory] Error cargando contexto:', error);
    }
    
    // Contexto inicial
    return {
      project_knowledge: {
        'SandraIA 8.0': {
          description: 'Proyecto principal de IA con QWEN, Electron, y servidores MCP',
          technologies: ['Electron', 'MCP', 'QWEN', 'VS Code'],
          key_files: ['main.js', 'mcp-server.js', 'preload.js'],
          decisions: []
        }
      },
      user_preferences: {
        preferred_approach: 'Proactivo, usar MCP directamente',
        communication_style: 'Directo y eficiente',
        priorities: ['SandraIA 8.0', 'COE Clay']
      },
      system_state: {
        mcp_servers: {
          'sandra-full-access': { port: 3001, status: 'active' },
          'sandra-core': { port: 3002, status: 'active' },
          'sandra-mcp-native': { port: 8081, status: 'active' }
        }
      }
    };
  }

  // ============ RESUMEN DE SESIÓN ============
  
  saveSessionSummary(session) {
    try {
      const summary = this.loadSessionSummary();
      
      if (!session.session_id) {
        session.session_id = `session-${Date.now()}`;
      }
      if (!session.start) {
        session.start = new Date().toISOString();
      }
      
      summary.sessions.push(session);
      
      // Mantener solo las últimas 50 sesiones
      if (summary.sessions.length > 50) {
        summary.sessions = summary.sessions.slice(-50);
      }
      
      summary.current_session = {
        session_id: session.session_id,
        start: session.start,
        conversations: session.conversation_ids || []
      };
      
      fs.writeFileSync(this.sessionSummaryFile, JSON.stringify(summary, null, 2));
      return { success: true, session_id: session.session_id };
    } catch (error) {
      console.error('[QWEN Memory] Error guardando resumen de sesión:', error);
      return { success: false, error: error.message };
    }
  }

  loadSessionSummary() {
    try {
      if (fs.existsSync(this.sessionSummaryFile)) {
        const data = fs.readFileSync(this.sessionSummaryFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[QWEN Memory] Error cargando resumen de sesión:', error);
    }
    
    return {
      sessions: [],
      current_session: null
    };
  }

  // ============ RESUMEN PARA CONTEXTO ============
  
  getContextSummary() {
    const conversations = this.loadConversations();
    const context = this.loadContext();
    const summary = this.loadSessionSummary();
    
    // Resumir últimas conversaciones
    const recent = this.getRecentConversations(5);
    const conversationSummaries = recent.map(conv => ({
      id: conv.id,
      timestamp: conv.timestamp,
      topic: conv.metadata?.topics?.[0] || 'General',
      message_count: conv.messages?.length || 0
    }));
    
    return {
      agent_identity: conversations.agent_identity,
      recent_conversations: conversationSummaries,
      project_context: context.project_knowledge['SandraIA 8.0'],
      system_state: context.system_state,
      current_session: summary.current_session
    };
  }

  // ============ HISTORIAL COMPLETO DE CHATS ============
  
  // Obtener todas las conversaciones anteriores (para inyectar en el contexto)
  getAllPreviousConversations() {
    const conversations = this.loadConversations();
    return conversations.conversations || [];
  }

  // Obtener historial completo formateado para inyectar en QWEN
  getFormattedChatHistory(limit = 50) {
    const conversations = this.loadConversations();
    const allConvs = conversations.conversations || [];
    
    // Ordenar por timestamp (más recientes primero)
    const sorted = allConvs.sort((a, b) => {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
    
    // Limitar cantidad
    const recent = sorted.slice(0, limit);
    
    // Formatear para inyectar
    let historyText = '# HISTORIAL COMPLETO DE CONVERSACIONES ANTERIORES\n\n';
    historyText += `Total de conversaciones almacenadas: ${allConvs.length}\n`;
    historyText += `Mostrando las últimas ${recent.length} conversaciones:\n\n`;
    historyText += '---\n\n';
    
    recent.forEach((conv, idx) => {
      const date = new Date(conv.timestamp || Date.now()).toLocaleString('es-ES');
      historyText += `## Conversación #${idx + 1} - ${date}\n\n`;
      
      if (conv.metadata?.topics?.length > 0) {
        historyText += `**Temas:** ${conv.metadata.topics.join(', ')}\n\n`;
      }
      
      // Incluir todos los mensajes de la conversación
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          const role = msg.role === 'user' ? '👤 Usuario' : 
                      msg.role === 'assistant' ? '🤖 QWEN' : 
                      '⚙️ Sistema';
          historyText += `**${role}:**\n${msg.content}\n\n`;
        });
      }
      
      historyText += '---\n\n';
    });
    
    return historyText;
  }

  // Obtener resumen compacto del historial (para cuando hay muchas conversaciones)
  getCompactHistorySummary() {
    const conversations = this.loadConversations();
    const allConvs = conversations.conversations || [];
    
    if (allConvs.length === 0) {
      return 'No hay conversaciones anteriores. Esta es tu primera sesión.';
    }
    
    const sorted = allConvs.sort((a, b) => {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
    
    // Resumir las últimas 10 conversaciones de forma compacta
    const recent = sorted.slice(0, 10);
    
    let summary = `# RESUMEN DE CONVERSACIONES ANTERIORES\n\n`;
    summary += `Tienes ${allConvs.length} conversaciones almacenadas. Aquí están las últimas 10:\n\n`;
    
    recent.forEach((conv, idx) => {
      const date = new Date(conv.timestamp || Date.now()).toLocaleDateString('es-ES');
      const msgCount = conv.messages?.length || 0;
      const topics = conv.metadata?.topics?.join(', ') || 'General';
      const preview = conv.messages?.[0]?.content?.substring(0, 100) || 'Sin mensajes';
      
      summary += `${idx + 1}. **${date}** - ${topics} (${msgCount} mensajes)\n`;
      summary += `   Previa: ${preview}...\n\n`;
    });
    
    summary += '\n**Nota:** Puedes pedirme detalles de cualquier conversación anterior si necesitas información específica.\n';
    
    return summary;
  }

  // Guardar mensaje en la conversación actual (para mantener continuidad durante la sesión)
  saveCurrentSessionMessage(role, content, metadata = {}) {
    try {
      const conversations = this.loadConversations();
      const summary = this.loadSessionSummary();
      
      // Obtener o crear conversación actual
      let currentConv = conversations.conversations.find(c => 
        c.id === summary.current_session?.conversation_id
      );
      
      if (!currentConv) {
        // Crear nueva conversación para esta sesión
        currentConv = {
          id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          messages: [],
          metadata: {
            project: 'SandraIA 8.0',
            session_id: summary.current_session?.session_id || `session-${Date.now()}`,
            ...metadata
          }
        };
        conversations.conversations.push(currentConv);
      }
      
      // Agregar mensaje
      currentConv.messages.push({
        role,
        content,
        timestamp: new Date().toISOString()
      });
      
      // Actualizar metadata
      if (metadata.topics) {
        currentConv.metadata.topics = [
          ...(currentConv.metadata.topics || []),
          ...metadata.topics
        ].filter((v, i, a) => a.indexOf(v) === i); // Eliminar duplicados
      }
      
      // Guardar
      conversations.agent_identity.total_messages = 
        conversations.conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
      conversations.agent_identity.last_activity = new Date().toISOString();
      
      fs.writeFileSync(this.conversationsFile, JSON.stringify(conversations, null, 2));
      
      // Actualizar sesión actual
      if (summary.current_session) {
        summary.current_session.conversation_id = currentConv.id;
        if (!summary.current_session.conversations) {
          summary.current_session.conversations = [];
        }
        if (!summary.current_session.conversations.includes(currentConv.id)) {
          summary.current_session.conversations.push(currentConv.id);
        }
        fs.writeFileSync(this.sessionSummaryFile, JSON.stringify(summary, null, 2));
      }
      
      return { success: true, conversation_id: currentConv.id };
    } catch (error) {
      console.error('[QWEN Memory] Error guardando mensaje:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = QwenMemoryManager;

