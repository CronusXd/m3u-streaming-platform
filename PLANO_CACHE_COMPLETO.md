# 🚀 Plano de Implementação - Cache Completo (30 dias)

## 🎯 Objetivo

Cachear **TODOS** os dados por 30 dias:
- ✅ Todas as séries (temporadas + episódios + streams)
- ✅ Todos os filmes (detalhes + streams)
- ✅ Todos os canais (detalhes + streams)
- ✅ Dados TMDB (posters, logos, metadados)

**Resultado:** Buscar do servidor apenas 1 vez, depois tudo vem do cache!

---

## 📋 Estrutura do Cache

### IndexedDB Schema

```typescript
// Database: playcoretv-cache
// Version: 2
// TTL: 30 dias (2.592.000.000 ms)

Stores:
1. series_metadata      // Lista de séries
2. series_seasons       // Temporadas por série
3. series_episodes      // Episódios por temporada
4. series_streams       // Streams de episódios
5. movies_metadata      // Lista de filmes
6. movies_streams       // Streams de filmes
7. channels_metadata    // Lista de canais
8. channels_streams     // Streams de canais
9. tmdb_data           // Dados TMDB (posters, etc)
10. cache_control      // Controle de expiração
```

---

## 🔄 Fases de Implementação

### **FASE 1: Criar Sistema de Cache Universal** ⏱️ 30min
**Arquivo:** `frontend/src/lib/cache/universal-cache.ts`

**Funcionalidades:**
- ✅ Gerenciador único de IndexedDB
- ✅ TTL de 30 dias configurável
- ✅ Métodos genéricos (get, set, delete, clear)
- ✅ Compressão de dados (opcional)
- ✅ Estatísticas de cache (hit/miss rate)

**Dependências:** Nenhuma

---

### **FASE 2: Migrar Cache de Séries** ⏱️ 45min
**Arquivos:**
- `frontend/src/lib/cache/series-cache-v2.ts` (novo)
- `frontend/src/services/api.ts` (atualizar)

**Mudanças:**
1. ✅ Cachear lista completa de séries
2. ✅ Cachear todas as temporadas de uma vez
3. ✅ Cachear todos os episódios de uma vez
4. ✅ Cachear todos os streams de episódios
5. ✅ TTL de 30 dias

**Estratégia:**
```typescript
// Primeira chamada: Busca TUDO do servidor
await cacheAllSeriesData(seriesName);

// Próximas chamadas: Busca TUDO do cache
const data = await getCachedSeriesData(seriesName);
```

**Dependências:** FASE 1

---

### **FASE 3: Migrar Cache de Filmes** ⏱️ 30min
**Arquivos:**
- `frontend/src/lib/cache/movies-cache-v2.ts` (novo)
- `frontend/src/services/api.ts` (atualizar)

**Mudanças:**
1. ✅ Cachear lista completa de filmes
2. ✅ Cachear detalhes + stream juntos
3. ✅ TTL de 30 dias

**Estratégia:**
```typescript
// Primeira chamada: Busca filme + stream
await cacheMovieWithStream(movieId);

// Próximas chamadas: Retorna tudo do cache
const movie = await getCachedMovie(movieId);
```

**Dependências:** FASE 1

---

### **FASE 4: Migrar Cache de Canais** ⏱️ 30min
**Arquivos:**
- `frontend/src/lib/cache/channels-cache-v2.ts` (novo)
- `frontend/src/services/api.ts` (atualizar)

**Mudanças:**
1. ✅ Cachear lista completa de canais
2. ✅ Cachear detalhes + stream juntos
3. ✅ TTL de 30 dias

**Estratégia:**
```typescript
// Primeira chamada: Busca canal + stream
await cacheChannelWithStream(channelId);

// Próximas chamadas: Retorna tudo do cache
const channel = await getCachedChannel(channelId);
```

**Dependências:** FASE 1

---

### **FASE 5: Cache de TMDB** ⏱️ 20min
**Arquivos:**
- `frontend/src/lib/cache/tmdb-cache.ts` (novo)
- `frontend/src/services/tmdb.ts` (atualizar)

**Mudanças:**
1. ✅ Cachear posters/logos
2. ✅ Cachear metadados (rating, plot, etc)
3. ✅ TTL de 30 dias

**Dependências:** FASE 1

---

### **FASE 6: Atualizar Componentes** ⏱️ 1h
**Arquivos:**
- `frontend/src/components/series/SeriesEpisodesModal.tsx`
- `frontend/src/components/movies/MovieDetailsModal.tsx`
- `frontend/src/app/dashboard/canais/page.tsx`
- `frontend/src/app/dashboard/series/page.tsx`
- `frontend/src/app/dashboard/filmes/page.tsx`

