/**
 * Configuração do Sistema de Cache IndexedDB
 * 
 * Este arquivo contém todas as constantes e configurações padrão
 * para o sistema de cache de dados IPTV.
 */

// ============================================================
// CONFIGURAÇÕES DO BANCO DE DADOS
// ============================================================

export const DB_CONFIG = {
  /** Nome do banco IndexedDB */
  DB_NAME: 'AppCache',
  
  /** Versão do banco */
  DB_VERSION: 1,
  
  /** Nome dos object stores */
  STORES: {
    SECTIONS: 'sections',
    METADATA: 'metadata'
  }
};

// ============================================================
// CONFIGURAÇÕES DE CACHE
// ============================================================

export const CACHE_CONFIG = {
  /** TTL padrão: 7 dias em segundos */
  DEFAULT_TTL: 604800,
  
  /** Tamanho do chunk: 5MB em bytes */
  CHUNK_SIZE: 5 * 1024 * 1024,
  
  /** Threshold para compactação: 1KB em bytes */
  COMPRESSION_THRESHOLD: 1024,
  
  /** Habilitar compactação por padrão */
  COMPRESSION_ENABLED: true,
  
  /** Limite de tamanho para LocalStorage fallback: 100KB */
  LOCALSTORAGE_MAX_SIZE: 100 * 1024,
  
  /** Prefixo para chaves do LocalStorage */
  LOCALSTORAGE_PREFIX: 'cache_'
};

// ============================================================
// CONFIGURAÇÕES DE DOWNLOAD
// ============================================================

export const DOWNLOAD_CONFIG = {
  /** Número máximo de downloads simultâneos */
  MAX_CONCURRENT: 3,
  
  /** Número máximo de tentativas em caso de falha */
  MAX_RETRIES: 3,
  
  /** Delay base para retry (ms) */
  RETRY_BASE_DELAY: 1000,
  
  /** Delay máximo para retry (ms) */
  RETRY_MAX_DELAY: 10000,
  
  /** Intervalo para emitir eventos de progresso (%) */
  PROGRESS_INTERVAL: 5
};

// ============================================================
// CONFIGURAÇÕES DE QUOTA
// ============================================================

export const QUOTA_CONFIG = {
  /** Threshold para warning de quota (80%) */
  WARNING_THRESHOLD: 0.8,
  
  /** Threshold para limpeza automática (85%) */
  CLEANUP_THRESHOLD: 0.85
};

// ============================================================
// SEÇÕES SUPORTADAS
// ============================================================

export const SECTIONS = {
  FILMES: 'filmes',
  SERIES: 'series',
  CANAIS: 'canais',
  M3U_FULL: 'm3u_full'
};

// ============================================================
// PRIORIDADES
// ============================================================

export const PRIORITY = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2
};

// ============================================================
// STATUS DE DOWNLOAD
// ============================================================

export const DOWNLOAD_STATUS = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// ============================================================
// EVENTOS
// ============================================================

export const EVENTS = {
  // Eventos de download
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETE: 'download:complete',
  DOWNLOAD_ERROR: 'download:error',
  
  // Eventos de cache
  CACHE_SAVE: 'cache:save',
  CACHE_LOAD: 'cache:load',
  CACHE_CLEAR: 'cache:clear',
  CACHE_EXPIRED: 'cache:expired',
  
  // Eventos de quota
  QUOTA_WARNING: 'quota:warning',
  QUOTA_EXCEEDED: 'quota:exceeded',
  
  // Eventos de sistema
  INIT_COMPLETE: 'init:complete',
  CLEANUP_COMPLETE: 'cleanup:complete'
};

// ============================================================
// CÓDIGOS DE ERRO
// ============================================================

export const ERROR_CODES = {
  INDEXEDDB_NOT_AVAILABLE: 'E001',
  QUOTA_EXCEEDED: 'E002',
  DOWNLOAD_FAILED: 'E003',
  COMPRESSION_FAILED: 'E004',
  INVALID_SECTION: 'E005',
  EXPIRED_DATA: 'E006',
  CORRUPTED_DATA: 'E007',
  INITIALIZATION_FAILED: 'E008',
  STORAGE_NOT_AVAILABLE: 'E009'
};

// ============================================================
// CONFIGURAÇÃO PADRÃO COMPLETA
// ============================================================

export const DEFAULT_CONFIG = {
  dbName: DB_CONFIG.DB_NAME,
  dbVersion: DB_CONFIG.DB_VERSION,
  defaultTTL: CACHE_CONFIG.DEFAULT_TTL,
  chunkSize: CACHE_CONFIG.CHUNK_SIZE,
  compressionEnabled: CACHE_CONFIG.COMPRESSION_ENABLED,
  compressionThreshold: CACHE_CONFIG.COMPRESSION_THRESHOLD,
  maxRetries: DOWNLOAD_CONFIG.MAX_RETRIES,
  retryDelay: DOWNLOAD_CONFIG.RETRY_BASE_DELAY,
  maxConcurrent: DOWNLOAD_CONFIG.MAX_CONCURRENT,
  quotaWarningThreshold: QUOTA_CONFIG.WARNING_THRESHOLD,
  cleanupOnInit: true,
  enableStats: true,
  debug: false
};
