# Requisitos - Plataforma de Streaming M3U

## Introdução

Este documento descreve os requisitos para uma plataforma web profissional que permite aos usuários carregar, gerenciar e reproduzir listas de canais no formato .m3u. A plataforma utilizará Node.js + TypeScript no backend, Supabase para banco de dados e autenticação, e React/Next.js no frontend com player HLS (hls.js). O sistema suportará autenticação de usuários, gerenciamento de playlists, favoritos, busca de canais e reprodução direta de streams HLS no navegador.

**Importante**: Este sistema NÃO deve incluir, solicitar ou facilitar a distribuição de conteúdo protegido sem autorização. Assume-se que todas as listas .m3u fornecidas são legais e de propriedade do usuário.

## Requisitos

### Requisito 1: Gerenciamento de Playlists M3U

**User Story:** Como usuário, eu quero fazer upload ou fornecer URL de arquivos .m3u para que eu possa gerenciar minhas listas de canais na plataforma.

#### Acceptance Criteria

1. WHEN um usuário autenticado envia uma URL de arquivo .m3u THEN o sistema SHALL fazer download e processar o arquivo
2. WHEN um usuário autenticado faz upload de um arquivo .m3u THEN o sistema SHALL aceitar arquivos de até 10MB
3. WHEN o sistema processa um arquivo .m3u THEN o sistema SHALL extrair name, stream_url, tvg-id, tvg-logo, group-title, language e raw_meta de cada canal
4. WHEN o sistema processa um arquivo .m3u THEN o sistema SHALL persistir os dados em tabelas estruturadas no Supabase
5. WHEN um usuário solicita atualização de uma playlist THEN o sistema SHALL re-sincronizar os dados da fonte original
6. IF o arquivo .m3u contém mais de 10.000 canais THEN o sistema SHALL processar em lotes e exibir progresso
7. WHEN o parsing falha THEN o sistema SHALL retornar mensagem de erro clara indicando linha/problema
8. WHEN uma playlist é criada THEN o sistema SHALL marcar automaticamente streams .m3u8 como is_hls = true

### Requisito 2: Autenticação e Autorização

**User Story:** Como usuário, eu quero me registrar e fazer login de forma segura para que eu possa acessar minhas playlists e favoritos.

#### Acceptance Criteria

1. WHEN um visitante acessa a plataforma THEN o sistema SHALL exibir opções de login/registro via Supabase Auth
2. WHEN um usuário se registra THEN o sistema SHALL suportar email/password e magic link
3. WHEN um usuário faz login THEN o sistema SHALL gerar token JWT via Supabase Auth
4. WHEN uma requisição API é feita THEN o sistema SHALL validar o bearer token do Supabase
5. IF um usuário tem perfil "admin" THEN o sistema SHALL permitir gerenciar playlists globais
6. IF um usuário tem perfil "user" THEN o sistema SHALL permitir apenas gerenciar playlists pessoais
7. WHEN um usuário não autenticado tenta acessar recursos protegidos THEN o sistema SHALL retornar HTTP 401
8. WHEN um token expira THEN o sistema SHALL solicitar re-autenticação

### Requisito 3: Banco de Dados e Modelagem

**User Story:** Como desenvolvedor, eu quero uma estrutura de banco de dados bem definida para que os dados sejam armazenados de forma eficiente e segura.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN o sistema SHALL ter tabela "users" gerenciada pelo Supabase Auth
2. WHEN o sistema é inicializado THEN o sistema SHALL ter tabela "playlists" com campos: id, owner_id, name, source_url, visibility (public/private), created_at, updated_at
3. WHEN o sistema é inicializado THEN o sistema SHALL ter tabela "channels" com campos: id, playlist_id, name, url, logo, group, language, tvg_id, raw_meta, is_hls, is_active, created_at
4. WHEN o sistema é inicializado THEN o sistema SHALL ter tabela "favorites" com campos: user_id, channel_id, created_at
5. WHEN queries de busca são executadas THEN o sistema SHALL usar índices em channels.name e channels.group
6. WHEN políticas RLS são aplicadas THEN o sistema SHALL garantir que usuários só acessem suas próprias playlists privadas
7. WHEN políticas RLS são aplicadas THEN o sistema SHALL permitir acesso público a playlists com visibility = "public"
8. WHEN um usuário é deletado THEN o sistema SHALL remover em cascata suas playlists e favoritos

