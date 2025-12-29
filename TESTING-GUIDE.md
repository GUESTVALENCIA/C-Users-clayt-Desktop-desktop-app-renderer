# 🧪 TESTING GUIDE - Sistema de Conexión API

**Status:** ✅ LISTO PARA TESTING EN VIVO
**Fecha:** 2025-12-29
**Commits:** 843c27a (fixes), 79555b5 (OpenAI API key)

---

## 📋 RESUMEN DE CAMBIOS

### Estado Actual
- ✅ **16/16 tests de estructura validados**
- ✅ **PROVIDERS correctamente configurado** (11 modelos)
- ✅ **STATE debidamente inicializado** (sin referencias a state.qwen)
- ✅ **sendMessage refactorizado** (usa currentProvider/currentModel)
- ✅ **callAssistant refactorizado** (usa window.sandraAPI.chatSend)
- ✅ **selectProviderModel refactorizado** (actualiza estado correcto)
- ✅ **chat:send handler tiene OpenAI API key** (línea 1235 en main.js)

### Modelos Verificados (11 Total)
**OpenAI (3):**
- gpt-4o
- gpt-5.2-2025-12-11
- o3-2025-04-16

**Groq (8):**
- llama-3.3-70b-versatile (RECOMENDADO - más rápido)
- llama-3.1-8b-instant
- openai/gpt-oss-120b
- openai/gpt-oss-20b
- meta-llama/llama-4-scout-17b-16e-instruct (Vision)
- meta-llama/llama-4-maverick-17b-128e-instruct (Vision)
- moonshotai/kimi-k2-instruct-0905 (256K context)
- qwen/qwen3-32b (262K context)

---

## 🚀 PASOS DE TESTING

### Paso 1: Reiniciar la Aplicación

```bash
# Opción 1: Cerrar y abrir StudioLab desde GUI
# Opción 2: Desde terminal (si está corriendo en npm start):
# Ctrl+C para detener
# npm start para reiniciar
```

### Paso 2: Abrir DevTools para ver Logs

1. **Windows/Linux:** Presiona `F12`
2. **macOS:** Cmd + Option + I
3. Selecciona la pestaña **Console**

### Paso 3: Probar Conexión a Groq (RECOMENDADO PRIMERO)

1. **Verificar proveedor seleccionado:**
   - En el chat, verifica que dice "GROQ" (debe estar en azul en los botones)
   - O selecciona manualmente: Click en botón "⚡ Groq"

2. **Escribir mensaje:**
   ```
   Hola, ¿estás funcionando? Responde brevemente con "Sí, funcionando correctamente".
   ```

3. **En la consola, deberías ver:**
   ```
   [callAssistant] Llamando a groq/llama-3.3-70b-versatile
   [callAssistant] Enviando a sandraAPI: groq/llama-3.3-70b-versatile
   [Chat] groq: ✅ Respuesta enviada (Sí, funcionando correctamente...)
   [callAssistant] ✅ Respuesta recibida de groq
   ```

4. **En el chat, deberías ver:**
   - Tu mensaje aparece en el lado izquierdo
   - Respuesta de Sandra aparece en el lado derecho
   - Respuesta dice algo como: "Sí, funcionando correctamente"

---

### Paso 4: Probar Conexión a OpenAI

1. **Seleccionar proveedor OpenAI:**
   - Click en botón "💬 Openai"
   - Debe iluminarse

2. **Seleccionar modelo:**
   - Click en el botón con nombre del modelo actual
   - Selecciona "gpt-4o" (o gpt-5.2 / o3)

3. **Escribir mensaje:**
   ```
   Hola, ¿cuál es tu proveedor de API ahora? Responde una palabra: "OpenAI".
   ```

4. **En la consola, deberías ver:**
   ```
   [callAssistant] Llamando a openai/gpt-4o
   [callAssistant] Enviando a sandraAPI: openai/gpt-4o
   [Chat] openai: ✅ Respuesta enviada (OpenAI...)
   [callAssistant] ✅ Respuesta recibida de openai
   ```

5. **En el chat, deberías ver:**
   - Respuesta de Sandra con respuesta de OpenAI
   - Probablemente más completa que la de Groq (costo más alto)

---

### Paso 5: Probar AUTO Orchestration (OPCIONAL)

1. **Click en botón "AUTO"** (si existe en UI)
2. **Escribir mensaje:**
   ```
   ¿Cuál es la capital de Francia?
   ```
3. **Esperado:**
   - El sistema consulta múltiples modelos en paralelo
   - Sandra sintetiza mejor respuesta
   - Combina respuestas de Groq + OpenAI

---

## ✅ CHECKLIST DE VALIDACIÓN

