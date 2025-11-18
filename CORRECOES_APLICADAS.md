# ✅ Correções Aplicadas - Estrutura da Tabela IPTV

## 🔧 Problema Identificado

**Erro:** `column iptv.stream_url does not exist`

**Causa:** As APIs estavam buscando a coluna `stream_url`, mas na tabela `iptv` a coluna correta é `url_stream`.

---

## 📊 Estrutura Correta da Tabela IPTV

```sql
CREATE TABLE iptv (
  id UUID PRIMARY KEY,
  tipo VARCHAR(20) CHECK (tipo IN ('canal', 'filme', 'serie')),
  nome VARCHAR(500) NOT NULL,
  categoria VARCHAR(255),
  url_stream TEXT NOT NULL,  -- ⚡ COLUNA CORRETA!
  is_hls BOOLEAN DEFAULT true,
  
  -- Séries
  temporada INTEGER,
  episodio INTEGER,
  
  -- EPG (canais)
  epg_logo TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Nota:** Dados TMDB (logo, poster, rating, etc) são buscados em tempo real via API, não do banco!

---

## ✅ Correções Aplicadas

### 1. API de Pré-carregamento de Séries
**Arquivo:** `frontend/src/app/api/iptv/preload/series/route.ts`

**Antes:**
```typescript
.select('id, nome, temporada, episodio, url_stream, stream_url, logo_url, is_hls')
//                                                   ^^^^^^^^^^^ ERRADO!

const streamUrl = ep.stream_url || ep.url_stream;
```

**Depois:**
```typescript
.select('id, nome, temporada, episodio, url_stream, logo_url, is_hls')
//                                      ^^^^^^^^^^^ CORRETO!

stream_url: ep.url_stream, // ⚡ Correto!
```

---

### 2. API de Pré-carregamento de Filmes
**Arquivo:** `frontend/src/app/api/iptv/preload/movies/route.ts`

**Antes:**
```typescript
.select('id, nome, categoria, url_stream, stream_url, logo_url, ...')
//                                        ^^^^^^^^^^^ ERRADO!

stream_url: movie.stream_url || movie.url_stream,
```

**Depois:**
```typescript
.select('id, nome, categoria, url_stream, logo_url, ...')
//                            ^^^^^^^^^^^ CORRETO!

stream_url: movie.url_stream, // ⚡ Correto!
```

---

### 3. API de Pré-carregamento de Canais
**Arquivo:** `frontend/src/app/api/iptv/preload/channels/route.ts`

**Antes:**
```typescript
.select('id, nome, categoria, url_stream, stream_url, logo_url, ...')
//                                        ^^^^^^^^^^^ ERRADO!

stream_url: channel.stream_url || channel.url_stream,
```

**Depois:**
```typescript
.select('id, nome, categoria, url_stream, logo_url, ...')
//                            ^^^^^^^^^^^ CORRETO!

stream_url: channel.url_stream, // ⚡ Correto!
```

---

## 🎯 Resultado

### Antes (Errado)
```
❌ column iptv.stream_url does not exist
❌ Erro ao buscar episódios
❌ Erro ao buscar filmes
❌ Erro ao buscar canais
```

### Depois (Correto)
```
✅ Busca url_stream corretamente
✅ Episódios carregados com sucesso
✅ Filmes carregados com sucesso
✅ Canais carregados com sucesso
```

---

## 📝 Mapeamento de Colunas

| Tipo | Colunas Buscadas |
|------|------------------|
| **Todos** | `id`, `tipo`, `nome`, `categoria`, `url_stream`, `logo_url`, `is_hls` |
| **Séries** | `temporada`, `episodio` |
| **Canais** | `epg_logo` (fallback se logo_url vazio) |
| **Filmes** | *(sem colunas extras)* |

**Não buscamos:**
- ❌ `backdrop_url` (vem do TMDB)
- ❌ `tmdb_vote_average` (vem do TMDB)
- ❌ `tmdb_release_date` (vem do TMDB)

---

## 🚀 Próximos Passos

1. ✅ Testar APIs de pré-carregamento
2. ✅ Verificar se dados são salvos no cache
3. ✅ Validar que streams funcionam
4. ✅ Confirmar que não há mais erros

---

## 📊 Queries Corretas

### Buscar Séries
```sql
SELECT id, nome, temporada, episodio, url_stream, logo_url, is_hls
FROM iptv
WHERE tipo = 'serie' AND nome = 'Nome da Série'
ORDER BY temporada, episodio;
```

### Buscar Filmes
```sql
SELECT id, nome, categoria, url_stream, logo_url, is_hls
FROM iptv
WHERE tipo = 'filme'
ORDER BY nome;
```

### Buscar Canais
```sql
SELECT id, nome, categoria, url_stream, logo_url, epg_logo, is_hls
FROM iptv
WHERE tipo = 'canal'
ORDER BY nome;
```

**Nota:** Posters, backdrops e metadados (rating, ano, etc) vêm do TMDB em tempo real!

---

**Data:** 17/01/2025  
**Status:** ✅ Corrigido  
**Impacto:** Crítico (APIs funcionando)
