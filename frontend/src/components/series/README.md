# 📺 Hierarquia de Séries - Frontend

## 🎯 Estrutura de Navegação

A navegação de séries segue uma hierarquia de 3 níveis, similar ao Netflix:

```
📺 Séries → 📁 Temporadas → 🎬 Episódios
```

---

## 📋 Componentes

### 1. **SeriesHierarchyView** (Componente Principal)
**Arquivo:** `SeriesHierarchyView.tsx`

Gerencia a navegação entre os 3 níveis:
- Controla qual view está ativa
- Mantém estado da série e temporada selecionadas
- Mostra breadcrumb de navegação

**Props:**
```typescript
interface SeriesHierarchyViewProps {
  categoryId?: string; // Filtrar por categoria (opcional)
}
```

**Uso:**
```tsx
import SeriesHierarchyView from '@/components/series/SeriesHierarchyView';

<SeriesHierarchyView categoryId="drama" />
```

---

### 2. **SeriesListView** (Nível 1: Lista de Séries)
**Arquivo:** `SeriesListView.tsx`

Exibe grid de séries disponíveis:
- Grid responsivo (2-6 colunas)
- Busca por nome
- Poster/logo de cada série
- Contador de séries

**Props:**
```typescript
interface SeriesListViewProps {
  categoryId?: string;
  onSeriesClick: (series: any) => void;
}
```

**Features:**
- ✅ Busca em tempo real
- ✅ Grid responsivo
- ✅ Hover effects
- ✅ Loading state
- ✅ Empty state

---

### 3. **SeasonsView** (Nível 2: Temporadas)
**Arquivo:** `SeasonsView.tsx`

Exibe temporadas de uma série:
- Hero section com backdrop
- Informações TMDB (sinopse, avaliação, gêneros)
- Grid de temporadas
- Contador de episódios por temporada

**Props:**
```typescript
interface SeasonsViewProps {
  series: any;
  onSeasonClick: (season: any) => void;
  onBack: () => void;
}
```

**Features:**
- ✅ Integração TMDB
- ✅ Hero section com backdrop
- ✅ Metadados da série
- ✅ Contador de episódios
- ✅ Badges de temporada

---

### 4. **EpisodesView** (Nível 3: Episódios)
**Arquivo:** `EpisodesView.tsx`

Exibe episódios de uma temporada:
- Grid de episódios
- Thumbnails dos episódios (TMDB)
- Sinopse e avaliação por episódio
- Player integrado

**Props:**
```typescript
interface EpisodesViewProps {
  series: any;
  season: any;
  onBack: () => void;
}
```

**Features:**
- ✅ Thumbnails TMDB
- ✅ Sinopse por episódio
- ✅ Avaliação por episódio
- ✅ Duração
- ✅ Player integrado
- ✅ Hover effects

---

## 🎨 Fluxo de Navegação

### Exemplo Completo:

```
1. Usuário acessa /dashboard/series
   └─> SeriesHierarchyView renderiza SeriesListView

2. Usuário clica em "Breaking Bad"
   └─> SeriesHierarchyView renderiza SeasonsView
   └─> Breadcrumb: 📺 Séries / Breaking Bad

3. Usuário clica em "Temporada 1"
   └─> SeriesHierarchyView renderiza EpisodesView
   └─> Breadcrumb: 📺 Séries / Breaking Bad / Temporada 1

4. Usuário clica em "E01 - Pilot"
   └─> VideoPlayerModal abre
   └─> Episódio começa a reproduzir

5. Usuário fecha o player
   └─> Volta para EpisodesView

6. Usuário clica em "Voltar"
   └─> Volta para SeasonsView

7. Usuário clica em "📺 Séries" no breadcrumb
   └─> Volta para SeriesListView
```

---

## 🔧 Integração TMDB

Cada componente busca dados do TMDB automaticamente:

### SeriesListView
- Usa logos do banco de dados
- Fallback para TMDB se necessário

### SeasonsView
- Busca metadados da série (sinopse, avaliação, gêneros)
- Usa backdrop como hero image
- Mostra número de temporadas/episódios

### EpisodesView
- Busca detalhes de cada episódio
- Thumbnails dos episódios
- Sinopse e avaliação por episódio
- Duração

---

## 📱 Responsividade

