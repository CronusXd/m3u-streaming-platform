# 📋 TAREFAS - Cache Completo 30 Dias

## 🎯 Objetivo
Cachear TODOS os streams por 30 dias (atualmente só 1 dia)

---

## ✅ TAREFA 1: Atualizar TTL de Streams para 30 dias
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`
**Tempo:** 5 min
**Prioridade:** 🔴 ALTA

### Mudança:
```typescript
// ANTES:
const TTL = {
  STREAMS: 24 * 60 * 60 * 1000, // 1 dia
};

// DEPOIS:
const TTL = {
  STREAMS: 30 * 24 * 60 * 60 * 1000, // 30 dias
};
```

### Impacto:
- ✅ Streams ficam em cache por 30 dias
- ✅ 95% menos chamadas ao servidor
- ✅ Reprodução instantânea

---

## ✅ TAREFA 2: Criar API para Buscar Série Completa
**Arquivo:** `frontend/src/app/api/iptv/series/[name]/complete/route.ts` (NOVO)
**Tempo:** 30 min
**Prioridade:** 🔴 ALTA

### Funcionalidade:
Retorna TUDO de uma série em 1 chamada:
- Temporadas
- Episódios
- Streams (url_stream)
- Dados TMDB

### Endpoint:
```
GET /api/iptv/series/[name]/complete
```

### Response:
```typescript
{
  name: string;
  tmdb: { ... };
  seasons: [
    {
      season: 1,
      episodes: [
        {
          id: "...",
          name: "...",
          episode: 1,
          stream_url: "...",  // ⚡ JÁ INCLUSO!
          logo_url: "...",
        }
      ]
    }
  ]
}
```

---

## ✅ TAREFA 3: Criar API para Buscar Filme Completo
**Arquivo:** `frontend/src/app/api/iptv/filmes/[id]/complete/route.ts` (NOVO)
**Tempo:** 20 min
**Prioridade:** 🟠 MÉDIA

### Funcionalidade:
Retorna filme + stream em 1 chamada

### Endpoint:
```
GET /api/iptv/filmes/[id]/complete
```

### Response:
```typescript
{
  id: string;
  name: string;
  stream_url: string;  // ⚡ JÁ INCLUSO!
  logo_url: string;
  tmdb: { ... };
}
```

---

## ✅ TAREFA 4: Criar API para Buscar Canal Completo
**Arquivo:** `frontend/src/app/api/iptv/canais/[id]/complete/route.ts` (NOVO)
**Tempo:** 15 min
**Prioridade:** 🟠 MÉDIA

### Funcionalidade:
Retorna canal + stream em 1 chamada

### Endpoint:
```
GET /api/iptv/canais/[id]/complete
```

### Response:
```typescript
{
  id: string;
  name: string;
  stream_url: string;  // ⚡ JÁ INCLUSO!
  logo_url: string;
}
```

---

## ✅ TAREFA 5: Adicionar Cache de Série Completa
**Arquivo:** `frontend/src/lib/cache/series-cache.ts`
**Tempo:** 30 min
**Prioridade:** 🔴 ALTA

### Adicionar:
```typescript
// Nova interface
interface CompleteSeriesData {
  name: string;
  tmdb: any;
  seasons: {
    season: number;
    episodes: {
      id: string;
      name: string;
      episode: number;
      stream_url: string;  // ⚡ INCLUSO!
      logo_url?: string;
    }[];
  }[];
  timestamp: number;
}

// Novos métodos
async saveCompleteSeries(name: string, data: CompleteSeriesData): Promise<void>
async getCompleteSeries(name: string): Promise<CompleteSeriesData | null>
```

---

## ✅ TAREFA 6: Atualizar getSeriesEpisodes() em api.ts
**Arquivo:** `frontend/src/services/api.ts`
**Tempo:** 20 min
**Prioridade:** 🔴 ALTA

### Mudança:
```typescript
// ANTES: Busca temporadas → episódios (2+ chamadas)
export async function getSeriesEpisodes(seriesName: string) {
  // 1. Busca temporadas
  // 2. Para cada temporada, busca episódios
  // 3. Streams buscados sob demanda
}

// DEPOIS: Busca tudo de uma vez (1 chamada)
export async function getSeriesEpisodes(seriesName: string) {
  // 1. Verifica cache completo
  const cached = await seriesCache.getCompleteSeries(seriesName);
  if (cached) return cached;
  
  // 2. Cache miss - busca TUDO do servidor
  const response = await fetch(`/api/iptv/series/${name}/complete`);
  const data = await response.json();
  
  // 3. Salva no cache (30 dias)
  await seriesCache.saveCompleteSeries(seriesName, data);
  
  return data;
}
```

---

## ✅ TAREFA 7: Atualizar SeriesEpisodesModal
**Arquivo:** `frontend/src/components/series/SeriesEpisodesModal.tsx`
**Tempo:** 15 min
**Prioridade:** 🟠 MÉDIA

### Mudança:
```typescript
// ANTES: Busca streams sob demanda
const handleEpisodeClick = async (episode) => {
  const streamUrl = await fetch(`/api/iptv/stream/${episode.id}`);
  // ...
}

