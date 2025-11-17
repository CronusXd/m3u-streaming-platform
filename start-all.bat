@echo off
echo ========================================
echo   PlayCoreTV - Iniciando Aplicacao
echo ========================================
echo.
echo Iniciando Backend e Frontend...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Pressione Ctrl+C para parar
echo ========================================
echo.

start "PlayCoreTV Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
start "PlayCoreTV Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Servidores iniciados em janelas separadas!
echo Feche as janelas para parar os servidores.
