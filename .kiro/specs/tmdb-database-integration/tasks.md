# Implementation Plan

- [x] 1. Atualizar tipos TypeScript no backend


  - Adicionar campos TMDB à interface `ChannelRecord` em `backend/src/clients/supabase.ts`
  - Incluir todos os 18 campos TMDB como opcionais
  - Definir tipos corretos para JSONB (genres, cast, created_by)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [ ] 2. Atualizar tipos TypeScript no frontend
  - Adicionar campos TMDB à interface `ConteudoIPTV` em `frontend/src/types/iptv.ts`
  - Manter campos antigos para compatibilidade retroativa




  - Garantir que `FilmeIPTV` e `SerieIPTV` herdem os novos campos
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.4_

- [ ] 3. Criar helper functions utilitárias
  - [ ] 3.1 Criar `frontend/src/utils/tmdb-helpers.ts`
    - Implementar `getPosterUrl(item: ConteudoIPTV): string | null`
    - Implementar `getBackdropUrl(item: ConteudoIPTV): string | null`
    - Implementar `getRating(item: ConteudoIPTV): number`
    - Implementar `shouldFetchTMDB(item: ConteudoIPTV): boolean`
    - Implementar `formatRuntime(minutes: number): string`
    - Implementar `formatReleaseYear(date: string): string`
    - _Requirements: 3.5, 4.1, 4.2, 4.3, 6.1_
  


  - [ ]* 3.2 Escrever testes unitários para helpers
    - Testar `getPosterUrl` com diferentes combinações de dados
    - Testar `getRating` com valores null/undefined
    - Testar `shouldFetchTMDB` com diferentes datas de sync
    - Testar formatação de runtime e ano




    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. Verificar queries do backend
  - Confirmar que `getChannelsByPlaylist` usa `select('*')`
  - Confirmar que `getChannelById` usa `select('*')`
  - Confirmar que `searchChannels` usa `select('*')`
  - Testar que campos TMDB são retornados na resposta JSON
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Atualizar componente FilmeCard
  - [ ] 5.1 Modificar `frontend/src/components/iptv/FilmeCard.tsx`
    - Importar helper functions de `tmdb-helpers.ts`
    - Usar `getPosterUrl()` para determinar imagem do poster
    - Usar `getRating()` para exibir avaliação




    - Adicionar badge de ano usando `tmdb_release_date`
    - Adicionar badge de duração usando `tmdb_runtime`
    - Adicionar tooltip com sinopse usando `tmdb_overview`
    - Manter fallback para campos antigos (`logo_url`, `avaliacao`)
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 5.2, 7.1_
  
  - [ ]* 5.2 Escrever testes para FilmeCard
    - Testar renderização com dados TMDB completos
    - Testar renderização com dados parciais
    - Testar renderização sem dados TMDB (fallback)
    - Testar exibição de badges condicionais
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 5.2, 7.1_

- [x] 6. Atualizar componente SerieCard





  - [ ] 6.1 Modificar `frontend/src/components/iptv/SerieCard.tsx`
    - Importar helper functions de `tmdb-helpers.ts`
    - Usar `getPosterUrl()` para determinar imagem do poster
    - Usar `getRating()` para exibir avaliação
    - Adicionar badge de temporadas usando `tmdb_number_of_seasons`
    - Adicionar badge de episódios usando `tmdb_number_of_episodes`
    - Adicionar tooltip com sinopse usando `tmdb_overview`
    - Manter fallback para campos antigos
    - _Requirements: 3.3, 3.4, 3.5, 5.3, 7.1_
  
  - [ ]* 6.2 Escrever testes para SerieCard
    - Testar renderização com dados TMDB completos




    - Testar renderização com dados parciais
    - Testar renderização sem dados TMDB (fallback)
    - Testar exibição de badges de temporadas/episódios
    - _Requirements: 3.3, 3.4, 3.5, 5.3, 7.1_