// DEPOIS: Stream já vem no episódio
const handleEpisodeClick = (episode) => {
  // episode.stream_url já está disponível!
  setSelectedEpisode({
    stream_url: episode.stream_url,  // ⚡ Instantâneo!
  });
}
```

---

## ✅ TAREFA 8: Adicionar Cache de Filmes Completos
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`
**Tempo:** 20 min
**Prioridade:** 🟠 MÉDIA

### Adicionar:
```typescript
// Nova interface
interface CompleteMovieData {
  id: string;
  name: string;
  stream_url: string;  // ⚡ INCLUSO!
  logo_url?: string;
  tmdb: any;
  timestamp: number;
}

// Novos métodos
async saveCompleteMovie(id: string, data: CompleteMovieData): Promise<void>
async getCompleteMovie(id: string): Promise<CompleteMovieData | null>
```

---

## ✅ TAREFA 9: Adicionar Cache de Canais Completos
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`
**Tempo:** 15 min
**Prioridade:** 🟡 BAIXA

### Adicionar:
```typescript
// Nova interface
interface CompleteChannelData {
  id: string;
  name: string;
  stream_url: string;  // ⚡ INCLUSO!
  logo_url?: string;
  timestamp: number;
}

// Novos métodos
async saveCompleteChannel(id: string, data: CompleteChannelData): Promise<void>
async getCompleteChannel(id: string): Promise<CompleteChannelData | null>
```

---

## ✅ TAREFA 10: Atualizar Componentes de Filmes
**Arquivo:** `frontend/src/components/movies/MovieDetailsModal.tsx`
**Tempo:** 15 min
**Prioridade:** 🟠 MÉDIA

### Mudança:
Usar stream_url que já vem no filme (não buscar separadamente)

---

## ✅ TAREFA 11: Atualizar Componentes de Canais
**Arquivo:** `frontend/src/app/dashboard/canais/page.tsx`
**Tempo:** 10 min
**Prioridade:** 🟡 BAIXA

### Mudança:
Usar stream_url que já vem no canal (não buscar separadamente)

---

## ✅ TAREFA 12: Criar Painel de Estatísticas
**Arquivo:** `frontend/src/app/dashboard/cache/page.tsx` (NOVO)
**Tempo:** 30 min
**Prioridade:** 🟡 BAIXA (OPCIONAL)

### Funcionalidades:
- Ver tamanho do cache
- Ver hit/miss rate
- Limpar cache
- Forçar atualização

---

## 📊 Ordem de Execução

### FASE 1: Fundação (1h)
```
✅ TAREFA 1: Atualizar TTL de Streams (5min)
✅ TAREFA 2: API Série Completa (30min)
✅ TAREFA 5: Cache Série Completa (30min)
```

### FASE 2: Integração Séries (35min)
```
✅ TAREFA 6: Atualizar getSeriesEpisodes() (20min)
✅ TAREFA 7: Atualizar SeriesEpisodesModal (15min)
```

### FASE 3: Filmes (55min)
```
✅ TAREFA 3: API Filme Completo (20min)
✅ TAREFA 8: Cache Filme Completo (20min)
✅ TAREFA 10: Atualizar Componentes Filmes (15min)
```

### FASE 4: Canais (40min)
```
✅ TAREFA 4: API Canal Completo (15min)
✅ TAREFA 9: Cache Canal Completo (15min)
✅ TAREFA 11: Atualizar Componentes Canais (10min)
```

### FASE 5: Painel (30min) - OPCIONAL
```
✅ TAREFA 12: Painel de Estatísticas (30min)
```

---

## 🎯 Resumo

### Tempo Total
- **Essencial:** 2h 30min (FASE 1-4)
- **Completo:** 3h (FASE 1-5)

### Impacto
- ⚡ **95% menos chamadas HTTP**
- ⚡ **Carregamento instantâneo**
- ⚡ **Reprodução imediata**

### Arquivos Afetados
- ✅ 2 arquivos de cache (melhorados)
- ✅ 3 APIs novas (complete)
- ✅ 1 serviço atualizado (api.ts)
- ✅ 3 componentes atualizados
- ✅ 1 arquivo deletado (indexeddb-cache.ts)

---

## 🚀 Pronto para Começar?

Diga **"COMEÇAR"** e eu executo na ordem:

1. ✅ TAREFA 1 (5min)
2. ✅ TAREFA 2 (30min)
3. ✅ TAREFA 5 (30min)
4. ✅ TAREFA 6 (20min)
5. ✅ TAREFA 7 (15min)
... e assim por diante!

Ou prefere que eu:
- [ ] Execute apenas FASE 1 primeiro?
- [ ] Pule alguma tarefa?
- [ ] Ajuste alguma coisa?

---

**Criado em:** 17/01/2025  
**Status:** ⏳ Aguardando aprovação
