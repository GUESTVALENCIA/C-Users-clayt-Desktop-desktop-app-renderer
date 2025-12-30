@echo off
echo ============================================
echo    Solucionando problemas de puertos y MCP
echo ============================================
echo.

echo Buscando procesos que usan el puerto 19875...
for /f "tokens=5" %%t in ('netstat -ano ^| findstr :19875') do (
  echo Matando proceso %%t que usa el puerto 19875...
  taskkill /PID %%t /F
)

echo.
echo Buscando procesos que usan el puerto 8765...
for /f "tokens=5" %%t in ('netstat -ano ^| findstr :8765') do (
  echo Matando proceso %%t que usa el puerto 8765...
  taskkill /PID %%t /F
)

echo.
echo Esperando 3 segundos para que los puertos se liberen...
ping 127.0.0.1 -n 3 > nul

echo.
echo Iniciando servidor MCP Principal en segundo plano...
start "MCP Server" cmd /c "cd /d "C:\Users\clayt\Desktop\desktop-app" && node start-mcp-main.js"

echo.
echo Iniciando servidor MCP Neon en segundo plano...
start "MCP Neon" cmd /c ""C:\Users\clayt\AppData\Local\Programs\Python\Python314\python.exe" "C:\Users\clayt\Desktop\desktop-app\mcp-server-neon.py""

echo.
echo Esperando 5 segundos para que los servidores se inicien...
ping 127.0.0.1 -n 5 > nul

echo.
echo ============================================
echo    Verificando estado de los servidores
echo ============================================

netstat -an | findstr :19875
netstat -an | findstr :8765

echo.
echo ============================================
echo    Iniciando StudioLab con Electron
echo ============================================
echo.

cd /d "C:\Users\clayt\Desktop\desktop-app"
set ELECTRON_ENABLE_SECURITY_WARNINGS=false

echo Ejecutando: npm start
echo.

npm start

echo.
echo ============================================
echo    StudioLab se ha cerrado
echo ============================================
echo.
pause