### Requisito 4: API REST Backend

**User Story:** Como desenvolvedor frontend, eu quero uma API REST bem documentada para que eu possa integrar facilmente com o backend.

#### Acceptance Criteria

1. WHEN POST /api/playlists é chamado com URL ou arquivo THEN o sistema SHALL criar nova playlist e retornar HTTP 201
2. WHEN GET /api/playlists é chamado THEN o sistema SHALL retornar lista de playlists visíveis ao usuário autenticado
3. WHEN GET /api/playlists/:id é chamado THEN o sistema SHALL retornar playlist com canais paginados (50 por página)
4. WHEN DELETE /api/playlists/:id é chamado por admin/owner THEN o sistema SHALL remover playlist e retornar HTTP 204
5. WHEN POST /api/channels/:id/refresh é chamado THEN o sistema SHALL revalidar metadados do stream
6. WHEN POST /api/favorites é chamado THEN o sistema SHALL adicionar canal aos favoritos do usuário
7. WHEN DELETE /api/favorites/:id é chamado THEN o sistema SHALL remover favorito
8. WHEN GET /api/search?q=termo é chamado THEN o sistema SHALL buscar canais por nome ou grupo
9. WHEN qualquer endpoint é chamado sem autenticação THEN o sistema SHALL retornar HTTP 401
10. WHEN qualquer endpoint retorna dados THEN o sistema SHALL usar formato JSON
11. WHEN rate limit é excedido THEN o sistema SHALL retornar HTTP 429

### Requisito 5: Frontend Web Responsivo

**User Story:** Como usuário, eu quero uma interface moderna e responsiva para que eu possa acessar a plataforma de qualquer dispositivo.

#### Acceptance Criteria

1. WHEN um usuário acessa a plataforma THEN o sistema SHALL exibir interface responsiva (mobile, tablet, desktop)
2. WHEN um usuário alterna tema THEN o sistema SHALL suportar dark mode e light mode
3. WHEN um usuário não autenticado acessa THEN o sistema SHALL exibir página de login/registro
4. WHEN um usuário autenticado acessa THEN o sistema SHALL exibir dashboard com suas playlists
5. WHEN um usuário visualiza canais THEN o sistema SHALL exibir grid/lista com thumbnail, nome, grupo e botões Play/Favoritar
6. WHEN um usuário busca canais THEN o sistema SHALL exibir campo de busca com resultados em tempo real
7. WHEN um usuário filtra canais THEN o sistema SHALL permitir filtros por grupo e idioma
8. WHEN uma playlist é pública THEN o sistema SHALL permitir acesso via URL pública sem autenticação
9. WHEN a interface carrega THEN o sistema SHALL exibir estados de loading e mensagens de erro apropriadas

### Requisito 6: Player de Vídeo HLS

**User Story:** Como usuário, eu quero reproduzir canais HLS diretamente no navegador para que eu possa assistir conteúdo sem aplicativos externos.

#### Acceptance Criteria

1. WHEN um usuário clica em Play em canal HLS THEN o sistema SHALL carregar player com hls.js
2. WHEN o player carrega THEN o sistema SHALL consumir URL do stream diretamente (sem proxy backend)
3. WHEN o player está ativo THEN o sistema SHALL exibir controles: play/pause, volume, fullscreen
4. WHEN o stream oferece múltiplas qualidades THEN o sistema SHALL permitir seleção manual de qualidade
5. WHEN o player inicia THEN o sistema SHALL ter autoplay desabilitado por padrão
6. IF um canal não é HLS (.m3u8) THEN o sistema SHALL exibir mensagem "Stream não compatível com navegador"
7. WHEN o player encontra erro THEN o sistema SHALL exibir mensagem de erro clara
8. WHEN o usuário entra em fullscreen THEN o sistema SHALL manter controles acessíveis