### Grid Breakpoints:

**SeriesListView:**
```
Mobile:   2 colunas
Tablet:   3-4 colunas
Desktop:  5-6 colunas
```

**SeasonsView:**
```
Mobile:   2 colunas
Tablet:   3-4 colunas
Desktop:  5-6 colunas
```

**EpisodesView:**
```
Mobile:   1 coluna
Tablet:   2 colunas
Desktop:  3 colunas
```

---

## 🎯 Breadcrumb

O breadcrumb é exibido automaticamente quando não está na view de séries:

```tsx
// Nível 2 (Temporadas)
📺 Séries / Breaking Bad

// Nível 3 (Episódios)
📺 Séries / Breaking Bad / Temporada 1
```

**Features:**
- ✅ Sticky (fica fixo no topo)
- ✅ Backdrop blur
- ✅ Links clicáveis
- ✅ Separadores visuais

---

## 🎨 Estilos

### Cores (Tailwind):
```
- netflix-black: #141414
- netflix-darkGray: #181818
- netflix-mediumGray: #2F2F2F
- netflix-lightGray: #B3B3B3
- netflix-dimGray: #808080
- netflix-red: #E50914
- purple-600: #9333EA (accent)
```

### Efeitos:
- Hover: `scale-105`
- Transition: `transition-transform`
- Overlay: `bg-black/50`
- Backdrop blur: `backdrop-blur-sm`

---

## 🚀 Como Usar

### 1. Página Simples:
```tsx
// app/dashboard/series/page.tsx
import SeriesHierarchyView from '@/components/series/SeriesHierarchyView';

export default function SeriesPage() {
  return <SeriesHierarchyView />;
}
```

### 2. Com Filtro de Categoria:
```tsx
import SeriesHierarchyView from '@/components/series/SeriesHierarchyView';

export default function DramaSeriesPage() {
  return <SeriesHierarchyView categoryId="drama" />;
}
```

### 3. Componente Standalone:
```tsx
import SeriesListView from '@/components/series/SeriesListView';

<SeriesListView
  categoryId="action"
  onSeriesClick={(series) => {
    console.log('Série clicada:', series);
    // Navegar para página de temporadas
  }}
/>
```

---

## 📊 Queries Supabase

### Buscar Séries:
```typescript
const { data } = await supabase
  .from('iptv')
  .select('nome, categoria, logo_url, backdrop_url')
  .eq('tipo', 'serie')
  .eq('is_active', true)
  .order('nome');
```

### Buscar Temporadas:
```typescript
const { data } = await supabase
  .from('iptv')
  .select('temporada, logo_url, backdrop_url')
  .eq('tipo', 'serie')
  .eq('nome', seriesName)
  .not('temporada', 'is', null)
  .order('temporada');
```

### Buscar Episódios:
```typescript
const { data } = await supabase
  .from('iptv')
  .select('*')
  .eq('tipo', 'serie')
  .eq('nome', seriesName)
  .eq('temporada', seasonNumber)
  .not('episodio', 'is', null)
  .order('episodio');
```

---

## 🐛 Troubleshooting

### "Séries não aparecem"
**Causa:** Filtro de categoria muito restritivo  
**Solução:** Remover `categoryId` ou usar `'all'`

### "Temporadas vazias"
**Causa:** Dados não têm campo `temporada` preenchido  
**Solução:** Executar script de organização do backend

### "Episódios sem thumbnail"
**Causa:** TMDB não tem dados do episódio  
**Solução:** Usar logo_url como fallback (já implementado)

### "Player não abre"
**Causa:** `url_stream` vazio ou inválido  
**Solução:** Verificar dados no banco

---

## 🎉 Features Futuras

- [ ] Filtro por gênero
- [ ] Ordenação (A-Z, mais recentes, mais populares)
- [ ] Favoritos
- [ ] Histórico de visualização
- [ ] "Continuar assistindo"
- [ ] Busca global
- [ ] Recomendações
- [ ] Trailers inline

---

## 📝 Notas

- Todos os componentes são client-side (`'use client'`)
- Integração TMDB é automática
- Cache de 1 hora para dados TMDB
- Suporte a loading e empty states
- Responsivo mobile-first

---

**Criado em:** 16/01/2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para Uso
