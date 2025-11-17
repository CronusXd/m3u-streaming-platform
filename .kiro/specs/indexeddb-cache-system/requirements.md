# Requirements Document

## Introduction

Este documento define os requisitos para um sistema completo de armazenamento local (cache) no navegador, capaz de gerenciar entre 60MB e 80MB de dados de IPTV (filmes, séries, canais e metadados). O sistema utilizará IndexedDB como tecnologia principal, implementando download progressivo, priorização inteligente por seção, expiração automática de 7 dias e compactação opcional de dados.

O objetivo principal é melhorar drasticamente a experiência do usuário, evitando downloads repetitivos, reduzindo latência e permitindo acesso offline aos dados por até 7 dias.

## Requirements

### Requirement 1: Inicialização e Configuração do IndexedDB

**User Story:** Como desenvolvedor, eu quero um sistema de cache baseado em IndexedDB, para que eu possa armazenar grandes volumes de dados (60-80MB) de forma eficiente no navegador.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN SHALL criar um banco IndexedDB chamado "AppCache" com versão 1
2. WHEN o banco é criado THEN SHALL criar dois object stores: "sections" (chave: sectionName) e "metadata" (chave: sectionName)
3. IF IndexedDB não estiver disponível no navegador THEN SHALL lançar erro informativo e usar fallback para LocalStorage apenas para metadados pequenos
4. WHEN a inicialização falhar THEN SHALL registrar erro detalhado no console e retornar status de falha
5. WHEN o banco já existir THEN SHALL reutilizar a conexão existente sem recriar

### Requirement 2: API do CacheManager

**User Story:** Como desenvolvedor, eu quero uma API simples e consistente para gerenciar o cache, para que eu possa facilmente salvar, carregar e limpar dados sem me preocupar com detalhes de implementação.

#### Acceptance Criteria

1. WHEN cache.init() é chamado THEN SHALL inicializar o IndexedDB e retornar Promise<boolean>
2. WHEN cache.save(section, data, ttlSeconds) é chamado THEN SHALL salvar os dados na seção especificada com timestamp e TTL
3. WHEN cache.load(section) é chamado THEN SHALL retornar os dados se válidos ou null se expirados/inexistentes
4. WHEN cache.exists(section) é chamado THEN SHALL retornar boolean indicando se a seção existe
5. WHEN cache.isExpired(section) é chamado THEN SHALL verificar se o cache expirou baseado no TTL
6. WHEN cache.clear(section) é chamado THEN SHALL remover a seção específica do cache
7. WHEN cache.clearAll() é chamado THEN SHALL limpar todo o banco de dados
8. WHEN qualquer operação falhar THEN SHALL retornar Promise rejeitada com erro descritivo

### Requirement 3: Gerenciamento de Seções

**User Story:** Como sistema, eu quero organizar os dados em seções lógicas (filmes, séries, canais), para que eu possa gerenciar e priorizar downloads de forma independente.

#### Acceptance Criteria

1. WHEN dados são salvos THEN SHALL suportar as seções: "filmes", "series", "canais", "m3u_full"
2. WHEN dados de séries específicas são salvos THEN SHALL usar formato "serie:<nome>:<temporada>"
3. WHEN uma seção é salva THEN SHALL armazenar no store "sections" e metadados no store "metadata"
4. WHEN metadados são salvos THEN SHALL incluir: {timestamp: number, ttl: number, size: number}
5. WHEN seções são listadas THEN SHALL retornar array com todas as seções disponíveis

### Requirement 4: Download Progressivo e Priorização

**User Story:** Como usuário, eu quero que o sistema baixe dados em background de forma inteligente, para que eu não precise esperar tudo carregar antes de usar o app.

#### Acceptance Criteria

1. WHEN o usuário faz login pela primeira vez THEN SHALL iniciar download automático de categorias em background
2. WHEN categorias são baixadas THEN SHALL iniciar download assíncrono de todas as seções (filmes, séries, canais)
3. WHEN o usuário clica em "FILMES" THEN SHALL interromper downloads não prioritários e priorizar download de filmes
4. WHEN o usuário clica em "SÉRIES" THEN SHALL interromper downloads não prioritários e priorizar download de séries
5. WHEN o usuário clica em "CANAIS" THEN SHALL interromper downloads não prioritários e priorizar download de canais
6. WHEN uma seção prioritária termina o download THEN SHALL salvar imediatamente no IndexedDB
7. WHEN downloads em background terminam THEN SHALL salvar no IndexedDB sem bloquear a UI
8. WHEN um download falha THEN SHALL tentar novamente até 3 vezes com backoff exponencial

### Requirement 5: Paginação e Processamento em Chunks

**User Story:** Como sistema, eu quero processar dados grandes em chunks/batches, para que eu não sobrecarregue a memória RAM com 60-80MB de dados de uma vez.

#### Acceptance Criteria

1. WHEN dados maiores que 5MB são processados THEN SHALL dividir em chunks de no máximo 5MB
2. WHEN chunks são salvos THEN SHALL salvar incrementalmente no IndexedDB
3. WHEN chunks são carregados THEN SHALL reconstruir o objeto completo de forma transparente
4. WHEN processamento em chunks ocorre THEN SHALL emitir eventos de progresso (0-100%)
5. WHEN a memória está sob pressão THEN SHALL pausar processamento e aguardar liberação

