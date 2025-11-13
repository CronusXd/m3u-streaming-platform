# 📊 Queries SQL Úteis

## Verificação de Dados

### Contar registros por tipo

```sql
-- Total de canais
SELECT COUNT(*) as total_canais FROM channels;

-- Total de séries
SELECT COUNT(*) as total_series FROM series;

-- Total de episódios
SELECT COUNT(*) as total_episodios FROM episodes;

-- Resumo geral
SELECT 
  (SELECT COUNT(*) FROM channels) as canais,
  (SELECT COUNT(*) FROM series) as series,
  (SELECT COUNT(*) FROM episodes) as episodios;
```

### Verificar duplicatas

```sql
-- Canais duplicados por nome
SELECT name, COUNT(*) as count
FROM channels
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- Canais duplicados por URL
SELECT url, COUNT(*) as count
FROM channels
GROUP BY url
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- Episódios duplicados
SELECT series_id, season, episode, COUNT(*) as count
FROM episodes
GROUP BY series_id, season, episode
HAVING COUNT(*) > 1;
```

### Top séries por número de episódios

```sql
SELECT 
  s.name,
  s.total_episodes,
  COUNT(e.id) as episodios_reais
FROM series s
LEFT JOIN episodes e ON e.series_id = s.id
GROUP BY s.id, s.name, s.total_episodes
ORDER BY s.total_episodes DESC
LIMIT 20;
```

### Séries com episódios faltando

```sql
-- Séries onde o total_episodes não bate com episódios reais
SELECT 
  s.name,
  s.total_episodes as esperado,
  COUNT(e.id) as real,
  s.total_episodes - COUNT(e.id) as diferenca
FROM series s
LEFT JOIN episodes e ON e.series_id = s.id
GROUP BY s.id, s.name, s.total_episodes
HAVING s.total_episodes != COUNT(e.id)
ORDER BY diferenca DESC;
```

## Limpeza de Dados

### Remover todos os canais

```sql
-- CUIDADO: Remove TODOS os canais
DELETE FROM channels;
```

### Remover todas as séries e episódios

```sql
-- CUIDADO: Remove TODAS as séries (episódios são removidos por CASCADE)
DELETE FROM series;
```

### Remover canais duplicados (manter o mais recente)

```sql
-- Remover duplicatas por nome (mantém o mais recente)
DELETE FROM channels
WHERE id NOT IN (
  SELECT MAX(id)
  FROM channels
  GROUP BY name
);

-- Remover duplicatas por URL (mantém o mais recente)
DELETE FROM channels
WHERE id NOT IN (
  SELECT MAX(id)
  FROM channels
  GROUP BY url
);
```

### Remover episódios duplicados

```sql
-- Remover episódios duplicados (mantém o mais recente)
DELETE FROM episodes
WHERE id NOT IN (
  SELECT MAX(id)
  FROM episodes
  GROUP BY series_id, season, episode
);
```

### Remover séries sem episódios

```sql
DELETE FROM series
WHERE id NOT IN (
  SELECT DISTINCT series_id
  FROM episodes
);
```

## Análise de Dados

### Canais por grupo

```sql
SELECT 
  COALESCE(group_title, 'Sem Grupo') as grupo,
  COUNT(*) as total
FROM channels
GROUP BY group_title
ORDER BY total DESC
LIMIT 20;
```

### Distribuição de episódios por temporada

```sql
SELECT 
  s.name as serie,
  e.season as temporada,
  COUNT(*) as episodios
FROM series s
JOIN episodes e ON e.series_id = s.id
GROUP BY s.name, e.season
ORDER BY s.name, e.season;
```

### Canais HLS vs não-HLS

```sql
SELECT 
  is_hls,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM channels
GROUP BY is_hls;
```

### Canais por idioma

```sql
SELECT 
  COALESCE(language, 'Desconhecido') as idioma,
  COUNT(*) as total
FROM channels
GROUP BY language
ORDER BY total DESC
LIMIT 20;
```

## Manutenção

### Atualizar contagem de episódios manualmente

