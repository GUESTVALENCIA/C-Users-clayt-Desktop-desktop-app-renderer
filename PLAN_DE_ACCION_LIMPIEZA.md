# PLAN DE ACCIÓN: Limpieza de Código Duplicado y Muerto

**Fecha**: 29 de diciembre de 2025
**Status**: EN PREPARACIÓN

## 1. ARCHIVOS A ELIMINAR (Sin Dependencias)

### 1.1 Main.js Variants

**main-clean.js** (173 líneas)
- Motivo: Versión simplificada abandonada
- Riesgo: BAJO - No se referencia en ningún lugar
- Acción: ✅ ELIMINAR

**main-simple.js** (4,375 líneas)
- Motivo: Versión alternativa confusa
- Riesgo: BAJO-MEDIO - Podría ser importado por error
- Verificación: Buscar importes de `main-simple.js` en el código
- Acción: ⏸️ REVISAR PRIMERO - ¿Se usa en algún lugar?

### 1.2 Preload.js Variants

**preload-simple.js** (319 líneas)
- Motivo: Versión antigua, menos completa que preload.js
- Riesgo: BAJO - main.js referencia preload.js, no preload-simple
- Acción: ✅ ELIMINAR

**qwen-preload.js.bak** (2,165 líneas)
- Motivo: BACKUP explícitamente marcado
- Riesgo: NULO - Los .bak nunca deben estar en producción
- Acción: ✅ ELIMINAR

### 1.3 HTML Variants

**index.html.backup** (31,321 bytes)
- Motivo: BACKUP antiguo
- Riesgo: BAJO - main.js carga studiolab-final-v2.html, no este
- Acción: ✅ ELIMINAR

**index.html.backup2** (105 bytes)
- Motivo: Backup adicional
- Riesgo: NULO
- Acción: ✅ ELIMINAR

**index-modified.html** (69,115 bytes)
- Motivo: Versión "modificada" no usada
- Riesgo: BAJO - main.js carga studiolab-final-v2.html
- Acción: ⏸️ REVISAR PRIMERO - Confirmar que no se carga

### 1.4 QWEN MCP Config Files

**qwen-mcp-config-alternative.json** (212 bytes)
- Motivo: Duplicado con solo 2 bytes diferencia
- Riesgo: NULO - main.js usa qwen-mcp-config.json
- Acción: ✅ ELIMINAR

**qwen-mcp-config-npx.json** (189 bytes)
- Motivo: Variante específica para NPX, no usada
- Riesgo: BAJO
- Acción: ✅ ELIMINAR

### 1.5 MCP Server Backups

**mcp-server-neon.py.backup** (11,059 líneas)
- Motivo: BACKUP de Python MCP server
- Riesgo: NULO - main.js carga mcp-server-neon-final.py o mcp-server-neon-simple.py
- Acción: ✅ ELIMINAR

---

## 2. ARCHIVOS A CONSOLIDAR (Mantener UNO, Archivar Otros)

### 2.1 MCP Servers - CONSOLIDAR EN `mcp-server-unified.js`

**Estrategia**: Este es el "unified" - debería ser el único

- `mcp-server.js` (5,015 líneas) → Archivar como `./archived/mcp-server.js.v1`
- `mcp-server-sse.js` (10,549 líneas) → Archivar como `./archived/mcp-server-sse.js.v1`
- `mcp-server-tools.js` (7,551 líneas) → Archivar como `./archived/mcp-server-tools.js.v1`
- `mcp-server-unified.js` (21,032 líneas) → ✅ MANTENER COMO PRINCIPAL

**Verificación**:
- Buscar imports de `mcp-server.js`, `mcp-server-sse.js`, `mcp-server-tools.js` en main.js
- Confirmar que main.js SOLO importa mcp-server-unified.js

### 2.2 MCP Servers Python - CONSOLIDAR EN `mcp-server-neon-final.py`

**Estrategia**: Versión "final" debería ser la oficial

- `mcp-server-neon.py` (10,851 líneas) → Archivar como `./archived/mcp-server-neon.py.v1`
- `mcp-server-neon-simple.py` (11,397 líneas) → Archivar como `./archived/mcp-server-neon-simple.py.v1`
- `mcp-server-neon-final.py` (11,358 líneas) → ✅ MANTENER COMO PRINCIPAL

**Renombrar**:
- `mcp-server-neon-final.py` → `mcp-server-neon.py`

**Verificación**:
- Buscar referencias a `mcp-server-neon.py` en main.js
- Confirmar que sea la versión correcta

### 2.3 Test Files - CONSOLIDAR EN `test-model-selection-logic.js`

**Archivos similares**:
- `test-model-selection-logic.js` (16,386 líneas) - Más completo
- `test-model-selection-fixed.js` (5,487 líneas) - Versión simplificada

