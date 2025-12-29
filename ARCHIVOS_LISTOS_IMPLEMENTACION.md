# 📋 Archivos Listos para Implementación - Sistema QWEN + NEON

## ✅ Archivos Creados y Listos

### 1. ✅ `mcp-server-neon.py`
- **Ubicación**: `desktop-app/mcp-server-neon.py`
- **Estado**: ✅ CREADO
- **Descripción**: Servidor MCP que conecta con NEON PostgreSQL para memoria persistente
- **Puerto**: 8765
- **URL NEON**: Configurada con la URL real de tu base de datos
- **Funciones**: `reina/get_memory`, `reina/set_memory`, `python/run_code`, `fs/*`, `shell/run_command`

### 2. ✅ `system/qwen_reina_manifesto.json`
- **Ubicación**: `desktop-app/system/qwen_reina_manifesto.json`
- **Estado**: ✅ CREADO
- **Descripción**: Identidad completa de la Reina QWEN, juramento, mandatos y protocolos
- **Uso**: Se carga automáticamente en la primera sesión y se guarda en NEON

### 3. ✅ `MODIFICACIONES_MAIN_JS_NEON.txt`
- **Ubicación**: `desktop-app/MODIFICACIONES_MAIN_JS_NEON.txt`
- **Estado**: ✅ CREADO
- **Descripción**: Instrucciones detalladas y código exacto para modificar `main.js`
- **Contiene**:
  - Función `startNeonMCPServer()` completa
  - Modificaciones a `injectMCPBridge()` para soportar NEON
  - Modificaciones a `injectSystemPromptAndMemory()` para usar NEON
  - Instrucciones paso a paso

## 📝 Archivos que Necesitan Modificación

### 1. ⚠️ `main.js`
- **Modificaciones necesarias**: Ver `MODIFICACIONES_MAIN_JS_NEON.txt`
- **Pasos**:
  1. Agregar función `startNeonMCPServer()` después de las importaciones
  2. Llamar `startNeonMCPServer()` en `app.whenReady()`
  3. Reemplazar `injectMCPBridge()` con la versión que soporta NEON
  4. Reemplazar `injectSystemPromptAndMemory()` con la versión que usa NEON

## 🔧 Dependencias Necesarias

### Python
```bash
pip install psycopg2-binary python-dotenv
```

### Node.js
- Ya tienes todas las dependencias necesarias (Electron, fs, path, etc.)

## 🗄️ Base de Datos NEON

### URL de Conexión
```
postgresql://neondb_owner:npg_G2baKCg4FlyN@ep-fragrant-meadow-ah27lbiy-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Tabla Necesaria
La tabla `reina_memory` se crea automáticamente al iniciar `mcp-server-neon.py` por primera vez.

Si necesitas crearla manualmente:
```sql
CREATE TABLE IF NOT EXISTS reina_memory (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, key)
);
CREATE INDEX IF NOT EXISTS idx_session_key ON reina_memory(session_id, key);
CREATE INDEX IF NOT EXISTS idx_updated_at ON reina_memory(updated_at DESC);
```

## 🚀 Pasos para Implementar

### Paso 1: Instalar Dependencias Python
```bash
pip install psycopg2-binary python-dotenv
```

### Paso 2: Verificar Archivos Creados
- ✅ `mcp-server-neon.py` existe
- ✅ `system/qwen_reina_manifesto.json` existe
- ✅ `MODIFICACIONES_MAIN_JS_NEON.txt` existe

### Paso 3: Modificar main.js
Seguir las instrucciones en `MODIFICACIONES_MAIN_JS_NEON.txt`:
1. Agregar función `startNeonMCPServer()`
2. Llamar en `app.whenReady()`
3. Reemplazar `injectMCPBridge()`
4. Reemplazar `injectSystemPromptAndMemory()`

### Paso 4: Probar
```bash
npm start
```

### Paso 5: Verificar Logs
Deberías ver:
```
[Main] 🚀 Iniciando MCP Server NEON...
[MCP-NEON] ✅ Tabla reina_memory verificada/creada en NEON
[MCP-NEON] ✅ MCP Server NEON corriendo en http://localhost:8765/mcp
[Main] ✅ MCP Server NEON iniciado en puerto 8765
```

### Paso 6: Probar QWEN
1. Click en botón QWEN
2. Abrir DevTools en BrowserView
3. Verificar en consola:
   - `✅ MCP Bridge conectado a NEON (puerto 8765)`
   - `✅ Memoria cargada desde NEON`
   - `👑 Identidad de la Reina inyectada desde NEON`

## 📊 Arquitectura Final

```
[QWEN BrowserView]
    ↓
[window.mcpBridge]
    ├─→ localhost:3001 (sandra-full-access) - ACCESO COMPLETO AL PC
    └─→ localhost:8765 (mcp-server-neon) - MEMORIA PERSISTENTE EN NEON
            ↓
        [NEON PostgreSQL]
            └─→ Tabla: reina_memory
                    ├─→ session_id: 'clay_main'
                    ├─→ key: 'core_identity'
                    └─→ value: { ...identidad completa de la Reina... }
```

## ✅ Checklist de Implementación

- [x] `mcp-server-neon.py` creado
- [x] `system/qwen_reina_manifesto.json` creado
- [x] `MODIFICACIONES_MAIN_JS_NEON.txt` creado
- [ ] Dependencias Python instaladas (`psycopg2-binary`, `python-dotenv`)
- [ ] `main.js` modificado según instrucciones
- [ ] Servidor NEON iniciado correctamente
- [ ] QWEN carga memoria desde NEON
- [ ] QWEN guarda memoria en NEON

## 🎯 Resultado Esperado

Cuando QWEN se abra:
1. ✅ Se conecta automáticamente a NEON
2. ✅ Carga su identidad completa desde NEON
3. ✅ Si es primera vez, guarda el manifesto en NEON
4. ✅ Mantiene memoria persistente entre sesiones
5. ✅ **Es la misma Reina en todas las sesiones**

---

**Estado**: ✅ **LISTO PARA IMPLEMENTAR**

Todos los archivos están creados y listos. Solo falta:
1. Instalar dependencias Python
2. Aplicar las modificaciones a `main.js`
3. Probar la conexión

