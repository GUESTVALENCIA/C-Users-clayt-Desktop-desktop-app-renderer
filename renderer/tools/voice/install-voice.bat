@echo off
echo 🎙️ Instalando motor de voz local...
echo.

REM Crear carpeta
mkdir models 2>nul
cd /d "%~dp0"

REM Descargar whisper.cpp binario ligero (Windows x64)
echo Descargando whisper.exe...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/ggerganov/whisper.cpp/releases/download/1.4.1/whisper.exe' -OutFile 'whisper.exe'"

REM Descargar modelo base (español/inglés, ~150 MB)
echo Descargando modelo base (es/en)...
powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin' -OutFile 'models\ggml-base.bin'"

echo.
echo ✅ Instalación completada.
echo Modelos disponibles: base, tiny, small
echo Para usar: voiceEngine.transcribeAudio('audio.wav', { model: 'base' })
echo.
pause