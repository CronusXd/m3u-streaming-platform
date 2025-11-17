# 📺 Importação M3U para Tabela Unificada

**Data:** 15/01/2025  
**Status:** ✅ Pronto para uso

---

## 🎯 OBJETIVO

Criar uma **tabela única** no banco de dados que armazena:
- 📺 **Canais** (transmissões ao vivo)
- 🎬 **Filmes** (conteúdo sob demanda)
- 📺 **Séries** (episódios organizados por temporada)

Tudo em uma única tabela, diferenciado pelo campo `tipo`.

---

## 📋 ESTRUTURA DA TABELA

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `tipo` | VARCHAR | 'canal', 'filme' ou 'serie' |
| `nome` | VARCHAR | Nome do conteúdo |
| `categoria` | VARCHAR | Categoria/grupo |
| `url_stream` | TEXT | URL do stream |
| `is_hls` | BOOLEAN | Se é HLS (.m3u8) |
| `is_active` | BOOLEAN | Se está ativo |

### Campos para Canais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `epg_id` | VARCHAR | ID do EPG |
| `epg_logo` | TEXT | Logo do canal |
| `epg_numero` | VARCHAR | Número do canal |

### Campos para Séries

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `temporada` | INTEGER | Número da temporada |
| `episodio` | INTEGER | Número do episódio |
| `nome_episodio` | VARCHAR | Nome do episódio |

### Campos Adicionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `logo_url` | TEXT | URL do logo/poster |
| `poster_url` | TEXT | URL do poster |
| `backdrop_url` | TEXT | URL do backdrop |
| `descricao` | TEXT | Descrição |
| `ano` | INTEGER | Ano de lançamento |
| `duracao` | INTEGER | Duração em minutos |
| `classificacao` | VARCHAR | Classificação etária |
| `qualidade` | VARCHAR | HD, FHD, 4K, SD |
| `tmdb_id` | INTEGER | ID do TMDB |
| `imdb_id` | VARCHAR | ID do IMDB |
| `visualizacoes` | INTEGER | Contador de views |
| `avaliacao` | DECIMAL | Nota 0.0 a 10.0 |
| `metadata` | JSONB | Metadados flexíveis |

---

## 🚀 COMO USAR

### 1. Executar Migration SQL

Primeiro, crie a tabela no Supabase:

```bash
# Acesse o Supabase Dashboard
# SQL Editor → New Query
# Cole o conteúdo de:
supabase/migrations/20250115_create_unified_content_table.sql
# Execute (Run)
```

### 2. Colocar Arquivo M3U na Raiz

```bash
# Coloque seu arquivo M3U na raiz do projeto
cp /caminho/para/sua/lista.m3u ./lista.m3u
```

### 3. Executar Importação

```bash
cd backend

# Importar (mantém dados existentes)
npm run import-m3u-unified

# Importar limpando tabela antes
npm run import-m3u-unified -- --clean
```

---

## 🔍 DETECÇÃO AUTOMÁTICA

### Como o Script Classifica

#### 📺 Canais
Detectado quando:
- URL contém `/live/`
- Categoria contém "canal", "tv" ou "rádio"
- Tem EPG ID

#### 🎬 Filmes
Detectado quando:
- Não é canal
- Não tem padrão de série no nome

#### 📺 Séries
Detectado quando o nome contém:
- `S01E02`, `s01e02` (padrão comum)
- `S1E2`, `S01 E02` (variações)
- `T01E02`, `T1E2` (temporada)
- `1x02`, `01x02` (formato alternativo)
- `Temporada 1 Episódio 2` (por extenso)
- `T1 Ep2` (abreviado)
- `S01 : E01` (com separadores)

### Normalização de Temporada/Episódio

Todos os formatos são convertidos para números inteiros:

```
S01E02  → temporada: 1, episodio: 2
s03e15  → temporada: 3, episodio: 15
T2E5    → temporada: 2, episodio: 5
1x10    → temporada: 1, episodio: 10
```

---

## 📊 FUNÇÕES SQL DISPONÍVEIS

### 1. Buscar Séries Agrupadas

```sql
SELECT * FROM get_series_agrupadas(
  'Ação',      -- categoria (opcional)
  'Breaking',  -- busca no nome (opcional)
  50,          -- limit
  0            -- offset
);
```

**Retorna:**
- Nome da série
- Categoria
- Total de episódios
- Total de temporadas
- Logo/poster
- Última atualização

### 2. Buscar Episódios de uma Série

```sql
SELECT * FROM get_episodios_serie(
  'Breaking Bad',  -- nome da série
  1                -- temporada (opcional)
);
```

**Retorna:**
- Todos os episódios da série
- Ordenados por temporada e episódio

### 3. Buscar Canais por Categoria

```sql
SELECT * FROM get_canais_por_categoria('Esportes');
```

**Retorna:**
- Todos os canais da categoria
- Com informações de EPG

### 4. Buscar Filmes

```sql
SELECT * FROM get_filmes(
  'Ação',      -- categoria (opcional)
  'Matrix',    -- busca no nome (opcional)
  50,          -- limit
  0            -- offset
);
```

**Retorna:**
- Filmes ordenados por visualizações
- Com informações completas

---

## 📈 VIEWS DISPONÍVEIS

### Estatísticas Gerais

```sql
SELECT * FROM stats_conteudos;
```

**Retorna:**
```
tipo   | total | total_categorias | ativos | media_visualizacoes
-------|-------|------------------|--------|--------------------
canal  | 1500  | 45               | 1450   | 125.5
filme  | 3200  | 28               | 3100   | 89.2
serie  | 8500  | 35               | 8200   | 156.8
```

