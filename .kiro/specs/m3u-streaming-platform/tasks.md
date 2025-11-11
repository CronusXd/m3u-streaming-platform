# Implementation Plan - Plataforma de Streaming M3U

Este plano de implementação detalha as tarefas necessárias para construir a plataforma de streaming M3U. Cada tarefa é projetada para ser executada de forma incremental, construindo sobre as tarefas anteriores. As tarefas marcadas com * são opcionais e focadas em testes unitários.

## Tasks

- [x] 1. Setup inicial do projeto e estrutura base


  - Criar estrutura de diretórios: backend/, frontend/, infra/
  - Configurar TypeScript no backend com tsconfig.json (strict mode, ES2022)
  - Configurar TypeScript no frontend com Next.js 14+
  - Criar arquivos .env.example para backend e frontend com todas as variáveis necessárias
  - Configurar ESLint e Prettier em ambos os projetos
  - Configurar Husky para pre-commit hooks (lint + format)
  - Criar .gitignore apropriado
  - _Requirements: 11.3, 12.2, 12.3_



- [ ] 2. Configurar Supabase e banco de dados
  - Criar arquivo de migration SQL (001_initial_schema.sql) com tabelas: playlists, channels, favorites
  - Adicionar índices para otimização: idx_channels_name (GIN), idx_channels_group, idx_playlists_owner
  - Criar arquivo de migration para RLS policies (002_rls_policies.sql)
  - Documentar no README como criar projeto Supabase e executar migrations



  - Criar script seed com sample_safe.m3u contendo 3-5 canais públicos de teste
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 13.6_

- [ ] 3. Implementar parser M3U no backend
  - Criar classe M3UParser em backend/src/parsers/m3u-parser.ts
  - Implementar método parse(content: string) que extrai name, url, tvg-id, tvg-logo, group-title, language, raw_meta
  - Implementar método parseFromUrl(url: string) com download via axios
  - Implementar método parseFromFile(buffer: Buffer)


  - Adicionar lógica para identificar is_hls por extensão .m3u8
  - Implementar tratamento de erros com ParseError[] retornando linha e problema
  - _Requirements: 1.1, 1.3, 1.4, 1.7, 1.8, 14.1_



- [ ] 3.1 Escrever testes unitários para M3U parser
  - Criar testes para parsing de conteúdo válido
  - Criar testes para conteúdo malformado
  - Criar testes para identificação de HLS
  - Criar testes para extração de metadados
  - Garantir cobertura > 80%
  - _Requirements: 12.4_



- [ ] 4. Implementar camada de serviços backend
  - Criar SupabaseClient em backend/src/clients/supabase.ts com métodos CRUD
  - Criar PlaylistService com createPlaylist, getPlaylists, getPlaylistById, deletePlaylist, refreshPlaylist
  - Criar ChannelService com getChannels, searchChannels, refreshChannelMetadata


  - Criar FavoriteService com addFavorite, removeFavorite, getUserFavorites
  - Implementar validação de permissões (owner/admin) nos services
  - Implementar bulk insert de canais para performance
  - _Requirements: 1.4, 1.5, 4.1, 4.6, 4.7, 7.1, 7.2_




- [ ] 4.1 Escrever testes unitários para services
  - Criar testes para PlaylistService com mocks do Supabase
  - Criar testes para validação de permissões
  - Criar testes para ChannelService
  - Criar testes para FavoriteService
  - _Requirements: 12.4_



- [ ] 5. Implementar validação e tipos compartilhados
  - Criar schemas Zod em backend/src/schemas/ para: CreatePlaylistDTO, PlaylistFilters, ChannelFilters
  - Criar interfaces TypeScript em backend/src/types/ para: User, Playlist, Channel, Favorite, ApiResponse
  - Criar classes de erro customizadas: AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, RateLimitError
  - Exportar tipos para reutilização
  - _Requirements: 9.1, 12.1_

- [ ] 6. Implementar middleware de autenticação e segurança
  - Criar authMiddleware em backend/src/middleware/auth.ts que valida JWT do Supabase


  - Implementar extração de user do token e anexar a req.user
  - Criar middleware de rate limiting com express-rate-limit (100 req/min geral, 10 req/min upload)
  - Criar middleware de validação usando Zod schemas
  - Criar errorHandler middleware que trata AppError e erros inesperados


  - Configurar helmet para security headers (CSP, HSTS)
  - _Requirements: 2.4, 2.7, 9.3, 9.4, 9.7, 4.11_

