# 🧪 Prueba Completa - QWEN + MCP + Memoria Persistente

## 📋 Pasos para Probar

### Paso 1: Iniciar la Aplicación
```bash
cd C:\Users\clayt\Desktop\desktop-app
npm start
```

### Paso 2: Verificar Logs de Inicio
En la consola deberías ver:
```
[Main] ✅ MCP Server de Herramientas cargado e iniciado
[Main] ✅ MCP Server Unificado iniciado en puerto 19875
[Main] 🚀 Iniciando MCP Server NEON...
[MCP-NEON] ✅ Tabla reina_memory verificada/creada en NEON
[MCP-NEON] ✅ MCP Server NEON corriendo en http://localhost:8765/mcp
[Main] ✅ MCP Server NEON iniciado en puerto 8765
```

### Paso 3: Abrir QWEN
1. Haz clic en el botón **QWEN** en la interfaz
2. Debería abrirse el BrowserView con `https://qwenlm.ai/`
3. Si es la primera vez, puede pedir login (solo una vez)

### Paso 4: Abrir DevTools en BrowserView
1. Presiona `Ctrl+Shift+I` o `F12` en la ventana de QWEN
2. Ve a la pestaña **Console**

### Paso 5: Verificar Conexión MCP
En la consola deberías ver:
```
[QWEN MCP Bridge] ✅ API expuesta: window.mcpBridge
[QWEN MCP Bridge] Conectado al servidor MCP (puerto 19875) - HERRAMIENTAS DIRECTAS
[QWEN MCP Bridge] Conectado al servidor MCP NEON (puerto 8765) - MEMORIA PERSISTENTE
✅ Memoria cargada desde NEON
👑 Identidad de la Reina inyectada desde NEON
```

### Paso 6: Probar que QWEN Trabaja Fuera del Workspace

#### Test 1: Listar Archivos en Desktop
Escribe a QWEN:
```
Lista los archivos en mi Desktop (C:\Users\clayt\Desktop)
```

**Qué debería hacer QWEN:**
- Usar `window.mcpBridge.listFiles('C:\\Users\\clayt\\Desktop')`
- Acceder al servidor MCP puerto 19875
- Mostrarte los archivos del Desktop

#### Test 2: Leer un Archivo Fuera del Workspace
Escribe a QWEN:
```
Lee el archivo VARIABLESFULL.txt de mi carpeta Downloads (C:\Users\clayt\Downloads\VARIABLESFULL.txt)
```

**Qué debería hacer QWEN:**
- Usar `window.mcpBridge.readFile('C:\\Users\\clayt\\Downloads\\VARIABLESFULL.txt')`
- Leer el archivo usando el servidor MCP
- Mostrarte el contenido

#### Test 3: Ejecutar un Comando
Escribe a QWEN:
```
Ejecuta el comando: dir C:\Users\clayt\Desktop (o ls si estás en Linux/Mac)
```

**Qué debería hacer QWEN:**
- Usar `window.mcpBridge.executeCommand('dir C:\\Users\\clayt\\Desktop')`
- Ejecutar el comando y mostrarte el resultado

#### Test 4: Verificar Memoria Persistente
Escribe a QWEN:
```
Recuérdate de esta conversación. Guarda en memoria que estamos probando el sistema QWEN completo.
```

**Qué debería hacer QWEN:**
- Usar `window.mcpBridge.setMemory('clay_main', 'test_conversation', {...})`
- Guardar en NEON (puerto 8765)
- Luego escribe: "¿Recuerdas qué estábamos probando?"
- Debería usar `window.mcpBridge.getMemory()` para recuperar la información

### Paso 7: Verificar en la Consola
Mientras QWEN trabaja, revisa la consola de DevTools para ver:
- ✅ Llamadas a `window.mcpBridge.*`
- ✅ No debería haber errores de conexión
- ✅ Debería ver logs de éxito

## ✅ Checklist de Pruebas

- [ ] Aplicación inicia correctamente
- [ ] Servidor MCP (19875) está corriendo
- [ ] Servidor NEON (8765) está corriendo (opcional)
- [ ] QWEN se abre correctamente
- [ ] MCP Bridge está inyectado (ver consola)
- [ ] QWEN puede listar archivos fuera del workspace
- [ ] QWEN puede leer archivos fuera del workspace
- [ ] QWEN puede ejecutar comandos
- [ ] QWEN puede guardar/recuperar memoria persistente
- [ ] No hay errores en la consola
- [ ] QWEN es QWEN (no se convierte en Sandra)

## 🐛 Si Algo Falla

### Si QWEN no se abre:
- Verifica que el BrowserView se esté creando
- Revisa errores en la consola principal
- Verifica que `https://qwenlm.ai/` esté accesible

### Si MCP Bridge no está disponible:
- Abre DevTools en BrowserView
- Verifica que el script se haya inyectado
- Busca errores de JavaScript en la consola

### Si las herramientas MCP fallan:
- Verifica que el servidor en puerto 19875 esté corriendo
- Usa el test: `curl http://localhost:19875/tools`
- Debería devolver la lista de herramientas

### Si la memoria NEON falla:
- Es opcional, QWEN puede funcionar sin ella
- Verifica que Python esté instalado
- Verifica que `psycopg2-binary` esté instalado
- Verifica que DATABASE_URL esté configurado

## 📝 Notas Importantes

1. **QWEN es QWEN**: No debe convertirse en Sandra
2. **Ejecución Directa**: Usa `window.mcpBridge.*` directamente
3. **No Intermediarios**: No pasa por capas de Sandra
4. **Puerto 19875**: Herramientas directas (read_file, write_file, execute_command, etc.)
5. **Puerto 8765**: Memoria persistente en NEON (opcional)
6. **Fuera del Workspace**: QWEN puede acceder a cualquier archivo del PC

---

**Estado**: ✅ Sistema listo para pruebas
**Cuando estés listo**: Inicia la app y sigue estos pasos

