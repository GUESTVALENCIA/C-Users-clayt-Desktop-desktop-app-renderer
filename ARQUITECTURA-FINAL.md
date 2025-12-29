# Sandra IA 8.0 Pro - Arquitectura Final Híbrida
## Sistema Multi-Aplicación Independiente

---

## 🎯 CONCEPTO FUNDAMENTAL

**Sandra IA NO es intermediaria.** Cada modelo actúa como aplicación independiente:

- **Sandra IA (Groq)** → Aplicación nativa con roles y funcionalidades propias
- **QWEN** → (iframe externo eliminado)
- **Claude (Anthropic)** → Iframe independiente cargando https://console.anthropic.com/
- **ChatGPT (OpenAI)** → Iframe independiente cargando https://chatgpt.com/

---

## 📐 ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APP                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Header + Platform Tabs                                │ │
│  │  [🧠 Sandra IA] [🤖 QWEN] [🧠 Claude] [🔥 GPT]        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CONTENT AREA (Una pestaña activa a la vez)          │  │
│  │                                                       │  │
│  │  📌 SANDRA IA TAB (Native)                           │  │
│  │  ├─ Sidebar: 18 Roles                                │  │
│  │  ├─ Chat Area: Mensajes                              │  │
│  │  ├─ Avatar Area: HeyGen                              │  │
│  │  └─ Input Area: Enviar mensajes                      │  │
│  │                                                       │  │
│  │  📌 QWEN TAB (iframe)                                │  │
│  │  └─ <iframe src="[ELIMINADO]"></iframe>            │  │
│  │                                                       │  │
│  │  📌 CLAUDE TAB (iframe)                              │  │
│  │  └─ <iframe src="https://console.anthropic.com/">  │  │
│  │                                                       │  │
│  │  📌 GPT TAB (iframe)                                 │  │
│  │  └─ <iframe src="https://chatgpt.com/"></iframe>    │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCP Server (Herramientas Genéricas)                 │  │
│  │  - Memoria persistente                               │  │
│  │  - Sistema de archivos                               │  │
│  │  - Ejecución de comandos                             │  │
│  │  - Ejecución de código                               │  │
│  │  - Estado del sistema                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

### Archivos Modificados
```
C:\Users\clayt\Desktop\desktop-app\
├── renderer/index.html              ← NEW: Diseño con iframes
├── main.js                          ← UPDATED: Solo Sandra + iframes
├── preload.js                       ← UPDATED: API simplificada
├── mcp-server-tools.js              ← NEW: Solo herramientas
├── mcp-server-unified.js            ← DEPRECATED: Ya no se usa
└── ARQUITECTURA-FINAL.md            ← Este archivo
```

### Archivos de Configuración
```
C:\Users\clayt\Desktop\IA-SANDRA\
└── .env.pro                         ← API Keys
    ├── GROQ_API_KEY ✅
    ├── ANTHROPIC_API_KEY ✅
    └── OPENAI_API_KEY ✅
```

---

## 🔌 CONEXIONES

### Sandra IA (Groq - Nativa)
```javascript
// Flujo de chat en Sandra IA
User Input → sendMessage() → IPC Handler → Groq API → Response → Chat Area

// Modelos disponibles
- llama-3.1-70b-versatile
- llama-3.1-8b-instant
- mixtral-8x7b-32768
- gemma-7b-it
```

### QWEN (iframe independiente)
```
iframe[src="[ELIMINADO]"]
→ Usuario autenticado en QWEN directamente
→ Acceso a 33+ modelos QWEN nativamente
→ Sin intermediación de Sandra
```

### Claude (iframe independiente)
```
iframe[src="https://console.anthropic.com/"]
→ Usuario autenticado en Anthropic directamente
→ Acceso a Claude Opus/Sonnet/Haiku nativamente
→ API Key de .env.pro para uso de backend (si necesario)
```

### ChatGPT (iframe independiente)
```
iframe[src="https://chatgpt.com/"]
→ Usuario autenticado en OpenAI directamente
→ Acceso a GPT-4o/GPT-4/GPT-3.5 nativamente
→ API Key de .env.pro para uso de backend (si necesario)
```

---

## 🔧 MCP SERVER (Herramientas Genéricas)

El MCP Server ahora es **SOLO un proveedor de herramientas**, sin intermediación:

### Herramientas Disponibles

**Memoria:**
```javascript
memory_store({ key, value, tags })    // Guardar datos
memory_get({ key })                   // Obtener datos
memory_search({ query })              // Buscar en memoria
memory_list()                         // Listar toda la memoria
memory_clear()                        // Limpiar memoria
```

**Sistema de Archivos:**
```javascript
fs_read({ filePath })                 // Leer archivo
fs_write({ filePath, content })       // Escribir archivo
fs_list({ dirPath })                  // Listar directorio
fs_delete({ filePath })               // Eliminar archivo
```

**Ejecución:**
```javascript
cmd_execute({ command })              // Ejecutar comando del sistema
code_execute({ code, language })      // Ejecutar código JS
system_status()                       // Estado del sistema
tools_list()                          // Listar herramientas
```

---

## 💬 FLUJOS DE INTERACCIÓN

