# QWEN Persistent Memory System

## Objetivo

Crear un sistema de memoria persistente para QWEN en VS Code que:
- Mantenga un agente único (no sesiones independientes)
- Almacene todas las conversaciones
- Permita acceso a contexto histórico
- Preserve decisiones y acuerdos previos

## Arquitectura

### 1. Almacenamiento de Conversaciones

**Ubicación**: `~/.qwen-code/memory/conversations.json`

**Estructura**:
```json
{
  "conversations": [
    {
      "id": "conv-001",
      "timestamp": "2025-12-26T13:00:00Z",
      "messages": [
        {
          "role": "system",
          "content": "System prompt...",
          "timestamp": "2025-12-26T13:00:00Z"
        },
        {
          "role": "user",
          "content": "Mensaje del usuario",
          "timestamp": "2025-12-26T13:01:00Z"
        },
        {
          "role": "assistant",
          "content": "Respuesta de QWEN",
          "timestamp": "2025-12-26T13:01:30Z"
        }
      ],
      "metadata": {
        "project": "SandraIA 8.0",
        "topics": ["MCP", "servidores", "implementación"],
        "tools_used": ["mcp/resources/list", "mcp/command/execute"]
      }
    }
  ],
  "agent_identity": {
    "name": "QWEN",
    "role": "Reina del Ecosistema SandraIA 8.0",
    "created": "2025-12-26T10:00:00Z",
    "total_conversations": 1,
    "total_messages": 3
  },
  "context": {
    "current_project": "SandraIA 8.0",
    "active_servers": ["sandra-full-access", "sandra-core"],
    "last_activity": "2025-12-26T13:01:30Z"
  }
}
```

### 2. Memoria de Contexto

**Ubicación**: `~/.qwen-code/memory/context.json`

**Estructura**:
```json
{
  "project_knowledge": {
    "SandraIA 8.0": {
      "description": "Proyecto principal de IA",
      "technologies": ["Electron", "MCP", "QWEN"],
      "key_files": ["main.js", "mcp-server.js"],
      "decisions": [
        {
          "date": "2025-12-26",
          "decision": "Usar servidor MCP sandra-full-access para acceso completo",
          "reason": "Necesidad de acceso fuera del workspace"
        }
      ]
    }
  },
  "user_preferences": {
    "preferred_approach": "Proactivo, usar MCP directamente",
    "communication_style": "Directo y eficiente",
    "priorities": ["SandraIA 8.0", "COE Clay"]
  },
  "system_state": {
    "mcp_servers": {
      "sandra-full-access": {
        "port": 3001,
        "status": "active",
        "last_used": "2025-12-26T13:00:00Z"
      }
    },
    "workspace": "C:\\Users\\clayt\\Desktop\\desktop-app",
    "active_files": ["main.js", "preload.js"]
  }
}
```

### 3. Resumen de Sesiones

**Ubicación**: `~/.qwen-code/memory/session_summary.json`

**Estructura**:
```json
{
  "sessions": [
    {
      "session_id": "session-001",
      "start": "2025-12-26T10:00:00Z",
      "end": "2025-12-26T12:00:00Z",
      "summary": "Configuración inicial de servidores MCP",
      "key_topics": ["MCP setup", "VS Code integration"],
      "actions_taken": [
        "Configurado servidor sandra-full-access",
        "Implementado bridge MCP para QWEN"
      ],
      "conversation_ids": ["conv-001", "conv-002"]
    }
  ],
  "current_session": {
    "session_id": "session-002",
    "start": "2025-12-26T13:00:00Z",
    "conversations": ["conv-003"]
  }
}
```

## Funcionalidades

### 1. Carga de Memoria al Iniciar

Cuando QWEN inicia en VS Code:
1. Cargar el prompt del sistema
2. Cargar conversaciones recientes (últimas 5-10)
3. Cargar contexto del proyecto
4. Cargar resumen de sesiones anteriores
5. Inyectar todo esto en el contexto inicial

### 2. Almacenamiento Continuo

Durante la conversación:
- Guardar cada mensaje inmediatamente
- Actualizar contexto en tiempo real
- Registrar herramientas usadas
- Mantener metadata actualizada

### 3. Búsqueda y Recuperación

QWEN puede:
- Buscar en conversaciones anteriores
- Recuperar contexto específico
- Referenciar decisiones previas
- Mantener continuidad entre sesiones

## Integración con VS Code

### Extension API

Usar `vscode.workspace.fs` y `vscode.workspace.workspaceFolders` para:
- Leer/escribir archivos de memoria
- Determinar ubicación de almacenamiento
- Sincronizar con workspace

### Global State

Usar `context.globalState` para:
- Configuración persistente
- Estado del agente
- Preferencias del usuario

## Implementación Técnica

### Archivos a Crear

1. `qwen-memory-manager.ts` - Gestor de memoria
2. `qwen-conversation-store.ts` - Almacenamiento de conversaciones
3. `qwen-context-loader.ts` - Cargador de contexto
4. `qwen-system-prompt.ts` - Prompt del sistema

### Flujo de Inicialización

```
1. VS Code Extension inicia
2. Cargar prompt del sistema
3. Verificar si existe memoria previa
4. Si existe: cargar conversaciones y contexto
5. Si no existe: crear nueva identidad de agente
6. Inyectar todo en QWEN al iniciar sesión
7. Mantener memoria actualizada durante la sesión
```

## Beneficios

1. **Continuidad**: QWEN recuerda todo el contexto
2. **Eficiencia**: No necesita explicar todo de nuevo
3. **Consistencia**: Mismo agente, misma personalidad
4. **Trazabilidad**: Historial completo de conversaciones
5. **Inteligencia**: Puede aprender y mejorar con el tiempo

