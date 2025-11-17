# Arquitetura do Sistema de Cache

## Visão Geral

O sistema de cache é composto por múltiplas camadas que trabalham juntas para fornecer armazenamento eficiente, download progressivo e sincronização de dados.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                    (UI Components)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      CacheManager                            │
│  (Orquestrador principal - API unificada)                   │
└─┬───────────┬──────────┬──────────┬──────────┬─────────────┘
  │           │          │          │          │
  ▼           ▼          ▼          ▼          ▼
┌────┐   ┌────────┐  ┌──────┐  ┌──────┐  ┌──────────┐
│IDB │   │Download│  │Sync  │  │Stats │  │Priority  │
│    │   │Manager │  │Mgr   │  │      │  │Manager   │
└─┬──┘   └────────┘  └──────┘  └──────┘  └──────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐                │
│  │IndexedDB │  │Compression │  │Chunking  │                │
│  └──────────┘  └────────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. CacheManager (Core)

**Responsabilidade**: Orquestrador principal do sistema.

**Funcionalidades**:
- Inicialização e configuração
- API unificada para todas as operações
- Coordenação entre componentes
- Gerenciamento de eventos

**Dependências**:
- IndexedDBAdapter
- CompressionModule
- ChunkingModule
- DownloadManager
- PriorityManager
- SyncManager
- StatisticsTracker
- EventEmitter

### 2. IndexedDBAdapter

**Responsabilidade**: Abstração do IndexedDB.

**Funcionalidades**:
- Operações CRUD
- Gerenciamento de transações
- Criação de stores e índices

**Stores**:
- `sections`: Dados das seções
- `metadata`: Metadados (timestamp, TTL, size, etc.)

### 3. CompressionModule

**Responsabilidade**: Compactação de dados.

**Algoritmo**: LZ-String

**Lógica**:
1. Verificar se dados > threshold (1KB)
2. Comprimir com LZ-String
3. Comparar tamanho: usar menor
4. Adicionar flag `compressed: true`

**Taxa de Compressão**: 40-60% típico

### 4. ChunkingModule

**Responsabilidade**: Divisão de dados grandes.

**Tamanho do Chunk**: 5MB (configurável)

**Lógica**:
1. Verificar se dados > chunkSize
2. Dividir em chunks
3. Salvar cada chunk com índice
4. Reconstruir ao carregar

### 5. DownloadManager

**Responsabilidade**: Gerenciar downloads progressivos.

**Funcionalidades**:
- Fila de prioridade
- Controle de concorrência (3 simultâneos)
- Retry com backoff exponencial
- Eventos de progresso

**Algoritmo de Retry**:
```
Tentativa 1: delay = 1s
Tentativa 2: delay = 2s
Tentativa 3: delay = 4s
```

### 6. PriorityManager

**Responsabilidade**: Priorização dinâmica.

**Níveis de Prioridade**:
- 0: Baixa
- 1: Média
- 2: Alta

**Lógica de Priorização**:
1. Cancelar downloads de baixa prioridade
2. Aumentar prioridade da seção
3. Reordenar fila
4. Iniciar download imediato

### 7. SyncManager

**Responsabilidade**: Sincronização com servidor.

**Funcionalidades**:
- Verificação de versão
- Atualização de seções
- Atualização em background

**Intervalo de Verificação**: 5 minutos

### 8. StatisticsTracker

**Responsabilidade**: Coleta de métricas.

**Métricas**:
- Hits/Misses
- Tempo de operações
- Tamanho total
- Contadores de erros

### 9. EventEmitter

**Responsabilidade**: Sistema de eventos.

**Eventos Principais**:
- `cache:save`, `cache:load`, `cache:clear`
- `download:start`, `download:progress`, `download:complete`
- `quota:warning`, `quota:exceeded`
- `init:complete`, `cleanup:complete`

## Fluxo de Dados

### Fluxo de Save

```
1. CacheManager.save(section, data)
2. Verificar quota
3. CompressionModule.shouldCompress(data)
   ├─ Sim → Comprimir
   └─ Não → Continuar
4. ChunkingModule.shouldChunk(data)
   ├─ Sim → Dividir em chunks
   └─ Não → Continuar
5. IndexedDBAdapter.put(sections, data)
6. IndexedDBAdapter.put(metadata, {...})
7. Emitir evento cache:save
8. Atualizar estatísticas
```

### Fluxo de Load

```
1. CacheManager.load(section)
2. IndexedDBAdapter.get(metadata, section)
3. Verificar expiração
   ├─ Expirado → Remover e retornar null
   └─ Válido → Continuar
4. IndexedDBAdapter.get(sections, section)
5. Se chunked → Carregar todos os chunks
6. ChunkingModule.merge(chunks)
7. Se compressed → Descomprimir
8. Atualizar lastAccessed
9. Emitir evento cache:load
10. Registrar hit/miss
```

### Fluxo de Download Progressivo

```
1. startBackgroundDownload(urls)
2. Para cada seção:
   ├─ DownloadManager.enqueue(section, url, priority)
   └─ Adicionar à fila
3. Processar fila (max 3 simultâneos)
4. Para cada download:
   ├─ Fetch com eventos de progresso
   ├─ Retry se falhar (3x)
   └─ CacheManager.save() ao completar
5. Emitir eventos de progresso
```