### Requisito 7: Sistema de Favoritos

**User Story:** Como usuário, eu quero marcar canais como favoritos para que eu possa acessá-los rapidamente.

#### Acceptance Criteria

1. WHEN um usuário clica em Favoritar THEN o sistema SHALL adicionar canal à lista de favoritos
2. WHEN um usuário clica em Desfavoritar THEN o sistema SHALL remover canal dos favoritos
3. WHEN um usuário acessa favoritos THEN o sistema SHALL exibir lista de todos os canais favoritados
4. WHEN um canal é favoritado THEN o sistema SHALL exibir indicador visual (ícone preenchido)
5. WHEN um canal favoritado é removido da playlist THEN o sistema SHALL remover automaticamente dos favoritos

### Requisito 8: Busca e Filtros

**User Story:** Como usuário, eu quero buscar e filtrar canais para que eu possa encontrar conteúdo específico rapidamente.

#### Acceptance Criteria

1. WHEN um usuário digita no campo de busca THEN o sistema SHALL buscar em nome e grupo de canais
2. WHEN resultados de busca são exibidos THEN o sistema SHALL destacar termos correspondentes
3. WHEN um usuário seleciona filtro de grupo THEN o sistema SHALL exibir apenas canais daquele grupo
4. WHEN um usuário seleciona filtro de idioma THEN o sistema SHALL exibir apenas canais daquele idioma
5. WHEN múltiplos filtros são aplicados THEN o sistema SHALL combinar filtros com operador AND
6. WHEN busca não retorna resultados THEN o sistema SHALL exibir mensagem "Nenhum canal encontrado"

### Requisito 9: Segurança e Validação

**User Story:** Como administrador do sistema, eu quero garantir segurança robusta para que a plataforma seja protegida contra ataques.

#### Acceptance Criteria

1. WHEN qualquer input de usuário é recebido THEN o sistema SHALL validar e sanitizar dados
2. WHEN upload de arquivo é feito THEN o sistema SHALL validar tipo MIME e tamanho máximo
3. WHEN requisições são feitas THEN o sistema SHALL implementar rate limiting por IP
4. WHEN a plataforma está em produção THEN o sistema SHALL usar HTTPS obrigatório
5. WHEN tokens são gerados THEN o sistema SHALL usar algoritmos seguros (JWT com RS256)
6. WHEN senhas são armazenadas THEN o sistema SHALL usar hashing via Supabase Auth
7. WHEN headers HTTP são enviados THEN o sistema SHALL incluir proteções CSRF/XSS
8. WHEN logs são gerados THEN o sistema SHALL NÃO incluir dados sensíveis (tokens, senhas)

### Requisito 10: Observabilidade e Monitoramento

**User Story:** Como DevOps, eu quero monitorar a saúde do sistema para que eu possa identificar e resolver problemas rapidamente.

#### Acceptance Criteria

1. WHEN o sistema está rodando THEN o sistema SHALL expor endpoint GET /healthz retornando status
2. WHEN logs são gerados THEN o sistema SHALL usar logging estruturado (JSON) com winston ou pino
3. WHEN erros ocorrem THEN o sistema SHALL logar com nível ERROR incluindo stack trace
4. WHEN requisições são processadas THEN o sistema SHALL logar tempo de resposta
5. IF Prometheus é configurado THEN o sistema SHALL expor métricas em /metrics
6. WHEN ambiente é produção THEN o sistema SHALL integrar com Sentry (opcional)

### Requisito 11: DevOps e Deploy

**User Story:** Como desenvolvedor, eu quero ambiente de desenvolvimento e deploy automatizado para que eu possa trabalhar eficientemente.

