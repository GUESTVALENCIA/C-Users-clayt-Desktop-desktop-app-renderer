# 🚀 Guía de Despliegue - Sandra IA Galaxy Level

## Configuración del Dominio

El sitio web está configurado para funcionar en el dominio: **sandra.guestsvalencia.es**

## Iniciar el Servidor Local

Para probar el servidor localmente:

```bash
npm run serve
```

O en modo desarrollo (con recarga automática):

```bash
npm run serve:dev
```

El servidor se iniciará en `http://localhost:3000` por defecto.

## Configuración del Dominio en Producción

Para conectar el dominio `sandra.guestsvalencia.es` al servidor, necesitas:

### 1. Configuración DNS

Configura los registros DNS de tu dominio para que apunten a la IP de tu servidor:

```
Tipo: A
Nombre: sandra (o @)
Valor: [IP de tu servidor]
TTL: 3600
```

### 2. Configuración del Servidor Web

#### Opción A: Usando Nginx (Recomendado)

Crea un archivo de configuración en `/etc/nginx/sites-available/sandra.guestsvalencia.es`:

```nginx
server {
    listen 80;
    server_name sandra.guestsvalencia.es;

    root /ruta/a/tu/proyecto/renderer;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Configuración para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Configuración para APK
    location /downloads/ {
        alias /ruta/a/tu/proyecto/renderer/downloads/;
        add_header Content-Disposition "attachment";
    }
}
```

Luego habilita el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/sandra.guestsvalencia.es /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Opción B: Usando Apache

Crea un archivo de configuración en `/etc/apache2/sites-available/sandra.guestsvalencia.es.conf`:

```apache
<VirtualHost *:80>
    ServerName sandra.guestsvalencia.es
    DocumentRoot /ruta/a/tu/proyecto/renderer

    <Directory /ruta/a/tu/proyecto/renderer>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/sandra_error.log
    CustomLog ${APACHE_LOG_DIR}/sandra_access.log combined
</VirtualHost>
```

Habilita el sitio:

```bash
sudo a2ensite sandra.guestsvalencia.es.conf
sudo systemctl reload apache2
```

#### Opción C: Usando Node.js directamente (PM2)

Instala PM2:

```bash
npm install -g pm2
```

Inicia el servidor con PM2:

```bash
PORT=80 pm2 start server.js --name sandra-ia
pm2 save
pm2 startup
```

### 3. Configuración SSL/HTTPS (Recomendado)

Para habilitar HTTPS, usa Let's Encrypt con Certbot:

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d sandra.guestsvalencia.es
```

O para Apache:

```bash
sudo certbot --apache -d sandra.guestsvalencia.es
```

### 4. Variables de Entorno

Puedes configurar el puerto usando una variable de entorno:

```bash
PORT=80 node server.js
```

O crear un archivo `.env`:

```
PORT=80
DOMAIN=sandra.guestsvalencia.es
```

## Estructura de Archivos

```
renderer/
├── index.html          # Página principal
├── server.js           # Servidor HTTP
├── package.json        # Configuración del proyecto
└── downloads/          # (Opcional) Carpeta para archivos APK
    └── sandra-ia-galaxy.apk
```

## URLs Configuradas en el HTML

El archivo `index.html` ya está configurado con las siguientes URLs:

- **Web App**: `https://sandra.guestsvalencia.es/app`
- **Descarga APK**: `https://sandra.guestsvalencia.es/downloads/sandra-ia-galaxy.apk`
- **PWA**: `https://sandra.guestsvalencia.es`

## Verificación

Una vez configurado, verifica que todo funciona:

1. Accede a `https://sandra.guestsvalencia.es` en tu navegador
2. Verifica que la página carga correctamente
3. Prueba los botones de descarga
4. Verifica que los enlaces internos funcionan

## Solución de Problemas

### El servidor no inicia

- Verifica que el puerto no esté en uso: `netstat -tulpn | grep :3000`
- Verifica los permisos del archivo `index.html`
- Revisa los logs del servidor

### El dominio no resuelve

- Verifica la configuración DNS con: `nslookup sandra.guestsvalencia.es`
- Espera a que se propague el DNS (puede tardar hasta 48 horas)
- Verifica que el firewall permite conexiones en el puerto 80/443

### Error 404 en archivos estáticos

- Verifica que la ruta en la configuración del servidor web sea correcta
- Verifica los permisos de los archivos
- Revisa la configuración de `try_files` en Nginx

## Soporte

Para más ayuda, contacta a: soporte@guestsvalencia.es
