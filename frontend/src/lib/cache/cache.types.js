/**
 * Definições de Tipos usando JSDoc
 * 
 * Este arquivo contém todas as definições de tipos para o sistema de cache,
 * proporcionando autocomplete e validação de tipos no VSCode.
 */

// ============================================================
// TIPOS DE CONFIGURAÇÃO
// ============================================================

/**
 * @typedef {Object} CacheConfig
 * @property {string} dbName - Nome do banco IndexedDB
 * @property {number} dbVersion - Versão do banco
 * @property {number} defaultTTL - TTL padrão em segundos (7 dias)
 * @property {number} chunkSize - Tamanho do chunk em bytes (5MB)
 * @property {boolean} compressionEnabled - Habilitar compactação
 * @property {number} compressionThreshold - Threshold para compactação em bytes
 * @property {number} maxRetries - Número máximo de tentativas
 * @property {number} retryDelay - Delay base para retry em ms
 * @property {number} maxConcurrent - Downloads simultâneos máximos
 * @property {number} quotaWarningThreshold - Threshold para warning (0-1)
 * @property {boolean} cleanupOnInit - Limpar caches expirados ao iniciar
 * @property {boolean} enableStats - Habilitar estatísticas
 * @property {boolean} debug - Modo debug
 */

// ============================================================
// TIPOS DE DADOS
// ============================================================

/**
 * @typedef {Object} SectionData
 * @property {string} sectionName - Nome da seção
 * @property {*} data - Dados da seção (qualquer tipo)
 * @property {number} [chunks] - Número total de chunks
 * @property {number} [chunkIndex] - Índice do chunk atual
 */

/**
 * @typedef {Object} Metadata
 * @property {string} sectionName - Nome da seção
 * @property {number} timestamp - Timestamp de criação (Date.now())
 * @property {number} ttl - Time to live em segundos
 * @property {number} size - Tamanho em bytes
 * @property {boolean} compressed - Se está compactado
 * @property {boolean} chunked - Se está dividido em chunks
 * @property {number} [totalChunks] - Total de chunks (se chunked)
 * @property {number} lastAccessed - Último acesso (Date.now())
 * @property {number} accessCount - Contador de acessos
 */

// ============================================================
// TIPOS DE DOWNLOAD
// ============================================================

/**
 * @typedef {Object} QueueItem
 * @property {string} section - Nome da seção
 * @property {string} url - URL para download
 * @property {number} priority - Prioridade (0=baixa, 1=média, 2=alta)
 * @property {'pending'|'downloading'|'completed'|'failed'|'cancelled'} status - Status do download
 * @property {number} progress - Progresso (0-100)
 * @property {number} retries - Número de tentativas
 * @property {Error|null} error - Erro (se houver)
 * @property {number} [startTime] - Timestamp de início
 * @property {number} [endTime] - Timestamp de fim
 */

/**
 * @typedef {Object} DownloadProgress
 * @property {string} section - Nome da seção
 * @property {number} progress - Progresso (0-100)
 * @property {number} loaded - Bytes carregados
 * @property {number} total - Total de bytes
 * @property {number} speed - Velocidade em bytes/s
 */

// ============================================================
// TIPOS DE ESTATÍSTICAS
// ============================================================

/**
 * @typedef {Object} OperationStats
 * @property {number} count - Número de operações
 * @property {number} totalTime - Tempo total em ms
 * @property {number} [avgTime] - Tempo médio em ms
 */

/**
 * @typedef {Object} Statistics
 * @property {number} hits - Número de cache hits
 * @property {number} misses - Número de cache misses
 * @property {number} totalSize - Tamanho total em bytes
 * @property {number} sectionsCount - Número de seções
 * @property {Object.<string, OperationStats>} operations - Estatísticas por operação
 * @property {Object.<string, number>} errors - Contadores de erros por tipo
 */

// ============================================================
// TIPOS DE QUOTA
// ============================================================

/**
 * @typedef {Object} QuotaInfo
 * @property {number} usage - Espaço usado em bytes
 * @property {number} quota - Quota total em bytes
 * @property {number} percentage - Percentual usado (0-1)
 * @property {number} available - Espaço disponível em bytes
 */

// ============================================================
// TIPOS DE EVENTOS
// ============================================================

/**
 * @typedef {Object} DownloadStartEvent
 * @property {string} section - Nome da seção
 * @property {string} url - URL do download
 */

/**
 * @typedef {Object} DownloadProgressEvent
 * @property {string} section - Nome da seção
 * @property {number} progress - Progresso (0-100)
 * @property {number} loaded - Bytes carregados
 * @property {number} total - Total de bytes
 */

/**
 * @typedef {Object} DownloadCompleteEvent
 * @property {string} section - Nome da seção
 * @property {number} size - Tamanho em bytes
 * @property {number} duration - Duração em ms
 */

/**
 * @typedef {Object} DownloadErrorEvent
 * @property {string} section - Nome da seção
 * @property {Error} error - Erro ocorrido
 * @property {number} retries - Número de tentativas
 */

/**
 * @typedef {Object} CacheSaveEvent
 * @property {string} section - Nome da seção
 * @property {number} size - Tamanho em bytes
 * @property {boolean} compressed - Se foi compactado
 * @property {boolean} chunked - Se foi dividido em chunks
 */

/**
 * @typedef {Object} CacheLoadEvent
 * @property {string} section - Nome da seção
 * @property {boolean} hit - Se foi cache hit
 * @property {number} duration - Duração em ms
 */

/**
 * @typedef {Object} QuotaWarningEvent
 * @property {number} used - Espaço usado em bytes
 * @property {number} available - Espaço disponível em bytes
 * @property {number} percentage - Percentual usado (0-1)
 */

// ============================================================
// TIPOS DE ERRO
// ============================================================

/**
 * @typedef {Object} CacheErrorDetails
 * @property {string} code - Código do erro (E001-E009)
 * @property {string} message - Mensagem do erro
 * @property {*} [details] - Detalhes adicionais
 * @property {string} [stack] - Stack trace
 */

// ============================================================
// TIPOS DE CALLBACK
// ============================================================

/**
 * @callback EventCallback
 * @param {*} data - Dados do evento
 * @returns {void}
 */

/**
 * @callback ProgressCallback
 * @param {DownloadProgressEvent} progress - Progresso do download
 * @returns {void}
 */

// ============================================================
// TIPOS DE RETORNO
// ============================================================

/**
 * @typedef {Object} SaveResult
 * @property {boolean} success - Se a operação foi bem-sucedida
 * @property {string} section - Nome da seção
 * @property {number} size - Tamanho salvo em bytes
 * @property {boolean} compressed - Se foi compactado
 * @property {boolean} chunked - Se foi dividido em chunks
 */

/**
 * @typedef {Object} LoadResult
 * @property {boolean} success - Se a operação foi bem-sucedida
 * @property {string} section - Nome da seção
 * @property {*} data - Dados carregados
 * @property {boolean} hit - Se foi cache hit
 * @property {number} duration - Duração em ms
 */

// ============================================================
// EXPORTS (para referência)
// ============================================================

export {};