**Mudanças:**
1. ✅ Remover lógica de cache antiga
2. ✅ Usar novo sistema universal
3. ✅ Simplificar código

**Dependências:** FASE 2, 3, 4, 5

---

### **FASE 7: Pré-carregamento Inteligente** ⏱️ 30min
**Arquivo:** `frontend/src/lib/cache/preloader.ts` (novo)

**Funcionalidades:**
- ✅ Pré-carregar séries populares
- ✅ Pré-carregar próximo episódio
- ✅ Pré-carregar filmes relacionados
- ✅ Background loading (não bloqueia UI)

**Dependências:** FASE 6

---

### **FASE 8: Painel de Controle de Cache** ⏱️ 45min
**Arquivo:** `frontend/src/app/dashboard/cache/page.tsx` (novo)

**Funcionalidades:**
- ✅ Ver tamanho do cache
- ✅ Ver hit/miss rate
- ✅ Limpar cache seletivamente
- ✅ Forçar atualização
- ✅ Ver estatísticas por tipo

**Dependências:** FASE 1

---

## 📊 Estrutura de Dados

### Série Completa (Exemplo)
```typescript
interface CachedSeries {
  // Metadados
  name: string;
  tmdb_id?: number;
  poster_url?: string;
  
  // Temporadas
  seasons: {
    season: number;
    episodes: {
      id: string;
      name: string;
      episode: number;
      stream_url: string;  // ⚡ JÁ INCLUSO!
      logo_url?: string;
      plot?: string;
      duration?: string;
      rating?: number;
    }[];
  }[];
  
  // Controle
  cached_at: number;
  expires_at: number;
}
```

### Filme Completo (Exemplo)
```typescript
interface CachedMovie {
  // Metadados
  id: string;
  name: string;
  stream_url: string;  // ⚡ JÁ INCLUSO!
  logo_url?: string;
  plot?: string;
  duration?: string;
  rating?: number;
  
  // TMDB
  tmdb_id?: number;
  poster_url?: string;
  backdrop_url?: string;
  
  // Controle
  cached_at: number;
  expires_at: number;
}
```

---

## 🔄 Fluxo de Dados

### Antes (Atual)
```
1. Usuário abre série
2. Busca temporadas → API → Supabase
3. Busca episódios → API → Supabase
4. Clica em episódio
5. Busca stream → API → Supabase
6. Busca TMDB → API → TMDB

Total: 4-6 chamadas HTTP
```

### Depois (Novo)
```
1. Usuário abre série
2. Verifica cache → IndexedDB
   - Se HIT: Retorna TUDO (0 chamadas HTTP)
   - Se MISS: 
     a. Busca TUDO do servidor (1 chamada)
     b. Salva no cache (30 dias)
     c. Retorna dados

Total: 0-1 chamadas HTTP
```

---

## 🎯 APIs a Criar/Modificar

### Nova API: Buscar Série Completa
```typescript
// GET /api/iptv/series/[name]/complete
// Retorna: temporadas + episódios + streams + TMDB

Response: {
  name: string;
  seasons: [
    {
      season: 1,
      episodes: [
        {
          id: "...",
          name: "...",
          episode: 1,
          stream_url: "...",  // ⚡ Já incluso!
          logo_url: "...",
        }
      ]
    }
  ],
  tmdb: { ... }
}
```

### Nova API: Buscar Filme Completo
```typescript
// GET /api/iptv/filmes/[id]/complete
// Retorna: detalhes + stream + TMDB

Response: {
  id: "...",
  name: "...",
  stream_url: "...",  // ⚡ Já incluso!
  logo_url: "...",
  tmdb: { ... }
}
```

### Nova API: Buscar Canal Completo
```typescript
// GET /api/iptv/canais/[id]/complete
// Retorna: detalhes + stream

Response: {
  id: "...",
  name: "...",
  stream_url: "...",  // ⚡ Já incluso!
  logo_url: "...",
}
```

---

## ⚠️ Estratégia de Migração (Sem Conflitos)

### Passo 1: Criar em Paralelo
- ✅ Criar novos arquivos (`*-v2.ts`)
- ✅ Manter arquivos antigos funcionando
- ✅ Não modificar código existente ainda

### Passo 2: Testar Isoladamente
- ✅ Criar página de teste (`/dashboard/cache-test`)
- ✅ Testar novo sistema
- ✅ Validar performance

### Passo 3: Migração Gradual
- ✅ Migrar 1 componente por vez
- ✅ Testar cada migração
- ✅ Rollback fácil se necessário

