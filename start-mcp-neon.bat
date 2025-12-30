@echo off
echo.
echo ============================================
echo    Iniciando MCP Server NEON para Qwen
echo ============================================
echo.

cd /d "C:\Users\clayt\Desktop\desktop-app"
echo Cambiando al directorio: %cd%

echo.
echo Verificando Python...
"C:\Users\clayt\AppData\Local\Programs\Python\Python314\python.exe" --version

echo.
echo Iniciando MCP Server NEON...
"C:\Users\clayt\AppData\Local\Programs\Python\Python314\python.exe" mcp-server-neon.py

echo.
echo MCP Server NEON detenido
pause