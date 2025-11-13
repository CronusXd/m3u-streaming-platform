@echo off
REM Script de configuração rápida da sincronização automática (Windows)
REM Uso: scripts\setup-sync.bat

echo.
echo ========================================
echo Configurando Sincronizacao Automatica do M3U
echo ========================================
echo.

REM Verificar se está na pasta correta
if not exist "package.json" (
    echo [ERRO] Execute este script da pasta backend/
    exit /b 1
)

REM Verificar se .env existe
if not exist ".env" (
    echo [AVISO] Arquivo .env nao encontrado
    echo Criando .env a partir do .env.example...
    copy .env.example .env
    echo [OK] Arquivo .env criado
    echo.
    echo [IMPORTANTE] Edite o arquivo .env e configure:
    echo    - M3U_SYNC_URL
    echo    - SUPABASE_URL
    echo    - SUPABASE_SERVICE_KEY
    echo.
    pause
)

echo Verificando configuracao...
echo.

REM Instalar dependências
echo Instalando dependencias...
call npm install
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

REM Build
echo Compilando TypeScript...
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha no build
    exit /b 1
)
echo [OK] Build concluido
echo.

REM Testar sincronização
echo Testando sincronizacao...
echo [AVISO] Isso pode demorar alguns minutos...
echo.
call npm run sync-m3u
if errorlevel 1 (
    echo.
    echo [ERRO] Erro no teste de sincronizacao
    echo Verifique os logs acima para mais detalhes
    exit /b 1
)

echo.
echo [OK] Teste de sincronizacao bem-sucedido!
echo.

REM Perguntar método de agendamento
echo Como voce quer agendar a sincronizacao automatica?
echo.
echo 1) PM2 (recomendado para producao)
echo 2) Agendador de Tarefas do Windows
echo 3) Script Node.js (simples, mantem processo rodando)
echo 4) Configurar manualmente depois
echo.
set /p choice="Escolha uma opcao (1-4): "

if "%choice%"=="1" goto pm2
if "%choice%"=="2" goto taskscheduler
if "%choice%"=="3" goto nodejs
if "%choice%"=="4" goto manual
goto invalid

:pm2
echo.
echo Configurando PM2...

REM Verificar se PM2 está instalado
where pm2 >nul 2>nul
if errorlevel 1 (
    echo Instalando PM2 globalmente...
    call npm install -g pm2
)

REM Iniciar com PM2
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo [OK] PM2 configurado!
echo.
echo Comandos uteis:
echo    pm2 list                    - Ver processos
echo    pm2 logs m3u-sync-scheduler - Ver logs
echo    pm2 restart m3u-sync-scheduler - Reiniciar
echo    pm2 stop m3u-sync-scheduler - Parar
goto end

:taskscheduler
echo.
echo Configurando Agendador de Tarefas do Windows...
echo.
echo Abra o "Agendador de Tarefas" e crie uma nova tarefa:
echo.
echo 1. Nome: Sincronizacao M3U
echo 2. Gatilho: Diariamente as 3:00
echo 3. Acao: Iniciar programa
echo    - Programa: npm
echo    - Argumentos: run sync-m3u
echo    - Iniciar em: %CD%
echo.
echo Pressione qualquer tecla para abrir o Agendador de Tarefas...
pause >nul
start taskschd.msc
goto end

:nodejs
echo.
echo Iniciando agendador Node.js...
echo.
echo O processo ficara rodando. Pressione Ctrl+C para parar.
echo.
call npm run schedule-sync -- --now
goto end

:manual
echo.
echo Consulte o arquivo SYNC_GUIDE.md para instrucoes detalhadas
goto end

:invalid
echo [ERRO] Opcao invalida
exit /b 1

:end
echo.
echo ========================================
echo Configuracao concluida!
echo ========================================
echo.
echo A sincronizacao sera executada:
echo    - Automaticamente: Todo dia as 3h da manha
echo    - Manualmente: npm run sync-m3u
echo.
echo Documentacao completa: backend\SYNC_GUIDE.md
echo.
pause
