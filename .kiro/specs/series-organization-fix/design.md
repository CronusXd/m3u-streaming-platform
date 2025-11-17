# Design Document - Correção da Organização de Séries

## Overview

Este documento descreve o design técnico para corrigir os problemas de organização de séries no PlayCoreTV. O sistema atual apresenta três problemas críticos:

1. **Episódios individuais na lista principal**: Cada episódio aparece como um card separado, quando deveria mostrar apenas séries únicas
2. **Temporadas incompletas**: Ao abrir uma série, apenas a Temporada 2 é exibida, quando todas as temporadas deveriam estar disponíveis
3. **Ícone de favorito indesejado**: Um coração vermelho aparece na UI e precisa ser removido

A solução envolve:
- Melhorar o agrupamento de dados no backend (API)
- Corrigir a lógica de parsing de metadados (temporada/episódio)
- Aumentar performance com 10 threads paralelas
- Remover componentes de favorito da UI
- Garantir hierarquia completa: Série → Temporada → Episódio

## Architecture

### Fluxo de Dados Atual (Problemático)

```
M3U Parser → Supabase (iptv table) → API Route → Frontend
                                          ↓
                                    Cada episódio = 1 registro
                                          ↓
                                    UI mostra episódios individuais ❌
```

### Fluxo de Dados Corrigido

```
M3U Parser → Supabase (iptv table) → API Route (10 threads)
                                          ↓
                                    Agrupamento por série
                                          ↓
                                    Extração de temporadas
                                          ↓
                                    Frontend (hierarquia)
                                          ↓
                                    Série → Temporadas → Episódios ✅
```

### Camadas da Aplicação

1. **Data Layer** (Supabase)
   - Tabela `iptv` com registros individuais de episódios
   - Campos: `nome`, `temporada`, `episodio`, `categoria`, `logo_url`, etc.

2. **API Layer** (Next.js API Routes)
   - `/api/iptv/series` - Lista séries únicas (agrupadas)
   - `/api/iptv/series/[nome]/seasons` - Lista temporadas de uma série
   - `/api/iptv/series/[nome]/seasons/[num]/episodes` - Lista episódios de uma temporada

3. **Presentation Layer** (React Components)
   - `SeriesListView` - Grid de séries únicas
   - `SeasonsView` - Grid de temporadas
   - `EpisodesView` - Lista de episódios

## Components and Interfaces

### 1. Backend API - Parallel Query System

#### Interface: ParallelQueryConfig
```typescript
interface ParallelQueryConfig {
  numThreads: number;        // 10 threads
  batchSize: number;         // 1000 registros por batch
  totalRecords: number;      // Total de registros a buscar
}
```

#### Interface: SeriesGrouping
```typescript
interface SeriesGrouping {
  nome: string;
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  temporadas: Set<number>;   // Set para evitar duplicatas
  episodios: number;         // Contador total
  visualizacoes: number;
}
```

#### Algoritmo de Agrupamento
```typescript
// Pseudo-código
function groupEpisodesBySeries(episodes: Episode[]): Series[] {
  const seriesMap = new Map<string, SeriesGrouping>();
  
  for (const episode of episodes) {
    if (!seriesMap.has(episode.nome)) {
      seriesMap.set(episode.nome, {
        nome: episode.nome,
        categoria: episode.categoria,
        logo_url: episode.logo_url,
        backdrop_url: episode.backdrop_url,
        temporadas: new Set(),
        episodios: 0,
        visualizacoes: episode.visualizacoes || 0
      });
    }
    
    const serie = seriesMap.get(episode.nome);
    
    // Adicionar temporada (Set evita duplicatas)
    if (episode.temporada) {
      serie.temporadas.add(episode.temporada);
    }
    
    // Contar episódios
    serie.episodios++;
  }
  
  return Array.from(seriesMap.values()).map(s => ({
    ...s,
    totalTemporadas: s.temporadas.size,
    totalEpisodios: s.episodios
  }));
}
```

### 2. Parallel Query Implementation (10 Threads)

