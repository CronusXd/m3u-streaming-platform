# 📁 Estrutura do Projeto PlayCoreTV

## 🎯 Visão Geral

Sistema IPTV completo com integração TMDB para informações ricas de filmes e séries.

## 📂 Estrutura de Arquivos

```
PlayCoreTV/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── movies/
│   │   │   │   │   └── page.tsx          # 🎬 Página de Filmes
│   │   │   │   ├── series/
│   │   │   │   │   └── page.tsx          # 📺 Página de Séries
│   │   │   │   └── channels/
│   │   │   │       └── page.tsx          # 📡 Página de Canais (TV ao vivo)
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── movies/
│   │   │   │   └── MovieDetailsModal.tsx # 🎬 Modal de detalhes do filme
│   │   │   ├── series/
│   │   │   │   └── SeriesEpisodesModal.tsx # 📺 Modal de episódios da série
│   │   │   ├── layouts/
│   │   │   │   └── SidebarLayout.tsx     # 📋 Layout com sidebar
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── api.ts                    # 🔌 API do backend
│   │   │   └── tmdb.ts                   # 🎥 Integração TMDB
│   │   └── ...
│   ├── .env.local                        # 🔐 Variáveis de ambiente (criar)
│   └── .env.example                      # 📝 Template de variáveis
├── backend/
│   └── src/
│       └── scripts/
│           ├── reorganize-all-categories.ts  # 🔄 Reorganizar categorias
│           └── mark-movies-parallel.ts       # 🎬 Marcar filmes
├── TMDB_SETUP.md                         # 📖 Guia de configuração TMDB
├── TESTE_RAPIDO.md                       # ✅ Guia de testes
└── ESTRUTURA_PROJETO.md                  # 📁 Este arquivo
```

## 🎬 Componentes Principais

### 1. Páginas

#### `/dashboard/movies` - Página de Filmes
- Grid de filmes com posters
- Sidebar com categorias
- Filtros: Todos, Favoritos, Histórico, Recentes
- Integração com TMDB para informações

#### `/dashboard/series` - Página de Séries
- Grid de séries agrupadas
- Sidebar com categorias
- Filtros: Todos, Favoritos, Histórico, Recentes
- Integração com TMDB para informações

#### `/dashboard/channels` - Página de Canais
- Lista de canais de TV ao vivo
- Categorias de canais
- Player integrado

### 2. Modais

#### `MovieDetailsModal` - Detalhes do Filme
**Funcionalidades:**
- Poster de alta qualidade (TMDB)
- Backdrop com gradiente
- Informações completas:
  - Título e ano
  - Diretor
  - Data de lançamento
  - Duração
  - Gênero
  - Elenco principal
  - Sinopse
  - Avaliação (estrelas)
- Botões:
  - Play (assistir filme)
  - Trailer (YouTube)
  - Favorito (coração)

#### `SeriesEpisodesModal` - Detalhes da Série
**Funcionalidades:**
- Poster de alta qualidade (TMDB)
- Informações completas:
  - Título
  - Criadores
  - Data de estreia
  - Gênero
  - Número de temporadas/episódios
  - Sinopse
  - Avaliação (estrelas)
- Seletor de temporada
- Grid de episódios com:
  - Thumbnail (TMDB)
  - Nome do episódio
  - Número (S01E01)
  - Duração
  - Avaliação
  - Descrição
- Botões:
  - Retomar (último episódio)
  - Trailer (YouTube)
  - Favorito (coração)

### 3. Layouts

#### `SidebarLayout` - Layout Principal
**Componentes:**
- Logo do projeto
- Busca de categorias
- Links rápidos:
  - TODOS OS CANAIS
  - FAVORITOS
  - HISTÓRICO ⭐ (novo)
  - ADICIONADO RECENTEMENTE
- Lista de categorias
- Botão de logout

## 🔌 Serviços

### API Service (`services/api.ts`)
**Funções principais:**
- `getChannels()` - Buscar canais/filmes
- `getSeriesGrouped()` - Buscar séries agrupadas
- `getSeriesEpisodes()` - Buscar episódios de uma série
- `getCategoriesWithCounts()` - Buscar categorias com contadores
- `searchGlobal()` - Busca global

### TMDB Service (`services/tmdb.ts`)
**Funções principais:**
- `searchMovie()` - Buscar filme por nome
- `getMovieDetails()` - Detalhes completos do filme
- `searchSeries()` - Buscar série por nome
- `getSeriesDetails()` - Detalhes completos da série
- `getSeasonDetails()` - Detalhes de uma temporada
- `getTMDBImageUrl()` - Construir URL de imagem
- `formatRuntime()` - Formatar duração
- `formatRating()` - Converter avaliação para estrelas
- `extractYear()` - Extrair ano do nome

## 🎨 Tema e Estilos