- [ ] 7. Implementar endpoints da API REST - Playlists
  - Criar router em backend/src/routes/playlists.ts
  - Implementar POST /api/playlists (aceita URL ou multipart file upload)
  - Implementar GET /api/playlists (lista playlists do usuário)
  - Implementar GET /api/playlists/:id (retorna playlist com canais paginados)



  - Implementar DELETE /api/playlists/:id (verifica ownership/admin)
  - Implementar POST /api/playlists/:id/refresh (re-sincroniza da fonte)
  - Adicionar validação de inputs com Zod
  - Adicionar rate limiting específico para upload
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 1.5, 9.2_



- [ ] 7.1 Escrever testes de integração para endpoints de playlists
  - Criar testes com supertest para POST /api/playlists
  - Criar testes para autenticação (401 quando não autenticado)
  - Criar testes para autorização (403 quando não é owner)
  - Criar testes para validação de inputs
  - _Requirements: 12.5_



- [ ] 8. Implementar endpoints da API REST - Channels e Search
  - Criar router em backend/src/routes/channels.ts


  - Implementar GET /api/channels com filtros (playlistId, groupTitle, language, isHls)
  - Implementar GET /api/channels/:id
  - Implementar POST /api/channels/:id/refresh
  - Criar router em backend/src/routes/search.ts
  - Implementar GET /api/search?q=termo com busca full-text usando índice GIN
  - Adicionar paginação (50 itens por página)
  - _Requirements: 4.5, 4.8, 8.1, 8.2_




- [ ] 9. Implementar endpoints da API REST - Favorites
  - Criar router em backend/src/routes/favorites.ts
  - Implementar POST /api/favorites (adiciona canal aos favoritos)
  - Implementar DELETE /api/favorites/:id (remove favorito)


  - Implementar GET /api/favorites (lista favoritos do usuário)
  - Garantir que apenas o próprio usuário pode gerenciar seus favoritos
  - _Requirements: 4.6, 4.7, 7.1, 7.2, 7.3_

- [ ] 10. Implementar observabilidade no backend
  - Configurar Pino logger com logs estruturados JSON
  - Adicionar logging middleware que registra todas as requisições com duração



  - Implementar endpoint GET /healthz que verifica conexão com banco
  - Adicionar logging de erros com stack trace (apenas em dev)
  - Configurar níveis de log por ambiente (info em prod, debug em dev)
  - _Requirements: 10.2, 10.3, 10.4, 10.1, 9.8_

- [ ] 10.1 Implementar métricas Prometheus (opcional)
  - Configurar prom-client
  - Adicionar métricas de duração de requisições HTTP



  - Implementar endpoint GET /metrics
  - _Requirements: 10.5_

- [x] 11. Configurar servidor Express e inicialização



  - Criar backend/src/index.ts com configuração do Express
  - Registrar todos os middlewares na ordem correta (helmet, cors, json, logger, auth)
  - Registrar todas as rotas (/api/playlists, /api/channels, /api/favorites, /api/search)
  - Adicionar error handler como último middleware
  - Configurar CORS para permitir frontend
  - Adicionar graceful shutdown
  - _Requirements: 4.10, 11.1_



- [ ] 12. Criar Dockerfile e Docker Compose para backend
  - Criar backend/Dockerfile com multi-stage build (builder + production)
  - Otimizar para produção (npm ci --only=production, node user)
  - Criar docker-compose.yml na raiz com serviço backend
  - Configurar volumes para desenvolvimento
  - Documentar comandos docker-compose no README



  - _Requirements: 11.1, 11.2, 13.4_

- [ ] 13. Setup do projeto Frontend com Next.js
  - Criar projeto Next.js 14+ com App Router em frontend/
  - Configurar Tailwind CSS com dark mode support
  - Instalar dependências: @supabase/auth-helpers-nextjs, @supabase/supabase-js, hls.js
  - Configurar variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL)
  - Criar layout base com suporte a dark/light mode
  - Configurar TypeScript strict mode
  - _Requirements: 5.1, 5.2, 13.3_