### Fluxo de Priorização

```
1. Usuário clica em "FILMES"
2. PriorityManager.prioritizeSection('filmes')
3. Cancelar downloads não prioritários
4. Aumentar prioridade de 'filmes' para 2
5. Reduzir prioridade de outras para 0
6. Reordenar fila
7. Iniciar download imediato
```

## Decisões de Design

### Por que IndexedDB?

- Suporta grandes volumes (60-80MB+)
- Assíncrono (não bloqueia UI)
- Estruturado (queries eficientes)
- Amplamente suportado

### Por que Chunking?

- Evita sobrecarga de memória
- Permite salvamento incremental
- Melhora performance em dados grandes
- Facilita retry parcial

### Por que Compactação?

- Reduz espaço de armazenamento (40-60%)
- Melhora performance de I/O
- Permite armazenar mais dados
- LZ-String é rápido e eficiente

### Por que Fila de Prioridade?

- Melhor experiência do usuário
- Recursos limitados (rede, CPU)
- Prioriza o que o usuário precisa agora
- Evita desperdício de banda

## Padrões de Design Utilizados

### 1. Facade Pattern

`CacheManager` fornece interface simplificada para sistema complexo.

### 2. Strategy Pattern

Diferentes estratégias de storage (IndexedDB, LocalStorage).

### 3. Observer Pattern

Sistema de eventos para comunicação assíncrona.

### 4. Singleton Pattern

Logger e configurações globais.

### 5. Factory Pattern

Criação de erros customizados.

## Performance

### Otimizações Implementadas

1. **Operações Assíncronas**: Todas as operações são não-bloqueantes
2. **Chunking**: Evita carregar tudo na memória
3. **Compactação**: Reduz I/O e espaço
4. **Cache de Metadados**: Acesso rápido sem I/O
5. **LRU**: Limpeza inteligente dos menos usados

### Métricas Esperadas

| Operação | Tamanho | Tempo Esperado |
|----------|---------|----------------|
| Save     | 1MB     | <100ms         |
| Save     | 5MB     | <500ms         |
| Save     | 50MB    | <3s            |
| Load     | 1MB     | <50ms          |
| Load     | 5MB     | <200ms         |
| Load     | 50MB    | <1.5s          |

## Segurança

### Proteções

1. **Validação de Entrada**: Todos os parâmetros são validados
2. **Isolamento**: Dados isolados por origem (same-origin)
3. **Sem Dados Sensíveis**: Apenas dados públicos
4. **Quota Limits**: Respeita limites do navegador

### Recomendações

- Não armazenar senhas ou tokens
- Validar integridade dos dados
- Implementar checksums (futuro)
- Usar HTTPS em produção

## Escalabilidade

### Limites Atuais

- **IndexedDB**: ~60% do espaço em disco (Chrome/Edge)
- **Chunks**: 5MB cada
- **Downloads Simultâneos**: 3
- **Histórico de Logs**: 1000 entradas

### Como Escalar

1. Aumentar `chunkSize` para dados maiores
2. Aumentar `maxConcurrent` para mais downloads
3. Implementar Web Workers para processamento
4. Usar Service Worker para cache de rede

## Manutenibilidade

### Estrutura de Código

```
cache/
├── CacheManager.js          # Core
├── IndexedDBAdapter.js      # Storage
├── CompressionModule.js     # Compression
├── ChunkingModule.js        # Chunking
├── DownloadManager.js       # Downloads
├── PriorityManager.js       # Priorização
├── SyncManager.js           # Sincronização
├── StatisticsTracker.js     # Métricas
├── EventEmitter.js          # Eventos
├── LocalStorageFallback.js  # Fallback
├── CacheError.js            # Erros
├── logger.js                # Logging
├── feature-detection.js     # Features
├── config-validator.js      # Validação
├── cache.config.js          # Configurações
├── cache.types.js           # Tipos JSDoc
├── index.js                 # Entry point
├── README.md                # Documentação
└── ARCHITECTURE.md          # Este arquivo
```

### Convenções

- **Nomes**: camelCase para métodos, PascalCase para classes
- **Comentários**: JSDoc para todas as funções públicas
- **Erros**: Sempre usar CacheError
- **Logs**: Usar logger ao invés de console
- **Eventos**: Sempre emitir eventos importantes

## Testes

### Estratégia de Testes

1. **Unitários**: Cada módulo isoladamente
2. **Integração**: Fluxos completos
3. **Performance**: Benchmarks
4. **Compatibilidade**: Múltiplos navegadores

### Cobertura Esperada

- Unitários: >80%
- Integração: >60%
- E2E: Cenários principais

## Roadmap Futuro

### Fase 2

- [ ] Web Workers para compactação
- [ ] Service Worker integration
- [ ] Criptografia de dados
- [ ] Sincronização multi-tab
- [ ] Compactação adaptativa
- [ ] Machine Learning para predição

### Fase 3

- [ ] Suporte a GraphQL
- [ ] Delta sync (apenas mudanças)
- [ ] Conflict resolution
- [ ] Offline mutations queue
- [ ] Real-time sync com WebSockets

## Referências

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html)
- [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
