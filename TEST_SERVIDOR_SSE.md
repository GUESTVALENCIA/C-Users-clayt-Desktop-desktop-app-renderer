# Test del Servidor MCP SSE

## ✅ Servidor Iniciado

El servidor está corriendo en: `http://localhost:8000/sse/`

## 🧪 Pasos para Probar

1. **Verificar que el servidor está corriendo**:
   ```bash
   curl http://localhost:8000/health
   ```
   Debe responder: `{"status":"ok","port":8000}`

2. **Probar conexión SSE**:
   ```bash
   curl -N http://localhost:8000/sse/
   ```
   Debe mostrar: `: connected` seguido de heartbeats cada 30 segundos

## 📋 Configuración para ChatGPT Desktop

Una vez confirmado que el servidor funciona, usa estos datos en ChatGPT:

- **Nombre**: `Sandra Full Access MCP`
- **Descripción**: `Servidor MCP con acceso completo al sistema de archivos, ejecución de comandos y memoria persistente`
- **URL**: `http://localhost:8000/sse/`
- **Autenticación**: `Ninguna`
- ✅ Marcar checkbox de advertencia

## 🔄 Siguiente Paso

Después de probar localmente, podemos:
1. Adaptarlo para Render (si necesitas acceso remoto)
2. Probar la conexión con ChatGPT Desktop
3. Verificar que las herramientas funcionan correctamente

