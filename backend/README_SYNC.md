# 🔄 Sistema de Sincronização Automática

## Resumo Rápido

Este sistema resolve 3 problemas principais:

1. ✅ **Atualização automática diária** do M3U
2. ✅ **Elimina duplicatas** (substitui dados ao invés de acumular)
3. ✅ **Agrupa episódios** dentro das séries corretamente

## 🚀 Quick Start

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env e adicionar M3U_SYNC_URL

# 2. Aplicar migrations do banco
cd ../supabase
supabase db push

# 3. Testar sincronização manual
cd ../backend
npm run sync-m3u

# 4. Configurar execução automática (escolha uma opção)

# Opção A: Script Node.js (mais simples)
npm run schedule-sync -- --now

# Opção B: Cron (Linux/Mac)
crontab -e
# Adicionar: 0 3 * * * cd /caminho/backend && npm run sync-m3u

# Opção C: PM2 (produção)
npm run build
pm2 start dist/scripts/schedule-sync.js --name m3u-sync
pm2 save
```

## 📁 Arquivos Criados

```
backend/
├── src/
│   ├── scripts/
│   │   ├── sync-m3u.ts          # Script principal de sincronização
│   │   └── schedule-sync.ts     # Agendador automático
│   ├── parsers/
│   │   ├── series-grouper.ts    # Agrupa episódios em séries
│   │   └── series-grouper.test.ts
│   └── clients/
│       └── supabase.ts          # Métodos novos: deleteAllChannels, bulkUpsert, etc
├── SYNC_GUIDE.md                # Documentação completa
└── README_SYNC.md               # Este arquivo

supabase/
└── migrations/
    └── 20240115_add_series_support.sql  # Tabelas series e episodes
```

## 🎯 Como Funciona

### Antes (Problema)
```
Execução 1: 160k canais → Total: 160k ✅
Execução 2: 160k canais → Total: 320k ❌
Execução 3: 160k canais → Total: 480k ❌
```

### Depois (Solução)
```
Execução 1: Remove 0, Insere 160k → Total: 160k ✅
Execução 2: Remove 160k, Insere 160k → Total: 160k ✅
Execução 3: Remove 160k, Insere 160k → Total: 160k ✅
```

### Agrupamento de Séries

**Antes:**
```
channels:
  - Breaking Bad S01E01
  - Breaking Bad S01E02
  - Breaking Bad S01E03
  - HBO
  - ESPN
```

**Depois:**
```
channels:
  - HBO
  - ESPN

series:
  - Breaking Bad (3 episódios)
    episodes:
      - S01E01
      - S01E02
      - S01E03
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Obrigatórias
M3U_SYNC_URL=http://play.dnsrot.vip/get.php?username=X&password=Y&type=m3u
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# Opcionais
SYNC_TIME_HOUR=3              # Hora do dia (0-23)
SYNC_INTERVAL_HOURS=24        # Intervalo em horas
```

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
# Script manual
npm run sync-m3u

# PM2
pm2 logs m3u-sync

# Cron
tail -f /var/log/m3u-sync.log
```

### Estatísticas Exibidas

```
✅ Sincronização concluída com sucesso!

📊 Estatísticas:
   - Duração: 45.32s
   - Total processado: 160000 itens
   - Canais: 155000
   - Séries: 3500
   - Episódios: 1500
   - Removidos: 498000 ← Limpou duplicatas!
   - Inseridos: 160000
   - Erros: 12
```

## 🐛 Troubleshooting

### Ainda tem duplicatas?

```bash
# Limpar banco manualmente
psql $DATABASE_URL -c "DELETE FROM channels; DELETE FROM series;"

# Executar sincronização
npm run sync-m3u
```

### Episódios não agrupam?

Verifique o formato do nome. Padrões suportados:
- `S01E01`, `s01e01` (Season/Episode)
- `S01P01`, `s01p01` (Season/Part)
- `1x01`, `1X01` (Season x Episode)
- `T01E01` (Temporada/Episódio)

### Timeout ao baixar?

Edite `src/parsers/m3u-parser.ts`:
```typescript
timeout: 60000, // Aumentar para 60s
```

## 📚 Documentação Completa

Veja `SYNC_GUIDE.md` para:
- Todas as opções de agendamento
- Configuração detalhada
- Exemplos de cron/PM2/Docker
- Queries SQL úteis
- Troubleshooting avançado

## ✅ Checklist de Implementação

- [ ] Aplicar migration: `supabase db push`
- [ ] Configurar `.env` com `M3U_SYNC_URL`
- [ ] Testar manual: `npm run sync-m3u`
- [ ] Verificar que duplicatas foram removidas
- [ ] Verificar que séries foram agrupadas
- [ ] Configurar agendamento automático
- [ ] Monitorar primeira execução agendada
- [ ] Configurar alertas (opcional)

## 🎉 Pronto!

Agora seu sistema:
- ✅ Atualiza automaticamente 1x por dia
- ✅ Não acumula duplicatas
- ✅ Organiza episódios em séries
- ✅ Mantém apenas dados atualizados