#### Estratégia de Paralelização
```typescript
async function fetchWithParallelThreads(config: ParallelQueryConfig) {
  const { numThreads, batchSize, totalRecords } = config;
  
  // Calcular batches
  const batches = Math.ceil(totalRecords / batchSize);
  const batchesPerThread = Math.ceil(batches / numThreads);
  
  // Função de thread
  const fetchThread = async (threadId: number) => {
    const results = [];
    const startBatch = threadId * batchesPerThread;
    const endBatch = Math.min(startBatch + batchesPerThread, batches);
    
    for (let i = startBatch; i < endBatch; i++) {
      const from = i * batchSize;
      const to = Math.min(from + batchSize - 1, totalRecords - 1);
      
      const { data } = await supabase
        .from('iptv')
        .select('*')
        .eq('tipo', 'serie')
        .range(from, to);
      
      results.push(...data);
    }
    
    return results;
  };
  
  // Executar threads em paralelo
  const threadPromises = Array.from({ length: numThreads }, (_, i) => 
    fetchThread(i)
  );
  
  const threadResults = await Promise.all(threadPromises);
  
  // Combinar resultados
  return threadResults.flat();
}
```

### 3. Season Extraction Logic

#### Interface: SeasonMetadata
```typescript
interface SeasonMetadata {
  temporada: number;
  totalEpisodios: number;
  episodios: Episode[];
}
```

#### Parsing de Temporada/Episódio
```typescript
function parseSeasonEpisode(nome: string): { season: number; episode: number } | null {
  // Padrão 1: S01E01, S02E05, etc.
  const pattern1 = /S(\d+)E(\d+)/i;
  const match1 = nome.match(pattern1);
  if (match1) {
    return {
      season: parseInt(match1[1], 10),
      episode: parseInt(match1[2], 10)
    };
  }
  
  // Padrão 2: Season 1 Episode 1
  const pattern2 = /Season\s+(\d+)\s+Episode\s+(\d+)/i;
  const match2 = nome.match(pattern2);
  if (match2) {
    return {
      season: parseInt(match2[1], 10),
      episode: parseInt(match2[2], 10)
    };
  }
  
  // Padrão 3: 1x01, 2x05, etc.
  const pattern3 = /(\d+)x(\d+)/i;
  const match3 = nome.match(pattern3);
  if (match3) {
    return {
      season: parseInt(match3[1], 10),
      episode: parseInt(match3[2], 10)
    };
  }
  
  return null;
}
```

### 4. Frontend Components

#### SeriesListView (Corrigido)
```typescript
interface SeriesListViewProps {
  categoryId?: string;
  onSeriesClick: (series: Series) => void;
}

// Responsabilidades:
// - Exibir APENAS séries únicas (não episódios)
// - Mostrar totalTemporadas e totalEpisodios
// - Lazy loading com Intersection Observer
// - Cache de 30 dias
```

#### SeasonsView (Corrigido)
```typescript
interface SeasonsViewProps {
  series: Series;
  onSeasonClick: (season: SeasonMetadata) => void;
  onBack: () => void;
}

// Responsabilidades:
// - Buscar TODAS as temporadas da série
// - Agrupar episódios por temporada
// - Ordenar temporadas numericamente
// - Exibir contagem de episódios por temporada
```

#### EpisodesView (Corrigido)
```typescript
interface EpisodesViewProps {
  series: Series;
  season: SeasonMetadata;
  onBack: () => void;
}

// Responsabilidades:
// - Exibir todos os episódios da temporada
// - Ordenar episódios numericamente
// - Permitir reprodução
// - Breadcrumb navigation
```

### 5. Remoção do Ícone de Favorito

#### Componentes Afetados
- `SeriesEpisodesModal.tsx` - Remover botão de coração
- `page.tsx` (series) - Remover estado de favorito
- Qualquer componente com `❤️` ou `favorite` no código

#### Código a Remover
```typescript
// ❌ REMOVER
const [isFavorite, setIsFavorite] = useState(false);

// ❌ REMOVER
<button onClick={() => setIsFavorite(!isFavorite)}>
  {isFavorite ? '❤️' : '🤍'}
</button>
```

## Data Models

### Database Schema (Existente)
```sql
-- Tabela iptv (já existe)
CREATE TABLE iptv (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,  -- 'serie', 'filme', 'canal'
  categoria TEXT,
  temporada INTEGER,   -- Número da temporada
  episodio INTEGER,    -- Número do episódio
  logo_url TEXT,
  backdrop_url TEXT,
  stream_url TEXT,
  visualizacoes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_iptv_tipo ON iptv(tipo);
CREATE INDEX idx_iptv_nome ON iptv(nome);
CREATE INDEX idx_iptv_categoria ON iptv(categoria);
CREATE INDEX idx_iptv_temporada ON iptv(temporada);
```

### API Response Models

