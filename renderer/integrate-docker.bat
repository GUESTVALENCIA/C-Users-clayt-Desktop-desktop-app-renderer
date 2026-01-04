@echo off
echo 🐳 Integrando Docker en tu app Electron...
echo.

REM Copiar archivos necesarios
copy "electron-docker-bridge.js" "..\renderer\" >nul 2>&1
copy "docker-control-ui.html" "..\renderer\" >nul 2>&1

REM Añadir import al main.js
powershell -Command "(Get-Content '..\renderer\main.js') -replace 'console\.log\(''🧠 Iniciando Sandra Studio con voz\.\.\.'', \"console.log(''🧠 Iniciando Sandra Studio con voz...'')\n\n// 🐳 Docker Bridge\nrequire('./electron-docker-bridge.js');\" | Set-Content '..\renderer\main.js'"

REM Añadir al main process
echo const { DockerManager } = require('./main-process-docker.js'); >> "..\main.js"

echo ✅ Integración completada.
echo.
echo Próximos pasos:
echo 1. Coloca la carpeta sandra-ai-docker en: %USERPROFILE%\Desktop\sandra-ai-docker
echo 2. Ejecuta tu app normalmente
echo 3. Usa el control Docker en la esquina superior derecha
pause