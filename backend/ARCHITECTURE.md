# 🏗️ Arquitetura do Sistema de Sincronização

## 📊 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    M3U Source Server                         │
│  http://play.dnsrot.vip/get.php?username=X&password=Y       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP GET (axios)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    M3U Parser                                │
│  - Faz parse do formato M3U                                  │
│  - Extrai metadados (tvg-id, logo, group-title)            │
│  - Identifica URLs HLS                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Array<Channel>
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Series Grouper                              │
│  - Detecta episódios (S01E01, 1x01, etc)                    │
│  - Agrupa por série                                          │
│  - Ordena por temporada/episódio                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ GroupedContent
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sync Script                                 │
│  1. DELETE dados antigos ← IMPORTANTE!                       │
│  2. INSERT canais normais                                    │
│  3. INSERT séries                                            │
│  4. INSERT episódios                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Supabase Client
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ channels │  │  series  │  │ episodes │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados Detalhado

### 1. Download e Parse

```typescript
// sync-m3u.ts
const parser = new M3UParser();
const parseResult = await parser.parseFromUrl(M3U_URL);

// parseResult = {
//   channels: [
//     { name: "HBO", url: "...", ... },
//     { name: "Breaking Bad S01E01", url: "...", ... },
//     { name: "Breaking Bad S01E02", url: "...", ... },
//   ],
//   errors: []
// }
```

### 2. Agrupamento de Séries

```typescript
// series-grouper.ts
const seriesGrouper = new SeriesGrouper();
const grouped = seriesGrouper.groupSeries(parseResult.channels);

// grouped = {
//   channels: [
//     { name: "HBO", url: "...", ... }
//   ],
//   series: [
//     {
//       name: "Breaking Bad",
//       episodes: [
//         { season: 1, episode: 1, url: "...", ... },
//         { season: 1, episode: 2, url: "...", ... }
//       ]
//     }
//   ]
// }
```

### 3. Limpeza e Inserção

```typescript
// sync-m3u.ts

// PASSO 1: Limpar dados antigos (evita duplicatas!)
await supabase.deleteAllChannels(); // Remove 498k registros antigos

// PASSO 2: Inserir canais normais
await supabase.bulkUpsertChannels(grouped.channels); // 155k canais

// PASSO 3: Inserir séries e episódios
for (const series of grouped.series) {
  const seriesRecord = await supabase.insertSeries(series);
  await supabase.bulkInsertEpisodes(series.episodes);
}
// 3.5k séries + 1.5k episódios
```

## 🗄️ Modelo de Dados

### Relacionamentos

```
┌──────────────┐
│   channels   │
│              │
│ - id         │
│ - name       │
│ - url        │
│ - logo       │
│ - group_title│
│ - content_type
└──────────────┘

┌──────────────┐         ┌──────────────┐
│   series     │ 1     N │   episodes   │
│              │◄────────┤              │
│ - id         │         │ - id         │
│ - name       │         │ - series_id  │
│ - logo       │         │ - name       │
│ - total_eps  │         │ - url        │
└──────────────┘         │ - season     │
                         │ - episode    │
                         └──────────────┘

┌──────────────┐         ┌──────────────┐
│   users      │         │  favorites   │
│              │         │              │
│ - id         │         │ - user_id    │
│ - email      │         │ - channel_id │
└──────────────┘         └──────────────┘
```

### Constraints Importantes

```sql
-- Evita episódios duplicados
UNIQUE INDEX idx_episodes_unique 
ON episodes(series_id, season, episode);

-- Atualiza total_episodes automaticamente
TRIGGER trigger_update_episode_count
AFTER INSERT OR DELETE ON episodes
FOR EACH ROW
EXECUTE FUNCTION update_series_episode_count();
```

## 🔍 Detecção de Episódios

### Padrões Regex

```typescript
private episodePatterns = [
  /[Ss](\d{1,2})[Ee](\d{1,3})/,  // S01E01, s01e01
  /[Ss](\d{1,2})[Pp](\d{1,3})/,  // S01P01, s01p01
  /(\d{1,2})[xX](\d{1,3})/,       // 1x01, 1X01
  /[Tt](\d{1,2})[Ee](\d{1,3})/,  // T01E01
];
```

### Exemplos de Detecção

| Nome Original | Detectado? | Série | Temporada | Episódio |
|--------------|-----------|-------|-----------|----------|
| `Breaking Bad S01E01` | ✅ | Breaking Bad | 1 | 1 |
| `Game of Thrones 5x10` | ✅ | Game of Thrones | 5 | 10 |
| `La Casa de Papel T01E05` | ✅ | La Casa de Papel | 1 | 5 |
| `HBO` | ❌ | - | - | - |
| `ESPN Sports` | ❌ | - | - | - |

### Extração do Nome da Série