#### GET /api/iptv/series
```typescript
interface SeriesListResponse {
  series: Series[];
  total: number;
  limit: number;
  offset: number;
}

interface Series {
  nome: string;
  tipo: 'serie';
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  visualizacoes: number;
  totalTemporadas: number;  // Calculado
  totalEpisodios: number;   // Calculado
  created_at: string;
  updated_at: string;
}
```

#### GET /api/iptv/series/[nome]/seasons
```typescript
interface SeasonsResponse {
  series: string;
  seasons: Season[];
  total: number;
}

interface Season {
  temporada: number;
  totalEpisodios: number;
  primeiroEpisodio: Episode;  // Para pegar logo/backdrop
}
```

#### GET /api/iptv/series/[nome]/seasons/[num]/episodes
```typescript
interface EpisodesResponse {
  series: string;
  temporada: number;
  episodes: Episode[];
  total: number;
}

interface Episode {
  id: number;
  nome: string;
  temporada: number;
  episodio: number;
  logo_url: string | null;
  backdrop_url: string | null;
  stream_url: string;
  visualizacoes: number;
}
```

## Error Handling

### Backend Error Handling
```typescript
try {
  // Query paralela
  const results = await fetchWithParallelThreads(config);
  
  // Agrupamento
  const series = groupEpisodesBySeries(results);
  
  return NextResponse.json({ series });
} catch (error) {
  console.error('❌ Erro ao buscar séries:', error);
  
  // Log detalhado para debugging
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
  
  return NextResponse.json(
    { 
      error: 'Erro ao buscar séries',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    },
    { status: 500 }
  );
}
```

### Frontend Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

try {
  const response = await fetch('/api/iptv/series');
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  setSeries(data.series);
} catch (err) {
  console.error('❌ Erro ao carregar séries:', err);
  setError('Não foi possível carregar as séries. Tente novamente.');
}

