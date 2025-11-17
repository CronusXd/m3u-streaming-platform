# Requirements Document

## Introduction

Este documento define os requisitos para integrar os metadados TMDB armazenados no banco de dados com o frontend da aplicação PlayCoreTV. Atualmente, as colunas TMDB foram adicionadas ao banco de dados, mas o frontend ainda busca dados em tempo real da API TMDB, ignorando os dados já armazenados. Esta feature visa otimizar o desempenho e reduzir chamadas desnecessárias à API externa.

## Requirements

### Requirement 1: Atualizar Tipos TypeScript

**User Story:** Como desenvolvedor, quero que os tipos TypeScript reflitam a estrutura completa do banco de dados, para que o código seja type-safe e autocomplete funcione corretamente.

#### Acceptance Criteria

1. WHEN os tipos são definidos THEN o backend SHALL incluir todos os campos TMDB na interface `ChannelRecord`
2. WHEN os tipos são definidos THEN o frontend SHALL incluir todos os campos TMDB na interface `ConteudoIPTV`
3. WHEN os tipos são atualizados THEN os campos TMDB SHALL ser opcionais (nullable)
4. WHEN os tipos são definidos THEN SHALL incluir tipos para `tmdb_genres`, `tmdb_cast` e `tmdb_created_by` como JSONB

### Requirement 2: Backend Retornar Dados TMDB

**User Story:** Como frontend, quero receber os metadados TMDB nas respostas da API, para que eu possa exibir informações ricas sem fazer chamadas adicionais ao TMDB.

#### Acceptance Criteria

1. WHEN a API `/api/channels` é chamada THEN SHALL retornar todos os campos TMDB disponíveis no banco
2. WHEN a API `/api/channels/:id` é chamada THEN SHALL retornar todos os campos TMDB do registro específico
3. WHEN um registro não tem dados TMDB THEN os campos SHALL ser `null` ou `undefined`
4. WHEN a query do Supabase é executada THEN SHALL usar `select('*')` para incluir todas as colunas

### Requirement 3: Componentes Usarem Dados do Banco

**User Story:** Como usuário, quero ver informações detalhadas dos filmes e séries carregadas rapidamente do banco de dados, para que a experiência seja fluida e responsiva.

#### Acceptance Criteria

1. WHEN `FilmeCard` renderiza THEN SHALL priorizar `tmdb_poster_path` sobre `logo_url`
2. WHEN `FilmeCard` renderiza THEN SHALL exibir `tmdb_vote_average` se disponível
3. WHEN `SerieCard` renderiza THEN SHALL priorizar `tmdb_poster_path` sobre `logo_url`
4. WHEN `SerieCard` renderiza THEN SHALL exibir `tmdb_vote_average` se disponível
5. WHEN dados TMDB não existem no banco THEN SHALL usar fallback para campos antigos (`logo_url`, `avaliacao`)

### Requirement 4: Modal de Detalhes com Fallback Inteligente

**User Story:** Como usuário, quero ver detalhes completos de filmes/séries, priorizando dados do banco mas buscando da API TMDB se necessário, para ter sempre informações atualizadas.

#### Acceptance Criteria

1. WHEN `MovieDetailsModal` abre THEN SHALL verificar se `tmdb_id` existe no registro
2. WHEN `tmdb_id` existe e `tmdb_last_sync` é recente (< 30 dias) THEN SHALL usar dados do banco
3. WHEN `tmdb_id` não existe ou dados estão desatualizados THEN SHALL buscar da API TMDB
4. WHEN busca da API TMDB é feita THEN SHALL exibir loading state
5. WHEN dados do banco são usados THEN SHALL carregar instantaneamente sem loading

### Requirement 5: Exibir Informações Adicionais nos Cards

**User Story:** Como usuário, quero ver mais informações nos cards de filmes/séries (ano, duração, gêneros), para tomar decisões informadas sobre o que assistir.

#### Acceptance Criteria

1. WHEN `FilmeCard` renderiza THEN SHALL exibir ano de lançamento se `tmdb_release_date` disponível
2. WHEN `FilmeCard` renderiza THEN SHALL exibir duração se `tmdb_runtime` disponível
3. WHEN `SerieCard` renderiza THEN SHALL exibir número de temporadas se `tmdb_number_of_seasons` disponível
4. WHEN hover no card THEN SHALL exibir sinopse curta (`tmdb_overview` truncado)
5. WHEN informações TMDB não disponíveis THEN SHALL ocultar badges/labels correspondentes

### Requirement 6: Otimização de Performance

**User Story:** Como usuário, quero que a aplicação carregue rapidamente e não faça requisições desnecessárias, para economizar dados e ter uma experiência fluida.

#### Acceptance Criteria

1. WHEN dados TMDB existem no banco THEN a aplicação SHALL NOT fazer chamadas à API TMDB
2. WHEN múltiplos cards são renderizados THEN SHALL usar dados do banco em batch
3. WHEN imagens TMDB são carregadas THEN SHALL usar URLs otimizadas (w500 para posters, w185 para thumbnails)
4. WHEN componente desmonta THEN SHALL cancelar requisições pendentes
5. WHEN erro ocorre ao buscar TMDB THEN SHALL usar dados do banco como fallback

### Requirement 7: Compatibilidade com Sistema Existente

**User Story:** Como desenvolvedor, quero que as mudanças sejam retrocompatíveis, para que funcionalidades existentes não quebrem.

#### Acceptance Criteria

1. WHEN campos TMDB não existem THEN o sistema SHALL funcionar com campos antigos (`logo_url`, `avaliacao`)
2. WHEN `MovieDetailsModal` é usado THEN SHALL manter comportamento atual se dados TMDB não disponíveis
3. WHEN cache IndexedDB existe THEN SHALL continuar funcionando em paralelo
4. WHEN tipos são atualizados THEN código existente SHALL compilar sem erros
5. WHEN componentes são atualizados THEN testes existentes SHALL passar

### Requirement 8: Tratamento de Erros e Edge Cases

**User Story:** Como usuário, quero que a aplicação funcione mesmo quando dados estão incompletos ou indisponíveis, para ter uma experiência consistente.

#### Acceptance Criteria

1. WHEN `tmdb_poster_path` é null THEN SHALL usar `logo_url` como fallback
2. WHEN `tmdb_vote_average` é null THEN SHALL usar `avaliacao` como fallback
3. WHEN `tmdb_overview` é null THEN SHALL ocultar seção de sinopse
4. WHEN `tmdb_genres` é array vazio THEN SHALL ocultar badges de gênero
5. WHEN erro de rede ocorre THEN SHALL exibir mensagem amigável e usar dados em cache

---

**Prioridade:** Alta  
**Complexidade:** Média  
**Impacto:** Alto (melhora significativa de performance e UX)  
**Dependências:** Migração do banco de dados já aplicada (`20250116_add_tmdb_columns.sql`)
