# Conexión QWEN con Servidor MCP "sandra-full-access"

## Estado Actual

✅ **Servidor MCP configurado en VS Code:**
- Nombre: `sandra-full-access`
- Ruta: `C:\Users\clayt\Desktop\IA-SANDRA\mcp-server\mcp-sonnet-full-access.js`
- Puerto: `3001`
- Autostart: `true`
- Descripción: "Sandra Full Access - Acceso completo al sistema"

## Configuración en VS Code

El servidor MCP ya está configurado en `settings.json`:

```json
"mcp.servers": {
  "sandra-full-access": {
    "command": "node",
    "args": ["C:\\Users\\clayt\\Desktop\\IA-SANDRA\\mcp-server\\mcp-sonnet-full-access.js"],
    "env": {
      "MCP_PORT": "3001",
      "MCP_SECRET_KEY": "sandra_mcp_ultra_secure_2025",
      "NODE_ENV": "production"
    },
    "description": "Sandra Full Access - Acceso completo al sistema",
    "autostart": true
  }
}
```

## Cómo QWEN Accede al Servidor MCP

QWEN en VS Code debería usar automáticamente los servidores MCP configurados en `mcp.servers` si:

1. **QWEN soporta MCP** (según documentación oficial, sí lo soporta)
2. **El servidor MCP está en ejecución** (con `autostart: true` debería iniciarse automáticamente)
3. **VS Code tiene MCP habilitado** (ya está configurado: `"mcp.autoStart": true`)

## Verificación

Para verificar que QWEN está usando el servidor MCP:

1. **Abre QWEN en VS Code** (icono en la barra lateral o `Ctrl+Shift+P` → "Open Qwen")

2. **Verifica que el servidor MCP esté corriendo:**
   - Abre la terminal en VS Code
   - Ejecuta: `netstat -ano | findstr :3001`
   - Deberías ver el puerto 3001 en uso

3. **Prueba una funcionalidad que requiera acceso al PC:**
   - Pregunta a QWEN: "Lista los archivos en mi escritorio"
   - O: "Ejecuta un comando para verificar mi conexión a internet"
   - Si QWEN puede hacerlo, significa que está usando el servidor MCP

## Si QWEN No Usa el Servidor MCP

Si QWEN no está usando el servidor MCP automáticamente, puedes:

1. **Verificar logs de MCP en VS Code:**
   - Abre la paleta de comandos (`Ctrl+Shift+P`)
   - Busca "MCP: Show Logs" o "MCP: View Logs"
   - Verifica que el servidor "sandra-full-access" esté iniciado

2. **Reiniciar VS Code:**
   - Cierra completamente VS Code
   - Vuelve a abrirlo
   - El servidor MCP debería iniciarse automáticamente con `autostart: true`

3. **Verificar configuración de QWEN:**
   - Abre configuración de VS Code (`Ctrl+,`)
   - Busca "qwen" o "QWEN"
   - Verifica si hay alguna opción para seleccionar servidores MCP

## Herramientas Disponibles en "sandra-full-access"

Según el código del servidor, este MCP expone:
- ✅ Archivos locales y carpetas
- ✅ Repositorios Git
- ✅ Vercel (deployments, proyectos, dominios)
- ✅ GitHub (repos, commits, PRs)
- ✅ APIs (Groq, Deepgram, Cartesia, HeyGen, Twilio, PayPal)
- ✅ Base de datos Neon
- ✅ Ejecución de comandos
- ✅ Navegación completa del sistema

## Nota Importante

El servidor MCP "sandra-full-access" es el más potente porque tiene **acceso completo al sistema**. QWEN debería poder usar todas estas herramientas automáticamente una vez que el servidor esté en ejecución.