// UI de erro
{error && (
  <div className="rounded-lg bg-red-900/20 border border-red-500 p-4">
    <p className="text-red-400">{error}</p>
    <button onClick={retry} className="mt-2 text-red-300 underline">
      Tentar novamente
    </button>
  </div>
)}
```

### Casos Especiais

#### Série sem temporada definida
```typescript
if (!episode.temporada) {
  episode.temporada = 1;  // Default para Temporada 1
  console.warn(`⚠️ Episódio sem temporada: ${episode.nome}`);
}
```

#### Série sem número de episódio
```typescript
if (!episode.episodio) {
  // Atribuir número sequencial baseado na ordem
  episode.episodio = index + 1;
  console.warn(`⚠️ Episódio sem número: ${episode.nome}`);
}
```

#### Nome de série vazio
```typescript
if (!episode.nome || episode.nome.trim() === '') {
  episode.nome = 'Série Sem Nome';
  console.warn(`⚠️ Episódio sem nome: ID ${episode.id}`);
}
```

## Testing Strategy

### Unit Tests

#### 1. Teste de Agrupamento
```typescript
describe('groupEpisodesBySeries', () => {
  it('deve agrupar episódios pela série', () => {
    const episodes = [
      { nome: 'Breaking Bad', temporada: 1, episodio: 1 },
      { nome: 'Breaking Bad', temporada: 1, episodio: 2 },
      { nome: 'Breaking Bad', temporada: 2, episodio: 1 },
    ];
    
    const series = groupEpisodesBySeries(episodes);
    
    expect(series).toHaveLength(1);
    expect(series[0].nome).toBe('Breaking Bad');
    expect(series[0].totalTemporadas).toBe(2);
    expect(series[0].totalEpisodios).toBe(3);
  });
});
```

#### 2. Teste de Parsing
```typescript
describe('parseSeasonEpisode', () => {
  it('deve parsear formato S01E01', () => {
    const result = parseSeasonEpisode('Breaking Bad S01E01');
    expect(result).toEqual({ season: 1, episode: 1 });
  });
  
  it('deve parsear formato Season 1 Episode 1', () => {
    const result = parseSeasonEpisode('Breaking Bad Season 1 Episode 1');
    expect(result).toEqual({ season: 1, episode: 1 });
  });
  
  it('deve parsear formato 1x01', () => {
    const result = parseSeasonEpisode('Breaking Bad 1x01');
    expect(result).toEqual({ season: 1, episode: 1 });
  });
});
```

#### 3. Teste de Threads Paralelas
```typescript
describe('fetchWithParallelThreads', () => {
  it('deve buscar dados com 10 threads', async () => {
    const config = {
      numThreads: 10,
      batchSize: 1000,
      totalRecords: 10000
    };
    
    const results = await fetchWithParallelThreads(config);
    
    expect(results).toHaveLength(10000);
  });
});
```

### Integration Tests

#### 1. Teste de API Completa
```typescript
describe('GET /api/iptv/series', () => {
  it('deve retornar séries únicas agrupadas', async () => {
    const response = await fetch('/api/iptv/series');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.series).toBeInstanceOf(Array);
    expect(data.series[0]).toHaveProperty('totalTemporadas');
    expect(data.series[0]).toHaveProperty('totalEpisodios');
  });
});
```

#### 2. Teste de Navegação Hierárquica
```typescript
describe('Series Hierarchy Navigation', () => {
  it('deve navegar de série → temporadas → episódios', async () => {
    // 1. Buscar séries
    const seriesResponse = await fetch('/api/iptv/series');
    const { series } = await seriesResponse.json();
    const firstSeries = series[0];
    
    // 2. Buscar temporadas
    const seasonsResponse = await fetch(`/api/iptv/series/${firstSeries.nome}/seasons`);
    const { seasons } = await seasonsResponse.json();
    
    expect(seasons.length).toBeGreaterThan(0);
    
    // 3. Buscar episódios
    const episodesResponse = await fetch(
      `/api/iptv/series/${firstSeries.nome}/seasons/${seasons[0].temporada}/episodes`
    );
    const { episodes } = await episodesResponse.json();
    
    expect(episodes.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

- [ ] Lista de séries mostra apenas séries únicas (não episódios)
- [ ] Ao clicar em uma série, todas as temporadas são exibidas
- [ ] Ao clicar em uma temporada, todos os episódios são exibidos
- [ ] Breadcrumb navigation funciona corretamente
- [ ] Ícone de coração vermelho foi removido
- [ ] Performance: dados carregam em menos de 5 segundos
- [ ] Lazy loading funciona na lista de séries
- [ ] Cache funciona corretamente (30 dias)
- [ ] Filtro por categoria funciona
- [ ] Ordenação está correta (alfabética para séries, numérica para temporadas/episódios)

## Performance Considerations

### 1. Parallel Queries (10 Threads)
- **Antes**: 1 query sequencial (~30s para 10.000 registros)
- **Depois**: 10 queries paralelas (~3-5s para 10.000 registros)
- **Ganho**: 6-10x mais rápido

### 2. Agrupamento Eficiente
- Usar `Map` para O(1) lookup
- Usar `Set` para temporadas únicas (evita duplicatas)
- Processar uma vez no backend (não no frontend)

### 3. Cache Strategy
- **Metadados**: 30 dias (séries mudam pouco)
- **Stream URLs**: 1 dia (podem expirar)
- **IndexedDB**: Armazenamento local persistente

### 4. Lazy Loading
- Carregar 20 séries por vez
- Intersection Observer para scroll infinito
- Evitar renderizar todas as séries de uma vez

### 5. Otimizações de Query
```sql
-- Índices necessários
CREATE INDEX idx_iptv_tipo_nome ON iptv(tipo, nome);
CREATE INDEX idx_iptv_nome_temporada ON iptv(nome, temporada);

-- Query otimizada
SELECT nome, categoria, temporada, episodio, logo_url
FROM iptv
WHERE tipo = 'serie' AND is_active = true
ORDER BY nome, temporada, episodio;
```

## Implementation Notes

### Ordem de Implementação
1. ✅ Aumentar threads de 5 para 10 no backend
2. ✅ Corrigir agrupamento de séries (remover episódios individuais)
3. ✅ Implementar extração de todas as temporadas
4. ✅ Remover ícone de favorito
5. ✅ Testar navegação hierárquica completa
6. ✅ Validar performance e cache

### Arquivos a Modificar
- `frontend/src/app/api/iptv/series/route.ts` - Aumentar threads, melhorar agrupamento
- `frontend/src/app/dashboard/series/page.tsx` - Remover favorito
- `frontend/src/components/series/SeriesEpisodesModal.tsx` - Remover favorito, corrigir temporadas
- `frontend/src/components/series/SeasonsView.tsx` - Garantir todas as temporadas
- `frontend/src/components/series/EpisodesView.tsx` - Validar ordenação

### Breaking Changes
- Nenhum breaking change esperado
- API mantém compatibilidade
- Frontend apenas corrige bugs existentes

### Rollback Plan
- Manter código antigo comentado
- Usar feature flags se necessário
- Backup do banco antes de mudanças
