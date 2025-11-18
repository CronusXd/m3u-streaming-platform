# 📋 RESUMO - Implementação Cache 30 Dias

## 🎯 Objetivo Final
Cachear TODOS os streams por 30 dias (atualmente só 1 dia)

---

## 📊 Situação Atual

### Sistemas de Cache Existentes

#### 1. ✅ `optimized-cache.ts` (PRINCIPAL)
- **Status:** EM USO
- **TTL Atual:**
  - Canais: 30 dias ✅
  - Filmes: 30 dias ✅
  - Séries: 30 dias ✅
  - **Streams: 1 dia ❌** (PRECISA MUDAR!)
- **Usado por:** `api.ts`, componentes

#### 2. ✅ `series-cache.ts` (SÉRIES)
- **Status:** EM USO
- **TTL:** 30 dias ✅
- **Usado por:** `api.ts`
- **Problema:** Não cacheia streams junto

#### 3. ⚠️ `cacheService.ts` + `CacheManager.js` (LEGADO)
- **Status:** EM USO (mas sistema antigo)
- **TTL:** 7 dias
- **Usado por:** Hooks, providers
- **Nota:** Sistema JavaScript antigo, mas ainda funcional

#### 4. ❌ `indexeddb-cache.ts` (DELETADO)
- **Status:** REMOVIDO ✅
- **Motivo:** Não estava sendo usado

---

## 🎯 Plano de Ação

### FASE 1: Atualizar TTL de Streams (5 min)
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`

```typescript
// Linha 24
const TTL = {
  CHANNELS: 30 * 24 * 60 * 60 * 1000,
  MOVIES: 30 * 24 * 60 * 60 * 1000,
  SERIES: 30 * 24 * 60 * 60 * 1000,
  STREAMS: 30 * 24 * 60 * 60 * 1000, // ⚡ MUDAR DE 1 DIA PARA 30 DIAS
};
```

**Impacto:** Streams ficam em cache por 30 dias

---

### FASE 2: Criar API de Série Completa (30 min)
**Arquivo:** `frontend/src/app/api/iptv/series/[name]/complete/route.ts` (NOVO)

**Funcionalidade:**
- Busca temporadas + episódios + streams em 1 chamada
- Retorna TUDO de uma vez

**Endpoint:**
```
GET /api/iptv/series/[name]/complete
```

**Response:**
```json
{
  "name": "1923",
  "seasons": [
    {
      "season": 1,
      "episodes": [
        {
          "id": "uuid",
          "name": "Episódio 1",
          "episode": 1,
          "stream_url": "http://...",
          "logo_url": "http://..."
        }
      ]
    }
  ]
}
```

---

### FASE 3: Adicionar Cache de Série Completa (30 min)
**Arquivo:** `frontend/src/lib/cache/series-cache.ts`

**Adicionar:**
```typescript
interface CompleteSeriesData {
  name: string;
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

async saveCompleteSeries(name: string, data: CompleteSeriesData): Promise<void>
async getCompleteSeries(name: string): Promise<CompleteSeriesData | null>
```

---

### FASE 4: Atualizar getSeriesEpisodes() (20 min)
**Arquivo:** `frontend/src/services/api.ts`

**Mudança:**
```typescript
// ANTES: Busca temporadas → episódios (2+ chamadas)
export async function getSeriesEpisodes(seriesName: string) {
  // Busca temporadas
  // Para cada temporada, busca episódios
  // Streams buscados sob demanda
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

### FASE 5: Atualizar SeriesEpisodesModal (15 min)
**Arquivo:** `frontend/src/components/series/SeriesEpisodesModal.tsx`

**Mudança:**
```typescript
// ANTES: Busca stream sob demanda
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

## 📊 Comparação

### Antes
```
Usuário abre série "1923"
├── Busca temporadas → API → Supabase (200ms)
├── Busca episódios T1 → API → Supabase (150ms)
├── Clica em episódio
└── Busca stream → API → Supabase (100ms)

Total: 3 chamadas HTTP, ~450ms
```

### Depois
```
Usuário abre série "1923"
├── Verifica cache → IndexedDB (5ms)
│   ├── HIT: Retorna TUDO (temporadas + episódios + streams)
│   └── MISS: Busca TUDO do servidor (1 chamada, 300ms)
├── Clica em episódio
└── Stream já disponível (0ms)

Total: 0-1 chamadas HTTP, 5-300ms
```

---

## 🎯 Benefícios

### Performance
- ⚡ **95% menos chamadas HTTP** (após primeira vez)
- ⚡ **Carregamento instantâneo** (5ms vs 450ms)
- ⚡ **Reprodução imediata** (0ms vs 100ms)

### Experiência do Usuário
- ✅ Modal abre instantaneamente
- ✅ Episódios carregam instantaneamente
- ✅ Reprodução sem delay
- ✅ Funciona offline (após cache)

### Servidor
- ✅ 95% menos carga
- ✅ Economia de custos
- ✅ Melhor escalabilidade

---

## ⏱️ Tempo de Implementação

### Essencial (Séries)
- FASE 1: 5 min
- FASE 2: 30 min
- FASE 3: 30 min
- FASE 4: 20 min
- FASE 5: 15 min
**Total: 1h 40min**

### Completo (Séries + Filmes + Canais)
- Essencial: 1h 40min
- Filmes: 55 min
- Canais: 40 min
**Total: 3h 15min**

---

## 🚀 Próximos Passos

1. ✅ **Aprovar plano**
2. ✅ **Executar FASE 1** (5min) - Atualizar TTL
3. ✅ **Executar FASE 2** (30min) - API completa
4. ✅ **Executar FASE 3** (30min) - Cache completo
5. ✅ **Executar FASE 4** (20min) - Atualizar api.ts
6. ✅ **Executar FASE 5** (15min) - Atualizar modal
7. ✅ **Testar** - Verificar funcionamento
8. ✅ **Expandir** - Aplicar para filmes e canais

---

## 📝 Arquivos Afetados

### Modificados
- ✅ `frontend/src/lib/cache/optimized-cache.ts` (TTL)
- ✅ `frontend/src/lib/cache/series-cache.ts` (cache completo)
- ✅ `frontend/src/services/api.ts` (busca completa)
- ✅ `frontend/src/components/series/SeriesEpisodesModal.tsx` (usar cache)

### Criados
- ✅ `frontend/src/app/api/iptv/series/[name]/complete/route.ts`

### Deletados
- ✅ `frontend/src/lib/cache/indexeddb-cache.ts` (já removido)

---

## ⚠️ Notas Importantes

### Sistema Legado
O `cacheService.ts` + `CacheManager.js` ainda está em uso por:
- `CacheProvider.tsx`
- `useSeries.ts`
- `useMovies.ts`
- `useCache.ts`
- `CacheDebug.tsx`

**Decisão:** Manter por enquanto, não interfere com novo sistema.

### Compatibilidade
- ✅ Novo sistema não quebra código existente
- ✅ Migração gradual possível
- ✅ Rollback fácil se necessário

---

## 🎯 Pronto para Começar?

Diga **"COMEÇAR"** e eu executo as 5 fases em sequência!

Ou prefere:
- [ ] Executar apenas FASE 1 primeiro?
- [ ] Ver código de alguma fase antes?
- [ ] Ajustar alguma coisa?

---

**Criado em:** 17/01/2025  
**Status:** ⏳ Aguardando aprovação  
**Tempo estimado:** 1h 40min (essencial)