#### Acceptance Criteria

1. WHEN o projeto é clonado THEN o sistema SHALL incluir Dockerfile para backend
2. WHEN docker-compose up é executado THEN o sistema SHALL iniciar ambiente local completo
3. WHEN código é commitado THEN o sistema SHALL executar lint e testes via Husky pre-commit
4. WHEN PR é criado THEN o sistema SHALL executar CI pipeline (lint, test, build) via GitHub Actions
5. WHEN build é bem-sucedido THEN o sistema SHALL gerar imagem Docker
6. WHEN deploy é feito THEN o sistema SHALL incluir instruções para Vercel/Netlify (frontend) e Render/Fly.io (backend)
7. WHEN variáveis de ambiente são necessárias THEN o sistema SHALL documentar todas em .env.example
8. WHEN HTTPS é configurado THEN o sistema SHALL incluir instruções para Let's Encrypt

### Requisito 12: Qualidade de Código e Testes

**User Story:** Como desenvolvedor, eu quero código de alta qualidade e bem testado para que o sistema seja confiável e manutenível.

#### Acceptance Criteria

1. WHEN código TypeScript é escrito THEN o sistema SHALL usar tipagem forte sem "any"
2. WHEN código é formatado THEN o sistema SHALL usar Prettier com configuração consistente
3. WHEN código é analisado THEN o sistema SHALL usar ESLint sem erros
4. WHEN parser .m3u é testado THEN o sistema SHALL ter unit tests com Jest (cobertura > 80%)
5. WHEN endpoints API são testados THEN o sistema SHALL ter integration tests com supertest
6. WHEN testes são executados THEN o sistema SHALL gerar relatório de cobertura
7. IF E2E tests são implementados THEN o sistema SHALL usar Playwright
8. WHEN código é commitado THEN o sistema SHALL executar testes automaticamente

### Requisito 13: Documentação

**User Story:** Como novo desenvolvedor, eu quero documentação completa para que eu possa configurar e contribuir com o projeto facilmente.

#### Acceptance Criteria

1. WHEN o repositório é acessado THEN o sistema SHALL incluir README.md com setup completo
2. WHEN API é documentada THEN o sistema SHALL incluir OpenAPI/Swagger ou Postman collection
3. WHEN variáveis de ambiente são necessárias THEN o sistema SHALL documentar todas com descrições
4. WHEN comandos são executados THEN o sistema SHALL documentar: dev, build, test, docker-compose
5. WHEN deploy é feito THEN o sistema SHALL incluir guia passo-a-passo
6. WHEN Supabase é configurado THEN o sistema SHALL documentar criação de projeto e obtenção de keys
7. WHEN o projeto evolui THEN o sistema SHALL manter CHANGELOG.md atualizado
8. WHEN contribuições são feitas THEN o sistema SHALL incluir CONTRIBUTING.md com guidelines
9. WHEN dados de teste são necessários THEN o sistema SHALL incluir sample_safe.m3u com 3-5 canais públicos

### Requisito 14: Compatibilidade de Streams

**User Story:** Como usuário, eu quero saber quais streams são compatíveis com o navegador para que eu possa escolher a melhor forma de reprodução.

#### Acceptance Criteria

1. WHEN um canal é processado THEN o sistema SHALL identificar is_hls por extensão .m3u8
2. WHEN um canal é processado THEN o sistema SHALL verificar headers HTTP para confirmar tipo HLS
3. WHEN um canal não é HLS THEN o sistema SHALL marcar como unsupported_in_browser
4. WHEN um canal não suportado é selecionado THEN o sistema SHALL exibir mensagem "Use app nativa ou player externo"
5. WHEN um canal HLS falha ao carregar THEN o sistema SHALL exibir erro específico do hls.js
6. WHEN o sistema detecta stream THEN o sistema SHALL NÃO tentar transcodificar ou fazer proxy
