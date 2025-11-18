# 🚀 PLANO - Sistema de Pré-carregamento (30 dias)

## 🎯 Objetivo

**Quando usuário loga:**
1. ✅ Baixar TODAS as séries (temporadas + episódios + streams)
2. ✅ Baixar TODOS os filmes (detalhes + streams)
3. ✅ Baixar TODOS os canais (detalhes + streams)
4. ✅ Salvar TUDO no cache por 30 dias
5. ✅ Usuário navega = TUDO vem do cache (instantâneo)

**Resultado:** Zero chamadas HTTP após login inicial!

---

## 📋 TAREFAS

### ✅ TAREFA 1: Atualizar TTL de Streams (2 min)
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`
**Linha:** 24

**Mudança:**
```typescript
const TTL = {
  CHANNELS: 30 * 24 * 60 * 60 * 1000,
  MOVIES: 30 * 24 * 60 * 60 * 1000,
  SERIES: 30 * 24 * 60 * 60 * 1000,
  STREAMS: 30 * 24 * 60 * 60 * 1000, // ⚡ MUDAR: 1 dia → 30 dias
};
```

---

### ✅ TAREFA 2: Criar API de Pré-carregamento de Séries (30 min)
**Arquivo:** `frontend/src/app/api/iptv/preload/series/route.ts` (NOVO)

**Funcionalidade:**
Retorna TODAS as séries com TUDO incluído:
- Lista de séries
- Temporadas de cada série
- Episódios de cada temporada
- **stream_url de cada episódio**

**Endpoint:**
```
GET /api/iptv/preload/series
```

**Response:**
```json
{
  "series": [
    {
      "name": "1923",
      "logo_url": "...",
      "seasons": [
        {
          "season": 1,
          "episodes": [
            {
              "id": "uuid",
              "name": "Episódio 1",
              "episode": 1,
              "stream_url": "http://...",  // ⚡ JÁ INCLUSO!
              "logo_url": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

**Implementação:**
```typescript
// Busca TODAS as séries
// Para cada série:
//   - Busca TODAS as temporadas
//   - Para cada temporada:
//     - Busca TODOS os episódios COM stream_url
// Retorna tudo de uma vez
```

---

### ✅ TAREFA 3: Criar API de Pré-carregamento de Filmes (15 min)
**Arquivo:** `frontend/src/app/api/iptv/preload/movies/route.ts` (NOVO)

**Funcionalidade:**
Retorna TODOS os filmes com stream_url incluído

**Endpoint:**
```
GET /api/iptv/preload/movies
```

**Response:**
```json
{
  "movies": [
    {
      "id": "uuid",
      "name": "Filme 1",
      "stream_url": "http://...",  // ⚡ JÁ INCLUSO!
      "logo_url": "..."
    }
  ]
}
```

---

### ✅ TAREFA 4: Criar API de Pré-carregamento de Canais (15 min)
**Arquivo:** `frontend/src/app/api/iptv/preload/channels/route.ts` (NOVO)

**Funcionalidade:**
Retorna TODOS os canais com stream_url incluído

**Endpoint:**
```
GET /api/iptv/preload/channels
```

**Response:**
```json
{
  "channels": [
    {
      "id": "uuid",
      "name": "Canal 1",
      "stream_url": "http://...",  // ⚡ JÁ INCLUSO!
      "logo_url": "..."
    }
  ]
}
```

---

### ✅ TAREFA 5: Adicionar Métodos de Pré-carregamento no Cache (30 min)
**Arquivo:** `frontend/src/lib/cache/optimized-cache.ts`

**Adicionar:**
```typescript
// ==================== PRÉ-CARREGAMENTO ====================

/**
 * Salva TODAS as séries com streams
 */
async saveAllSeriesWithStreams(data: any): Promise<void> {
  // Salva estrutura completa:
  // - Lista de séries
  // - Temporadas
  // - Episódios
  // - Streams
}

/**
 * Busca TODAS as séries do cache
 */
async getAllSeriesWithStreams(): Promise<any | null> {
  // Retorna estrutura completa se válida (30 dias)
}

/**
 * Salva TODOS os filmes com streams
 */
async saveAllMoviesWithStreams(data: any): Promise<void> {
  // Salva filmes com stream_url incluído
}

/**
 * Busca TODOS os filmes do cache
 */
async getAllMoviesWithStreams(): Promise<any | null> {
  // Retorna filmes com streams
}

/**
 * Salva TODOS os canais com streams
 */
async saveAllChannelsWithStreams(data: any): Promise<void> {
  // Salva canais com stream_url incluído
}

/**
 * Busca TODOS os canais do cache
 */
async getAllChannelsWithStreams(): Promise<any | null> {
  // Retorna canais com streams
}
```

---

### ✅ TAREFA 6: Criar Serviço de Pré-carregamento (30 min)
**Arquivo:** `frontend/src/services/preload.ts` (NOVO)

**Funcionalidade:**
```typescript
class PreloadService {
  /**
   * Pré-carrega TUDO quando usuário loga
   */
  async preloadAll(): Promise<void> {
    console.log('🚀 Iniciando pré-carregamento...');
    
    // 1. Verificar se já tem cache válido
    const hasCache = await this.checkCache();
    if (hasCache) {
      console.log('✅ Cache válido encontrado');
      return;
    }
    
    // 2. Baixar TUDO do servidor
    console.log('📥 Baixando TODOS os dados...');
    
    // Paralelo para ser mais rápido
    await Promise.all([
      this.preloadSeries(),
      this.preloadMovies(),
      this.preloadChannels(),
    ]);
    
    console.log('✅ Pré-carregamento completo!');
  }
  
  /**
   * Pré-carrega séries
   */
  private async preloadSeries(): Promise<void> {
    const response = await fetch('/api/iptv/preload/series');
    const data = await response.json();
    await optimizedCache.saveAllSeriesWithStreams(data);
    console.log('✅ Séries pré-carregadas');
  }
  
  /**
   * Pré-carrega filmes
   */
  private async preloadMovies(): Promise<void> {
    const response = await fetch('/api/iptv/preload/movies');
    const data = await response.json();
    await optimizedCache.saveAllMoviesWithStreams(data);
    console.log('✅ Filmes pré-carregados');
  }
  
  /**
   * Pré-carrega canais
   */
  private async preloadChannels(): Promise<void> {
    const response = await fetch('/api/iptv/preload/channels');
    const data = await response.json();
    await optimizedCache.saveAllChannelsWithStreams(data);
    console.log('✅ Canais pré-carregados');
  }
  
  /**
   * Verifica se tem cache válido
   */
  private async checkCache(): Promise<boolean> {
    const series = await optimizedCache.getAllSeriesWithStreams();
    const movies = await optimizedCache.getAllMoviesWithStreams();
    const channels = await optimizedCache.getAllChannelsWithStreams();
    
    return !!(series && movies && channels);
  }
  
  /**
   * Força atualização do cache
   */
  async forceRefresh(): Promise<void> {
    await optimizedCache.clearAll();
    await this.preloadAll();
  }
}

export const preloadService = new PreloadService();
```

---

### ✅ TAREFA 7: Integrar Pré-carregamento no Login (10 min)
**Arquivo:** `frontend/src/app/dashboard/layout.tsx` (ou onde faz login)

**Adicionar:**
```typescript
import { preloadService } from '@/services/preload';

// Após login bem-sucedido
useEffect(() => {
  if (user) {
    // Pré-carregar em background
    preloadService.preloadAll().catch(console.error);
  }
}, [user]);
```

---

### ✅ TAREFA 8: Atualizar api.ts para Usar Cache (20 min)
**Arquivo:** `frontend/src/services/api.ts`

**Mudança:**
```typescript
// ANTES: Busca do servidor
export async function getSeriesEpisodes(seriesName: string) {
  const response = await fetch(`/api/iptv/series/${seriesName}/seasons`);
  // ...
}

// DEPOIS: Busca do cache
export async function getSeriesEpisodes(seriesName: string) {
  // 1. Buscar TUDO do cache
  const allSeries = await optimizedCache.getAllSeriesWithStreams();
  
  if (!allSeries) {
    // Cache miss - forçar pré-carregamento
    await preloadService.preloadAll();
    return getSeriesEpisodes(seriesName); // Retry
  }
  
  // 2. Filtrar série específica
  const serie = allSeries.series.find(s => s.name === seriesName);
  
  if (!serie) {
    throw new Error('Série não encontrada');
  }
  
  // 3. Retornar dados (já com streams!)
  return serie.seasons;
}
```

**Aplicar mesma lógica para:**
- `getMovies()` → Busca do cache
- `getChannels()` → Busca do cache

---

### ✅ TAREFA 9: Atualizar Componentes (15 min)
**Arquivos:**
- `frontend/src/components/series/SeriesEpisodesModal.tsx`
- `frontend/src/components/movies/MovieDetailsModal.tsx`
- `frontend/src/app/dashboard/canais/page.tsx`

**Mudança:**
```typescript
// ANTES: Busca stream sob demanda
const handleEpisodeClick = async (episode) => {
  const streamUrl = await fetch(`/api/iptv/stream/${episode.id}`);
  // ...
}

// DEPOIS: Stream já está no episódio
const handleEpisodeClick = (episode) => {
  // episode.stream_url já está disponível!
  setSelectedEpisode({
    stream_url: episode.stream_url,  // ⚡ Instantâneo!
  });
}
```

---

### ✅ TAREFA 10: Adicionar Indicador de Progresso (20 min)
**Arquivo:** `frontend/src/components/common/PreloadProgress.tsx` (NOVO)

**Funcionalidade:**
```typescript
// Mostra progresso do pré-carregamento
// "Carregando séries... 50%"
// "Carregando filmes... 75%"
// "Pronto! ✅"
```

**Integrar em:**
- Dashboard (canto inferior direito)
- Ou modal de loading

---

## 📊 Fluxo Completo

### 1. Usuário Faz Login
```
1. Login bem-sucedido
2. Redireciona para dashboard
3. 🚀 Inicia pré-carregamento em background
   ├── Verifica cache (5ms)
   │   ├── Cache válido? → Usa cache ✅
   │   └── Cache inválido? → Baixa tudo ⬇️
   └── Baixa em paralelo:
       ├── Séries (todas + temporadas + episódios + streams)
       ├── Filmes (todos + streams)
       └── Canais (todos + streams)
4. Salva no IndexedDB (30 dias)
5. ✅ Pronto!
```

### 2. Usuário Navega
```
1. Abre página de séries
2. Busca do cache (5ms) ⚡
3. Mostra lista instantaneamente
4. Clica em série
5. Busca temporadas do cache (5ms) ⚡
6. Mostra episódios instantaneamente
7. Clica em episódio
8. Stream já está disponível (0ms) ⚡
9. Reproduz imediatamente
```

### 3. Próximo Login (dentro de 30 dias)
```
1. Login bem-sucedido
2. Verifica cache (5ms)
3. Cache válido! ✅
4. Usa cache (zero downloads)
5. Tudo instantâneo ⚡
```

---

## 🎯 Benefícios

### Performance
- ⚡ **Zero chamadas HTTP** após pré-carregamento
- ⚡ **5ms** para buscar qualquer dado
- ⚡ **Reprodução instantânea** (0ms)

### Experiência do Usuário
- ✅ Navegação ultra-rápida
- ✅ Sem loading desnecessário
- ✅ Funciona offline (após pré-carregamento)
- ✅ Transparente (usuário nem percebe)

### Servidor
- ✅ **99% menos carga** (só 1 chamada a cada 30 dias)
- ✅ Economia massiva de custos
- ✅ Escalabilidade infinita

---

## ⏱️ Tempo de Implementação

```
TAREFA 1: TTL Streams           →  2 min
TAREFA 2: API Séries            → 30 min
TAREFA 3: API Filmes            → 15 min
TAREFA 4: API Canais            → 15 min
TAREFA 5: Métodos Cache         → 30 min
TAREFA 6: Serviço Preload       → 30 min
TAREFA 7: Integrar Login        → 10 min
TAREFA 8: Atualizar api.ts      → 20 min
TAREFA 9: Atualizar Componentes → 15 min
TAREFA 10: Indicador Progresso  → 20 min
─────────────────────────────────────────
TOTAL:                            2h 47min
```

---

## 📝 Estrutura de Dados

### Cache de Séries
```typescript
{
  series: [
    {
      name: "1923",
      logo_url: "...",
      backdrop_url: "...",
      seasons: [
        {
          season: 1,
          episodes: [
            {
              id: "uuid",
              name: "Episódio 1",
              episode: 1,
              stream_url: "http://...",  // ⚡ INCLUSO!
              logo_url: "...",
              plot: "...",
              duration: "45m",
              rating: 8.5
            }
          ]
        }
      ]
    }
  ],
  timestamp: 1705500000000,
  expires_at: 1708092000000  // 30 dias depois
}
```

### Cache de Filmes
```typescript
{
  movies: [
    {
      id: "uuid",
      name: "Filme 1",
      stream_url: "http://...",  // ⚡ INCLUSO!
      logo_url: "...",
      backdrop_url: "...",
      plot: "...",
      duration: "120m",
      rating: 7.5
    }
  ],
  timestamp: 1705500000000,
  expires_at: 1708092000000
}
```

---

## 🚀 Ordem de Execução

### FASE 1: Fundação (1h 17min)
```
✅ TAREFA 1: TTL Streams (2min)
✅ TAREFA 2: API Séries (30min)
✅ TAREFA 3: API Filmes (15min)
✅ TAREFA 4: API Canais (15min)
✅ TAREFA 5: Métodos Cache (30min)
```

### FASE 2: Integração (1h)
```
✅ TAREFA 6: Serviço Preload (30min)
✅ TAREFA 7: Integrar Login (10min)
✅ TAREFA 8: Atualizar api.ts (20min)
```

### FASE 3: UI (35min)
```
✅ TAREFA 9: Atualizar Componentes (15min)
✅ TAREFA 10: Indicador Progresso (20min)
```

---

## 🎯 Checklist

### Preparação
- [ ] Backup do código atual
- [ ] Criar branch `feature/preload-cache`

### FASE 1
- [ ] TAREFA 1: Atualizar TTL
- [ ] TAREFA 2: API Séries
- [ ] TAREFA 3: API Filmes
- [ ] TAREFA 4: API Canais
- [ ] TAREFA 5: Métodos Cache
- [ ] Testar APIs isoladamente

### FASE 2
- [ ] TAREFA 6: Serviço Preload
- [ ] TAREFA 7: Integrar Login
- [ ] TAREFA 8: Atualizar api.ts
- [ ] Testar pré-carregamento

### FASE 3
- [ ] TAREFA 9: Atualizar Componentes
- [ ] TAREFA 10: Indicador Progresso
- [ ] Testar navegação completa

### Finalização
- [ ] Testar com cache vazio
- [ ] Testar com cache cheio
- [ ] Testar expiração (30 dias)
- [ ] Validar performance
- [ ] Merge para main

---

## 🚀 Pronto para Começar?

Diga **"COMEÇAR"** e eu executo as 10 tarefas em ordem!

Ou prefere:
- [ ] Ver código de alguma tarefa antes?
- [ ] Executar fase por fase?
- [ ] Ajustar alguma coisa?

---

**Criado em:** 17/01/2025  
**Tempo total:** 2h 47min  
**Impacto:** 🔥 REVOLUCIONÁRIO  
**Resultado:** Zero chamadas HTTP após login!
