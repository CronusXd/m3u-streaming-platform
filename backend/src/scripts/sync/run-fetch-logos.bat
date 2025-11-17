@echo off
REM ========================================
REM Script para Buscar Logos do TMDB
REM ========================================

echo.
echo ========================================
echo  BUSCAR LOGOS DO TMDB
echo ========================================
echo.

REM Navegar para a pasta raiz do backend
cd /d "%~dp0..\..\..\.."

echo [1/2] Instalando dependencias...
call npm install

echo.
echo [2/2] Executando busca de logos...
call npm run sync:tmdb

echo.
echo ========================================
echo  BUSCA DE LOGOS CONCLUIDA!
echo ========================================
echo.

pause
