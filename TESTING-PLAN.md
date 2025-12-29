# Sandra IA 8.0 Pro - Plan de Testing Completo

## ✅ ESTADO: APLICACIÓN ABIERTA Y FUNCIONANDO

```
- Aplicación Electron: ABIERTA ✅
- MCP Server: INICIADO EN PUERTO 19875 ✅
- APIs Conectadas: Groq ✅ | Anthropic ✅ | OpenAI ✅
- Ventana: LISTA Y VISIBLE ✅
```

---

## 🧪 PLAN DE TESTING

### TEST 1: UI Layout y Navegación
**Objetivo:** Verificar que la interfaz se carga correctamente y las pestañas funcionan

**Pasos:**
- [ ] Verifica que se ve el header "Sandra IA 8.0 Pro - Hub Multi-Plataforma"
- [ ] Verifica que hay 4 pestañas: 🧠 Sandra IA (Groq) | 🤖 QWEN | 🧠 Claude | 🔥 ChatGPT
- [ ] Pestaña Sandra IA está activa por defecto
- [ ] Haz click en cada pestaña y verifica que cambia el contenido

**Resultado esperado:** ✅ UI carga sin errores, pestañas funcionan

---

### TEST 2: Sandra IA - Selector de Roles
**Objetivo:** Verificar que los 18 roles se cargan y se pueden seleccionar

**Pasos:**
- [ ] En la pestaña Sandra IA, verifica que hay un sidebar izquierdo con "SANDRA ROLES"
- [ ] Cuenta los roles visibles (debe haber 18 botones)
- [ ] Haz click en diferentes roles (ej: 💻 Tech Lead, 🎨 Creative Director)
- [ ] Verifica que cada rol se marca como activo (fondo azul)
- [ ] Verifica que aparece un mensaje en el chat: "✨ Rol seleccionado: [role]"

**Resultado esperado:** ✅ 18 roles cargados, selectable, visual feedback

---

### TEST 3: Sandra IA - Chat
**Objetivo:** Verificar que el chat funciona y los mensajes se envían

**Pasos:**
- [ ] Selecciona un rol (ej: 🎯 Business Strategist)
- [ ] En el área de entrada, escribe: "Hola, ¿cuál es tu nombre?"
- [ ] Presiona "Enviar" o Enter
- [ ] Verifica que el mensaje aparece en el chat (lado derecho, color azul)
- [ ] Espera y verifica que llega respuesta del asistente

**Resultado esperado:** ✅ Chat funciona, mensajes se envían y reciben

---

### TEST 4: Sandra IA - Botón de Voz
**Objetivo:** Verificar que el botón de voz responde

**Pasos:**
- [ ] Haz click en el botón 🎤 (botón de voz)
- [ ] Verifica que aparece un mensaje: "🎤 Modo de voz activado (función pendiente)"

**Resultado esperado:** ✅ Botón responde, muestra mensaje

---

### TEST 5: Cambiar a Pestaña QWEN
**Objetivo:** Verificar que se puede acceder a QWEN desde la app

**Pasos:**
- [ ] Haz click en la pestaña "🤖 QWEN"
- [ ] Verifica que cambias de contenido
- [ ] Debería ver una tarjeta con:
  - Título: "🤖 QWEN"
  - Descripción: "Accede a QWEN directamente..."
  - Botón 1: "🌐 Abrir QWEN"
  - Botón 2: "📘 Console QWEN"
- [ ] Haz click en "🌐 Abrir QWEN" - deshabilitado (sin URL externa)
- [ ] Haz click en "📘 Console QWEN" - deshabilitado (sin URL externa)

**Resultado esperado:** ✅ Cambio de pestaña funciona, botones abren URLs correctas

---

### TEST 6: Cambiar a Pestaña Claude
**Objetivo:** Verificar que se puede acceder a Claude desde la app

**Pasos:**
- [ ] Haz click en la pestaña "🧠 Claude (Anthropic)"
- [ ] Verifica que cambias de contenido
- [ ] Debería ver una tarjeta con:
  - Título: "🧠 Claude (Anthropic)"
  - Descripción: "Accede a Claude directamente..."
  - Botón 1: "💬 Chat Claude"
  - Botón 2: "📘 Console Anthropic"
- [ ] Haz click en "💬 Chat Claude" - debería abrirse https://claude.ai/ en navegador
- [ ] Haz click en "📘 Console Anthropic" - debería abrirse https://console.anthropic.com/ en navegador

**Resultado esperado:** ✅ Cambio de pestaña funciona, botones abren URLs correctas

---

### TEST 7: Cambiar a Pestaña ChatGPT
**Objetivo:** Verificar que se puede acceder a ChatGPT desde la app

