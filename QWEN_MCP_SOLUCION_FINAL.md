# Solución MCP para QWEN App - Usando npx

## ⚠️ Problema

QWEN solo acepta `npx` o `uvx` para servidores stdio, no acepta `node` directamente.

## ✅ Solución

Hay dos opciones:

### Opción 1: Usar npx con --package (RECOMENDADO)

1. **Asegúrate de que `package.json` tiene el bin configurado** (ya está actualizado)

2. **Usa este JSON en QWEN:**

```json
{
  "mcpServers": {
    "sandra-full-access": {
      "command": "npx",
      "args": [
        "--yes",
        "--package=file:C:\\Users\\clayt\\Desktop\\desktop-app",
        "sandra-full-access-mcp"
      ]
    }
  }
}
```

**Nota:** Si tu app está en otra ubicación, cambia la ruta en `--package=file:TU_RUTA`

### Opción 2: Crear un script wrapper (ALTERNATIVA)

Si la Opción 1 no funciona, puedes crear un script `.cmd` que QWEN puede ejecutar directamente:

1. Ya existe `qwen-mcp-wrapper.cmd` en el directorio
2. Usa este JSON:

```json
{
  "mcpServers": {
    "sandra-full-access": {
      "command": "C:\\Users\\clayt\\Desktop\\desktop-app\\qwen-mcp-wrapper.cmd"
    }
  }
}
```

**Pero espera:** QWEN dice que solo acepta `npx` o `uvx`, así que esta opción probablemente NO funcionará.

### Opción 3: Usar npx con ruta absoluta directa (PROBAR ESTA)

```json
{
  "mcpServers": {
    "sandra-full-access": {
      "command": "npx",
      "args": [
        "--yes",
        "node",
        "C:\\Users\\clayt\\Desktop\\desktop-app\\qwen-mcp-stdio-server.js"
      ]
    }
  }
}
```

## 📋 Instrucciones Paso a Paso

1. **Abre QWEN App**
2. **Ve a Configuración → MCP → Mi MCP**
3. **Haz clic en "+ Añadir MCP" → "Agregar usando JSON"**
4. **Prueba primero la Opción 1** (con --package)
5. Si no funciona, prueba la **Opción 3** (npx node con ruta)
6. **Guarda y habilita**

## 🧪 Probar la Conexión

Una vez configurado, prueba en QWEN:

```
¿Puedes listar los archivos en mi escritorio?
```

```
Ejecuta: dir C:\Users\clayt\Desktop
```

