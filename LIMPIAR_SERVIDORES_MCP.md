# 🧹 Limpieza de Servidores MCP - Plan de Acción

## 📊 Estado Actual

### Servidores MCP en el Código:

1. **mcp-server.js** (Puerto 19875)
   - Estado: ✅ EN USO
   - Propósito: Servidor MCP principal de herramientas genéricas
   - Usado por: main.js, aplicación principal

2. **mcp-server-neon.py** (Puerto 8765)
   - Estado: ⚠️ RECIÉN CREADO
   - Propósito: Memoria persistente en NEON
   - Usado por: QWEN para memoria persistente

3. **Referencias a Puerto 3001**
   - Estado: ⚠️ EN CÓDIGO PERO NO SE INICIA
   - Propósito: Servidor "sandra-full-access" mencionado en código
   - Problema: Se referencia pero no se inicia en main.js

4. **qwen-omni-server.js** (Puerto 8085)
   - Estado: ✅ EN USO
   - Propósito: Gateway HTTP para QWEN
   - Usado por: QWEN streaming

### Servidores MCP en Cursor (según capturas):

**Funcionando:**
- render (22 tools)
- livekit-docs (7 tools, 3 resources)
- supabase (29 tools)

**Con Errores:**
- neon
- mcp-server-fetch
- playwright
- task-master
- MCP DOCKER

## ✅ DECISIONES DE LIMPIEZA

### 1. Para la Aplicación Electron:

**MANTENER:**
- ✅ `mcp-server.js` (puerto 19875) - Servidor principal que funciona
- ✅ `qwen-omni-server.js` (puerto 8085) - Gateway QWEN que funciona
- ❓ `mcp-server-neon.py` (puerto 8765) - Solo si realmente se necesita memoria NEON

**ELIMINAR/NO USAR:**
- ❌ Referencias a puerto 3001 ("sandra-full-access") - NO existe, solo está en comentarios
- ❌ `mcp-server-tools.js` - Si es duplicado
- ❌ `mcp-server-unified.js` - Si es duplicado

### 2. Para QWEN en la Aplicación:

**QWEN debe usar:**
- Puerto 19875: Para herramientas genéricas (mcp-server.js)
- Puerto 8765: Para memoria NEON (solo si se usa)
- NO debe usar puerto 3001 (no existe en esta app)

### 3. Para Cursor/VS Code:

**El usuario debe:**
- Deshabilitar servidores con errores
- Usar solo los que funcionan: render, livekit-docs, supabase
- Para QWEN en VS Code, usar los servidores que ya funcionan

## 🔧 Acciones de Limpieza

1. ✅ Eliminar referencias a puerto 3001 en código (no existe)
2. ✅ Asegurar que QWEN use puerto 19875 para herramientas
3. ✅ Verificar archivos duplicados mcp-server-*
4. ✅ Limpiar comentarios que mencionan servidores inexistentes