**Acción**:
- Archivar `test-model-selection-fixed.js` como `./archived/tests/`
- Mantener `test-model-selection-logic.js` como principal

**Para QWEN**:
- `test-qwen-integration.js` (1,225 líneas) - Versión ligera
- `TEST_QWEN_INTEGRATION.js` (9,970 líneas) - Versión completa

**Acción**:
- Mantener `TEST_QWEN_INTEGRATION.js` (es más completo)
- Archivar `test-qwen-integration.js` (es muy ligero)

---

## 3. DOCUMENTACIÓN A CONSOLIDAR

**Estrategia**: Mantener 3-4 documentos principales, archivar el resto de 67 archivos

### Mantener:
1. `QWEN_COMPLETE_SUMMARY.md` - Resumen general
2. `QWEN_INTEGRATION_GUIDE.md` - Guía de uso
3. `ANALISIS_CRITICO_QWEN_CONNECTION.md` - Análisis que acabo de crear
4. `PLAN_DE_ACCION_QWEN.md` - Plan de implementación

### Archivar los demás 60+ archivos en carpeta `./archived/docs/`

---

## 4. ESTRUCTURA PROPUESTA DESPUÉS DE LIMPIEZA

```
C:\Users\clayt\Desktop\desktop-app\
├── main.js                          ✅ ÚNICO (eliminar main-clean.js, main-simple.js)
├── preload.js                       ✅ ÚNICO (eliminar preload-simple.js)
├── qwen-preload.js                  ✅ MANTENER (es diferente)
├── chat-service.js                  ✅ MANTENER
├── groq-service.js                  ✅ MANTENER
├── ollama-service.js                ✅ MANTENER
├── mcp-server-unified.js            ✅ ÚNICO para MCP JS
├── mcp-server-neon.py               ✅ ÚNICO para MCP Python (renombrado desde final)
├── .env                             ✅ MANTENER
├── package.json                     ✅ MANTENER
│
├── renderer/
│   ├── studiolab-final-v2.html      ✅ ÚNICO (eliminar index.html.backup, etc)
│   ├── studiolab.js                 ✅ MANTENER
│   └── qwen-integration.js          ✅ MANTENER
│
├── test/                            ✅ Mantener solo los activos
│   ├── test-model-selection-logic.js
│   ├── TEST_QWEN_INTEGRATION.js
│   └── ...
│
├── archived/                        📦 NUEVA CARPETA para backups
│   ├── js/
│   │   ├── main-clean.js.v1
│   │   ├── main-simple.js.v1
│   │   ├── mcp-server.js.v1
│   │   ├── mcp-server-sse.js.v1
│   │   └── ...
│   ├── py/
│   │   ├── mcp-server-neon.py.v1
│   │   └── mcp-server-neon-simple.py.v1
│   ├── html/
│   │   └── index.html.backup
│   ├── configs/
│   │   └── qwen-mcp-config-*.json
│   └── docs/
│       └── [60+ archivos MD/TXT redundantes]
│
├── ANALISIS_CRITICO_QWEN_CONNECTION.md  ✅ Nuevo
├── PLAN_DE_ACCION_QWEN.md              ✅ Nuevo
├── LIMPIEZA_LOG.md                     ✅ Nuevo (registra qué se eliminó)
└── ...
```

---

## 5. VERIFICACIONES PREVIAS A LA LIMPIEZA

Antes de eliminar, necesito verificar:

### Verificación 1: ¿Se importa main-simple.js en algún lugar?
```bash
grep -r "main-simple" .
grep -r "require.*main-simple" .
```
**Si encuentra algo**: ⚠️ NO ELIMINAR

### Verificación 2: ¿Se importa mcp-server.js (no unified)?
```bash
grep -r "mcp-server\.js" . --exclude-dir=node_modules
grep -r "require.*mcp-server[^-]" .
```
**Si encuentra algo**: ⚠️ ACTUALIZAR REFERENCIAS

### Verificación 3: ¿Carga main.js algún HTML diferente a studiolab-final-v2.html?
```bash
grep -n "loadFile\|loadURL" main.js | grep -i "html"
```
**Resultado esperado**: Solo studiolab-final-v2.html
**Si encuentra otro**: ⚠️ REVISAR POR QUÉ

### Verificación 4: ¿Usa el sistema qwen-mcp-config-*.json?
```bash
grep -r "qwen-mcp-config" .
ls -la qwen-mcp-config*.json
```
**Resultado esperado**: Solo qwen-mcp-config.json (sin sufijos)

---

## 6. PASO A PASO DE LIMPIEZA

### Fase 1: Preparación (SIN CAMBIOS DESTRUCTIVOS)

