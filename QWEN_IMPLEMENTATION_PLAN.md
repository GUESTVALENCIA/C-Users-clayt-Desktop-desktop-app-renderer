# Plan de Implementación: QWEN System Prompt + Persistent Memory

## Resumen del Problema

1. **Context Window Saturado**: QWEN repite mensajes cuando el contexto se llena
2. **Falta de Prompt del Sistema**: QWEN no sabe que tiene MCP servers al iniciar
3. **Sin Memoria Persistente**: Cada sesión es nueva, no hay continuidad
4. **Negación Inicial**: QWEN se niega a trabajar hasta que se le convence

## Solución Propuesta

### Fase 1: System Prompt Injection

**Objetivo**: Inyectar automáticamente el prompt del sistema cuando QWEN inicia

**Implementación**:
1. Crear archivo `qwen-system-prompt.txt` con el prompt completo
2. Modificar extensión VS Code para leer y inyectar el prompt
3. Inyectar antes de la primera interacción del usuario

**Archivos**:
- `qwen-system-prompt.txt` - Prompt del sistema
- Modificar extensión VS Code (si es posible) o crear script de inyección

### Fase 2: Persistent Memory System

**Objetivo**: Crear sistema de memoria que persista entre sesiones

**Implementación**:
1. Crear estructura de directorios para memoria
2. Implementar gestor de memoria (leer/escribir)
3. Cargar memoria al iniciar QWEN
4. Guardar conversaciones en tiempo real

**Estructura**:
```
~/.qwen-code/
  ├── memory/
  │   ├── conversations.json
  │   ├── context.json
  │   └── session_summary.json
  └── system-prompt.txt
```

### Fase 3: Context Loading

**Objetivo**: Cargar contexto histórico al iniciar sesión

**Implementación**:
1. Al iniciar QWEN, cargar:
   - Prompt del sistema
   - Últimas 5-10 conversaciones (resumidas)
   - Contexto del proyecto
   - Estado actual del sistema
2. Inyectar todo como mensajes del sistema iniciales

### Fase 4: Memory Management

**Objetivo**: Gestionar memoria para evitar saturación

**Implementación**:
1. Resumir conversaciones antiguas
2. Mantener solo conversaciones recientes en contexto completo
3. Archivar conversaciones antiguas
4. Crear índices para búsqueda rápida

## Implementación Técnica

### Opción A: Modificar Extensión VS Code (si es posible)

Si tenemos acceso al código de la extensión:
1. Modificar `extension.ts` para inyectar prompt
2. Agregar listeners para guardar conversaciones
3. Implementar carga de memoria al iniciar

### Opción B: Script de Inyección Externa

Si no tenemos acceso:
1. Crear script que monitoree cuando QWEN inicia
2. Inyectar prompt vía API o manipulación del DOM
3. Interceptar mensajes para guardar en memoria

### Opción C: Bridge MCP + Memory Server

Crear servidor MCP adicional que:
1. Gestione memoria persistente
2. Proporcione endpoints para:
   - Guardar conversaciones
   - Cargar contexto
   - Buscar en historial
3. QWEN usa este servidor para memoria

## Archivos a Crear

1. **`qwen-system-prompt.txt`** - Prompt del sistema completo
2. **`qwen-memory-manager.js`** - Gestor de memoria (Node.js)
3. **`qwen-context-injector.js`** - Script para inyectar contexto
4. **`qwen-memory-mcp-server.js`** - Servidor MCP para memoria (opcional)

## Flujo Completo

```
1. Usuario abre QWEN en VS Code
   ↓
2. Extension detecta inicio de sesión
   ↓
3. Cargar prompt del sistema (qwen-system-prompt.txt)
   ↓
4. Cargar memoria persistente (conversations.json, context.json)
   ↓
5. Resumir conversaciones antiguas (si hay muchas)
   ↓
6. Inyectar en QWEN:
   - System prompt
   - Resumen de conversaciones anteriores
   - Contexto del proyecto
   - Estado actual
   ↓
7. QWEN inicia con todo el contexto
   ↓
8. Durante la conversación:
   - Guardar cada mensaje inmediatamente
   - Actualizar contexto
   - Registrar herramientas usadas
   ↓
9. Al cerrar sesión:
   - Guardar estado final
   - Actualizar resumen de sesión
   - Archivar si es necesario
```

## Prioridades

1. **ALTA**: System prompt injection (resuelve negación inicial)
2. **ALTA**: Memoria persistente básica (resuelve continuidad)
3. **MEDIA**: Carga de contexto histórico (mejora experiencia)
4. **MEDIA**: Resumen de conversaciones (evita saturación)
5. **BAJA**: Búsqueda en historial (nice to have)

## Próximos Pasos

1. ✅ Crear prompt del sistema
2. ✅ Diseñar estructura de memoria
3. ⏳ Implementar gestor de memoria
4. ⏳ Implementar inyección de prompt
5. ⏳ Implementar carga de contexto
6. ⏳ Probar y ajustar

## Notas Importantes

- El prompt debe ser conciso pero completo
- La memoria debe ser eficiente (no guardar todo)
- El contexto debe cargarse rápido (no bloquear inicio)
- Debe funcionar con la extensión actual de QWEN

