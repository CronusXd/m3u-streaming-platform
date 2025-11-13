# Guia de Sincronização Automática do M3U

## 📋 Visão Geral

Este sistema sincroniza automaticamente a lista M3U do servidor, atualizando o banco de dados com os canais e séries mais recentes. **Importante:** O sistema SUBSTITUI os dados antigos ao invés de acumular, evitando duplicatas.

## 🎯 Funcionalidades

### 1. Sincronização Inteligente
- ✅ Baixa M3U da URL configurada
- ✅ Faz parse de canais e séries
- ✅ **Remove dados antigos antes de inserir** (evita acúmulo)
- ✅ Agrupa episódios dentro das séries automaticamente
- ✅ Detecta padrões: S01E01, S01P01, 1x01, etc

### 2. Organização de Séries
O sistema identifica episódios e os agrupa corretamente:

**Antes:**
```
- Breaking Bad S01E01
- Breaking Bad S01E02
- Breaking Bad S01E03
```

**Depois:**
```
Série: Breaking Bad
  ├─ Temporada 1
  │   ├─ Episódio 1
  │   ├─ Episódio 2
  │   └─ Episódio 3
```

### 3. Prevenção de Duplicatas
- Remove TODOS os registros antigos antes de inserir novos
- Usa constraints únicos no banco de dados
- Evita acúmulo de 160k → 498k+ registros

## 🚀 Como Usar

### Execução Manual

```bash
# Entrar na pasta do backend
cd backend

# Executar sincronização uma vez
npm run sync-m3u
```

### Execução Agendada (Recomendado)

#### Opção 1: Script Node.js (Simples)

```bash
# Executar agendador (roda 1x por dia às 3h)
npm run schedule-sync

# Executar agora E agendar próximas
npm run schedule-sync -- --now
```

#### Opção 2: Cron Job (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa todo dia às 3h da manhã)
0 3 * * * cd /caminho/para/backend && npm run sync-m3u >> /var/log/m3u-sync.log 2>&1
```

#### Opção 3: Task Scheduler (Windows)

1. Abrir "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "Sincronização M3U"
4. Gatilho: Diariamente às 3:00
5. Ação: Iniciar programa
   - Programa: `npm`
   - Argumentos: `run sync-m3u`
   - Iniciar em: `C:\caminho\para\backend`

#### Opção 4: PM2 (Produção)

```bash
# Instalar PM2
npm install -g pm2

# Criar arquivo de configuração
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'm3u-scheduler',
    script: 'dist/scripts/schedule-sync.js',
    cron_restart: '0 3 * * *',
    autorestart: false,
    watch: false
  }]
}
EOF

# Iniciar com PM2
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Opção 5: Docker Compose (com cron)

```yaml
# Adicionar ao docker-compose.yml
services:
  m3u-sync:
    build: ./backend
    command: npm run schedule-sync
    environment:
      - M3U_SYNC_URL=${M3U_SYNC_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    restart: unless-stopped
```

## ⚙️ Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env` do backend:

```env
# URL do M3U para sincronização
M3U_SYNC_URL=http://play.dnsrot.vip/get.php?username=Betania&password=hmjefp94euh&type=m3u&output=m3u8

# ID da playlist do sistema (opcional)
SYSTEM_PLAYLIST_ID=system-main

# Configurações do agendador (opcional)
SYNC_INTERVAL_HOURS=24
SYNC_TIME_HOUR=3
```

### Personalizar Horário

Para mudar o horário de sincronização:

```env
# Executar às 2h da manhã
SYNC_TIME_HOUR=2

# Executar a cada 12 horas
SYNC_INTERVAL_HOURS=12
```

## 📊 Logs e Monitoramento

### Visualizar Logs

```bash
# Durante execução manual
npm run sync-m3u

# Logs do PM2
pm2 logs m3u-scheduler

# Logs do cron
tail -f /var/log/m3u-sync.log
```

### Estatísticas Exibidas

```
📊 Estatísticas:
   - Duração: 45.32s
   - Total processado: 160000 itens
   - Canais: 155000
   - Séries: 3500
   - Episódios: 1500
   - Removidos: 498000
   - Inseridos: 160000
   - Erros: 12
```

## 🔧 Troubleshooting

### Problema: Duplicatas ainda aparecem

**Solução:** Execute a migration do banco de dados:

```bash
# Aplicar migration de séries
cd supabase
supabase db push
```

### Problema: Episódios não agrupam

**Causa:** Formato do nome não é reconhecido

**Solução:** Adicione o padrão no `series-grouper.ts`:

```typescript
private episodePatterns = [
  /[Ss](\d{1,2})[Ee](\d{1,3})/,  // S01E01
  /[Ss](\d{1,2})[Pp](\d{1,3})/,  // S01P01
  /(\d{1,2})[xX](\d{1,3})/,       // 1x01
  /[Tt](\d{1,2})[Ee](\d{1,3})/,  // T01E01
  // Adicione seu padrão aqui
];
```

### Problema: Timeout ao baixar M3U

**Solução:** Aumentar timeout no `m3u-parser.ts`:

```typescript
const response = await axios.get(url, {
  timeout: 60000, // 60 segundos
  maxContentLength: 50 * 1024 * 1024, // 50MB
});
```

### Problema: Memória insuficiente

**Solução:** Processar em lotes menores no `sync-m3u.ts`:

```typescript
// Reduzir tamanho do lote
const batchSize = 250; // ao invés de 500
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **series** - Séries de TV
   - id, name, logo, total_episodes

2. **episodes** - Episódios das séries
   - id, series_id, name, url, season, episode

3. **channels** - Canais normais (modificada)
   - Adicionado: content_type, playlist_id opcional

### Relacionamentos

```
series (1) ──< (N) episodes
```

## 📝 Manutenção

### Limpar Banco Manualmente

```sql
-- Remover todos os canais
DELETE FROM channels;

-- Remover todas as séries e episódios
DELETE FROM series; -- episódios são removidos por CASCADE
```

### Verificar Duplicatas

```sql
-- Contar duplicatas de canais
SELECT name, COUNT(*) as count
FROM channels
GROUP BY name
HAVING COUNT(*) > 1;

-- Contar duplicatas de episódios
SELECT series_id, season, episode, COUNT(*) as count
FROM episodes
GROUP BY series_id, season, episode
HAVING COUNT(*) > 1;
```

## 🎯 Próximos Passos

1. ✅ Aplicar migration: `supabase db push`
2. ✅ Configurar variáveis de ambiente
3. ✅ Testar sincronização manual: `npm run sync-m3u`
4. ✅ Configurar agendamento automático
5. ✅ Monitorar logs na primeira execução

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Confirme que as variáveis de ambiente estão corretas
3. Teste a URL do M3U manualmente no navegador
4. Verifique se o Supabase está acessível
