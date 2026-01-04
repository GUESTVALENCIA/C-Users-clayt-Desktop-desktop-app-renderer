# 🚀 Guía Completa de Despliegue - sandra.guestsvalencia.es

## 📋 Checklist Pre-Despliegue

- [x] ✅ `index.html` creado con contenido "🌙 Sandra Elysium"
- [x] ✅ `sw.js` (Service Worker) creado
- [x] ✅ `server.js` configurado para desarrollo local (puerto 8080)
- [x] ✅ Configuraciones de Nginx y Apache preparadas
- [x] ✅ Scripts de despliegue creados

## 🌐 Paso 1: Configuración DNS

Configura los registros DNS en tu proveedor de dominio:

```
Tipo: A
Nombre: sandra (o @)
Valor: [IP de tu servidor]
TTL: 3600
```

**Verificar DNS:**
```bash
nslookup sandra.guestsvalencia.es
# o
dig sandra.guestsvalencia.es
```

## 🖥️ Paso 2: Preparar el Servidor

### Opción A: Servidor Linux (Ubuntu/Debian)

**Conectarse al servidor:**
```bash
ssh root@tu-servidor.com
```

**Instalar servidor web (elige uno):**

**Nginx:**
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Apache:**
```bash
sudo apt update
sudo apt install apache2 -y
sudo systemctl enable apache2
sudo systemctl start apache2
```

**Crear directorio:**
```bash
sudo mkdir -p /var/www/sandra.guestsvalencia.es
sudo chown -R $USER:$USER /var/www/sandra.guestsvalencia.es
```

## 📤 Paso 3: Subir Archivos

### Método 1: Usando SCP (desde tu máquina local)

```bash
# Desde el directorio del proyecto
scp index.html root@tu-servidor.com:/var/www/sandra.guestsvalencia.es/
scp sw.js root@tu-servidor.com:/var/www/sandra.guestsvalencia.es/
```

### Método 2: Usando el Script de Despliegue

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh tu-servidor.com root
```

**Windows (PowerShell):**
```powershell
.\deploy.ps1 -Server "tu-servidor.com" -User "root"
```

### Método 3: Usando Git (si tienes repositorio)

```bash
# En el servidor
cd /var/www/sandra.guestsvalencia.es
git clone tu-repositorio .
```

## ⚙️ Paso 4: Configurar Servidor Web

### Si usas Nginx:

```bash
# Copiar configuración
sudo cp nginx.conf /etc/nginx/sites-available/sandra.guestsvalencia.es

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/sandra.guestsvalencia.es /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### Si usas Apache:

```bash
# Copiar configuración
sudo cp apache.conf /etc/apache2/sites-available/sandra.guestsvalencia.es.conf

# Habilitar módulos necesarios
sudo a2enmod rewrite headers expires

# Habilitar sitio
sudo a2ensite sandra.guestsvalencia.es.conf

# Verificar configuración
sudo apache2ctl configtest

# Recargar Apache
sudo systemctl reload apache2
```

## 🔒 Paso 5: Configurar SSL/HTTPS (Recomendado)

### Usando Let's Encrypt (Certbot):

**Para Nginx:**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d sandra.guestsvalencia.es
```

**Para Apache:**
```bash
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d sandra.guestsvalencia.es
```

**Renovación automática:**
```bash
sudo certbot renew --dry-run
```

## ✅ Paso 6: Verificar Despliegue

1. **Verificar que el sitio carga:**
   ```bash
   curl http://sandra.guestsvalencia.es
   ```

2. **Verificar en el navegador:**
   - Abre: `http://sandra.guestsvalencia.es` (o `https://` si configuraste SSL)
   - Deberías ver "🌙 Sandra Elysium"

3. **Verificar Service Worker:**
   - Abre DevTools (F12)
   - Ve a Application > Service Workers
   - Debería estar registrado

## 🔧 Solución de Problemas

### El sitio no carga

1. **Verificar que el servidor web está corriendo:**
   ```bash
   sudo systemctl status nginx
   # o
   sudo systemctl status apache2
   ```

2. **Verificar permisos:**
   ```bash
   sudo chown -R www-data:www-data /var/www/sandra.guestsvalencia.es
   sudo chmod -R 755 /var/www/sandra.guestsvalencia.es
   ```

3. **Verificar logs:**
   ```bash
   # Nginx
   sudo tail -f /var/log/nginx/sandra-error.log
   
   # Apache
   sudo tail -f /var/log/apache2/sandra-error.log
   ```

### Error 404

- Verifica que `index.html` esté en `/var/www/sandra.guestsvalencia.es/`
- Verifica la configuración de `try_files` (Nginx) o `RewriteRule` (Apache)

### DNS no resuelve

- Espera hasta 48 horas para propagación completa
- Verifica con: `nslookup sandra.guestsvalencia.es`
- Verifica que el registro A apunte a la IP correcta

## 📝 Notas Importantes

- **Ruta del proyecto:** `/var/www/sandra.guestsvalencia.es`
- **Archivos necesarios:** `index.html`, `sw.js`
- **Puerto HTTP:** 80 (443 para HTTPS)
- **Usuario del servidor web:** `www-data` (Ubuntu/Debian)

## 🎯 Comandos Rápidos

```bash
# Ver estado del servidor web
sudo systemctl status nginx
sudo systemctl status apache2

# Reiniciar servidor web
sudo systemctl restart nginx
sudo systemctl restart apache2

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/sandra-access.log
sudo tail -f /var/log/apache2/sandra-access.log

# Verificar configuración
sudo nginx -t
sudo apache2ctl configtest
```

## 🚀 Actualizar el Sitio

Para actualizar el contenido:

```bash
# Subir nuevo index.html
scp index.html root@tu-servidor.com:/var/www/sandra.guestsvalencia.es/

# O usar el script
./deploy.sh tu-servidor.com root
```

¡Listo! Tu sitio debería estar online en `sandra.guestsvalencia.es` 🎉
