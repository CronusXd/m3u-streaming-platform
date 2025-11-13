#!/bin/bash
# Script de configuração rápida da sincronização automática
# Uso: ./scripts/setup-sync.sh

set -e

echo "🚀 Configurando Sincronização Automática do M3U"
echo "================================================"
echo ""

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script da pasta backend/"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado"
    echo "📝 Criando .env a partir do .env.example..."
    cp .env.example .env
    echo "✅ Arquivo .env criado"
    echo ""
    echo "⚠️  IMPORTANTE: Edite o arquivo .env e configure:"
    echo "   - M3U_SYNC_URL"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_KEY"
    echo ""
    read -p "Pressione Enter após configurar o .env..."
fi

# Verificar variáveis obrigatórias
echo "🔍 Verificando configuração..."
source .env

if [ -z "$M3U_SYNC_URL" ]; then
    echo "❌ Erro: M3U_SYNC_URL não configurada no .env"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Erro: SUPABASE_URL não configurada no .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Erro: SUPABASE_SERVICE_KEY não configurada no .env"
    exit 1
fi

echo "✅ Configuração válida"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install
echo "✅ Dependências instaladas"
echo ""

# Build
echo "🔨 Compilando TypeScript..."
npm run build
echo "✅ Build concluído"
echo ""

# Testar sincronização
echo "🧪 Testando sincronização..."
echo "⚠️  Isso pode demorar alguns minutos..."
echo ""
npm run sync-m3u

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Teste de sincronização bem-sucedido!"
    echo ""
else
    echo ""
    echo "❌ Erro no teste de sincronização"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi

# Perguntar método de agendamento
echo "📅 Como você quer agendar a sincronização automática?"
echo ""
echo "1) PM2 (recomendado para produção)"
echo "2) Cron (Linux/Mac)"
echo "3) Script Node.js (simples, mantém processo rodando)"
echo "4) Configurar manualmente depois"
echo ""
read -p "Escolha uma opção (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Configurando PM2..."
        
        # Verificar se PM2 está instalado
        if ! command -v pm2 &> /dev/null; then
            echo "📦 Instalando PM2 globalmente..."
            npm install -g pm2
        fi
        
        # Iniciar com PM2
        pm2 start ecosystem.config.js
        pm2 save
        
        echo ""
        echo "✅ PM2 configurado!"
        echo ""
        echo "📝 Comandos úteis:"
        echo "   pm2 list                    - Ver processos"
        echo "   pm2 logs m3u-sync-scheduler - Ver logs"
        echo "   pm2 restart m3u-sync-scheduler - Reiniciar"
        echo "   pm2 stop m3u-sync-scheduler - Parar"
        echo ""
        echo "Para iniciar automaticamente com o sistema:"
        echo "   pm2 startup"
        ;;
        
    2)
        echo ""
        echo "🔧 Configurando Cron..."
        
        BACKEND_PATH=$(pwd)
        CRON_LINE="0 3 * * * cd $BACKEND_PATH && npm run sync-m3u >> /var/log/m3u-sync.log 2>&1"
        
        echo ""
        echo "Adicione esta linha ao crontab:"
        echo ""
        echo "$CRON_LINE"
        echo ""
        echo "Para editar o crontab:"
        echo "   crontab -e"
        echo ""
        read -p "Deseja abrir o crontab agora? (s/n): " open_cron
        
        if [ "$open_cron" = "s" ] || [ "$open_cron" = "S" ]; then
            crontab -e
        fi
        ;;
        
    3)
        echo ""
        echo "🔧 Iniciando agendador Node.js..."
        echo ""
        echo "O processo ficará rodando. Pressione Ctrl+C para parar."
        echo ""
        npm run schedule-sync -- --now
        ;;
        
    4)
        echo ""
        echo "📚 Consulte o arquivo SYNC_GUIDE.md para instruções detalhadas"
        ;;
        
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "✨ Configuração concluída!"
echo ""
echo "📊 A sincronização será executada:"
echo "   - Automaticamente: Todo dia às 3h da manhã"
echo "   - Manualmente: npm run sync-m3u"
echo ""
echo "📚 Documentação completa: backend/SYNC_GUIDE.md"
