# PLAN: Sistema de Scraping Profesional para QWEN

## 📋 Análisis del Problema Actual

### Problemas Identificados:
1. **Mezcla de mensajes**: Las preguntas del usuario se mezclan con respuestas de QWEN
2. **Borrado de contenido**: El sistema borra mensajes anteriores al actualizar
3. **Detección incorrecta**: No distingue entre mensajes nuevos y actualizaciones
4. **Código fragmentado**: Los bloques de código se capturan de forma incompleta
5. **Timeout**: El sistema se bloquea esperando respuestas

## 🎯 Solución Profesional Basada en Estándares

### Opción 1: MutationObserver + Message Queue (Recomendada)
**Biblioteca base**: MutationObserver API nativa (ya disponible en Electron)

**Ventajas**:
- ✅ Nativa del navegador, sin dependencias
- ✅ Detecta cambios en tiempo real
- ✅ Bajo overhead de rendimiento
- ✅ Funciona con cualquier framework (React, Vue, etc.)

**Implementación**:
```javascript
// Sistema de cola de mensajes
class MessageQueue {
  constructor() {
    this.messages = [];
    this.observers = [];
  }
  
  addMessage(message) {
    // Validar que no sea duplicado
    // Separar por tipo (usuario vs asistente)
    // Mantener historial
  }
}
```

### Opción 2: Puppeteer Core (Headless Chrome)
**Biblioteca**: `puppeteer-core` (ya disponible en Electron)

**Ventajas**:
- ✅ Sistema probado y robusto
- ✅ APIs profesionales para scraping
- ✅ Manejo avanzado de DOM
- ✅ Soporte para código y texto

**Desventajas**:
- ⚠️ Requiere integración con BrowserView existente

### Opción 3: Playwright (Alternativa)
**Biblioteca**: `playwright-core`

**Ventajas**:
- ✅ Similar a Puppeteer pero más moderno
- ✅ Mejor manejo de contenido dinámico

## 🔧 Plan de Implementación Recomendado

### Fase 1: Sistema de Mensajes Separados
**Objetivo**: Distinguir claramente mensajes del usuario vs QWEN

**Implementación**:
1. Usar selectores específicos para mensajes del usuario
2. Usar selectores específicos para mensajes del asistente
3. Mantener dos colas separadas
4. Nunca mezclar contenido

### Fase 2: Message Queue con IDs Únicos
**Objetivo**: Evitar duplicados y borrados

**Implementación**:
```javascript
class QwenMessageQueue {
  constructor() {
    this.userMessages = new Map(); // ID -> mensaje
    this.assistantMessages = new Map(); // ID -> mensaje
    this.lastUserMessageId = null;
    this.lastAssistantMessageId = null;
  }
  
  addUserMessage(text, element) {
    const id = this.generateId(element);
    if (!this.userMessages.has(id)) {
      this.userMessages.set(id, { text, element, timestamp: Date.now() });
      return { isNew: true, id };
    }
    return { isNew: false, id };
  }
  
  addAssistantMessage(text, element) {
    const id = this.generateId(element);
    if (!this.assistantMessages.has(id)) {
      this.assistantMessages.set(id, { text, element, timestamp: Date.now() });
      return { isNew: true, id };
    }
    // Actualizar si el texto es más largo (streaming)
    const existing = this.assistantMessages.get(id);
    if (text.length > existing.text.length) {
      existing.text = text;
      return { isNew: false, id, isUpdate: true };
    }
    return { isNew: false, id };
  }
}
```

### Fase 3: Detección Inteligente de Código
**Objetivo**: Capturar bloques de código completos

**Implementación**:
1. Usar `querySelectorAll('pre code')` para bloques completos
2. Esperar a que el bloque esté completo (sin cambios por 1 segundo)
3. Extraer lenguaje del atributo `class` o `data-language`
4. Enviar bloque completo, no fragmentos

### Fase 4: Streaming Incremental
**Objetivo**: Mostrar contenido mientras se genera, sin borrar

**Implementación**:
1. Detectar cuando texto está creciendo (streaming activo)
2. Enviar solo la diferencia (chunk nuevo)
3. Renderer agrega chunk, no reemplaza
4. Marcar como completo cuando texto deja de crecer

## 📦 Bibliotecas a Considerar

### 1. **MutationObserver API** (Nativa)
- Ya disponible en Electron
- No requiere instalación
- Perfecta para detectar cambios DOM

### 2. **ResizeObserver** (Nativa)
- Para detectar cuando elementos cambian de tamaño
- Útil para detectar mensajes nuevos

### 3. **IntersectionObserver** (Nativa)
- Para detectar cuando mensajes entran en vista
- Útil para optimización

## 🎯 Arquitectura Propuesta

```
BrowserView (QWEN)
    ↓
MutationObserver (detecta cambios)
    ↓
MessageQueue (separa usuario/asistente)
    ↓
CodeDetector (identifica bloques de código)
    ↓
StreamManager (maneja streaming incremental)
    ↓
IPC → Renderer (envía mensajes separados)
    ↓
Renderer (muestra sin borrar)
```

## ✅ Checklist de Implementación

- [ ] Sistema de cola de mensajes separados
- [ ] IDs únicos por mensaje (basados en elemento DOM)
- [ ] Detección de mensajes nuevos vs actualizaciones
- [ ] Extracción de código completa (no fragmentada)
- [ ] Streaming incremental (solo chunks nuevos)
- [ ] Renderer que nunca borra contenido
- [ ] Separación clara usuario/asistente
- [ ] Manejo de timeouts robusto

## 🚀 Próximos Pasos

1. **Implementar MessageQueue** con separación usuario/asistente
2. **Mejorar selectores** para identificar mensajes correctamente
3. **Implementar streaming incremental** real (solo diferencias)
4. **Corregir renderer** para nunca usar innerHTML que borra
5. **Testing exhaustivo** antes de presentar

## ⏱️ Tiempo Estimado

- Fase 1 (Mensajes separados): 2-3 horas
- Fase 2 (Message Queue): 2-3 horas
- Fase 3 (Código completo): 1-2 horas
- Fase 4 (Streaming): 2-3 horas
- Testing y pulido: 2-3 horas

**Total**: 9-14 horas de trabajo enfocado

---

**Estado**: Plan creado, listo para implementación profesional
**Autor**: Opus 4.1
**Fecha**: 2025-12-30

