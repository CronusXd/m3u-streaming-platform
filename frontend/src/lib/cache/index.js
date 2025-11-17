/**
 * Sistema de Cache IndexedDB
 * 
 * Entry point principal do sistema de cache.
 * 
 * @version 1.0.0
 * @author PlayCoreTV
 * @license MIT
 */

// Core
export { CacheManager } from './CacheManager.js';

// Componentes
export { IndexedDBAdapter } from './IndexedDBAdapter.js';
export { CompressionModule } from './CompressionModule.js';
export { ChunkingModule } from './ChunkingModule.js';
export { StatisticsTracker } from './StatisticsTracker.js';
export { EventEmitter } from './EventEmitter.js';
export { LocalStorageFallback } from './LocalStorageFallback.js';
export { DownloadManager } from './DownloadManager.js';
export { PriorityManager } from './PriorityManager.js';
export { SyncManager } from './SyncManager.js';

// Utilitários
export { CacheError, ErrorHandler } from './CacheError.js';
export { Logger, LogLevel, logger } from './logger.js';
export {
  detectFeatures,
  detectIndexedDB,
  detectLocalStorage,
  detectLZString,
  detectBrowser,
  detectLimits,
  getCompatibilityReport,
  getCompatibilityReportText,
  canSystemRun
} from './feature-detection.js';
export {
  validateConfig,
  mergeConfig,
  getRecommendedConfig,
  getConfigDocumentation
} from './config-validator.js';

// Configurações e Constantes
export {
  DB_CONFIG,
  CACHE_CONFIG,
  DOWNLOAD_CONFIG,
  QUOTA_CONFIG,
  SECTIONS,
  PRIORITY,
  DOWNLOAD_STATUS,
  EVENTS,
  ERROR_CODES,
  DEFAULT_CONFIG
} from './cache.config.js';

// Versão
export const VERSION = '1.0.0';

/**
 * Cria instância do CacheManager com configuração
 * 
 * @param {Object} config - Configuração
 * @returns {CacheManager}
 * 
 * @example
 * import { createCache } from './lib/cache';
 * const cache = createCache({ debug: true });
 * await cache.init();
 */
export function createCache(config = {}) {
  return new CacheManager(config);
}

/**
 * Cria instância do CacheManager e inicializa
 * 
 * @param {Object} config - Configuração
 * @returns {Promise<CacheManager>}
 * 
 * @example
 * import { createAndInitCache } from './lib/cache';
 * const cache = await createAndInitCache({ debug: true });
 */
export async function createAndInitCache(config = {}) {
  const cache = new CacheManager(config);
  await cache.init();
  return cache;
}

// Export default
export default CacheManager;