- [ ] 14. Implementar autenticação no frontend
  - Criar Supabase client em frontend/lib/supabase.ts (client e server)
  - Criar AuthContext em frontend/contexts/AuthContext.tsx com signIn, signUp, signOut
  - Criar página app/(auth)/login/page.tsx com formulário de login
  - Criar página app/(auth)/register/page.tsx com formulário de registro
  - Implementar callback handler em app/api/auth/callback/route.ts
  - Criar middleware para proteger rotas autenticadas
  - Adicionar feedback visual (loading, erros) nos formulários
  - _Requirements: 2.1, 2.2, 2.3, 5.3_

- [x] 15. Criar componentes UI base reutilizáveis


  - Criar componentes em frontend/components/ui/: Button, Input, Modal, Dropdown, Toast, Loading
  - Implementar variantes de estilo com Tailwind (primary, secondary, danger)
  - Criar ErrorBoundary component para capturar erros de React
  - Criar componente de Loading skeleton para estados de carregamento
  - Garantir acessibilidade (ARIA labels, keyboard navigation)
  - _Requirements: 5.9, 12.1_




- [ ] 16. Implementar dashboard e listagem de playlists
  - Criar layout app/(dashboard)/layout.tsx com sidebar e navegação
  - Criar página app/(dashboard)/page.tsx com overview do usuário
  - Criar página app/(dashboard)/playlists/page.tsx listando playlists do usuário
  - Criar componente PlaylistCard exibindo nome, data, visibilidade
  - Implementar modal de upload/URL para criar nova playlist
  - Adicionar botões de ação (visualizar, deletar) em cada card
  - Implementar estados de loading e empty state
  - _Requirements: 5.4, 5.5, 5.9_

- [ ] 17. Implementar visualização de canais de uma playlist
  - Criar página app/(dashboard)/playlists/[id]/page.tsx
  - Criar componente ChannelGrid exibindo canais em grid responsivo
  - Criar componente ChannelCard com thumbnail (logo), nome, grupo, botões Play e Favoritar
  - Implementar paginação (50 canais por página)
  - Adicionar indicador visual para canais favoritados
  - Implementar loading states e error handling
  - _Requirements: 5.5, 7.4_

- [ ] 18. Implementar player de vídeo HLS
  - Criar componente VideoPlayer em frontend/components/VideoPlayer.tsx
  - Integrar hls.js para reprodução de streams HLS
  - Implementar detecção de suporte MSE (Media Source Extensions)
  - Criar controles customizados: play/pause, volume, fullscreen, progress bar
  - Adicionar seletor de qualidade quando disponível
  - Implementar tratamento de erros com mensagens claras
  - Exibir mensagem "Stream não compatível" para não-HLS
  - Garantir autoplay desabilitado por padrão
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 14.6_

- [ ] 18.1 Escrever testes para VideoPlayer
  - Criar testes com React Testing Library
  - Testar inicialização do hls.js
  - Testar controles do player
  - Testar error handling
  - _Requirements: 12.4_

- [ ] 19. Implementar gerenciamento de estado do player
  - Criar PlayerContext em frontend/contexts/PlayerContext.tsx
  - Implementar estado: currentChannel, isPlaying, play(), pause(), stop()
  - Integrar PlayerContext com VideoPlayer component
  - Criar mini-player persistente na bottom bar (opcional)
  - Garantir que apenas um canal toca por vez
  - _Requirements: 6.1_

- [ ] 20. Implementar sistema de favoritos no frontend
  - Criar FavoritesContext em frontend/contexts/FavoritesContext.tsx
  - Implementar addFavorite, removeFavorite, isFavorite
  - Criar página app/(dashboard)/favorites/page.tsx listando favoritos
  - Adicionar botão de favoritar em ChannelCard com toggle visual
  - Implementar optimistic updates para melhor UX
  - Sincronizar estado com backend
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 21. Implementar busca e filtros
  - Criar página app/(dashboard)/search/page.tsx
  - Criar componente SearchBar com debouncing (300ms)
  - Implementar busca em tempo real chamando GET /api/search
  - Criar componente FilterPanel com filtros: grupo, idioma, apenas HLS
  - Destacar termos de busca nos resultados
  - Implementar empty state quando não há resultados
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 22. Implementar visualização pública de playlists
  - Criar página app/public/playlists/[id]/page.tsx (sem autenticação)
  - Verificar visibility = 'public' antes de exibir
  - Reutilizar ChannelGrid e VideoPlayer
  - Desabilitar funcionalidade de favoritos para não autenticados
  - Adicionar botão "Login para favoritar"
  - _Requirements: 5.8, 3.7_

