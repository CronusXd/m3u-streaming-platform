@echo off
REM ========================================
REM Script para Sincronizar M3U Completo
REM ========================================

echo.
echo ========================================
echo  SINCRONIZACAO M3U COMPLETA
echo ========================================
echo.

REM Navegar para a pasta raiz do backend
cd /d "%~dp0..\..\..\.."

echo [1/2] Instalando dependencias...
call npm install

echo.
echo [2/2] Executando sincronizacao M3U...
call npm run sync:m3u

echo.
echo ========================================
echo  SINCRONIZACAO CONCLUIDA!
echo ========================================
echo.

pause