### Passo 4: Limpeza
- ✅ Remover código antigo
- ✅ Remover arquivos não usados
- ✅ Atualizar documentação

---

## 📈 Benefícios Esperados

### Performance
- ⚡ **95% menos chamadas HTTP**
- ⚡ **Carregamento instantâneo** (após primeira vez)
- ⚡ **Offline-first** (funciona sem internet)

### Experiência do Usuário
- ✅ Navegação ultra-rápida
- ✅ Sem loading desnecessário
- ✅ Reprodução instantânea

### Servidor
- ✅ 95% menos carga
- ✅ Economia de custos
- ✅ Melhor escalabilidade

---

## 🔧 Configurações

### Cache TTL (Configurável)
```typescript
const CACHE_CONFIG = {
  series: 30 * 24 * 60 * 60 * 1000,    // 30 dias
  movies: 30 * 24 * 60 * 60 * 1000,    // 30 dias
  channels: 30 * 24 * 60 * 60 * 1000,  // 30 dias
  tmdb: 30 * 24 * 60 * 60 * 1000,      // 30 dias
  streams: 30 * 24 * 60 * 60 * 1000,   // 30 dias
};
```

### Tamanho Máximo do Cache
```typescript
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500 MB
```

### Estratégia de Limpeza
```typescript
// Se cache > 500MB:
1. Remover itens expirados
2. Remover itens menos acessados (LRU)
3. Manter pelo menos 100MB livre
```

---

## 📝 Checklist de Implementação

### FASE 1: Sistema Universal ✅
- [ ] Criar `universal-cache.ts`
- [ ] Implementar IndexedDB manager
- [ ] Implementar TTL de 30 dias
- [ ] Implementar estatísticas
- [ ] Testar isoladamente

### FASE 2: Séries ✅
- [ ] Criar `series-cache-v2.ts`
- [ ] Criar API `/series/[name]/complete`
- [ ] Atualizar `api.ts`
- [ ] Testar com 1 série
- [ ] Validar performance

### FASE 3: Filmes ✅
- [ ] Criar `movies-cache-v2.ts`
- [ ] Criar API `/filmes/[id]/complete`
- [ ] Atualizar `api.ts`
- [ ] Testar com 1 filme
- [ ] Validar performance

### FASE 4: Canais ✅
- [ ] Criar `channels-cache-v2.ts`
- [ ] Criar API `/canais/[id]/complete`
- [ ] Atualizar `api.ts`
- [ ] Testar com 1 canal
- [ ] Validar performance

### FASE 5: TMDB ✅
- [ ] Criar `tmdb-cache.ts`
- [ ] Atualizar `tmdb.ts`
- [ ] Testar com 1 item
- [ ] Validar performance

### FASE 6: Componentes ✅
- [ ] Atualizar `SeriesEpisodesModal.tsx`
- [ ] Atualizar `MovieDetailsModal.tsx`
- [ ] Atualizar páginas de dashboard
- [ ] Testar cada componente
- [ ] Validar UX

### FASE 7: Pré-carregamento ✅
- [ ] Criar `preloader.ts`
- [ ] Implementar background loading
- [ ] Testar não bloquear UI
- [ ] Validar performance

### FASE 8: Painel de Controle ✅
- [ ] Criar página `/dashboard/cache`
- [ ] Implementar estatísticas
- [ ] Implementar limpeza
- [ ] Testar funcionalidades
- [ ] Validar UX

---

## 🚀 Ordem de Execução

```
DIA 1 (3h):
├── FASE 1: Sistema Universal (30min)
├── FASE 2: Séries (45min)
├── FASE 3: Filmes (30min)
├── FASE 4: Canais (30min)
└── FASE 5: TMDB (20min)

DIA 2 (2h):
├── FASE 6: Componentes (1h)
├── FASE 7: Pré-carregamento (30min)
└── FASE 8: Painel de Controle (45min)

TOTAL: ~5 horas
```

---

## 🎯 Próximos Passos

1. ✅ **Aprovar este plano**
2. ✅ **Começar pela FASE 1** (sistema universal)
3. ✅ **Testar cada fase** antes de avançar
4. ✅ **Migrar gradualmente** (sem quebrar nada)
5. ✅ **Validar performance** em cada etapa

---

## 📞 Pronto para Começar?

Diga "SIM" e eu começo pela **FASE 1** agora mesmo! 🚀

Ou prefere que eu:
- [ ] Ajuste alguma coisa no plano?
- [ ] Explique alguma fase em detalhes?
- [ ] Comece por outra fase?

---

**Criado em:** 17/01/2025  
**Tempo estimado:** 5 horas  
**Impacto:** 🔥 REVOLUCIONÁRIO
