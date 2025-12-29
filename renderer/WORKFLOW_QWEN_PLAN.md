# Workflow QWEN: modelos, limites y boton inteligente (plan previo a implementacion)

## Objetivo
Definir, antes de tocar codigo, como funcionara la seleccion de modelo (manual y auto), el uso de memoria persistente y el monitoreo de tokens para que la app cambie de modelo sin cortar la sesion de QWEN.

## Modelos y limites (segun capturas)
| Modelo | Contexto max tokens | Generacion max tokens | Modalidad |
| --- | --- | --- | --- |
| Qwen3-Max | 262144 | 32768 (resumen) / 81920 (max thinking) | texto |
| Qwen3-VL-235B-A22B | 262144 | 32768 (resumen) / 81920 (max thinking) | texto, imagen, video |
| Qwen3-235B-A22B-2507 | 131072 | 8192 (resumen) / 81920 (max thinking) | texto |
| Qwen3-VL-30B-A3B | 131072 | 32768 (resumen) / 81920 (max thinking) | texto, imagen, video |
| Qwen3-30B-A3B-2507 | 131072 | 32768 (resumen) / 81920 (max thinking) | texto |
| Qwen3-Next-80B-A3B | 262144 | 32768 (resumen) / 81920 (max thinking) | texto |
| Qwen3-Omni-Flash | 65536 | 13684 (generacion) / 24576 (max thinking) | texto, imagen, video, audio |
| Qwen3-Coder | 1048576 | 65536 | texto |
| Qwen3-Coder-Flash | 262144 (hasta 1M con Yarn) | 65536 | texto |
| QVQ-Max | 131072 | 8192 | texto, imagen, video |
| QwQ-32B | 131072 | 8192 | texto |
| Qwen2.5-Plus | 131072 | 8192 | texto |
| Qwen2.5-72B-Instruct | 131072 | 8192 | texto |
| Qwen2.5-Coder-32B-Instruct | 131072 | 8192 | texto |
| Qwen2.5-14B-Instruct-1M | 1000000 | 8192 | texto |
| Qwen2.5-Turbo | 1000000 | 8192 | texto |
| Qwen2.5-VL-32B-Instruct | 131072 | 8192 | texto, imagen, video |
| Qwen2.5-Omni-7B | 30720 | 2048 | texto, imagen, video, audio |

## Estados a persistir
- Modelo activo (id) y flag de auto-mode.
- Uso de contexto estimado (tokens) y limite del modelo.
- Sesion de QWEN (ultima URL abierta) y cookies en partition persistente.
- Estado de login Google/GitHub (solo bandera conectada y ultima URL, sin guardar credenciales).

## Flujo UI/IPC (alto nivel)
1) Al cargar renderer: pedir lista de modelos y modelo actual al main; pintar tarjetas con contexto; leer auto-mode y estado Google; mostrar barra de uso.
2) Boton manual: `setModel(modelId)` via IPC; main persiste modelo y emite `app-status` de vuelta.
3) Toggle auto: `setAutoMode(enabled)` via IPC; main persiste y emite estado.
4) Boton abrir QWEN: abre BrowserWindow con partition persistente (`persist:qwen`); reutiliza cookies/sesion Google.
5) QWEN preload: observa DOM/WebSocket y envia `qwen:contextUsage { tokens }` al main; se limita la frecuencia.
6) Main calcula porcentaje = tokens/contexto y emite `app-status` continuo al renderer para actualizar barra/estado.

## Estrategia de auto-switch
- Umbral: cuando `usage >= 0.9 * contexto_modelo` buscar siguiente modelo con mayor contexto disponible (ordenar por contexto desc y elegir el primero que supere al actual).
- Si ya estas en el mas grande, solo avisar (no cortar sesion).
- Mantener modo manual intacto: si auto-mode esta off, solo monitorear y mostrar porcentaje, sin cambiar modelo.
- Persistir siempre el modelo elegido para reanudar en el mismo punto tras reinicio.

## Telemetria de tokens (pre-implementacion)
- Aproximacion inicial: tokens = caracteres / 4 sobre `document.body.innerText` (rapido, sin dependencia de backend).
- Afinar despues: enganchar a mensajes de chat WebSocket o contadores nativos si la pagina los expone, para reducir falsos positivos.
- Frecuencia: usar MutationObserver con debounce 1s para no saturar IPC.

## Plan de implementacion (resumen de archivos)
- Renderer (`renderer/index.html` o componente equivalente): añadir tarjetas de modelo, toggle auto, barra de contexto, botones de login y abrir QWEN; suscribirse a `app-status` y enviar acciones via IPC.
- Preload principal: exponer `qwen.*`, `auth.*`, `app.onStatus` seguros (sin exponer ipcRenderer).
- Main (Electron): manejar `qwen:setModel`, `qwen:setAutoMode`, `auth:start/logout/status`, persistir estado en disco, abrir ventana QWEN con partition persistente, decidir auto-switch al recibir `qwen:contextUsage`.
- QWEN preload: observar contenido y emitir `qwen:contextUsage` con estimacion de tokens.
- Persistencia: guardar todo en un JSON en userData (memoria + state) para recordar modelo, auto-mode, tokens y estado de login.

## Listo para copiar/usar
Este archivo es el blueprint previo al cambio de codigo. Si das OK, se implementan estos pasos en los archivos indicados y se prueba lanzando la app Electron (modo dev o empaquetado) para verificar cambio auto y seleccion manual con los limites de cada modelo.
