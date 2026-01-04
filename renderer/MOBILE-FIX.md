# 📱 Correcciones para Móvil - Sandra Elysium

## ✅ Cambios Realizados

1. **Manifest.json creado** - Configuración PWA completa
2. **Meta tags móviles agregados** - Para iOS y Android
3. **Service Worker mejorado** - Registro automático
4. **Iconos SVG creados** - icon-192.svg y icon-512.svg
5. **Detección de PWA instalada** - Para saber si está en modo standalone

## 🔍 Verificación en Móvil

### Pasos para verificar:

1. **Abre en el navegador móvil:**
   - https://sandra.guestsvalencia.es

2. **Verifica que cargue:**
   - Deberías ver "🌙 Sandra Elysium"
   - El botón "✨ Comenzar Sesión Íntima"

3. **Instalar como PWA:**
   - **Android Chrome:** Menú (⋮) > "Instalar aplicación" o "Añadir a pantalla de inicio"
   - **iOS Safari:** Compartir (□↑) > "Añadir a pantalla de inicio"

4. **Verificar Service Worker:**
   - Abre DevTools (si es posible en móvil)
   - Application > Service Workers
   - Debería estar registrado

## 🐛 Problemas Comunes

### No se puede instalar como PWA:
- Verifica que estés usando HTTPS (ya está configurado)
- Verifica que el manifest.json sea accesible: https://sandra.guestsvalencia.es/manifest.json
- Verifica que el Service Worker esté registrado

### No carga en móvil:
- Verifica la conexión a internet
- Limpia la caché del navegador
- Intenta en modo incógnito

### Service Worker no funciona:
- Verifica que sw.js sea accesible: https://sandra.guestsvalencia.es/sw.js
- Verifica la consola del navegador para errores

## 📋 Checklist de Verificación

- [ ] El sitio carga en el navegador móvil
- [ ] Se puede instalar como PWA
- [ ] El Service Worker está registrado
- [ ] Funciona offline después de la primera carga
- [ ] El manifest.json es accesible
- [ ] Los iconos se muestran correctamente

## 🔧 Si aún no funciona:

1. **Verifica los archivos desplegados:**
   ```bash
   curl https://sandra.guestsvalencia.es/manifest.json
   curl https://sandra.guestsvalencia.es/sw.js
   ```

2. **Limpia la caché del navegador móvil:**
   - Chrome: Configuración > Privacidad > Borrar datos de navegación
   - Safari: Configuración > Safari > Borrar historial y datos

3. **Reinstala la PWA:**
   - Desinstala la app si ya estaba instalada
   - Vuelve a instalar desde el navegador

## 📞 URLs de Verificación

- **Sitio principal:** https://sandra.guestsvalencia.es
- **Manifest:** https://sandra.guestsvalencia.es/manifest.json
- **Service Worker:** https://sandra.guestsvalencia.es/sw.js
- **Icono 192:** https://sandra.guestsvalencia.es/icon-192.svg
- **Icono 512:** https://sandra.guestsvalencia.es/icon-512.svg