### Resumo de Séries

```sql
SELECT * FROM series_resumo
ORDER BY total_episodios DESC
LIMIT 10;
```

**Retorna:**
- Top 10 séries com mais episódios
- Contagem de temporadas
- Última atualização

---

## 🔍 QUERIES ÚTEIS

### Contar por Tipo

```sql
SELECT tipo, COUNT(*) as total
FROM conteudos
GROUP BY tipo;
```

### Buscar Série Específica

```sql
SELECT *
FROM conteudos
WHERE tipo = 'serie'
  AND nome ILIKE '%Breaking Bad%'
ORDER BY temporada, episodio;
```

### Canais Mais Vistos

```sql
SELECT nome, categoria, visualizacoes
FROM conteudos
WHERE tipo = 'canal'
ORDER BY visualizacoes DESC
LIMIT 20;
```

### Filmes por Ano

```sql
SELECT ano, COUNT(*) as total
FROM conteudos
WHERE tipo = 'filme'
  AND ano IS NOT NULL
GROUP BY ano
ORDER BY ano DESC;
```

### Séries com Mais Temporadas

```sql
SELECT 
  nome,
  COUNT(DISTINCT temporada) as total_temporadas,
  COUNT(*) as total_episodios
FROM conteudos
WHERE tipo = 'serie'
GROUP BY nome
ORDER BY total_temporadas DESC
LIMIT 10;
```

---

## 🎯 EXEMPLO DE DADOS

### Canal

```json
{
  "id": "uuid",
  "tipo": "canal",
  "nome": "TNT [4K]",
  "categoria": "Canais | TNT",
  "url_stream": "http://example.com/live/stream.m3u8",
  "epg_id": "TNT [4K]",
  "epg_logo": "https://i.imgur.com/s99Fd0l.png",
  "epg_numero": "101",
  "is_hls": true,
  "is_active": true,
  "qualidade": "4K"
}
```

### Filme

```json
{
  "id": "uuid",
  "tipo": "filme",
  "nome": "Matrix",
  "categoria": "Filmes | Ação",
  "url_stream": "http://example.com/movie.m3u8",
  "logo_url": "https://image.tmdb.org/poster.jpg",
  "ano": 1999,
  "duracao": 136,
  "avaliacao": 8.7,
  "is_hls": true,
  "is_active": true
}
```

### Série

```json
{
  "id": "uuid",
  "tipo": "serie",
  "nome": "Breaking Bad",
  "categoria": "Séries | Drama",
  "url_stream": "http://example.com/episode.m3u8",
  "temporada": 1,
  "episodio": 1,
  "nome_episodio": "Breaking Bad S01E01 - Pilot",
  "logo_url": "https://image.tmdb.org/poster.jpg",
  "is_hls": true,
  "is_active": true
}
```

---

## 📊 ÍNDICES CRIADOS

Para garantir performance, foram criados índices em:

- ✅ `tipo` - Busca por tipo de conteúdo
- ✅ `categoria` - Busca por categoria
- ✅ `nome` - Busca full-text em português
- ✅ `(nome, temporada, episodio)` - Busca de séries
- ✅ `epg_id` - Busca de canais por EPG
- ✅ `is_active` - Filtro de ativos
- ✅ `tmdb_id` - Integração com TMDB
- ✅ `visualizacoes` - Ordenação por popularidade
- ✅ `ano` - Filtro por ano

---

## 🔧 MANUTENÇÃO

### Atualizar Metadados

```sql
UPDATE conteudos
SET metadata = metadata || '{"novo_campo": "valor"}'::jsonb
WHERE id = 'uuid';
```

### Marcar como Inativo

```sql
UPDATE conteudos
SET is_active = false
WHERE url_stream LIKE '%offline%';
```

### Limpar Duplicados

```sql
DELETE FROM conteudos a
USING conteudos b
WHERE a.id < b.id
  AND a.nome = b.nome
  AND a.tipo = b.tipo
  AND a.temporada = b.temporada
  AND a.episodio = b.episodio;
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Tabela não existe"
**Solução:** Execute a migration SQL primeiro

### Erro: "Arquivo não encontrado"
**Solução:** Coloque `lista.m3u` na raiz do projeto

### Erro: "Rate limit"
**Solução:** O script já processa em lotes de 1000 com delay

### Séries não detectadas
**Solução:** Verifique se o nome contém padrão S01E01 ou similar

---

## 📚 ARQUIVOS CRIADOS

1. ✅ `supabase/migrations/20250115_create_unified_content_table.sql` - Migration SQL
2. ✅ `backend/src/scripts/import-m3u-unified.ts` - Script de importação
3. ✅ `IMPORTACAO_M3U_UNIFICADA.md` - Esta documentação

---

## ✅ CHECKLIST

- [ ] Executar migration SQL no Supabase
- [ ] Colocar arquivo `lista.m3u` na raiz
- [ ] Executar `npm run import-m3u-unified`
- [ ] Verificar dados importados
- [ ] Testar queries de busca
- [ ] Integrar com frontend

---

## 🎉 PRONTO!

Agora você tem uma tabela unificada com:
- ✅ Canais, filmes e séries em um só lugar
- ✅ Detecção automática de tipo
- ✅ Normalização de temporada/episódio
- ✅ Funções SQL prontas para uso
- ✅ Índices otimizados
- ✅ Views para estatísticas

**Execute a importação e comece a usar!** 🚀

---

**Criado em:** 15/01/2025  
**Mantido por:** Kiro AI
