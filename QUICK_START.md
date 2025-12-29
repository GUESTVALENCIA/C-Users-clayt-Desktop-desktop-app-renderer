# 🚀 QUICK START - QWEN EMBEDDED

## Iniciar la Aplicación (30 segundos)

```bash
cd C:\Users\clayt\Desktop\desktop-app
npm start
```

---

## Encontrar el Botón QWEN (10 segundos)

En la **sidebar izquierda**, primer botón arriba (azul-celeste con gradient):

```
┌──────────┐
│ 🔵 ← AQUÍ │  ← QWEN Button (Gradiente #1890ff → #13c2c2)
├──────────┤
│ 📑 Histor│
│ ➕ Nuevo │
│ 🔍 Buscar│
└──────────┘
```

---

## Abrir QWEN (5 segundos)

**CLICK** en el botón azul 🔵

**Resultado:**
- Nueva ventana se abre
- QWEN carga internamente (https://qwenlm.ai/)
- Status bar muestra: `🟢 Conectado`
- Credenciales se guardan automáticamente

---

## Enviar Propuesta al MCP Server (15 segundos)

1. **Escribe** algo en QWEN, obtén respuesta
2. **Selecciona** texto que quieres enviar (drag to select)
3. **Clickea** botón `📤 Enviar al MCP` (en barra de status)
4. **Ve** notificación verde: `✅ Mensaje enviado exitosamente`

**¿Qué pasa?**
```
Respuesta de QWEN → POST a MCP Server → Guardada en BD NEON
                     ↓
           https://pwa-imbf.onrender.com
```

---

## Características

| Feature | Estado | Detalles |
|---------|--------|----------|
| Panel embebido | ✅ | Sin proceso externo |
| Sesión persistente | ✅ | Credenciales automáticas |
| Status bar | ✅ | 🟢 🟡 🔴 estados |
| Reconexión | ✅ | Botón 🔄 en panel |
| Envío a MCP | ✅ | Con notificación visual |
| Seguridad | ✅ | Context Isolation ON |

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Botón no aparece | Recarga app (`npm start`) |
| QWEN no carga | Internet + URL https://qwenlm.ai/ accesible |
| Botón MCP deshabilitado | Selecciona texto primero |
| Error al enviar | Verificá token MCP en .env.pro |
| Notificación no aparece | Abre DevTools (F12) → Console |

---

## Archivos Principales

```
desktop-app/
├── main.js                              ← Actualizado (QwenWindow + MCP)
├── renderer/studiolab-final-v2.html     ← Botón QWEN agregado
│
├── src/main/
│   ├── qwen-window.js                   ← ✨ NUEVO: Gestor QWEN
│   └── qwen-manager.js                  ← ✨ NUEVO: Sesiones
│
├── src/preload/
│   └── qwen-preload.js                  ← ✨ NUEVO: Puente IPC
│
├── src/renderer/
│   └── qwen-renderer.html               ← ✨ NUEVO: UI QWEN panel
│
├── TEST_QWEN_INTEGRATION.js             ← 49/49 tests ✅
├── QWEN_COMPLETE_SUMMARY.md             ← Documentación full
└── QUICK_START.md                       ← Tú estás aquí
```

---

## Commits de Hoy

```bash
21f65bb 🔗 Integración completa: QWEN embebido + MCP Server
458dd98 🎨 Agregar botón QWEN con logo oficial + función
b7ded5d 📚 Documentación completa
ee74d77 ✅ Test automatizado - 49/49 tests pasaron
f7f6eaa 📋 Resumen completo - Producción lista
```

---

## Status

🟢 **LISTO PARA PRODUCCIÓN**

- ✅ Código compilado y testeado
- ✅ Seguridad verificada
- ✅ Documentación completa
- ✅ Tests automatizados (49/49)

---

## Próximos Modelos (Same Pattern)

```javascript
// Mismo patrón para:
- Claude (https://claude.ai/)
- ChatGPT (https://chatgpt.com/)
- Gemini (https://gemini.google.com/)
- DeepSeek (https://chat.deepseek.com/)
```

---

**¿Preguntas?** Ver `QWEN_COMPLETE_SUMMARY.md` o `QWEN_MCP_INTEGRATION_COMPLETE.md`

**¡A USARLO!** 🚀
