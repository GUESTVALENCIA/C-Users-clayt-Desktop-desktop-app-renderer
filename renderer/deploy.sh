#!/bin/bash
# Script de despliegue para sandra.guestsvalencia.es
# Uso: ./deploy.sh [servidor] [usuario]

set -e

SERVER=${1:-"tu-servidor.com"}
USER=${2:-"root"}
DOMAIN="sandra.guestsvalencia.es"
REMOTE_DIR="/var/www/${DOMAIN}"

echo "🚀 Iniciando despliegue de ${DOMAIN}..."

# Crear directorio remoto
echo "📁 Creando directorio en el servidor..."
ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}"

# Subir archivos
echo "📤 Subiendo archivos..."
scp index.html ${USER}@${SERVER}:${REMOTE_DIR}/
scp sw.js ${USER}@${SERVER}:${REMOTE_DIR}/

# Configurar permisos
echo "🔐 Configurando permisos..."
ssh ${USER}@${SERVER} "chown -R www-data:www-data ${REMOTE_DIR} && chmod -R 755 ${REMOTE_DIR}"

# Si es Nginx
if ssh ${USER}@${SERVER} "command -v nginx &> /dev/null"; then
    echo "🌐 Configurando Nginx..."
    scp nginx.conf ${USER}@${SERVER}:/tmp/sandra-nginx.conf
    ssh ${USER}@${SERVER} "sudo cp /tmp/sandra-nginx.conf /etc/nginx/sites-available/${DOMAIN} && \
        sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/ && \
        sudo nginx -t && \
        sudo systemctl reload nginx"
    echo "✅ Nginx configurado y recargado"
fi

# Si es Apache
if ssh ${USER}@${SERVER} "command -v apache2 &> /dev/null"; then
    echo "🌐 Configurando Apache..."
    scp apache.conf ${USER}@${SERVER}:/tmp/sandra-apache.conf
    ssh ${USER}@${SERVER} "sudo cp /tmp/sandra-apache.conf /etc/apache2/sites-available/${DOMAIN}.conf && \
        sudo a2ensite ${DOMAIN}.conf && \
        sudo a2enmod rewrite headers expires && \
        sudo systemctl reload apache2"
    echo "✅ Apache configurado y recargado"
fi

echo "✨ Despliegue completado!"
echo "🌐 Visita: http://${DOMAIN}"
