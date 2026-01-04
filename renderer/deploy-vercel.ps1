# Despliegue automático a Vercel para sandra.guestsvalencia.es

$Domain = "sandra.guestsvalencia.es"

Write-Host "🚀 Desplegando $Domain a Vercel..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Vercel CLI está instalado
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI encontrado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Instala Vercel CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g vercel" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Verificar archivos
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: index.html no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivos listos para desplegar" -ForegroundColor Green
Write-Host ""

# Desplegar
Write-Host "📤 Desplegando a Vercel..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar vercel deploy con producción
vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✨ Despliegue completado!" -ForegroundColor Green
    Write-Host "🌐 Visita: https://$Domain" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "💡 Asegúrate de estar autenticado: vercel login" -ForegroundColor Yellow
}
