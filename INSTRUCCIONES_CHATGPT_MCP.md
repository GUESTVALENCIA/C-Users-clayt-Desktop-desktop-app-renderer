# Instrucciones Paso a Paso: Configurar MCP en ChatGPT Desktop

## 📋 Campos del Formulario "Aplicación nueva BETA"

### 1. **Icono (opcional)**
- **Campo**: Cuadro grande con "+"
- **Qué hacer**: 
  - Puedes dejarlo vacío (opcional)
  - O subir una imagen de mínimo 128x128 px

### 2. **Nombre**
- **Campo**: Campo de texto "Nombre"
- **Qué poner**: 
  ```
  Sandra Full Access MCP
  ```
- **Por qué**: Un nombre descriptivo para identificar tu servidor

### 3. **Descripción (opcional)**
- **Campo**: Área de texto grande "Descripción (opcional)"
- **Qué poner**: 
  ```
  Servidor MCP con acceso completo al sistema de archivos, ejecución de comandos y memoria persistente para desarrollo y automatización local.
  ```
- **Por qué**: Ayuda a entender qué hace el servidor

### 4. **URL del servidor MCP** ⚠️ IMPORTANTE
- **Campo**: Campo de texto "URL del servidor MCP"
- **Qué poner**: 
  ```
  http://localhost:8000/sse/
  ```
  (Si usas el servidor SSE local que creamos)
  
  O si tienes un servidor remoto:
  ```
  https://tu-servidor.com/sse/
  ```
- **⚠️ CRÍTICO**: 
  - La URL **DEBE terminar en `/sse/`**
  - ChatGPT solo acepta servidores MCP con transporte SSE (Server-Sent Events)
  - Tu servidor actual (puerto 19875) NO funciona directamente

### 5. **Autenticación**
- **Campo**: Menú desplegable "Autenticación"
- **Qué seleccionar**: 
  - **"Ninguna"** (si el servidor es local/privado) ✅ RECOMENDADO
  - **"OAuth"** (solo si necesitas autenticación externa)

### 6. **ID de cliente OAuth (opcional)**
- **Campo**: Solo aparece si seleccionas "OAuth"
- **Qué poner**: Dejar vacío (a menos que uses OAuth)

### 7. **Secreto de cliente OAuth (opcional)**
- **Campo**: Solo aparece si seleccionas "OAuth"
- **Qué poner**: Dejar vacío (a menos que uses OAuth)

### 8. **Checkbox de Advertencia** ⚠️ OBLIGATORIO
- **Campo**: Checkbox "Entiendo y quiero continuar"
- **Qué hacer**: 
  - ✅ **DEBES marcarlo** para poder continuar
  - Lee la advertencia sobre los riesgos

### 9. **Botones**
- **"Guardar"**: Guarda la configuración
- **"Guardar y habilitar"**: Guarda y activa el servidor inmediatamente

## 🔧 Pasos Completos

1. **Inicia el servidor MCP SSE** (si aún no lo tienes):
   ```bash
   node mcp-server-sse.js
   ```
   Debe mostrar: `✅ MCP Server SSE corriendo en http://localhost:8000/sse/`

2. **Abre ChatGPT Desktop**

3. **Ve a Configuración → Aplicaciones → "+ Añadir" o "Aplicación nueva BETA"**

4. **Completa el formulario**:
   - Nombre: `Sandra Full Access MCP`
   - Descripción: `Servidor MCP con acceso completo...`
   - URL: `http://localhost:8000/sse/`
   - Autenticación: `Ninguna`
   - ✅ Marca el checkbox de advertencia

5. **Haz clic en "Guardar y habilitar"**

6. **Prueba** el servidor en un chat nuevo

## ⚠️ IMPORTANTE: Diferencias con QWEN

| Aspecto | QWEN | ChatGPT Desktop |
|---------|------|-----------------|
| **Tipo** | stdio (local) | SSE (remoto) |
| **Configuración** | JSON con `npx` | URL HTTP con `/sse/` |
| **Servidor** | `qwen-mcp-stdio-server.js` | `mcp-server-sse.js` |
| **Puerto** | N/A (stdio) | 8000 (HTTP) |
| **URL** | N/A | `http://localhost:8000/sse/` |

## 🚨 Advertencias de Seguridad

ChatGPT te mostrará estas advertencias:

1. **"Los servidores MCP personalizados suponen un riesgo"**
   - ⚠️ Solo conecta servidores que TU hayas creado
   - ⚠️ Revisa cuidadosamente qué herramientas expone el servidor
   - ⚠️ No conectes servidores de terceros sin revisar el código

2. **Riesgos potenciales**:
   - Robo de datos
   - Acciones no deseadas del modelo
   - Destrucción de datos

3. **Recomendaciones**:
   - ✅ Solo usa servidores locales que TU hayas creado
   - ✅ Revisa los parámetros de las herramientas antes de usar
   - ✅ No expongas el servidor a internet sin autenticación

## 🧪 Verificar que Funciona

Después de configurar, prueba en ChatGPT:

```
Lista los archivos en mi escritorio
```

```
Lee el archivo C:\Users\clayt\Desktop\desktop-app\package.json
```

```
Ejecuta el comando: dir C:\Users\clayt\Desktop
```

Si funciona, ChatGPT debería poder usar las herramientas MCP que configuraste.