```bash
# Crear carpeta de archivo
mkdir archived
mkdir archived/js
mkdir archived/py
mkdir archived/html
mkdir archived/configs
mkdir archived/docs

# Crear log
> LIMPIEZA_LOG.md
```

### Fase 2: Archivo (CAMBIOS REVERSIBLES)

```bash
# Mover archivos a carpeta archived en lugar de eliminar
mv main-clean.js archived/js/
mv main-simple.js archived/js/
mv preload-simple.js archived/js/
mv qwen-preload.js.bak archived/js/
mv index.html.backup archived/html/
mv index-modified.html archived/html/
mv qwen-mcp-config-alternative.json archived/configs/
mv qwen-mcp-config-npx.json archived/configs/
mv qwen-mcp-config-final.json archived/configs/
mv mcp-server-neon.py.backup archived/py/
```

### Fase 3: Consolidación de MCP Servers

```bash
# Verificar que mcp-server-unified.js es realmente la única referencia
grep -n "mcp-server" main.js

# Si es necesario, actualizar main.js para usar SOLO mcp-server-unified.js
# (editar main.js si está usando mcp-server.js directamente)

# Archivar versiones antiguas
mv mcp-server.js archived/js/
mv mcp-server-sse.js archived/js/
mv mcp-server-tools.js archived/js/
```

### Fase 4: Consolidación de Python Servers

```bash
# Verificar cuál es la versión activa
grep -n "mcp-server-neon" main.js

# Si es mcp-server-neon-final.py, renombrar a mcp-server-neon.py
cp mcp-server-neon-final.py mcp-server-neon.py

# Archivar versiones antiguas
mv mcp-server-neon-final.py archived/py/
mv mcp-server-neon-simple.py archived/py/
```

### Fase 5: Documentación

```bash
# Crear carpeta archived/docs
mkdir archived/docs

# Mover todos los MD/TXT EXCEPTO los 4 principales
# (hacer esto manualmente o con script)
```

### Fase 6: Verificación Post-Limpieza

```bash
# Ejecutar aplicación y verificar que todo funciona
npm start

# Verificar que no hay errores "Cannot find module"
```

---

## 7. VALIDACIONES DESPUÉS DE LA LIMPIEZA

```bash
# Búsqueda de imports rotos
grep -r "main-simple" . 2>/dev/null
grep -r "mcp-server\.js[^-]" . 2>/dev/null
grep -r "preload-simple" . 2>/dev/null

# Confirmación de estructura
ls -la *.js | wc -l  # Debería tener menos archivos
```

---

## 8. REVERSIBILIDAD

Todos los archivos se mueven a `./archived/`, NO se eliminan.
Si algo falla, simplemente:

```bash
# Restaurar desde archived
cp archived/js/main-simple.js ./
cp archived/js/mcp-server.js ./
# etc.
```

---

## 9. DOCUMENTO DE CAMBIOS

Al terminar, actualizar `LIMPIEZA_LOG.md` con:

```markdown
# Log de Limpieza de StudioLab

## Archivos Movidos a ./archived/

### Eliminados de Root:
- [ ] main-clean.js
- [ ] main-simple.js
- [ ] preload-simple.js
- [ ] qwen-preload.js.bak
- [ ] index.html.backup
- [ ] index-modified.html
- [ ] qwen-mcp-config-alternative.json
- [ ] qwen-mcp-config-npx.json
- [ ] qwen-mcp-config-final.json
- [ ] mcp-server-neon.py.backup
- [ ] mcp-server.js (versión antigua)
- [ ] mcp-server-sse.js (versión antigua)
- [ ] mcp-server-tools.js (versión antigua)

### Consolidados:
- mcp-server-unified.js → Único MCP JS server
- mcp-server-neon.py (renombrado desde -final) → Único MCP Python server

### Documentación Consolidada:
- QWEN_COMPLETE_SUMMARY.md ✅
- QWEN_INTEGRATION_GUIDE.md ✅
- ANALISIS_CRITICO_QWEN_CONNECTION.md ✅
- PLAN_DE_ACCION_QWEN.md ✅
- [60+ otros archivos] → ./archived/docs/

## Fecha de Limpieza: [COMPLETAR]
## Status: ✅ COMPLETADO / ⏳ PENDIENTE / ❌ ERRORES
```

---

## 10. PRÓXIMOS PASOS DESPUÉS DE LIMPIEZA

1. ✅ LIMPIEZA COMPLETADA
2. ⏳ REVISAR RUTAS DE CONFIGURACIÓN
3. ⏳ CONECTAR SELECTOR DE MODELOS CON BROWSERVIEW
4. ⏳ IMPLEMENTAR HEALTH CHECK DE QWEN
5. ⏳ TESTEAR TODO EL SISTEMA