```typescript
// Input: "Breaking Bad - S01E01"
// Regex match: "S01E01" at position 15
// Series name: "Breaking Bad - ".substring(0, 15).trim()
//            = "Breaking Bad"

// Remove separadores finais: -, _, :
seriesName = seriesName.replace(/[-_:]+$/, '').trim();
```

## ⏰ Sistema de Agendamento

### Opção 1: Script Node.js

```
┌─────────────────────────────────────────┐
│      schedule-sync.ts                   │
│                                         │
│  while(true) {                          │
│    nextTime = calculateNextSync()       │
│    sleep(nextTime - now)                │
│    await syncM3U()                      │
│  }                                      │
└─────────────────────────────────────────┘
```

### Opção 2: PM2 Cron

```javascript
// ecosystem.config.js
{
  name: 'm3u-sync',
  script: 'dist/scripts/sync-m3u.js',
  cron_restart: '0 3 * * *',  // Todo dia às 3h
  autorestart: false
}
```

### Opção 3: System Cron

```bash
# crontab -e
0 3 * * * cd /path/backend && npm run sync-m3u
```

## 🔐 Segurança e Permissões

### Row Level Security (RLS)

```sql
-- Leitura pública
CREATE POLICY "Séries são públicas"
ON series FOR SELECT
TO authenticated, anon
USING (true);

-- Escrita apenas service role
CREATE POLICY "Apenas service role modifica"
ON series FOR ALL
TO service_role
USING (true);
```

### Autenticação

```
┌──────────────┐
│   Frontend   │
│              │
│ JWT Token    │
└──────┬───────┘
       │
       │ Authorization: Bearer <token>
       ▼
┌──────────────┐
│   Backend    │
│              │
│ Middleware   │
│ - Valida JWT │
│ - Extrai user│
└──────┬───────┘
       │
       │ Service Key
       ▼
┌──────────────┐
│   Supabase   │
│              │
│ RLS Policies │
└──────────────┘
```

## 📊 Performance

### Batch Inserts

```typescript
// Ao invés de:
for (const channel of channels) {
  await supabase.insert(channel); // 160k queries! ❌
}

// Fazemos:
const batchSize = 500;
for (let i = 0; i < channels.length; i += batchSize) {
  const batch = channels.slice(i, i + batchSize);
  await supabase.bulkInsert(batch); // 320 queries ✅
}
```

### Índices

```sql
-- Busca por nome
CREATE INDEX idx_channels_name ON channels(name);

-- Busca por grupo
CREATE INDEX idx_channels_group_title ON channels(group_title);

-- Episódios de uma série
CREATE INDEX idx_episodes_series_order 
ON episodes(series_id, season, episode);
```

## 🔄 Ciclo de Vida Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    Dia 1 - 3:00 AM                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Trigger Cron    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Download M3U    │
              │  (160k canais)   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Parse & Group   │
              │  155k + 3.5k     │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  DELETE antigos  │
              │  (0 registros)   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  INSERT novos    │
              │  (160k total)    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Estatísticas    │
              │  Logs            │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Aguardar 24h    │
              └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Dia 2 - 3:00 AM                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Trigger Cron    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Download M3U    │
              │  (162k canais)   │ ← Novos canais!
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  DELETE antigos  │
              │  (160k removidos)│ ← Limpa duplicatas!
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  INSERT novos    │
              │  (162k total)    │ ← Sempre atualizado!
              └──────────────────┘
```

## 🎯 Pontos Chave

### ✅ Prevenção de Duplicatas

```typescript
// ANTES (errado)
await supabase.bulkInsert(channels); // Acumula!

// DEPOIS (correto)
await supabase.deleteAllChannels();  // Limpa primeiro
await supabase.bulkInsert(channels); // Depois insere
```

### ✅ Agrupamento Inteligente

```typescript
// Detecta automaticamente
"Breaking Bad S01E01" → Série: "Breaking Bad"
"Breaking Bad S01E02" → Mesma série!

// Agrupa
series: {
  name: "Breaking Bad",
  episodes: [E01, E02, ...]
}
```

### ✅ Execução Automática

```typescript
// Calcula próximo horário
const next = new Date();
next.setHours(3, 0, 0, 0);
if (next <= now) next.setDate(next.getDate() + 1);

// Agenda
setTimeout(syncM3U, next - now);
```

## 📈 Métricas

### Antes da Implementação
- ❌ 498k+ registros (duplicatas)
- ❌ Episódios desorganizados
- ❌ Atualização manual

### Depois da Implementação
- ✅ 160k registros (sem duplicatas)
- ✅ Episódios agrupados em séries
- ✅ Atualização automática diária
- ✅ Logs e monitoramento
- ✅ Fácil manutenção

---

**Última atualização:** 2024-01-15  
**Versão:** 1.0.0