### Requirement 6: Expiração e TTL (Time To Live)

**User Story:** Como sistema, eu quero que os dados expirem automaticamente após 7 dias, para que o cache não fique desatualizado e o usuário sempre tenha dados frescos.

#### Acceptance Criteria

1. WHEN dados são salvos THEN SHALL definir TTL padrão de 604800 segundos (7 dias)
2. WHEN dados são carregados THEN SHALL verificar se timestamp + ttl > Date.now()
3. IF dados estiverem expirados THEN SHALL remover automaticamente do cache e retornar null
4. WHEN cache.isExpired(section) é chamado THEN SHALL retornar true se expirado, false caso contrário
5. WHEN o sistema inicia THEN SHALL executar limpeza automática de caches expirados
6. WHEN TTL customizado é fornecido THEN SHALL usar o valor fornecido ao invés do padrão

### Requirement 7: Compactação de Dados (Opcional)

**User Story:** Como sistema, eu quero comprimir dados grandes antes de salvar, para que eu possa reduzir o espaço de armazenamento utilizado e melhorar performance.

#### Acceptance Criteria

1. WHEN compactação está habilitada THEN SHALL usar LZ-String para comprimir dados antes de salvar
2. WHEN dados compactados são carregados THEN SHALL descomprimir automaticamente
3. WHEN compactação falha THEN SHALL salvar dados sem compactação e registrar warning
4. WHEN dados são menores que 1KB THEN SHALL não aplicar compactação (overhead não compensa)
5. WHEN compactação é aplicada THEN SHALL adicionar flag "compressed: true" nos metadados

### Requirement 8: Fallback e Tratamento de Erros

**User Story:** Como sistema, eu quero ter fallbacks robustos e tratamento de erros, para que o app continue funcionando mesmo quando IndexedDB falhar.

#### Acceptance Criteria

1. IF IndexedDB não estiver disponível THEN SHALL usar LocalStorage apenas para metadados pequenos (<100KB)
2. IF IndexedDB estiver cheio THEN SHALL limpar caches mais antigos automaticamente
3. WHEN quota é excedida THEN SHALL notificar usuário e oferecer opção de limpar cache
4. WHEN operações falham THEN SHALL registrar erro detalhado com stack trace
5. WHEN fallback é usado THEN SHALL registrar warning informando limitações
6. IF LocalStorage também falhar THEN SHALL operar em modo "sem cache" e avisar usuário

### Requirement 9: Monitoramento e Métricas

**User Story:** Como desenvolvedor, eu quero monitorar o uso do cache e performance, para que eu possa identificar problemas e otimizar o sistema.

#### Acceptance Criteria

1. WHEN operações são executadas THEN SHALL registrar tempo de execução
2. WHEN cache é usado THEN SHALL manter contadores de hits/misses
3. WHEN quota é consultada THEN SHALL retornar espaço usado e disponível
4. WHEN cache.getStats() é chamado THEN SHALL retornar: {totalSize, sectionsCount, hits, misses, avgLoadTime}
5. WHEN erros ocorrem THEN SHALL incrementar contador de erros por tipo

### Requirement 10: Sincronização e Atualização

**User Story:** Como usuário, eu quero que o sistema detecte quando há dados novos disponíveis, para que eu possa atualizar meu cache quando necessário.

#### Acceptance Criteria

1. WHEN o app inicia THEN SHALL verificar se há atualizações disponíveis no servidor
2. WHEN atualizações são detectadas THEN SHALL notificar usuário com opção de atualizar
3. WHEN usuário aceita atualização THEN SHALL baixar e substituir dados expirados
4. WHEN atualização em background ocorre THEN SHALL não interromper uso do app
5. WHEN atualização falha THEN SHALL manter dados antigos e tentar novamente mais tarde

### Requirement 11: Interface de Progresso

**User Story:** Como usuário, eu quero ver o progresso dos downloads, para que eu saiba quanto tempo falta para os dados estarem disponíveis.

#### Acceptance Criteria

1. WHEN download está em progresso THEN SHALL emitir eventos com percentual (0-100%)
2. WHEN múltiplas seções estão baixando THEN SHALL mostrar progresso individual e total
3. WHEN download é priorizado THEN SHALL atualizar UI para refletir nova prioridade
4. WHEN download termina THEN SHALL emitir evento "complete" com estatísticas
5. WHEN download falha THEN SHALL emitir evento "error" com detalhes do erro

### Requirement 12: Limpeza e Manutenção

**User Story:** Como sistema, eu quero realizar manutenção automática do cache, para que o armazenamento não fique cheio de dados obsoletos.

#### Acceptance Criteria

1. WHEN o app inicia THEN SHALL executar limpeza de caches expirados
2. WHEN quota está acima de 80% THEN SHALL limpar caches menos usados (LRU)
3. WHEN cache.clearAll() é chamado THEN SHALL remover todos os dados e resetar contadores
4. WHEN seção específica é limpa THEN SHALL remover dados e metadados associados
5. WHEN limpeza automática ocorre THEN SHALL registrar log com quantidade de dados removidos
