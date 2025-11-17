# Implementation Plan - Correção da Organização de Séries

- [x] 1. Aumentar threads paralelas de 5 para 10 no backend


  - Modificar `/api/iptv/series/route.ts` para usar 10 threads em vez de 5
  - Ajustar cálculo de `batchesPerThread` para distribuir carga entre 10 threads
  - Adicionar logs para monitorar performance de cada thread
  - _Requirements: 1.5_




- [ ] 2. Corrigir agrupamento de séries no backend
  - [ ] 2.1 Implementar lógica de agrupamento usando Map para séries únicas
    - Criar `Map<string, SeriesGrouping>` para agrupar episódios pelo nome da série
    - Usar `Set<number>` para armazenar temporadas únicas (evita duplicatas)

    - Contar total de episódios por série
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 2.2 Adicionar extração de metadados agregados
    - Calcular `totalTemporadas` usando `temporadas.size`

    - Calcular `totalEpisodios` contando registros
    - Preservar `logo_url`, `backdrop_url`, `categoria` da série
    - _Requirements: 1.4_
  




  - [ ] 2.3 Retornar apenas séries únicas na resposta da API
    - Converter Map para Array de séries
    - Ordenar séries alfabeticamente por nome
    - Remover duplicatas de episódios individuais
    - _Requirements: 1.5_



- [ ] 3. Implementar parsing correto de temporadas e episódios
  - [x] 3.1 Criar função `parseSeasonEpisode` com múltiplos padrões




    - Suportar formato `S01E01`, `S02E05`, etc.
    - Suportar formato `Season 1 Episode 1`
    - Suportar formato `1x01`, `2x05`, etc.
    - Retornar `{ season: number, episode: number }` ou `null`
    - _Requirements: 2.2, 2.3, 6.1, 6.2, 6.3_

  
  - [ ] 3.2 Aplicar parsing nos dados do banco
    - Extrair temporada e episódio de cada registro
    - Validar que são números válidos




    - Usar valores padrão se parsing falhar (Season 1, Episode 1)
    - _Requirements: 6.4, 6.5, 8.1, 8.2_

- [x] 4. Criar API para buscar temporadas de uma série

  - [ ] 4.1 Implementar rota `/api/iptv/series/[nome]/seasons`
    - Buscar todos os episódios da série pelo nome
    - Agrupar episódios por número de temporada
    - Contar episódios por temporada




    - Ordenar temporadas numericamente
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 4.2 Retornar metadados de cada temporada
    - Incluir `temporada`, `totalEpisodios`

    - Incluir primeiro episódio para pegar `logo_url` e `backdrop_url`
    - Validar que todas as temporadas estão presentes
    - _Requirements: 2.5_

- [x] 5. Criar API para buscar episódios de uma temporada

  - [ ] 5.1 Implementar rota `/api/iptv/series/[nome]/seasons/[num]/episodes`
    - Buscar episódios filtrados por série e temporada
    - Ordenar episódios numericamente




    - Incluir `stream_url` para reprodução
    - _Requirements: 3.5_
  
  - [x] 5.2 Adicionar tratamento de casos especiais

    - Lidar com episódios sem número (atribuir sequencial)
    - Lidar com dados faltantes (usar placeholders)
    - Logar erros sem quebrar a API
    - _Requirements: 8.3, 8.4, 8.5_





- [ ] 6. Atualizar componente SeriesListView para exibir séries únicas
  - [ ] 6.1 Modificar fetch para usar nova API agrupada
    - Chamar `/api/iptv/series` que retorna séries únicas

    - Remover lógica de agrupamento do frontend (já feito no backend)
    - Validar que cada card representa uma série, não um episódio
    - _Requirements: 1.1, 1.2_
  



  - [ ] 6.2 Exibir informações agregadas no card
    - Mostrar `totalTemporadas` e `totalEpisodios`
    - Formatar como "X temp. • Y eps."
    - Usar `logo_url` da série
    - _Requirements: 1.4_

  
  - [ ] 6.3 Implementar cache de 30 dias para metadados
    - Usar `optimizedCache.getMetadata('serie')`
    - Salvar séries agrupadas no cache




    - Validar TTL de 30 dias
    - _Requirements: 7.2_

- [x] 7. Atualizar componente SeasonsView para exibir todas as temporadas


  - [ ] 7.1 Buscar todas as temporadas da série selecionada
    - Chamar `/api/iptv/series/[nome]/seasons`
    - Validar que todas as temporadas são retornadas (não só Temporada 2)



    - Ordenar temporadas numericamente (1, 2, 3, ...)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 7.2 Renderizar grid de temporadas
    - Criar card para cada temporada

    - Mostrar número da temporada e total de episódios
    - Adicionar click handler para navegar para episódios
    - _Requirements: 2.4, 3.2_



- [ ] 8. Atualizar componente EpisodesView para exibir episódios ordenados
  - [ ] 8.1 Buscar episódios da temporada selecionada
    - Chamar `/api/iptv/series/[nome]/seasons/[num]/episodes`
    - Validar ordenação numérica dos episódios
    - Incluir `stream_url` para reprodução
    - _Requirements: 3.5_
  
  - [ ] 8.2 Renderizar lista de episódios
    - Criar card para cada episódio
    - Mostrar número do episódio e nome
    - Adicionar botão de play para assistir
    - _Requirements: 3.4_

- [ ] 9. Implementar navegação hierárquica completa
  - [ ] 9.1 Adicionar breadcrumb navigation
    - Mostrar caminho: Séries → [Nome da Série] → Temporada X
    - Permitir voltar para níveis anteriores
    - Manter contexto de navegação
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  
  - [ ] 9.2 Gerenciar estado de navegação
    - Usar `useState` para série e temporada selecionadas
    - Implementar funções `handleBackToSeasons` e `handleBackToSeries`
    - Atualizar URL para deep linking (opcional)
    - _Requirements: 7.1, 7.3_

- [ ] 10. Remover ícone de favorito (coração vermelho)
  - [ ] 10.1 Remover botão de favorito do SeriesEpisodesModal
    - Localizar e remover elemento `<button>` com ❤️ ou 🤍
    - Remover estado `isFavorite` e `setIsFavorite`
    - Remover imports relacionados a favoritos
    - _Requirements: 4.1, 4.2_
  
  - [ ] 10.2 Remover código de favorito de page.tsx
    - Buscar por "favorite", "❤️", "heart" no código
    - Remover qualquer lógica relacionada
    - Limpar imports não utilizados
    - _Requirements: 4.3_

- [ ] 11. Validar performance e otimizações
  - [ ] 11.1 Testar tempo de carregamento com 10 threads
    - Medir tempo de resposta da API
    - Validar que é menor que 5 segundos para 10.000 registros
    - Comparar com performance anterior (5 threads)
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 11.2 Validar cache e lazy loading
    - Testar que cache de 30 dias funciona
    - Validar lazy loading na lista de séries
    - Verificar que scroll infinito funciona corretamente
    - _Requirements: 7.2, 7.4_

- [ ] 12. Testar navegação completa end-to-end
  - Abrir página de séries
  - Validar que apenas séries únicas são exibidas (não episódios)
  - Clicar em uma série
  - Validar que TODAS as temporadas são exibidas
  - Clicar em uma temporada
  - Validar que todos os episódios são exibidos ordenados
  - Validar que coração vermelho não aparece
  - Testar breadcrumb navigation (voltar)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.1_
