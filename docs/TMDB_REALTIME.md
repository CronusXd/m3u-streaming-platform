# 🎬 Sistema TMDB em Tempo Real

## 📋 Visão Geral

O sistema busca metadados do TMDB (posters, sinopses, trailers, ratings) **em tempo real** quando o usuário acessa o site, sem precisar sincronizar tudo no banco de dados.

## ✨ Vantagens

### 1. **Sem Sincronização Prévia**
- ❌ Não precisa processar 165k registros
- ❌ Não precisa armazenar metadados no banco
- ✅ Dados sempre atualizados
- ✅ Economia de espaço no banco

### 2. **Performance Otimizada**
- 🚀 Cache em memória (1 hora)
- 🚀 Queue de requisições em lote
- 🚀 Delay de 100ms entre requisições
- 🚀 Carregamento progressivo

### 3. **Experiência do Usuário**
- 🎨 Loading spinner enquanto busca
- 🎨 Fallback para logo original
- 🎨 Ratings e metadados ricos
- 🎨 Posters em alta qualidade

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Usuário       │
│   Acessa Site   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FilmeCard /    │
│  SerieCard      │
│  (Componente)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useTMDBMetadata │
│    (Hook)       │
│  - Queue        │
│  - Batch        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  tmdbService    │
│  - Cache        │
│  - API Calls    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   TMDB API      │
│  (External)     │
└─────────────────┘
```

## 📁 Arquivos Criados

### 1. `frontend/src/services/tmdbService.ts`
Serviço principal que faz as requisições para a API do TMDB.

**Funções:**
- `searchMovie(query, year)` - Busca filme
- `searchSeries(query, year)` - Busca série
- `getIPTVMetadata(nome, tipo)` - Busca metadados completos
- `getTMDBImageUrl(path, size)` - Gera URL de imagem
- `clearCache()` - Limpa cache

**Cache:**
- Armazena resultados em memória
- Duração: 1 hora
- Evita requisições duplicadas

### 2. `frontend/src/hooks/useTMDBMetadata.ts`
Hook React que gerencia o carregamento de metadados.

**Recursos:**
- Queue de requisições
- Processamento em lote
- Delay de 100ms entre requisições
- Estado de loading/error

### 3. `frontend/src/components/iptv/FilmeCard.tsx`
Componente de card de filme com TMDB integrado.

**Features:**
- Loading spinner
- Poster do TMDB
- Rating com estrela
- Sinopse
- Ano de lançamento
- Overlay com ações

### 4. `frontend/src/components/iptv/SerieCard.tsx`
Componente de card de série com TMDB integrado.

**Features:**
- Badge "SÉRIE"
- Número de temporadas
- Metadados específicos de séries
- Cor roxa para diferenciar

## 🚀 Como Usar

### 1. Configurar API Key

Adicione no `.env`:
```env
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_aqui
```

### 2. Usar nos Componentes

```tsx
import { FilmeCard } from '@/components/iptv/FilmeCard';

<FilmeCard
  filme={{
    id: '123',
    nome: 'Avatar (2009)',
    tipo: 'filme',
    categoria: 'Ação',
    logo_url: null,
    visualizacoes: 1000
  }}
  onClick={() => console.log('Clicou')}
/>
```

### 3. Usar o Hook Diretamente

```tsx
import { useTMDBMetadata } from '@/hooks/useTMDBMetadata';

function MeuComponente() {
  const { metadata, loading, error } = useTMDBMetadata('Avatar', 'filme');

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro</div>;

  return (
    <div>
      <h1>{metadata.title}</h1>
      <img src={metadata.posterUrl} />
      <p>{metadata.overview}</p>
    </div>
  );
}
```

## ⚡ Performance

### Cache em Memória
```typescript
// Primeira requisição: busca na API
const data1 = await getIPTVMetadata('Avatar', 'filme'); // ~500ms

