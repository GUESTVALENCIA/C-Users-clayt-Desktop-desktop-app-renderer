# 🔧 Solución: App Instalada No Se Abre

## ✅ Cambios Realizados

1. **Service Worker actualizado** (v2) - Fuerza actualización del caché
2. **Cache mejorado** - Incluye manifest.json
3. **Activación inmediata** - La app se actualiza automáticamente

## 🔄 Pasos para Solucionar

### Opción 1: Desinstalar y Reinstalar (RECOMENDADO)

1. **Desinstala la app del móvil:**
   - Mantén presionado el icono de la app
   - Selecciona "Desinstalar" o "Eliminar"

2. **Limpia la caché del navegador:**
   - **Chrome Android:** Configuración > Privacidad > Borrar datos de navegación > Caché
   - **Safari iOS:** Configuración > Safari > Borrar historial y datos

3. **Vuelve a abrir el sitio:**
   ```
   https://sandra.guestsvalencia.es
   ```

4. **Reinstala la app:**
   - **Android:** Menú (⋮) > "Instalar aplicación"
   - **iOS:** Compartir (□↑) > "Añadir a pantalla de inicio"

### Opción 2: Forzar Actualización del Service Worker

1. **Abre el sitio en el navegador:**
   ```
   https://sandra.guestsvalencia.es
   ```

2. **Abre las herramientas de desarrollador** (si es posible):
   - Chrome: chrome://inspect
   - Safari: Requiere Mac conectado

3. **Ve a Application > Service Workers**
4. **Haz clic en "Unregister"** en el Service Worker antiguo
5. **Recarga la página** (Ctrl+F5 o Cmd+Shift+R)
6. **Cierra y vuelve a abrir la app instalada**

### Opción 3: Limpiar Todo el Caché

1. **Desinstala la app**
2. **Limpia TODOS los datos del navegador:**
   - Chrome: Configuración > Privacidad > Borrar datos de navegación > Todo
   - Safari: Configuración > Safari > Borrar historial y datos
3. **Reinicia el móvil**
4. **Vuelve a instalar la app**

## 🔍 Verificación

Después de reinstalar, verifica:

- ✅ La app se abre correctamente
- ✅ Muestra "🌙 Sandra Elysium"
- ✅ El botón funciona
- ✅ Funciona offline después de la primera carga

## 📱 Si Aún No Funciona

### Verifica la URL:
Asegúrate de que la app apunte a:
```
https://sandra.guestsvalencia.es
```

### Verifica el manifest:
Abre en el navegador:
```
https://sandra.guestsvalencia.es/manifest.json
```
Deberías ver un JSON válido.

### Verifica el Service Worker:
Abre en el navegador:
```
https://sandra.guestsvalencia.es/sw.js
```
Deberías ver el código del Service Worker.

## 🆘 Último Recurso

Si nada funciona:

1. **Desinstala completamente la app**
2. **Limpia TODO el caché del navegador**
3. **Reinicia el móvil**
4. **Abre el sitio en modo incógnito primero:**
   ```
   https://sandra.guestsvalencia.es
   ```
5. **Verifica que cargue correctamente**
6. **Luego instala la app desde modo normal**

## 📞 Información Técnica

- **Última actualización:** Service Worker v2
- **Cache name:** sandra-elysium-v2
- **URL de producción:** https://sandra.guestsvalencia.es
- **Manifest:** https://sandra.guestsvalencia.es/manifest.json