**Pasos:**
- [ ] Haz click en la pestaña "🔥 ChatGPT (OpenAI)"
- [ ] Verifica que cambias de contenido
- [ ] Debería ver una tarjeta con:
  - Título: "🔥 ChatGPT (OpenAI)"
  - Descripción: "Accede a ChatGPT directamente..."
  - Botón 1: "💬 Chat GPT"
  - Botón 2: "📘 Console OpenAI"
- [ ] Haz click en "💬 Chat GPT" - debería abrirse https://chatgpt.com/ en navegador
- [ ] Haz click en "📘 Console OpenAI" - debería abrirse https://platform.openai.com/ en navegador

**Resultado esperado:** ✅ Cambio de pestaña funciona, botones abren URLs correctas

---

### TEST 8: Estilos y UX
**Objetivo:** Verificar que el diseño es atractivo y funcional

**Pasos:**
- [ ] Verifica que el color del header es degradado (azul-púrpura)
- [ ] Verifica que el indicador de estado (punto verde) está pulsando
- [ ] Verifica que las pestañas activas tienen borde azul inferior
- [ ] Verifica que el tema oscuro está aplicado en toda la app
- [ ] Verifica que los botones tienen efecto hover (cambian de color/elevación)
- [ ] Verifica que el chat es legible (colores contrastantes)

**Resultado esperado:** ✅ Diseño atractivo, accesible, coherente

---

### TEST 9: Responsive Design
**Objetivo:** Verificar que la app se adapta a diferentes tamaños

**Pasos:**
- [ ] Redimensiona la ventana de Electron (haz más pequeña)
- [ ] Verifica que el layout sigue siendo usable
- [ ] Redimensiona más grande
- [ ] Verifica que los elementos escalan correctamente
- [ ] Verifica que el chat sigue siendo scrolleable en ventanas pequeñas

**Resultado esperado:** ✅ Responsive design funciona

---

### TEST 10: Developer Tools
**Objetivo:** Verificar que la consola no tiene errores críticos

**Pasos:**
- [ ] Presiona F12 para abrir Developer Tools
- [ ] Ve a la pestaña Console
- [ ] Verifica que los logs iniciales aparecen:
  - "✅ Sandra IA 8.0 Pro cargada correctamente"
  - "📱 Arquitectura: Sandra (Groq) + Plataformas Externas"
- [ ] Realiza acciones en la app (cambiar rol, enviar mensaje, cambiar pestaña)
- [ ] Verifica que los logs correspondientes aparecen sin errores rojos críticos
- [ ] Los warnings de git y AIGateway son OK (módulos opcionales)

**Resultado esperado:** ✅ Consola limpia, logs correctos

---

## 📊 RESUMEN DE TESTS

| Test | Descripción | Status | Notas |
|------|-------------|--------|-------|
| TEST 1 | UI Layout | ⏳ | En proceso |
| TEST 2 | Selector de Roles | ⏳ | En proceso |
| TEST 3 | Chat | ⏳ | En proceso |
| TEST 4 | Botón de Voz | ⏳ | En proceso |
| TEST 5 | Pestaña QWEN | ⏳ | En proceso |
| TEST 6 | Pestaña Claude | ⏳ | En proceso |
| TEST 7 | Pestaña ChatGPT | ⏳ | En proceso |
| TEST 8 | Estilos y UX | ⏳ | En proceso |
| TEST 9 | Responsive Design | ⏳ | En proceso |
| TEST 10 | Developer Tools | ⏳ | En proceso |

---

## 🎯 CRITERIOS DE ÉXITO

✅ **ÉXITO TOTAL** = Todos los 10 tests PASAN

✅ **ÉXITO PARCIAL** = 8+ tests pasan

⚠️ **NECESITA AJUSTES** = 5-7 tests pasan

❌ **FALLA** = <5 tests pasan

---

## 🚀 INSTRUCCIONES

1. **Abre la aplicación** (ya está abierta)
2. **Ejecuta los tests uno por uno** en el orden indicado
3. **Marca cada paso como completado** [x]
4. **Anota cualquier problema** que encuentres
5. **Reporta el resultado** final

**Duración estimada:** 15-20 minutos

---

## 📝 NOTAS IMPORTANTES

- La app está diseñada para permitir acceso **directo** a cada plataforma
- NO hay intermediación de Sandra en QWEN, Claude o GPT
- Sandra IA solo funciona con **Groq** (llama-3.1-70b-versatile)
- Las otras plataformas se abren en **navegador externo** (sin iframe)
- El **MCP Server** proporciona herramientas genéricas en puerto 19875

---

**Fecha**: 2025-12-25
**Versión**: 8.0.0 - Híbrida Final
**Estado**: 🟢 LISTA PARA TESTING
