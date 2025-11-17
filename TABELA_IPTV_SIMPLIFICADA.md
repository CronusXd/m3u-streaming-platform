# 📺 Tabela IPTV Simplificada

**Data:** 15/01/2025  
**Status:** ✅ Otimizada para TMDB

---

## 🎯 MUDANÇAS REALIZADAS

### ✅ Tabela Renomeada
- **Antes:** `conteudos`
- **Agora:** `iptv`

### ✅ Colunas Removidas (Dados do TMDB)
Estas colunas foram **removidas** porque serão buscadas em tempo real da API TMDB:

| Coluna Removida | Motivo |
|-----------------|--------|
| `descricao` | Vem do TMDB |
| `ano` | Vem do TMDB |
| `duracao` | Vem do TMDB |
| `classificacao` | Vem do TMDB |
| `idioma` | Vem do TMDB |
| `qualidade` | Vem do TMDB |
| `poster_url` | Vem do TMDB |
| `tmdb_id` | Não precisa armazenar |
| `tmdb_type` | Não precisa armazenar |
| `imdb_id` | Vem do TMDB |
| `avaliacao` | Vem do TMDB |

---

## 📋 ESTRUTURA FINAL DA TABELA `iptv`

### Campos Mantidos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `tipo` | VARCHAR | 'canal', 'filme' ou 'serie' |
| `nome` | VARCHAR | Nome do conteúdo |
| `nome_original` | VARCHAR | Nome original (opcional) |
| `categoria` | VARCHAR | Categoria/grupo do M3U |
| `url_stream` | TEXT | URL do stream (obrigatório) |
| `is_hls` | BOOLEAN | Se é HLS (.m3u8) |
| `is_active` | BOOLEAN | Se está ativo |

### Campos para Canais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `epg_id` | VARCHAR | ID do EPG |
| `epg_logo` | TEXT | Logo do EPG |
| `epg_numero` | VARCHAR | Número do canal |

### Campos para Séries

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `temporada` | INTEGER | Número da temporada |
| `episodio` | INTEGER | Número do episódio |
| `nome_episodio` | VARCHAR | Nome completo do episódio |

### Campos de Imagem

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `logo_url` | TEXT | Logo extraído do M3U |
| `backdrop_url` | TEXT | Backdrop/banner |

### Campos de Controle

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `visualizacoes` | INTEGER | Contador de views |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |
| `last_checked_at` | TIMESTAMP | Última verificação |
| `metadata` | JSONB | Metadados flexíveis |

---

## 🚀 VANTAGENS DA SIMPLIFICAÇÃO

### 1. **Banco de Dados Mais Leve**
- ✅ Menos colunas = menos espaço
- ✅ Menos índices = mais rápido
- ✅ Menos dados duplicados

### 2. **Dados Sempre Atualizados**
- ✅ TMDB é a fonte da verdade
- ✅ Não precisa sincronizar dados
- ✅ Sempre tem as informações mais recentes

### 3. **Mais Flexível**
- ✅ TMDB adiciona novos campos? Sem problema!
- ✅ Não precisa fazer migrations
- ✅ Frontend decide quais dados mostrar

### 4. **Melhor Performance**
- ✅ Queries mais rápidas (menos colunas)
- ✅ Inserts mais rápidos
- ✅ Menos índices para manter

---

## 🔄 FLUXO DE DADOS

### Importação M3U → Banco
```
M3U → Script → Tabela IPTV
(Apenas dados básicos: nome, URL, categoria, EPG)
```

### Exibição no Frontend
```
1. Buscar da tabela IPTV (nome, URL, categoria)
2. Buscar do TMDB API (descrição, ano, poster, etc)
3. Combinar e exibir
```

---

## 📊 EXEMPLO DE INTEGRAÇÃO TMDB

### Backend - Buscar Filme

```typescript
// 1. Buscar da tabela IPTV
const { data: filme } = await supabase
  .from('iptv')
  .select('*')
  .eq('tipo', 'filme')
  .eq('nome', 'Matrix')
  .single();

// 2. Buscar do TMDB
const tmdbData = await fetch(
  `https://api.themoviedb.org/3/search/movie?query=${filme.nome}&api_key=${TMDB_API_KEY}`
);
const tmdbResult = await tmdbData.json();

// 3. Combinar dados
const filmeCompleto = {
  ...filme,
  descricao: tmdbResult.results[0].overview,
  ano: tmdbResult.results[0].release_date.split('-')[0],
  poster: `https://image.tmdb.org/t/p/w500${tmdbResult.results[0].poster_path}`,
  avaliacao: tmdbResult.results[0].vote_average,
  duracao: tmdbResult.results[0].runtime,
};
```

### Frontend - Exibir Filme

```typescript
// Hook para buscar dados TMDB
const useTMDB = (nome: string, tipo: 'movie' | 'tv') => {
  const [tmdbData, setTmdbData] = useState(null);
  
  useEffect(() => {
    fetch(`/api/tmdb/search?query=${nome}&type=${tipo}`)
      .then(res => res.json())
      .then(data => setTmdbData(data));
  }, [nome, tipo]);
  
  return tmdbData;
};

