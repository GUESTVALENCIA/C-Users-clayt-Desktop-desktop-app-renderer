# Configuración MCP para QWEN App Oficial

## 📋 Instrucciones de Instalación

### 1. Copiar el JSON de Configuración

1. Abre la aplicación oficial de QWEN
2. Ve a **Configuración** → **MCP** → **Mi MCP**
3. Haz clic en **"+ Añadir MCP"** → **"Agregar usando JSON"**
4. Copia y pega el contenido completo del archivo `qwen-mcp-config.json`

### 2. Ajustar la Ruta del Script (si es necesario)

Si tu aplicación Electron está en una ruta diferente a `C:\Users\clayt\Desktop\desktop-app\`, edita la ruta en el JSON:

```json
{
  "mcpServers": {
    "sandra-full-access": {
      "command": "node",
      "args": [
        "TU_RUTA_COMPLETA\\qwen-mcp-stdio-server.js"
      ]
    }
  }
}
```

### 3. Verificar que Node.js está en el PATH

Asegúrate de que Node.js esté instalado y disponible en el PATH del sistema. Para verificar:

```cmd
node --version
```

Si Node.js no está en el PATH, usa la ruta completa en el JSON:

```json
{
  "mcpServers": {
    "sandra-full-access": {
      "command": "C:\\Program Files\\Node.js\\node.exe",
      "args": [
        "C:\\Users\\clayt\\Desktop\\desktop-app\\qwen-mcp-stdio-server.js"
      ]
    }
  }
}
```

## 🔧 Herramientas Disponibles

El servidor MCP proporciona las siguientes herramientas con **acceso completo** a tu PC:

### Sistema de Archivos
- **read_file**: Leer cualquier archivo del sistema
- **write_file**: Escribir/crear archivos en cualquier ubicación
- **list_files**: Listar archivos y directorios

### Ejecución de Código
- **execute_command**: Ejecutar comandos CMD/PowerShell
- **execute_python**: Ejecutar código Python
- **execute_node**: Ejecutar código Node.js

### Memoria Persistente
- **memory_store**: Guardar información en memoria
- **memory_get**: Recuperar información de memoria
- **memory_list**: Listar toda la memoria
- **memory_search**: Buscar en memoria

## ⚠️ Importante

Este servidor MCP tiene **acceso completo** a tu PC. Asegúrate de:
- Solo usar QWEN desde tu cuenta oficial
- No compartir la configuración con otros
- Revisar los comandos que ejecutas

## 🧪 Prueba la Conexión

Una vez configurado, prueba en QWEN:

```
¿Puedes listar los archivos en mi escritorio?
```

```
Ejecuta el comando: dir C:\Users\clayt\Desktop
```

```
Lee el archivo: C:\Users\clayt\Desktop\desktop-app\package.json
```

## 📝 Notas Técnicas

- El servidor usa **stdio** (entrada/salida estándar) para comunicarse con QWEN
- No requiere puerto HTTP adicional (a diferencia del servidor HTTP en puerto 19875)
- Funciona directamente con la app oficial de QWEN
- Todas las herramientas se ejecutan **directamente** en tu PC, sin intermediarios

