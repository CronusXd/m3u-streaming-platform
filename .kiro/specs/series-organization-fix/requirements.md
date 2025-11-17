# Requirements Document - Correção da Organização de Séries

## Introdução

O sistema atual de séries apresenta problemas críticos de organização e exibição. Os episódios individuais estão sendo mostrados como itens separados na lista principal, quando deveriam ser agrupados por série. Além disso, ao abrir uma série, apenas uma temporada é exibida (Temporada 2) quando todas as temporadas disponíveis deveriam estar visíveis. Também há um ícone de favorito (coração vermelho) que precisa ser removido.

Este documento define os requisitos para corrigir a estrutura hierárquica de séries, garantindo que:
- Séries apareçam como itens únicos na lista principal
- Todas as temporadas de uma série sejam exibidas corretamente
- Todos os episódios de cada temporada estejam organizados
- O ícone de favorito seja removido
- A performance seja otimizada com 10 threads paralelas

## Requirements

### Requirement 1: Agrupamento Correto de Séries na Lista Principal

**User Story:** Como usuário, eu quero ver apenas séries únicas na lista principal (não episódios individuais), para que eu possa navegar facilmente pelo catálogo sem confusão.

#### Acceptance Criteria

1. WHEN o usuário acessa a página de séries THEN o sistema SHALL exibir apenas um card por série (não múltiplos cards para cada episódio)
2. WHEN o sistema carrega os dados do backend THEN o sistema SHALL agrupar todos os episódios pelo nome da série antes de renderizar
3. WHEN uma série possui múltiplas temporadas THEN o sistema SHALL mostrar apenas um card com o nome da série
4. WHEN o card da série é exibido THEN o sistema SHALL mostrar informações agregadas (total de temporadas, total de episódios)
5. IF existem episódios duplicados com o mesmo nome de série THEN o sistema SHALL consolidá-los em um único item

### Requirement 2: Exibição Completa de Todas as Temporadas

**User Story:** Como usuário, eu quero ver todas as temporadas disponíveis quando abro uma série, para que eu possa escolher qualquer temporada que desejo assistir.

#### Acceptance Criteria

1. WHEN o usuário clica em uma série THEN o sistema SHALL exibir todas as temporadas disponíveis (não apenas uma)
2. WHEN o sistema agrupa os episódios THEN o sistema SHALL extrair corretamente o número da temporada de cada episódio
3. WHEN múltiplas temporadas existem THEN o sistema SHALL ordená-las numericamente (S01, S02, S03, etc.)
4. WHEN uma temporada é exibida THEN o sistema SHALL mostrar o número correto de episódios contidos nela
5. IF os dados do M3U contêm informações de temporada THEN o sistema SHALL parsear corretamente usando regex ou string matching

### Requirement 3: Organização Hierárquica Completa

**User Story:** Como usuário, eu quero navegar através de uma hierarquia clara (Série → Temporada → Episódio), para que eu possa encontrar facilmente o conteúdo que desejo assistir.

#### Acceptance Criteria

1. WHEN o usuário está na lista de séries THEN o sistema SHALL exibir apenas nomes de séries
2. WHEN o usuário clica em uma série THEN o sistema SHALL navegar para a view de temporadas
3. WHEN o usuário está na view de temporadas THEN o sistema SHALL exibir todas as temporadas da série selecionada
4. WHEN o usuário clica em uma temporada THEN o sistema SHALL navegar para a view de episódios
5. WHEN o usuário está na view de episódios THEN o sistema SHALL exibir todos os episódios da temporada selecionada ordenados numericamente
6. WHEN o usuário navega entre níveis THEN o sistema SHALL manter o contexto e permitir voltar para o nível anterior

### Requirement 4: Remoção do Ícone de Favorito

**User Story:** Como usuário, eu não quero ver o ícone de coração vermelho (favorito) na interface, para que a UI fique mais limpa e focada no conteúdo.

#### Acceptance Criteria

1. WHEN a página de detalhes da série é renderizada THEN o sistema SHALL NOT exibir o ícone de coração vermelho
2. WHEN o componente de série é carregado THEN o sistema SHALL remover qualquer código relacionado ao botão de favorito
3. IF existe funcionalidade de favoritos THEN o sistema SHALL desabilitá-la temporariamente até implementação futura

### Requirement 5: Otimização de Performance com 10 Threads

**User Story:** Como usuário, eu quero que os dados das séries carreguem rapidamente, para que eu possa começar a assistir sem esperar muito tempo.

#### Acceptance Criteria

1. WHEN o sistema busca dados de séries THEN o sistema SHALL usar 10 threads paralelas para queries
2. WHEN múltiplas queries são executadas THEN o sistema SHALL processar até 10 simultaneamente
3. WHEN os dados são carregados THEN o sistema SHALL completar em menos de 5 segundos para 10.000 registros
4. IF uma thread falha THEN o sistema SHALL continuar processando as outras threads sem interrupção
5. WHEN todas as threads completam THEN o sistema SHALL consolidar os resultados antes de retornar ao frontend

### Requirement 6: Parsing Correto de Metadados de Episódios

**User Story:** Como desenvolvedor, eu quero que o sistema extraia corretamente informações de temporada e episódio dos dados M3U, para que a organização hierárquica funcione perfeitamente.

#### Acceptance Criteria

1. WHEN o sistema processa um episódio THEN o sistema SHALL extrair o número da temporada usando regex pattern `S(\d+)E(\d+)` ou similar
2. WHEN o sistema processa um episódio THEN o sistema SHALL extrair o número do episódio corretamente
3. IF o formato não segue o padrão SxxExx THEN o sistema SHALL tentar formatos alternativos (Season X Episode Y, etc.)
4. WHEN metadados são extraídos THEN o sistema SHALL validar que são números válidos
5. IF a extração falha THEN o sistema SHALL logar o erro e usar valores padrão (Season 1, Episode 1)

### Requirement 7: Cache e Estado Consistente

**User Story:** Como usuário, eu quero que o sistema mantenha o estado da minha navegação, para que eu possa voltar e avançar sem perder o contexto.

#### Acceptance Criteria

1. WHEN o usuário navega entre níveis THEN o sistema SHALL manter o estado da série e temporada selecionadas
2. WHEN os dados são carregados THEN o sistema SHALL cachear os resultados agrupados para evitar reprocessamento
3. WHEN o usuário volta para a lista principal THEN o sistema SHALL restaurar a posição de scroll anterior
4. IF o cache expira THEN o sistema SHALL recarregar os dados automaticamente
5. WHEN o estado muda THEN o sistema SHALL atualizar a URL para permitir deep linking

### Requirement 8: Tratamento de Casos Especiais

**User Story:** Como desenvolvedor, eu quero que o sistema lide graciosamente com dados inconsistentes ou incompletos, para que a aplicação não quebre com dados inesperados.

#### Acceptance Criteria

1. IF uma série não tem número de temporada THEN o sistema SHALL atribuir "Temporada 1" como padrão
2. IF um episódio não tem número THEN o sistema SHALL atribuir números sequenciais baseados na ordem
3. WHEN dados estão faltando THEN o sistema SHALL exibir placeholders apropriados
4. IF o nome da série está vazio THEN o sistema SHALL usar "Série Sem Nome" como fallback
5. WHEN erros ocorrem THEN o sistema SHALL logar detalhes para debugging sem quebrar a UI