// Componente
function FilmeCard({ filme }) {
  const tmdb = useTMDB(filme.nome, 'movie');
  
  return (
    <div>
      <h2>{filme.nome}</h2>
      <img src={tmdb?.poster} />
      <p>{tmdb?.descricao}</p>
      <span>Ano: {tmdb?.ano}</span>
      <span>Nota: {tmdb?.avaliacao}/10</span>
    </div>
  );
}
```

---

## 🔍 QUERIES ATUALIZADAS

### Buscar Filmes
```sql
SELECT * FROM get_filmes('Ação', 'Matrix', 50, 0);
```

**Retorna:**
- id, nome, categoria, url_stream
- logo_url, backdrop_url
- visualizacoes

**Não retorna mais:**
- ~~ano, duracao, avaliacao, poster_url~~
- (Buscar do TMDB)

### Buscar Séries
```sql
SELECT * FROM get_series_agrupadas('Drama', 'Breaking', 50, 0);
```

**Retorna:**
- nome, categoria
- total_episodios, total_temporadas
- logo_url, backdrop_url

**Não retorna mais:**
- ~~poster_url~~
- (Buscar do TMDB)

### Buscar Canais
```sql
SELECT * FROM get_canais_por_categoria('Esportes');
```

**Retorna:**
- id, nome, categoria, url_stream
- epg_id, epg_logo, epg_numero
- logo_url

**Não retorna mais:**
- ~~qualidade~~
- (Pode inferir da URL ou EPG)

---

## 📈 ESTATÍSTICAS

### View Atualizada
```sql
SELECT * FROM stats_iptv;
```

**Retorna:**
```
tipo   | total | total_categorias | ativos | media_visualizacoes
-------|-------|------------------|--------|--------------------
canal  | 1500  | 45               | 1450   | 125.5
filme  | 3200  | 28               | 3100   | 89.2
serie  | 8500  | 35               | 8200   | 156.8
```

---

## 🔧 MIGRAÇÃO

### Se Já Tem Dados na Tabela Antiga

```sql
-- Copiar dados de conteudos para iptv
INSERT INTO iptv (
  tipo, nome, nome_original, categoria, url_stream,
  is_hls, is_active, epg_id, epg_logo, epg_numero,
  temporada, episodio, nome_episodio,
  logo_url, backdrop_url, visualizacoes,
  created_at, updated_at, metadata
)
SELECT 
  tipo, nome, nome_original, categoria, url_stream,
  is_hls, is_active, epg_id, epg_logo, epg_numero,
  temporada, episodio, nome_episodio,
  logo_url, backdrop_url, visualizacoes,
  created_at, updated_at, metadata
FROM conteudos;

-- Dropar tabela antiga
DROP TABLE conteudos CASCADE;
```

---

## ✅ CHECKLIST

- [x] Tabela renomeada para `iptv`
- [x] Colunas TMDB removidas
- [x] Funções SQL atualizadas
- [x] Views atualizadas
- [x] Script de importação atualizado
- [x] Documentação atualizada
- [ ] Executar migration no Supabase
- [ ] Importar dados do M3U
- [ ] Integrar TMDB API no backend
- [ ] Atualizar frontend para buscar TMDB

---

## 🎯 PRÓXIMOS PASSOS

### 1. Executar Migration
```bash
# Supabase Dashboard → SQL Editor
# Executar: supabase/migrations/20250115_create_unified_content_table.sql
```

### 2. Importar M3U
```bash
cd backend
npm run import-m3u-unified -- --clean
```

### 3. Criar Endpoint TMDB
```typescript
// backend/src/routes/tmdb.routes.ts
router.get('/search', async (req, res) => {
  const { query, type } = req.query;
  const tmdbData = await fetchTMDB(query, type);
  res.json(tmdbData);
});
```

### 4. Integrar no Frontend
```typescript
// Buscar dados IPTV + TMDB
const filme = await getFilme(id);
const tmdb = await getTMDBData(filme.nome, 'movie');
const completo = { ...filme, ...tmdb };
```

---

## 📚 ARQUIVOS ATUALIZADOS

1. ✅ `supabase/migrations/20250115_create_unified_content_table.sql`
2. ✅ `backend/src/scripts/import-m3u-unified.ts`
3. ✅ `TABELA_IPTV_SIMPLIFICADA.md` (este arquivo)

---

## 🎉 RESULTADO FINAL

**Tabela IPTV:**
- ✅ Mais simples e leve
- ✅ Apenas dados essenciais do M3U
- ✅ Dados TMDB buscados em tempo real
- ✅ Sempre atualizados
- ✅ Mais flexível
- ✅ Melhor performance

**Pronto para usar!** 🚀

---

**Criado em:** 15/01/2025  
**Otimizado para:** TMDB API Integration