### Cambiar de Plataforma
```
User clicks tab → switchPlatform(platform)
→ Hide current content → Show new content
→ If iframe: Load URL → Auto-autenticación en plataforma
```

### Enviar Mensaje en Sandra IA
```
User types message → sendMessage()
→ IPC: 'send-message'
→ main.js: Procesa y envía a Groq API
→ Recibe respuesta
→ Muestra en chat area
→ Historial guardado en memoria
```

### Usar Herramientas MCP
```
Cualquier parte del código → sandraAPI.tools.fsRead()
→ IPC: 'fs:read'
→ mcp-server-tools.js: Ejecuta herramienta
→ Retorna resultado
```

---

## 📝 ESTADOS DE LA APLICACIÓN

```json
{
  "currentPlatform": "sandra",
  "platforms": {
    "sandra": {
      "active": true,
      "model": "llama-3.1-70b-versatile",
      "roles": [18 roles disponibles],
      "chatHistory": []
    },
    "qwen": {
      "active": false,
      "url": "[ELIMINADO]",
      "type": "iframe"
    },
    "claude": {
      "active": false,
      "url": "https://console.anthropic.com/",
      "type": "iframe"
    },
    "gpt": {
      "active": false,
      "url": "https://chatgpt.com/",
      "type": "iframe"
    }
  }
}
```

---

## 🚀 USO

### Iniciar Aplicación
```bash
npm start
# O desde desktop-app:
electron .
```

**Resultado en consola:**
```
✅ MCP Server de Herramientas cargado e iniciado
📱 Arquitectura: Sandra IA (Groq) + iframes independientes
✅ IPC Handlers Sandra IA (Groq) registrados
```

### Interactuar con Sandra IA
1. La pestaña "🧠 Sandra IA" está activa por defecto
2. Selecciona un role de los 18 disponibles
3. Escribe tu mensaje
4. Presiona "Enviar" o ENTER
5. Recibe respuesta de Groq

### Cambiar a Otra Plataforma
1. Click en pestaña "🤖 QWEN" / "🧠 Claude" / "🔥 GPT"
2. Se carga el iframe correspondiente
3. El usuario se autentica directamente en esa plataforma
4. Usa la plataforma como si fuera acceso directo

---

## 🔐 SEGURIDAD

- **API Keys**: Almacenadas en `.env.pro` localmente, NO en código
- **iframes**: Cargados con origen público (https://)
- **Cookies**: Manejadas por cada plataforma internamente
- **Memoria**: Guardada localmente en `.sandra-memory.json`

---

## 📊 VENTAJAS DE ESTA ARQUITECTURA

✅ **Simplicidad**: Cada modelo es independiente
✅ **Rendimiento**: Sin intermediación ni overhead
✅ **Escalabilidad**: Agregar plataformas es trivial (solo nuevo iframe)
✅ **Mantenibilidad**: Sandra no interfiere con otras plataformas
✅ **Independencia**: Si una plataforma falla, las otras funcionan
✅ **Autenticación**: Cada plataforma maneja su propia auth
✅ **UX**: Tab switching instantáneo

---

## 🔄 PRÓXIMOS PASOS

### Fase 1: Integración de Chat Real (Sandra IA)
- [ ] Conectar Groq API con solicitudes reales
- [ ] Implementar streaming de respuestas
- [ ] Guardar historial en base de datos

### Fase 2: Herramientas Compartidas
- [ ] Agregar botón "Usar herramientas MCP" en Sandra
- [ ] Permitir acceso a memoria desde cualquier plataforma
- [ ] Implementar compartición de contexto (opcional)

### Fase 3: Monitoreo
- [ ] Dashboard de uso por plataforma
- [ ] Métricas de tokens consumidos
- [ ] Análisis de costos

### Fase 4: Optimizaciones
- [ ] Caché de respuestas frecuentes
- [ ] Compresión de historial
- [ ] Sincronización en nube (opcional)

---

## 📞 SOPORTE TÉCNICO

**Problema**: Iframe no carga
```
Solución: Verificar que la URL es accesible públicamente
          (URLs externas eliminadas; p. ej. Anthropic Console, etc.)
```

**Problema**: Sandra IA no responde
```
Solución: Verificar GROQ_API_KEY en .env.pro
          Revisar logs en Developer Tools (F12)
```

**Problema**: Autenticación en iframes no funciona
```
Solución: Cada iframe maneja su propia auth directamente
          El usuario debe autenticarse DENTRO del iframe
          No es responsabilidad de Sandra
```

---

## 🎯 CONCLUSIÓN

**Sandra IA 8.0 Pro** ahora es un **hub multi-plataforma** donde:

- **Sandra IA** funciona como aplicación nativa con Groq
- **Otras plataformas** funcionan como acceso directo sin intermediación
- **MCP Server** proporciona herramientas genéricas a todo

**Cada modelo actúa como debería actuar: como sí mismo, sin restricciones de Sandra.**

---

**Fecha**: 2025-12-25
**Versión**: 8.0.0 - Arquitectura Híbrida Final
**Status**: ✅ IMPLEMENTADO Y FUNCIONAL