```sql
-- Atualizar total_episodes de todas as séries
UPDATE series s
SET total_episodes = (
  SELECT COUNT(*)
  FROM episodes e
  WHERE e.series_id = s.id
),
updated_at = NOW();
```

### Reativar todos os canais

```sql
UPDATE channels
SET is_active = true;
```

### Desativar canais sem URL válida

```sql
UPDATE channels
SET is_active = false
WHERE url IS NULL OR url = '';
```

### Adicionar índices para performance (se não existirem)

```sql
-- Índices em channels
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_channels_group_title ON channels(group_title);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);

-- Índices em series
CREATE INDEX IF NOT EXISTS idx_series_name ON series(name);

-- Índices em episodes
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON episodes(season, episode);
```

## Backup e Restore

### Exportar dados para CSV

```sql
-- Exportar canais
COPY (SELECT * FROM channels) TO '/tmp/channels_backup.csv' CSV HEADER;

-- Exportar séries
COPY (SELECT * FROM series) TO '/tmp/series_backup.csv' CSV HEADER;

-- Exportar episódios
COPY (SELECT * FROM episodes) TO '/tmp/episodes_backup.csv' CSV HEADER;
```

### Importar dados de CSV

```sql
-- Importar canais
COPY channels FROM '/tmp/channels_backup.csv' CSV HEADER;

-- Importar séries
COPY series FROM '/tmp/series_backup.csv' CSV HEADER;

-- Importar episódios
COPY episodes FROM '/tmp/episodes_backup.csv' CSV HEADER;
```

## Monitoramento

### Últimas atualizações

```sql
-- Últimos canais adicionados
SELECT name, created_at
FROM channels
ORDER BY created_at DESC
LIMIT 10;

-- Últimas séries adicionadas
SELECT name, total_episodes, created_at
FROM series
ORDER BY created_at DESC
LIMIT 10;
```

### Tamanho das tabelas

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Estatísticas de uso

```sql
-- Canais mais favoritados (se tiver tabela de favoritos)
SELECT 
  c.name,
  COUNT(f.channel_id) as favoritos
FROM channels c
LEFT JOIN favorites f ON f.channel_id = c.id
GROUP BY c.id, c.name
ORDER BY favoritos DESC
LIMIT 20;
```

## Troubleshooting

### Verificar integridade referencial

```sql
-- Episódios órfãos (sem série)
SELECT COUNT(*)
FROM episodes e
LEFT JOIN series s ON s.id = e.series_id
WHERE s.id IS NULL;

-- Favoritos órfãos (canal não existe)
SELECT COUNT(*)
FROM favorites f
LEFT JOIN channels c ON c.id = f.channel_id
WHERE c.id IS NULL;
```

### Resetar sequências (após importação manual)

```sql
-- Resetar sequência de channels
SELECT setval('channels_id_seq', (SELECT MAX(id) FROM channels));

-- Resetar sequência de series
SELECT setval('series_id_seq', (SELECT MAX(id) FROM series));

-- Resetar sequência de episodes
SELECT setval('episodes_id_seq', (SELECT MAX(id) FROM episodes));
```

## Queries de Desenvolvimento

### Buscar canais por padrão

```sql
-- Buscar canais que parecem ser episódios
SELECT name
FROM channels
WHERE name ~* 'S\d{2}E\d{2}|S\d{2}P\d{2}|\d{1,2}x\d{1,2}'
LIMIT 20;
```

### Testar regex de episódios

```sql
-- Testar diferentes padrões de episódios
SELECT 
  name,
  name ~* 'S\d{2}E\d{2}' as formato_s01e01,
  name ~* 'S\d{2}P\d{2}' as formato_s01p01,
  name ~* '\d{1,2}x\d{1,2}' as formato_1x01
FROM channels
WHERE name ~* 'S\d{2}E\d{2}|S\d{2}P\d{2}|\d{1,2}x\d{1,2}'
LIMIT 20;
```

---

**Dica:** Execute essas queries no Supabase Dashboard ou via `psql`:

```bash
# Conectar ao banco
psql $DATABASE_URL

# Ou via Supabase CLI
supabase db remote exec < query.sql
```
