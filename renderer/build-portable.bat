@echo off
echo 📦 Creando Sandra AI Portable...
echo.

REM Crear carpeta
set "TARGET=sandra-ai-portable"
mkdir "%TARGET%" 2>nul
cd /d "%TARGET%"

REM 1. Copiar estructura esencial
echo Copiando módulos...
mkdir tools 2>nul
mkdir observers 2>nul
mkdir outputs 2>nul

xcopy "..\tools\claude_local" "tools\claude_local\" /E /I /Q
xcopy "..\observers" "observers\" /E /I /Q
xcopy "..\tools\voice" "tools\voice\" /E /I /Q
copy "..\main.js" .
copy "..\auto-orchestration-engine.js" .
copy "..\install-sandra-ai.bat" .
copy "..\test-full-observer.html" .

REM 2. Descargar Python embebido (Windows x64)
echo Descargando Python embebido...
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile 'python.zip'"
powershell -Command "Expand-Archive -Path 'python.zip' -DestinationPath 'python' -Force"
del python.zip

REM 3. Instalar dependencias mínimas
echo Instalando dependencias...
echo requests==2.31.0 > requirements.txt
echo tzlocal==5.0 >> requirements.txt
cd python
.\python.exe -m pip install --target ..\lib -r ..\requirements.txt
cd ..

REM 4. Crear launcher (Node.js + Python)
echo Creando launcher...
(
echo const { spawn } = require('child_process');
echo const path = require('path');
echo.
echo console.log('🚀 Sandra AI Portable');
echo console.log('   - Claude local');
echo console.log('   - Qwen integrado');
echo console.log('   - STT/TTS local');
echo console.log('   - Observer 2.0');
echo.
echo // Iniciar servidor Python si es necesario
echo const py = spawn('python\\python.exe', ['tools/claude_local/claude_wrapper.py', 'create_chat'], {
echo   cwd: '.',
echo   stdio: 'ignore'
echo });
echo.
echo // Abrir interfaz
echo require('./main.js');
) > launcher.js

REM 5. Empaquetar con pkg (opcional)
echo.
echo 🎁 Para crear .exe único:
echo    npm install -g pkg
echo    pkg launcher.js --targets node18-win-x64 --output sandra-ai.exe
echo.
echo ✅ Portable listo en: %cd%
pause