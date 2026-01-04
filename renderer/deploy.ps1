# Script de despliegue PowerShell para sandra.guestsvalencia.es
# Uso: .\deploy.ps1 -Server "tu-servidor.com" -User "root"

param(
    [string]$Server = "tu-servidor.com",
    [string]$User = "root"
)

$Domain = "sandra.guestsvalencia.es"
$RemoteDir = "/var/www/$Domain"

Write-Host "🚀 Iniciando despliegue de $Domain..." -ForegroundColor Cyan

# Verificar que los archivos existen
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: index.html no encontrado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "sw.js")) {
    Write-Host "⚠️  Advertencia: sw.js no encontrado" -ForegroundColor Yellow
}

# Crear directorio remoto
Write-Host "📁 Creando directorio en el servidor..." -ForegroundColor Yellow
ssh "${User}@${Server}" "mkdir -p $RemoteDir"

# Subir archivos
Write-Host "📤 Subiendo archivos..." -ForegroundColor Yellow
scp index.html "${User}@${Server}:${RemoteDir}/"
if (Test-Path "sw.js") {
    scp sw.js "${User}@${Server}:${RemoteDir}/"
}

# Configurar permisos
Write-Host "🔐 Configurando permisos..." -ForegroundColor Yellow
ssh "${User}@${Server}" "chown -R www-data:www-data $RemoteDir && chmod -R 755 $RemoteDir"

# Verificar y configurar servidor web
Write-Host "🌐 Configurando servidor web..." -ForegroundColor Yellow

# Nginx
$nginxCheck = ssh "${User}@${Server}" "command -v nginx 2>/dev/null"
if ($nginxCheck) {
    Write-Host "   Configurando Nginx..." -ForegroundColor Green
    scp nginx.conf "${User}@${Server}:/tmp/sandra-nginx.conf"
    ssh "${User}@${Server}" "sudo cp /tmp/sandra-nginx.conf /etc/nginx/sites-available/$Domain && sudo ln -sf /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"
    Write-Host "✅ Nginx configurado" -ForegroundColor Green
}

# Apache
$apacheCheck = ssh "${User}@${Server}" "command -v apache2 2>/dev/null"
if ($apacheCheck) {
    Write-Host "   Configurando Apache..." -ForegroundColor Green
    scp apache.conf "${User}@${Server}:/tmp/sandra-apache.conf"
    ssh "${User}@${Server}" "sudo cp /tmp/sandra-apache.conf /etc/apache2/sites-available/$Domain.conf && sudo a2ensite $Domain.conf && sudo a2enmod rewrite headers expires && sudo systemctl reload apache2"
    Write-Host "✅ Apache configurado" -ForegroundColor Green
}

Write-Host "`n✨ Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 Visita: http://$Domain" -ForegroundColor Cyan