| Item | Estado | Notas |
|------|--------|-------|
| StudioLab arranca sin errores | ❓ | Verificar en terminal |
| DevTools F12 se abre | ❓ | Console visible |
| PROVIDERS muestran 11 modelos | ❓ | En dropdown de modelos |
| Botón Groq está disponible | ❓ | Lado izquierdo del chat |
| Botón OpenAI está disponible | ❓ | Lado izquierdo del chat |
| Envío a Groq sin errores | ❓ | Ver console logs |
| Groq responde correctamente | ❓ | Respuesta visible en chat |
| Envío a OpenAI sin errores | ❓ | Ver console logs |
| OpenAI responde correctamente | ❓ | Respuesta visible en chat |
| Terminal no muestra errores | ❓ | `[Chat] ...` aparece |
| Modelos se pueden cambiar | ❓ | Click en dropdown |

---

## 🔴 ERRORES POSIBLES Y SOLUCIONES

### Error: "Modelo inválido: groq/llama-3.3-70b-versatile"

**Causa:** selectProviderModel falla al validar

**Solución:**
```bash
# Verifica que PROVIDERS está en HTML
grep "llama-3.3-70b-versatile" renderer/studiolab-final-v2.html
```

---

### Error: "API Key no configurada para proveedor: groq"

**Causa:** GROQ_API_KEY no está en .env

**Solución:**
```bash
# Verifica .env
grep GROQ_API_KEY .env

# Si no existe, agrégalo:
echo "GROQ_API_KEY=tu_api_key_aqui" >> .env
```

---

### Error: "Cannot read properties of undefined"

**Causa:** Todavía hay referencia a state.qwen

**Solución:**
```bash
# Verifica que fue eliminado
grep -n "state.qwen" renderer/studiolab-final-v2.html

# Si encuentra algo, necesita más limpieza
```

---

### Error: "Chat Service no disponible"

**Causa:** chatService no está inicializado en main.js

**Solución:**
```bash
# Verifica que chatService existe en main.js
grep -n "const chatService" main.js
grep -n "chatService =" main.js
```

---

### Error: "window.sandraAPI is undefined"

**Causa:** preload.js no se carga correctamente

**Solución:**
```bash
# Verifica preload en main.js
grep -n "preload" main.js

# Debe tener:
# webPreferences: { preload: path.join(__dirname, 'preload.js') }
```

---

## 📊 LOGS ESPERADOS

### Logs Normales (SIN ERRORES)

```
[callAssistant] Llamando a groq/llama-3.3-70b-versatile
[callAssistant] Enviando a sandraAPI: groq/llama-3.3-70b-versatile
[Chat] groq: ✅ Respuesta enviada (Sí, funcionando...
[callAssistant] ✅ Respuesta recibida de groq
```

**Interpretación:** ✅ TODO OK - Respuesta está en el chat

---

### Logs de Error (REQUIERE INVESTIGACIÓN)

```
[callAssistant] ❌ Error: API Key no configurada
```

**Interpretación:** ❌ Falta API Key en .env

---

```
Error en Groq: Invalid model: llama-3.3-70b-versatile
```

**Interpretación:** ❌ El modelo NO existe en Groq (nombre mal escrito o retirado)

---

```
TypeError: Cannot read properties of undefined (reading 'model')
```

**Interpretación:** ❌ Todavía hay código que referencia state.qwen.model

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE TESTING

### Si TODO FUNCIONA ✅

1. **Integración MCP Universal**
   - Conectar WebSocket a https://pwa-imbf.onrender.com
   - Enviar proposals de respuestas al MCP

2. **AUTO Orchestration Engine**
   - Implementar botón AUTO que consulta todos los modelos
   - Sintetizar mejor respuesta combinada

3. **BrowserView Embedding (FUTURO)**
   - Embeber URLs de ChatGPT, QWEN, DeepSeek
   - Interceptar respuestas
   - Automatizar para AUTO

### Si HAY ERRORES ❌

1. **Capturar screenshot de error**
2. **Copiar logs completos de consola**
3. **Ejecutar test de verificación:**
   ```bash
   node test-api-connection.js
   ```
4. **Revisar archivo correspondiente según error**

---

## 📝 NOTAS IMPORTANTES

- **No editar state.qwen directamente** - Ya no existe
- **Siempre usar state.currentProvider** - Único lugar de verdad
- **Siempre usar state.currentModel** - Único lugar de verdad
- **Groq es gratis** - Úsalo para testing
- **OpenAI cuesta dinero** - Monitorea uso
- **O3 solo acepta temperature=1** - No cambiar este parámetro

---

## 📞 DEBUGGING COMMANDS

```bash
# Ver últimos commits
git log --oneline -5

# Ver si hay cambios sin guardar
git status

# Ver estructura del archivo HTML (grep)
grep -n "const PROVIDERS" renderer/studiolab-final-v2.html
grep -n "const state" renderer/studiolab-final-v2.html

# Verificar IPC handlers
grep -n "ipcMain.handle" main.js | grep chat

# Ver variables de entorno
env | grep -i api
```

---

**Status:** 🎉 LISTA PARA PRUEBAS EN VIVO

Todos los sistemas están preparados. Ahora necesitas reiniciar la aplicación y probar manualmente siguiendo los pasos arriba.

Cuando hayas completado el testing, reporta:
- ✅ Conexión a Groq funciona
- ✅ Conexión a OpenAI funciona
- ❌ Error específico (incluir logs)