// Segunda requisição: retorna do cache
const data2 = await getIPTVMetadata('Avatar', 'filme'); // ~1ms
```

### Queue de Requisições
```typescript
// 100 cards carregando ao mesmo tempo
// Sem queue: 100 requisições simultâneas ❌
// Com queue: 1 requisição a cada 100ms ✅
```

## 🎨 Metadados Disponíveis

### Filmes
- ✅ Título (PT-BR e original)
- ✅ Sinopse
- ✅ Poster (500px)
- ✅ Backdrop (original)
- ✅ Data de lançamento
- ✅ Duração
- ✅ Gêneros
- ✅ Rating (0-10)
- ✅ Número de votos
- ✅ Diretor
- ✅ Elenco (top 5)
- ✅ Trailer (YouTube key)

### Séries
- ✅ Título (PT-BR e original)
- ✅ Sinopse
- ✅ Poster (500px)
- ✅ Backdrop (original)
- ✅ Data de estreia
- ✅ Gêneros
- ✅ Rating (0-10)
- ✅ Número de votos
- ✅ Número de temporadas
- ✅ Número de episódios
- ✅ Criadores
- ✅ Trailer (YouTube key)

## 🔧 Configurações

### Tamanhos de Imagem
```typescript
// Poster
getTMDBImageUrl(path, 'w185')  // 185px (thumbnail)
getTMDBImageUrl(path, 'w500')  // 500px (padrão)
getTMDBImageUrl(path, 'original') // Original

// Backdrop
getTMDBImageUrl(path, 'original') // Full HD
```

### Cache
```typescript
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

// Limpar cache manualmente
import { clearCache } from '@/services/tmdbService';
clearCache();
```

### Queue
```typescript
const BATCH_DELAY = 100; // ms entre requisições

// Ajustar delay
// Menor = mais rápido, mais carga na API
// Maior = mais lento, menos carga na API
```

## 📊 Comparação: Sync vs Real-Time

### Sincronização no Banco
```
❌ Processar 165k registros
❌ ~10 horas de processamento
❌ Dados podem ficar desatualizados
❌ Ocupa espaço no banco
✅ Carregamento instantâneo no site
```

### Tempo Real
```
✅ Sem processamento prévio
✅ Dados sempre atualizados
✅ Economia de espaço
✅ Cache inteligente
⚠️ Loading inicial (1-2s por card)
```

## 🎯 Próximos Passos

### 1. **Otimizações**
- [ ] Implementar Service Worker para cache offline
- [ ] Pré-carregar metadados dos primeiros 20 itens
- [ ] Lazy loading de imagens
- [ ] Intersection Observer para carregar só o visível

### 2. **Features**
- [ ] Modal com detalhes completos
- [ ] Integração com player de trailer
- [ ] Recomendações baseadas em TMDB
- [ ] Filtros por gênero/ano/rating

### 3. **Backend (Opcional)**
- [ ] API proxy para TMDB (evitar expor API key)
- [ ] Cache no Redis (compartilhado entre usuários)
- [ ] Rate limiting inteligente

## 🐛 Troubleshooting

### Imagens não carregam
```tsx
// Adicionar unoptimized no Image
<Image src={url} unoptimized />

// Ou configurar next.config.js
images: {
  domains: ['image.tmdb.org']
}
```

### Rate limit da API
```typescript
// Aumentar delay entre requisições
const BATCH_DELAY = 200; // 200ms
```

### Cache não funciona
```typescript
// Verificar se a chave está correta
const cacheKey = `movie:${query}:${year || 'no-year'}`;
console.log('Cache key:', cacheKey);
```

## 📝 Notas

- A API do TMDB tem limite de 40 requisições por 10 segundos
- O cache em memória é resetado quando o servidor reinicia
- Para produção, considere usar Redis ou similar
- Imagens do TMDB são servidas via CDN (rápido)

---

**Criado em:** 15/01/2025  
**Mantido por:** Equipe PlayCoreTV