### Cores (Tailwind)
```javascript
netflix-black: '#141414'      // Fundo principal
netflix-darkGray: '#181818'   // Cards e modais
netflix-mediumGray: '#2F2F2F' // Elementos secundários
netflix-dimGray: '#808080'    // Texto secundário
netflix-lightGray: '#B3B3B3'  // Texto terciário
netflix-red: '#E50914'        // Cor de destaque
```

### Componentes Reutilizáveis
- Botões com hover effects
- Cards com overlay
- Grids responsivos
- Modais em tela cheia
- Spinners de loading
- Badges e tags

## 🔄 Fluxo de Dados

### Filmes
```
1. Usuário acessa /dashboard/movies
2. Carrega lista de filmes do backend
3. Usuário clica em um filme
4. Abre MovieDetailsModal
5. Busca informações no TMDB
6. Exibe dados enriquecidos
7. Usuário clica em Play
8. Abre VideoPlayerModal
```

### Séries
```
1. Usuário acessa /dashboard/series
2. Carrega lista de séries agrupadas do backend
3. Usuário clica em uma série
4. Abre SeriesEpisodesModal
5. Busca informações da série no TMDB
6. Busca episódios da temporada no TMDB
7. Exibe dados enriquecidos com thumbnails
8. Usuário clica em um episódio
9. Abre VideoPlayerModal
```

## 📊 Banco de Dados

### Tabelas Principais
- `channels` - Todos os conteúdos (filmes, séries, canais)
- `categories` - Categorias de conteúdo
- `favorites` - Favoritos do usuário (a implementar)
- `watch_history` - Histórico de visualização (a implementar)

### Campos Importantes
```sql
channels:
  - id
  - name
  - stream_url
  - logo_url
  - category_id
  - content_type (movie/series/live)
  - is_movie (boolean)
  - series_name
  - season_number
  - episode_number
```

## 🚀 Funcionalidades Implementadas

### ✅ Concluído
- [x] Página de filmes com grid
- [x] Página de séries com agrupamento
- [x] Modal de filme em tela cheia
- [x] Modal de série com episódios
- [x] Integração TMDB para filmes
- [x] Integração TMDB para séries
- [x] Thumbnails de episódios
- [x] Trailers do YouTube
- [x] Sidebar com HISTÓRICO
- [x] Filtros por categoria
- [x] Player de vídeo integrado
- [x] Design responsivo

### 🔄 Em Desenvolvimento
- [ ] Sistema de favoritos separado (filmes/séries/canais)
- [ ] Histórico de visualização
- [ ] Progresso de visualização
- [ ] Busca global com TMDB
- [ ] Recomendações personalizadas

### 📋 Planejado
- [ ] Listas personalizadas
- [ ] Notificações de novos episódios
- [ ] Download de conteúdo
- [ ] Legendas
- [ ] Múltiplos perfis
- [ ] Controle parental

## 🔐 Variáveis de Ambiente

### Obrigatórias
```env
NEXT_PUBLIC_SUPABASE_URL=          # URL do Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Chave anônima do Supabase
NEXT_PUBLIC_TMDB_API_KEY=          # Chave da API do TMDB
```

### Opcionais
```env
NEXT_PUBLIC_APP_NAME=PlayCoreTV    # Nome do app
NEXT_PUBLIC_APP_VERSION=1.0.0      # Versão
```

## 📱 Responsividade

### Breakpoints
- **Mobile**: < 640px (2 colunas)
- **Tablet**: 640px - 1024px (4 colunas)
- **Desktop**: > 1024px (6 colunas)

### Componentes Adaptáveis
- Grid de filmes/séries
- Modal de detalhes
- Sidebar (colapsa em mobile)
- Player de vídeo
- Grid de episódios

## 🎯 Próximas Melhorias

### Curto Prazo
1. Implementar favoritos separados por tipo
2. Adicionar histórico de visualização
3. Melhorar busca com sugestões
4. Adicionar filtros avançados

### Médio Prazo
1. Sistema de recomendações
2. Notificações push
3. Modo offline
4. Múltiplos idiomas

### Longo Prazo
1. App mobile nativo
2. Smart TV apps
3. Chromecast support
4. Download de conteúdo

## 📚 Documentação Adicional

- `TMDB_SETUP.md` - Como configurar a API do TMDB
- `TESTE_RAPIDO.md` - Guia de testes rápidos
- `README.md` - Documentação geral do projeto

## 🤝 Contribuindo

Para adicionar novas funcionalidades:

1. Crie um branch: `git checkout -b feature/nova-funcionalidade`
2. Faça suas alterações
3. Teste localmente
4. Commit: `git commit -m "feat: adiciona nova funcionalidade"`
5. Push: `git push origin feature/nova-funcionalidade`
6. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação
2. Consulte o console do navegador
3. Verifique os logs do servidor
4. Abra uma issue no GitHub

---

**Última atualização**: 12/11/2025
**Versão**: 1.0.0