- [ ] 23. Adicionar validação e feedback de erros no frontend
  - Implementar validação de formulários com mensagens claras
  - Adicionar toast notifications para sucesso/erro de operações
  - Criar páginas de erro customizadas (404, 500)
  - Implementar retry logic para falhas de rede
  - Adicionar confirmação para ações destrutivas (deletar playlist)
  - _Requirements: 5.9, 9.1_

- [ ] 24. Otimizações de performance no frontend
  - Implementar lazy loading de imagens (logos de canais)
  - Adicionar dynamic imports para VideoPlayer
  - Configurar Next.js Image component para logos
  - Implementar prefetching de rotas comuns
  - Adicionar debouncing no search input
  - Otimizar bundle com análise (@next/bundle-analyzer)
  - _Requirements: 5.1_

- [ ] 25. Criar Dockerfile para frontend
  - Criar frontend/Dockerfile com multi-stage build
  - Otimizar para produção (standalone output)
  - Adicionar serviço frontend ao docker-compose.yml
  - Configurar variáveis de ambiente no compose
  - Testar build e execução local
  - _Requirements: 11.1, 11.2_

- [ ] 26. Configurar CI/CD pipeline
  - Criar .github/workflows/ci.yml
  - Adicionar job backend-test: lint, type-check, test, build
  - Adicionar job frontend-test: lint, type-check, test, build
  - Adicionar job docker-build para branch main
  - Configurar cache de node_modules para velocidade
  - Adicionar badges de status no README
  - _Requirements: 11.4, 11.5_

- [ ] 27. Criar documentação completa
  - Criar README.md raiz com: overview, features, tech stack, setup local, comandos
  - Documentar todas as variáveis de ambiente em .env.example
  - Criar guia de setup do Supabase (criar projeto, migrations, obter keys)
  - Documentar comandos: dev, build, test, docker-compose
  - Criar CONTRIBUTING.md com guidelines de contribuição
  - Criar CHANGELOG.md
  - Adicionar LICENSE (MIT)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 28. Criar documentação da API
  - Criar arquivo OpenAPI/Swagger spec em infra/openapi.yaml
  - Documentar todos os endpoints com schemas de request/response
  - Incluir exemplos de uso
  - Adicionar descrições de códigos de erro
  - Alternativamente, criar Postman collection
  - _Requirements: 13.2_

- [ ] 29. Criar guia de deploy
  - Documentar deploy do backend no Render/Fly.io/Cloud Run
  - Documentar deploy do frontend no Vercel/Netlify
  - Incluir instruções para configurar variáveis de ambiente
  - Documentar setup de HTTPS com Let's Encrypt (se necessário)
  - Adicionar checklist de pré-deploy
  - _Requirements: 11.6, 11.7, 11.8, 13.5_

- [ ] 30. Criar dados de seed e testes finais
  - Criar sample_safe.m3u com 3-5 canais públicos legais
  - Criar script de seed que popula banco com dados de exemplo
  - Executar testes end-to-end manuais de todos os fluxos principais
  - Verificar responsividade em mobile, tablet, desktop
  - Testar dark mode e light mode
  - Validar acessibilidade básica
  - _Requirements: 13.9, 5.1, 5.2_

- [ ] 30.1 Implementar testes E2E com Playwright (opcional)
  - Configurar Playwright no frontend
  - Criar teste: usuário faz login, cria playlist, reproduz canal
  - Criar teste: busca de canais
  - Criar teste: adicionar/remover favoritos
  - _Requirements: 12.7_

- [ ] 31. Validação de segurança final
  - Revisar todas as validações de input
  - Verificar rate limiting em todos os endpoints sensíveis
  - Confirmar que RLS policies estão ativas no Supabase
  - Testar proteção contra CSRF/XSS
  - Validar que tokens expiram corretamente
  - Verificar que senhas não aparecem em logs
  - Testar upload de arquivos maliciosos (validação de MIME type)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [ ] 32. Integração e testes finais do sistema completo
  - Executar docker-compose up e verificar que tudo inicia corretamente
  - Testar fluxo completo: registro → login → upload playlist → busca → play → favoritar
  - Verificar logs estruturados no backend
  - Testar health check endpoint
  - Validar que playlists públicas são acessíveis sem login
  - Testar refresh de playlist
  - Verificar tratamento de erros em todos os cenários
  - _Requirements: 1.5, 10.1, 10.2, 5.8_
