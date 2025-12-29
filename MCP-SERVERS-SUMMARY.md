# RESUMEN DE SERVIDORES MCP EXISTENTES

## Servidores MCP Encontrados

### 1. `mcp-server.js` (ACTIVO - Puerto 19875)
**Estado:** ✅ Actualmente en uso (requerido por main.js)

**Herramientas:**
- `memory_store` - Guardar datos en memoria
- `memory_get` - Obtener datos de memoria
- `memory_list` - Listar toda la memoria
- `memory_search` - Buscar en memoria
- `read_file` - Leer archivos
- `write_file` - Escribir archivos
- `list_files` - Listar archivos de directorio
- `execute_command` - Ejecutar comandos del sistema

**Endpoints HTTP:**
- GET `/tools` - Lista herramientas disponibles
- GET `/memory` - Ver memoria
- POST `/call` - Ejecutar herramienta

---

### 2. `mcp-server-tools.js` (Puerto 19875)
**Estado:** ❌ NO activo (duplicado de mcp-server.js)

**Herramientas:**
- `memory_store`, `memory_get`, `memory_search`, `memory_list`, `memory_clear`
- `fs_read`, `fs_write`, `fs_list`, `fs_delete` (sistema de archivos)
- `cmd_execute` (comandos del sistema)
- `code_execute` (ejecutar JavaScript)
- `system_status` (estado del sistema)
- `tools_list` (listar herramientas)

**Nota:** Similar a mcp-server.js pero con nombres diferentes (fs_* en lugar de read_file/write_file)

---

### 3. `mcp-server-unified.js` (Puerto 19875)
**Estado:** ❌ DEPRECADO (marcado como deprecado en documentación)

**Características:**
- Servidor multi-proveedor (Groq, QWEN, Anthropic, OpenAI)
- Gestión de modelos y estados
- Herramientas para memoria, archivos, comandos, código
- Soporta streaming, imágenes, audio, video (según comentarios)

**Herramientas:**
- Memoria y contexto
- Sistema de archivos
- Ejecución de comandos
- Ejecución de código
- Gestión de modelos y proveedores
- Autenticación (Google auth)
- Historial de chat

**Nota:** Este es el más completo pero está marcado como deprecado

---

### 4. `qwen-omni-server.js` (Puerto 8085)
**Estado:** ✅ Activo (gateway HTTP para QWEN)

**Endpoints:**
- GET `/health` - Health check
- GET `/api/conversation-history/:userId` - Obtener historial
- POST `/api/chat` - Chat con QWEN
- POST `/api/voice-chat` - Voice chat (stub)

**Funcionalidad:**
- Gateway local para QWEN Omni
- Manejo de historial de conversaciones
- Integración con chat-service.js

---

## Resumen de Puertos

| Puerto | Servidor | Estado | Propósito |
|--------|----------|--------|-----------|
| 19875 | mcp-server.js | ✅ Activo | Herramientas MCP genéricas |
| 19875 | mcp-server-tools.js | ❌ Inactivo | Duplicado (no usado) |
| 19875 | mcp-server-unified.js | ❌ Deprecado | Versión unificada multi-proveedor |
| 8085 | qwen-omni-server.js | ✅ Activo | Gateway HTTP para QWEN |

---

## Recomendaciones

1. **Servidor Principal:** `mcp-server.js` es el que está en uso actualmente
2. **Servidores Duplicados:** 
   - `mcp-server-tools.js` - Similar funcionalidad, podría eliminarse
   - `mcp-server-unified.js` - Más completo pero deprecado
3. **Servidor QWEN:** `qwen-omni-server.js` - Gateway separado para QWEN

## Próximos Pasos

Para conectar con VS Code y QWEN, el servidor `mcp-server.js` (puerto 19875) es el que debe usarse como base, ya que:
- Es el que está activo
- Tiene las herramientas básicas
- Puede extenderse con herramientas multimedia si es necesario

