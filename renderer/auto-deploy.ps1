# Script automático de despliegue para sandra.guestsvalencia.es
# Detecta y configura automáticamente

$Domain = "sandra.guestsvalencia.es"
$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando despliegue automático de $Domain..." -ForegroundColor Cyan
Write-Host ""

# Verificar que los archivos existen
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: index.html no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivos encontrados:" -ForegroundColor Green
Write-Host "   - index.html" -ForegroundColor Gray
if (Test-Path "sw.js") {
    Write-Host "   - sw.js" -ForegroundColor Gray
}
Write-Host ""

# Intentar detectar servidor desde DNS
Write-Host "🔍 Detectando información del servidor..." -ForegroundColor Yellow
try {
    $dnsResult = Resolve-DnsName -Name $Domain -Type A -ErrorAction SilentlyContinue
    if ($dnsResult) {
        $serverIP = $dnsResult[0].IPAddress
        Write-Host "   IP detectada: $serverIP" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No se pudo resolver DNS. Necesitarás configurar el DNS manualmente." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Para configurar DNS, agrega este registro A:" -ForegroundColor Cyan
        Write-Host "   Tipo: A" -ForegroundColor Gray
        Write-Host "   Nombre: sandra" -ForegroundColor Gray
        Write-Host "   Valor: [IP de tu servidor]" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "   ⚠️  No se pudo resolver DNS" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Para completar el despliegue, necesitas:" -ForegroundColor Cyan
Write-Host "   1. IP o hostname del servidor" -ForegroundColor Gray
Write-Host "   2. Usuario SSH (ej: root, ubuntu, etc.)" -ForegroundColor Gray
Write-Host "   3. Acceso SSH al servidor" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Ejecuta manualmente:" -ForegroundColor Yellow
Write-Host "   .\deploy.ps1 -Server `"IP_O_HOSTNAME`" -User `"usuario`"" -ForegroundColor White
Write-Host ""
Write-Host "📖 O sigue la guía completa en: DEPLOY_COMPLETE.md" -ForegroundColor Cyan