- [ ] 7. Atualizar MovieDetailsModal com fallback inteligente
  - [ ] 7.1 Modificar `frontend/src/components/movies/MovieDetailsModal.tsx`
    - Importar `shouldFetchTMDB` helper
    - Verificar se dados TMDB existem no registro antes de buscar API
    - Se `tmdb_id` existe e `tmdb_last_sync` < 30 dias, usar dados do banco



    - Se dados não existem ou estão desatualizados, buscar da API TMDB
    - Não mostrar loading state quando usar dados do banco
    - Usar dados do banco como fallback se API TMDB falhar
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 8.2_
  
  - [ ]* 7.2 Escrever testes para MovieDetailsModal
    - Testar carregamento com dados TMDB do banco
    - Testar carregamento com busca da API
    - Testar fallback quando API falha
    - Testar que não há loading quando dados do banco são usados
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 8.2_

- [ ] 8. Criar componente SeriesDetailsModal (similar ao MovieDetailsModal)
  - [ ] 8.1 Criar `frontend/src/components/series/SeriesDetailsModal.tsx`
    - Implementar lógica similar ao MovieDetailsModal
    - Usar `shouldFetchTMDB` para decidir se busca API
    - Exibir informações específicas de séries (temporadas, episódios, criadores)
    - Implementar fallback inteligente
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1_
  
  - [ ]* 8.2 Escrever testes para SeriesDetailsModal
    - Testar carregamento com dados do banco
    - Testar busca da API quando necessário
    - Testar exibição de informações de séries
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1_

- [ ] 9. Atualizar serviço de API do frontend
  - Verificar que `frontend/src/services/iptvService.ts` mapeia campos TMDB corretamente
  - Garantir que tipos retornados incluem campos TMDB
  - Adicionar validação de dados JSONB (genres, cast)
  - _Requirements: 2.1, 2.2, 7.4_

- [ ] 10. Implementar tratamento de erros robusto
  - [ ] 10.1 Adicionar validação de dados TMDB
    - Validar formato de `tmdb_poster_path` antes de usar
    - Validar que `tmdb_genres` é array válido
    - Validar que `tmdb_cast` é array válido
    - Sanitizar `tmdb_overview` para prevenir XSS
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 10.2 Implementar fallbacks em cascata
    - Criar função `getImageWithFallback` que tenta múltiplas fontes
    - Criar função `getTextWithFallback` para textos
    - Adicionar error boundaries nos componentes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 11. Otimizar performance de carregamento
  - Verificar que Next.js Image component está sendo usado corretamente
  - Implementar lazy loading para imagens TMDB
  - Adicionar prefetch para dados TMDB em hover (opcional)
  - Medir tempo de carregamento antes e depois
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 12. Atualizar documentação
  - Documentar novos campos TMDB em README
  - Adicionar exemplos de uso dos helpers
  - Documentar estratégia de fallback
  - Atualizar diagramas de arquitetura
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Testar integração completa
  - [ ] 13.1 Testar fluxo completo de filmes
    - Carregar página de filmes
    - Verificar que cards usam dados TMDB do banco
    - Abrir modal de detalhes
    - Verificar que não há chamadas desnecessárias ao TMDB
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 13.2 Testar fluxo completo de séries
    - Carregar página de séries
    - Verificar que cards usam dados TMDB do banco
    - Abrir modal de detalhes
    - Verificar informações específicas de séries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 13.3 Testar cenários de erro
    - Testar com registros sem dados TMDB
    - Testar com dados TMDB parciais
    - Testar com API TMDB indisponível
    - Verificar que fallbacks funcionam corretamente
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 14. Verificar compatibilidade retroativa
  - Testar que código existente continua funcionando
  - Verificar que testes existentes passam
  - Confirmar que não há breaking changes
  - Testar com dados antigos (sem TMDB)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Deploy e monitoramento
  - Fazer deploy em ambiente de staging
  - Monitorar logs de erro
  - Verificar métricas de performance
  - Coletar feedback de usuários
  - Fazer deploy em produção
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
