/**
 * CacheManager - Sistema Principal de Gerenciamento de Cache
 * 
 * Orquestra todos os componentes do sistema de cache, fornecendo
 * uma API unificada para salvar, carregar e gerenciar dados.
 * 
 * @example
 * const cache = new CacheManager();
 * await cache.init();
 * await cache.save('filmes', data);
 * const loaded = await cache.load('filmes');
 */

/// <reference path="./cache.types.js" />

import { DEFAULT_CONFIG, ERROR_CODES, EVENTS, DB_CONFIG } from './cache.config.js';
import { IndexedDBAdapter } from './IndexedDBAdapter.js';
import { CompressionModule } from './CompressionModule.js';
import { ChunkingModule } from './ChunkingModule.js';
import { StatisticsTracker } from './StatisticsTracker.js';
import { EventEmitter } from './EventEmitter.js';
import { LocalStorageFallback } from './LocalStorageFallback.js';
import { DownloadManager } from './DownloadManager.js';
import { PriorityManager } from './PriorityManager.js';
import { SyncManager } from './SyncManager.js';

export class CacheManager {
  /**
   * @param {CacheConfig} config - Configuração customizada
   */
  constructor(config = {}) {
    /**
     * Configuração final (merge de padrão + customizada)
     * @type {CacheConfig}
     */
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    /**
     * Componentes do sistema
     * @private
     */
    this.db = null;
    this.storage = null;
    this.compression = null;
    this.chunking = null;
    this.statsTracker = null;
    this.eventEmitter = null;
    this.downloadManager = null;
    this.priorityManager = null;
    this.syncManager = null;

    /**
     * Estado do sistema
     * @private
     */
    this.initialized = false;
    this.useFallback = false;

    /**
     * Features disponíveis
     * @private
     */
    this.features = {
      indexedDB: false,
      localStorage: false,
      compression: false,
      webWorkers: false
    };
  }

  /**
   * Inicializa o sistema de cache
   * 
   * @returns {Promise<boolean>} - true se inicializou com sucesso
   * 
   * @example
   * const success = await cache.init();
   * if (success) {
   *   console.log('Cache pronto!');
   * }
   */
  async init() {
    if (this.initialized) {
      console.warn('CacheManager already initialized');
      return true;
    }

    try {
      console.log('Initializing CacheManager...');

      // 1. Detectar features disponíveis
      this._detectFeatures();

      // 2. Inicializar EventEmitter
      this.eventEmitter = new EventEmitter();

      // 3. Inicializar StatisticsTracker
      this.statsTracker = new StatisticsTracker();

      // 4. Inicializar CompressionModule
      this.compression = new CompressionModule(this.config.compressionThreshold);
      
      if (this.config.debug) {
        console.log('Compression:', this.compression.getInfo());
      }

      // 5. Inicializar ChunkingModule
      this.chunking = new ChunkingModule(this.config.chunkSize);
      
      if (this.config.debug) {
        console.log('Chunking:', this.chunking.getInfo());
      }

      // 6. Tentar inicializar IndexedDB
      if (this.features.indexedDB) {
        try {
          this.db = new IndexedDBAdapter(
            this.config.dbName,
            this.config.dbVersion
          );
          
          await this.db.open();
          this.storage = this.db;
          
          console.log('IndexedDB initialized successfully');

        } catch (error) {
          console.error('Failed to initialize IndexedDB:', error);
          this.features.indexedDB = false;
          this.useFallback = true;
        }
      }

      // 7. Fallback para LocalStorage se necessário
      if (!this.features.indexedDB && this.features.localStorage) {
        console.warn('Using LocalStorage fallback (limited to small metadata)');
        
        this.storage = new LocalStorageFallback();
        this.useFallback = true;

        this.eventEmitter.emit('fallback:activated', {
          reason: 'IndexedDB not available',
          storage: 'localStorage'
        });
      }

      // 8. Se nenhum storage disponível, falhar
      if (!this.storage) {
        throw new Error(
          `${ERROR_CODES.STORAGE_NOT_AVAILABLE}: No storage mechanism available`
        );
      }

      // 9. Inicializar DownloadManager
      this.downloadManager = new DownloadManager(this);
      
      // 10. Inicializar PriorityManager
      this.priorityManager = new PriorityManager(this.downloadManager);

      // 11. Inicializar SyncManager
      this.syncManager = new SyncManager(this);

      // 11. Limpeza automática de caches expirados
      if (this.config.cleanupOnInit) {
        await this._cleanupExpiredCaches();
      }

      // 12. Marcar como inicializado
      this.initialized = true;

      // 13. Emitir evento de inicialização completa
      this.eventEmitter.emit(EVENTS.INIT_COMPLETE, {
        success: true,
        features: this.features,
        useFallback: this.useFallback,
        config: this.config
      });

      console.log('CacheManager initialized successfully');
      
      if (this.config.debug) {
        console.log('Features:', this.features);
        console.log('Config:', this.config);
      }

      return true;

    } catch (error) {
      console.error('Failed to initialize CacheManager:', error);
      
      this.eventEmitter?.emit(EVENTS.INIT_COMPLETE, {
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Detecta features disponíveis no navegador
   * @private
   */
  _detectFeatures() {
    // IndexedDB
    this.features.indexedDB = IndexedDBAdapter.isAvailable();

    // LocalStorage
    this.features.localStorage = LocalStorageFallback.isAvailable();

    // Compression (LZ-String)
    this.features.compression = CompressionModule.isAvailable();

    // Web Workers
    this.features.webWorkers = typeof Worker !== 'undefined';

    if (this.config.debug) {
      console.log('Feature detection:', this.features);
    }
  }

  /**
   * Limpa caches expirados
   * @private
   * @returns {Promise<number>} - Número de caches removidos
   */
  async _cleanupExpiredCaches() {
    if (!this.initialized && !this.storage) {
      return 0;
    }

    try {
      console.log('Cleaning up expired caches...');

      let removedCount = 0;
      const now = Date.now();

      // Obter todas as chaves de metadados
      const metadataKeys = await this.storage.getAllKeys(DB_CONFIG.STORES.METADATA);

      for (const key of metadataKeys) {
        try {
          const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, key);

          if (metadata) {
            const expirationTime = metadata.timestamp + (metadata.ttl * 1000);

            if (now > expirationTime) {
              // Cache expirado, remover
              await this.clear(metadata.sectionName);
              removedCount++;

              this.eventEmitter.emit(EVENTS.CACHE_EXPIRED, {
                section: metadata.sectionName,
                expiredAt: expirationTime
              });
            }
          }
        } catch (error) {
          console.error(`Failed to check expiration for ${key}:`, error);
        }
      }

      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} expired cache(s)`);
        
        this.eventEmitter.emit(EVENTS.CLEANUP_COMPLETE, {
          removed: removedCount
        });
      }

      return removedCount;

    } catch (error) {
      console.error('Failed to cleanup expired caches:', error);
      return 0;
    }
  }

  /**
   * Verifica se o cache está inicializado
   * @private
   * @throws {Error} - Se não estiver inicializado
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('CacheManager not initialized. Call init() first.');
    }
  }

  /**
   * Obtém features disponíveis
   * 
   * @returns {Object} - Features disponíveis
   * 
   * @example
   * const features = cache.getFeatures();
   * console.log('IndexedDB:', features.indexedDB);
   */
  getFeatures() {
    return { ...this.features };
  }

  /**
   * Verifica se está usando fallback
   * 
   * @returns {boolean} - true se usando fallback
   * 
   * @example
   * if (cache.isUsingFallback()) {
   *   console.warn('Usando LocalStorage (limitado)');
   * }
   */
  isUsingFallback() {
    return this.useFallback;
  }

  /**
   * Obtém configuração atual
   * 
   * @returns {CacheConfig} - Configuração
   * 
   * @example
   * const config = cache.getConfig();
   * console.log('TTL padrão:', config.defaultTTL);
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Registra listener de evento
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Callback
   * @returns {CacheManager} - this para encadeamento
   * 
   * @example
   * cache.on('cache:save', (data) => {
   *   console.log('Cache salvo:', data.section);
   * });
   */
  on(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.on(event, callback);
    }
    return this;
  }

  /**
   * Remove listener de evento
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Callback
   * @returns {CacheManager} - this para encadeamento
   */
  off(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.off(event, callback);
    }
    return this;
  }

  /**
   * Registra listener que executa apenas uma vez
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Callback
   * @returns {CacheManager} - this para encadeamento
   */
  once(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.once(event, callback);
    }
    return this;
  }

  // ============================================================
  // OPERAÇÕES DE SAVE
  // ============================================================

  /**
   * Salva dados no cache
   * 
   * @param {string} section - Nome da seção
   * @param {*} data - Dados a salvar
   * @param {number} [ttlSeconds] - TTL customizado em segundos
   * @returns {Promise<SaveResult>} - Resultado da operação
   * 
   * @example
   * await cache.save('filmes', filmesData);
   * await cache.save('series', seriesData, 86400); // 1 dia
   */
  async save(section, data, ttlSeconds = null) {
    this._ensureInitialized();

    const startTime = Date.now();

    try {
      // Validar parâmetros
      if (!section || typeof section !== 'string') {
        throw new Error('Section name must be a non-empty string');
      }

      if (data === null || data === undefined) {
        throw new Error('Data cannot be null or undefined');
      }

      // Usar TTL padrão se não fornecido
      const ttl = ttlSeconds || this.config.defaultTTL;

      // Estimar tamanho original
      const originalSize = this._estimateSize(data);

      if (this.config.debug) {
        console.log(`Saving ${section} (${(originalSize / 1024).toFixed(2)} KB)`);
      }

      // Verificar se deve comprimir
      let processedData = data;
      let compressed = false;

      if (this.config.compressionEnabled && this.compression.shouldCompress(data)) {
        processedData = this.compression.compress(data);
        compressed = typeof processedData === 'string' && processedData !== data;

        if (compressed && this.config.debug) {
          const compressedSize = this._estimateSize(processedData);
          const ratio = this.compression.getCompressionRatio(data, processedData);
          console.log(`Compressed: ${(ratio * 100).toFixed(2)}% reduction`);
        }
      }

      // Verificar se deve dividir em chunks
      const shouldChunk = this.chunking.shouldChunk(processedData);
      let chunks = [];

      if (shouldChunk) {
        chunks = this.chunking.split(section, processedData);

        if (this.config.debug) {
          console.log(`Split into ${chunks.length} chunks`);
        }

        // Salvar cada chunk
        for (const chunk of chunks) {
          await this.storage.put(DB_CONFIG.STORES.SECTIONS, chunk.sectionName, chunk);
        }
      } else {
        // Salvar como único item
        await this.storage.put(DB_CONFIG.STORES.SECTIONS, section, {
          sectionName: section,
          data: processedData,
          chunks: 1,
          chunkIndex: 0
        });
      }

      // Verificar quota antes de salvar metadados
      await this.checkQuota();

      // Salvar metadados
      const metadata = {
        sectionName: section,
        timestamp: Date.now(),
        ttl: ttl,
        size: originalSize,
        compressed: compressed,
        chunked: shouldChunk,
        totalChunks: shouldChunk ? chunks.length : 1,
        lastAccessed: Date.now(),
        accessCount: 0
      };

      await this.storage.put(DB_CONFIG.STORES.METADATA, section, metadata);

      // Atualizar estatísticas
      const duration = Date.now() - startTime;
      this.statsTracker.recordOperation('save', duration);
      await this._updateTotalSize();

      // Emitir evento
      this.eventEmitter.emit(EVENTS.CACHE_SAVE, {
        section,
        size: originalSize,
        compressed,
        chunked: shouldChunk,
        duration
      });

      if (this.config.debug) {
        console.log(`Saved ${section} in ${duration}ms`);
      }

      return {
        success: true,
        section,
        size: originalSize,
        compressed,
        chunked: shouldChunk
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.statsTracker.recordOperation('save', duration);
      this.statsTracker.recordError('save');

      console.error(`Failed to save ${section}:`, error);
      throw error;
    }
  }

  /**
   * Estima tamanho dos dados em bytes
   * @private
   * @param {*} data - Dados
   * @returns {number} - Tamanho em bytes
   */
  _estimateSize(data) {
    try {
      if (typeof data === 'string') {
        return new Blob([data]).size;
      }
      
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.error('Failed to estimate size:', error);
      return 0;
    }
  }

  /**
   * Atualiza tamanho total do cache nas estatísticas
   * @private
   */
  async _updateTotalSize() {
    try {
      const metadataKeys = await this.storage.getAllKeys(DB_CONFIG.STORES.METADATA);
      let totalSize = 0;

      for (const key of metadataKeys) {
        const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, key);
        if (metadata && metadata.size) {
          totalSize += metadata.size;
        }
      }

      this.statsTracker.updateTotalSize(totalSize);
      this.statsTracker.updateSectionsCount(metadataKeys.length);

    } catch (error) {
      console.error('Failed to update total size:', error);
    }
  }

  // ============================================================
  // OPERAÇÕES DE LOAD
  // ============================================================

  /**
   * Carrega dados do cache
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<*|null>} - Dados ou null se não existir/expirado
   * 
   * @example
   * const filmes = await cache.load('filmes');
   * if (filmes) {
   *   console.log('Cache hit!');
   * }
   */
  async load(section) {
    this._ensureInitialized();

    const startTime = Date.now();

    try {
      // Validar parâmetros
      if (!section || typeof section !== 'string') {
        throw new Error('Section name must be a non-empty string');
      }

      // Carregar metadados
      const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, section);

      if (!metadata) {
        // Cache miss
        this.statsTracker.recordMiss();
        
        this.eventEmitter.emit(EVENTS.CACHE_LOAD, {
          section,
          hit: false,
          duration: Date.now() - startTime
        });

        return null;
      }

      // Verificar expiração
      if (await this.isExpired(section)) {
        // Cache expirado, remover
        await this.clear(section);
        this.statsTracker.recordMiss();

        this.eventEmitter.emit(EVENTS.CACHE_EXPIRED, {
          section,
          expiredAt: metadata.timestamp + (metadata.ttl * 1000)
        });

        this.eventEmitter.emit(EVENTS.CACHE_LOAD, {
          section,
          hit: false,
          expired: true,
          duration: Date.now() - startTime
        });

        return null;
      }

      // Carregar dados
      let data;

      if (metadata.chunked) {
        // Carregar todos os chunks
        const chunks = [];
        
        for (let i = 0; i < metadata.totalChunks; i++) {
          const chunkName = `${section}:chunk:${i}`;
          const chunk = await this.storage.get(DB_CONFIG.STORES.SECTIONS, chunkName);
          
          if (!chunk) {
            throw new Error(`Missing chunk ${i} of ${metadata.totalChunks}`);
          }
          
          chunks.push(chunk);
        }

        // Reconstruir dados
        data = this.chunking.merge(chunks);

      } else {
        // Carregar como único item
        const item = await this.storage.get(DB_CONFIG.STORES.SECTIONS, section);
        
        if (!item) {
          throw new Error('Data not found in sections store');
        }
        
        data = item.data;
      }

      // Descomprimir se necessário
      if (metadata.compressed) {
        data = this.compression.decompress(data);
      }

      // Atualizar metadados de acesso
      metadata.lastAccessed = Date.now();
      metadata.accessCount = (metadata.accessCount || 0) + 1;
      await this.storage.put(DB_CONFIG.STORES.METADATA, section, metadata);

      // Registrar estatísticas
      const duration = Date.now() - startTime;
      this.statsTracker.recordHit();
      this.statsTracker.recordOperation('load', duration);

      // Emitir evento
      this.eventEmitter.emit(EVENTS.CACHE_LOAD, {
        section,
        hit: true,
        duration
      });

      if (this.config.debug) {
        console.log(`Loaded ${section} in ${duration}ms (hit)`);
      }

      return data;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.statsTracker.recordOperation('load', duration);
      this.statsTracker.recordError('load');
      this.statsTracker.recordMiss();

      console.error(`Failed to load ${section}:`, error);
      
      // Retornar null em caso de erro (não propagar)
      return null;
    }
  }

  /**
   * Verifica se uma seção existe no cache
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<boolean>} - true se existe
   * 
   * @example
   * if (await cache.exists('filmes')) {
   *   console.log('Filmes estão em cache');
   * }
   */
  async exists(section) {
    this._ensureInitialized();

    try {
      const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, section);
      return metadata !== null && metadata !== undefined;
    } catch (error) {
      console.error(`Failed to check existence of ${section}:`, error);
      return false;
    }
  }

  /**
   * Verifica se uma seção está expirada
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<boolean>} - true se expirado
   * 
   * @example
   * if (await cache.isExpired('filmes')) {
   *   console.log('Cache expirado, precisa atualizar');
   * }
   */
  async isExpired(section) {
    this._ensureInitialized();

    try {
      const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, section);

      if (!metadata) {
        return true; // Não existe = considerado expirado
      }

      const now = Date.now();
      const expirationTime = metadata.timestamp + (metadata.ttl * 1000);

      return now > expirationTime;

    } catch (error) {
      console.error(`Failed to check expiration of ${section}:`, error);
      return true; // Em caso de erro, considerar expirado
    }
  }

  // ============================================================
  // OPERAÇÕES AUXILIARES
  // ============================================================

  /**
   * Remove uma seção do cache
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.clear('filmes');
   */
  async clear(section) {
    this._ensureInitialized();

    const startTime = Date.now();

    try {
      // Carregar metadados para saber se tem chunks
      const metadata = await this.storage.get(DB_CONFIG.STORES.METADATA, section);

      if (metadata && metadata.chunked) {
        // Remover todos os chunks
        for (let i = 0; i < metadata.totalChunks; i++) {
          const chunkName = `${section}:chunk:${i}`;
          await this.storage.delete(DB_CONFIG.STORES.SECTIONS, chunkName);
        }
      } else {
        // Remover item único
        await this.storage.delete(DB_CONFIG.STORES.SECTIONS, section);
      }

      // Remover metadados
      await this.storage.delete(DB_CONFIG.STORES.METADATA, section);

      // Atualizar estatísticas
      const duration = Date.now() - startTime;
      this.statsTracker.recordOperation('clear', duration);
      await this._updateTotalSize();

      // Emitir evento
      this.eventEmitter.emit(EVENTS.CACHE_CLEAR, {
        section,
        duration
      });

      if (this.config.debug) {
        console.log(`Cleared ${section} in ${duration}ms`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.statsTracker.recordOperation('clear', duration);
      this.statsTracker.recordError('clear');

      console.error(`Failed to clear ${section}:`, error);
      throw error;
    }
  }

  /**
   * Remove todas as seções do cache
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.clearAll();
   */
  async clearAll() {
    this._ensureInitialized();

    const startTime = Date.now();

    try {
      // Limpar ambos os stores
      await this.storage.clear(DB_CONFIG.STORES.SECTIONS);
      await this.storage.clear(DB_CONFIG.STORES.METADATA);

      // Resetar estatísticas
      this.statsTracker.updateTotalSize(0);
      this.statsTracker.updateSectionsCount(0);

      const duration = Date.now() - startTime;

      // Emitir evento
      this.eventEmitter.emit(EVENTS.CLEANUP_COMPLETE, {
        removed: 'all',
        duration
      });

      if (this.config.debug) {
        console.log(`Cleared all cache in ${duration}ms`);
      }

    } catch (error) {
      this.statsTracker.recordError('clearAll');
      console.error('Failed to clear all cache:', error);
      throw error;
    }
  }

  /**
   * Obtém lista de todas as seções em cache
   * 
   * @returns {Promise<string[]>} - Array com nomes das seções
   * 
   * @example
   * const sections = await cache.getSections();
   * console.log('Seções:', sections);
   */
  async getSections() {
    this._ensureInitialized();

    try {
      const keys = await this.storage.getAllKeys(DB_CONFIG.STORES.METADATA);
      return keys;
    } catch (error) {
      console.error('Failed to get sections:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas do cache
   * 
   * @returns {Promise<Statistics>} - Estatísticas completas
   * 
   * @example
   * const stats = await cache.getStats();
   * console.log('Hit rate:', stats.hitRatePercentage);
   * console.log('Tamanho total:', stats.totalSizeMB, 'MB');
   */
  async getStats() {
    this._ensureInitialized();

    try {
      // Atualizar tamanho total antes de retornar
      await this._updateTotalSize();
      
      return this.statsTracker.getStats();
    } catch (error) {
      console.error('Failed to get stats:', error);
      return this.statsTracker.getStats();
    }
  }

  /**
   * Obtém informações de quota de armazenamento
   * 
   * @returns {Promise<QuotaInfo>} - Informações de quota
   * 
   * @example
   * const quota = await cache.getQuota();
   * console.log(`Usando ${quota.percentage}% da quota`);
   */
  async getQuota() {
    this._ensureInitialized();

    try {
      // Verificar se Storage API está disponível
      if (!navigator.storage || !navigator.storage.estimate) {
        return {
          usage: 0,
          quota: 0,
          percentage: 0,
          available: 0
        };
      }

      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? usage / quota : 0;
      const available = quota - usage;

      return {
        usage,
        quota,
        percentage,
        available,
        usageMB: (usage / (1024 * 1024)).toFixed(2),
        quotaMB: (quota / (1024 * 1024)).toFixed(2),
        availableMB: (available / (1024 * 1024)).toFixed(2)
      };

    } catch (error) {
      console.error('Failed to get quota:', error);
      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        available: 0
      };
    }
  }

  /**
   * Obtém metadados de uma seção
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<Metadata|null>} - Metadados ou null
   * 
   * @example
   * const metadata = await cache.getMetadata('filmes');
   * console.log('Salvo em:', new Date(metadata.timestamp));
   */
  async getMetadata(section) {
    this._ensureInitialized();

    try {
      return await this.storage.get(DB_CONFIG.STORES.METADATA, section);
    } catch (error) {
      console.error(`Failed to get metadata for ${section}:`, error);
      return null;
    }
  }

  /**
   * Obtém informações completas sobre o cache
   * 
   * @returns {Promise<Object>} - Informações completas
   * 
   * @example
   * const info = await cache.getInfo();
   * console.log(info);
   */
  async getInfo() {
    this._ensureInitialized();

    try {
      const stats = await this.getStats();
      const quota = await this.getQuota();
      const sections = await this.getSections();

      return {
        initialized: this.initialized,
        useFallback: this.useFallback,
        features: this.features,
        config: this.config,
        stats,
        quota,
        sections,
        sectionsCount: sections.length
      };

    } catch (error) {
      console.error('Failed to get info:', error);
      return {
        initialized: this.initialized,
        useFallback: this.useFallback,
        features: this.features,
        error: error.message
      };
    }
  }

  /**
   * Fecha conexões e limpa recursos
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.close();
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }

    this.initialized = false;
  }

  // ============================================================
  // GERENCIAMENTO DE QUOTA E LIMPEZA
  // ============================================================

  /**
   * Verifica quota e emite warnings se necessário
   * 
   * @returns {Promise<QuotaInfo>} - Informações de quota
   * @private
   */
  async checkQuota() {
    try {
      const quota = await this.getQuota();

      // Emitir warning se acima do threshold
      if (quota.percentage > this.config.quotaWarningThreshold) {
        this.eventEmitter.emit(EVENTS.QUOTA_WARNING, {
          used: quota.usage,
          available: quota.available,
          percentage: quota.percentage
        });

        if (this.config.debug) {
          console.warn(`Quota warning: ${(quota.percentage * 100).toFixed(2)}% used`);
        }
      }

      // Emitir erro se quota excedida
      if (quota.percentage >= 0.95) {
        this.eventEmitter.emit(EVENTS.QUOTA_EXCEEDED, {
          used: quota.usage,
          available: quota.available
        });

        console.error('Quota exceeded! Storage is almost full.');
      }

      return quota;

    } catch (error) {
      console.error('Failed to check quota:', error);
      return null;
    }
  }

  /**
   * Limpa caches expirados
   * 
   * @returns {Promise<number>} - Número de caches removidos
   * 
   * @example
   * const removed = await cache.cleanupExpired();
   * console.log(`Removidos ${removed} caches expirados`);
   */
  async cleanupExpired() {
    return await this._cleanupExpiredCaches();
  }

  /**
   * Limpa caches menos usados (LRU - Least Recently Used)
   * 
   * @param {number} targetPercentage - Percentual alvo de uso (0-1)
   * @returns {Promise<number>} - Número de caches removidos
   * 
   * @example
   * // Limpar até ficar com 50% de uso
   * const removed = await cache.cleanupLRU(0.5);
   */
  async cleanupLRU(targetPercentage = 0.7) {
    this._ensureInitialized();

    try {
      console.log(`Starting LRU cleanup (target: ${(targetPercentage * 100).toFixed(0)}%)`);

      let quota = await this.getQuota();
      let removedCount = 0;

      // Se já está abaixo do target, não fazer nada
      if (quota.percentage <= targetPercentage) {
        return 0;
      }

      // Obter todas as seções com metadados
      const sections = await this.getSections();
      const sectionsWithMetadata = [];

      for (const section of sections) {
        const metadata = await this.getMetadata(section);
        if (metadata) {
          sectionsWithMetadata.push({
            section,
            lastAccessed: metadata.lastAccessed,
            accessCount: metadata.accessCount || 0,
            size: metadata.size
          });
        }
      }

      // Ordenar por último acesso (mais antigo primeiro)
      sectionsWithMetadata.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Remover seções até atingir target
      for (const item of sectionsWithMetadata) {
        if (quota.percentage <= targetPercentage) {
          break;
        }

        await this.clear(item.section);
        removedCount++;

        // Atualizar quota
        quota = await this.getQuota();

        if (this.config.debug) {
          console.log(`Removed ${item.section} (LRU). Quota now: ${(quota.percentage * 100).toFixed(2)}%`);
        }
      }

      console.log(`LRU cleanup complete. Removed ${removedCount} cache(s)`);

      this.eventEmitter.emit(EVENTS.CLEANUP_COMPLETE, {
        removed: removedCount,
        type: 'lru',
        finalPercentage: quota.percentage
      });

      return removedCount;

    } catch (error) {
      console.error('Failed to cleanup LRU:', error);
      return 0;
    }
  }

  /**
   * Executa limpeza automática se necessário
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _autoCleanup() {
    try {
      const quota = await this.getQuota();

      // Se quota está acima do threshold de limpeza, executar LRU
      if (quota.percentage > 0.85) {
        console.log('Auto cleanup triggered');
        await this.cleanupLRU(0.7);
      }

    } catch (error) {
      console.error('Failed to auto cleanup:', error);
    }
  }

  /**
   * Força limpeza de espaço
   * 
   * @param {number} bytesNeeded - Bytes necessários
   * @returns {Promise<boolean>} - true se conseguiu liberar espaço
   * 
   * @example
   * const freed = await cache.freeSpace(10 * 1024 * 1024); // 10MB
   */
  async freeSpace(bytesNeeded) {
    this._ensureInitialized();

    try {
      let quota = await this.getQuota();

      // Se já tem espaço suficiente, retornar true
      if (quota.available >= bytesNeeded) {
        return true;
      }

      // Tentar limpar expirados primeiro
      await this.cleanupExpired();
      quota = await this.getQuota();

      if (quota.available >= bytesNeeded) {
        return true;
      }

      // Calcular percentual necessário
      const neededPercentage = 1 - (bytesNeeded / quota.quota);

      // Tentar LRU
      await this.cleanupLRU(neededPercentage);
      quota = await this.getQuota();

      return quota.available >= bytesNeeded;

    } catch (error) {
      console.error('Failed to free space:', error);
      return false;
    }
  }

  /**
   * Obtém seções ordenadas por último acesso
   * 
   * @returns {Promise<Array>} - Array de seções com metadados
   * 
   * @example
   * const lru = await cache.getLRUSections();
   * console.log('Menos usado:', lru[0].section);
   */
  async getLRUSections() {
    this._ensureInitialized();

    try {
      const sections = await this.getSections();
      const sectionsWithMetadata = [];

      for (const section of sections) {
        const metadata = await this.getMetadata(section);
        if (metadata) {
          sectionsWithMetadata.push({
            section,
            lastAccessed: metadata.lastAccessed,
            accessCount: metadata.accessCount || 0,
            size: metadata.size,
            timestamp: metadata.timestamp,
            ttl: metadata.ttl
          });
        }
      }

      // Ordenar por último acesso (mais antigo primeiro)
      sectionsWithMetadata.sort((a, b) => a.lastAccessed - b.lastAccessed);

      return sectionsWithMetadata;

    } catch (error) {
      console.error('Failed to get LRU sections:', error);
      return [];
    }
  }

  // ============================================================
  // DOWNLOAD PROGRESSIVO E PRIORIZAÇÃO
  // ============================================================

  /**
   * Adiciona download de uma seção à fila
   * 
   * @param {string} section - Nome da seção
   * @param {string} url - URL para download
   * @param {number} priority - Prioridade (0=baixa, 1=média, 2=alta)
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.downloadSection('filmes', '/api/filmes', 2);
   */
  async downloadSection(section, url, priority = 0) {
    this._ensureInitialized();

    if (!this.downloadManager) {
      throw new Error('DownloadManager not initialized');
    }

    await this.downloadManager.enqueue(section, url, priority);
  }

  /**
   * Prioriza download de uma seção
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<void>}
   * 
   * @example
   * // Usuário clicou em "FILMES"
   * await cache.prioritizeSection('filmes');
   */
  async prioritizeSection(section) {
    this._ensureInitialized();

    if (!this.priorityManager) {
      throw new Error('PriorityManager not initialized');
    }

    await this.priorityManager.prioritizeSection(section);
  }

  /**
   * Cancela download de uma seção
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.cancelDownload('series');
   */
  async cancelDownload(section) {
    this._ensureInitialized();

    if (!this.downloadManager) {
      throw new Error('DownloadManager not initialized');
    }

    await this.downloadManager.cancel(section);
  }

  /**
   * Cancela todos os downloads
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.cancelAllDownloads();
   */
  async cancelAllDownloads() {
    this._ensureInitialized();

    if (!this.downloadManager) {
      throw new Error('DownloadManager not initialized');
    }

    await this.downloadManager.cancelAll();
  }

  /**
   * Obtém progresso de um download
   * 
   * @param {string} section - Nome da seção
   * @returns {number|null} - Progresso (0-100) ou null
   * 
   * @example
   * const progress = cache.getDownloadProgress('filmes');
   * console.log(`Progresso: ${progress}%`);
   */
  getDownloadProgress(section) {
    if (!this.downloadManager) {
      return null;
    }

    return this.downloadManager.getProgress(section);
  }

  /**
   * Obtém progresso de todos os downloads
   * 
   * @returns {Object.<string, number>} - Mapa de seção -> progresso
   * 
   * @example
   * const allProgress = cache.getAllDownloadProgress();
   * console.log('Filmes:', allProgress.filmes, '%');
   */
  getAllDownloadProgress() {
    if (!this.downloadManager) {
      return {};
    }

    return this.downloadManager.getAllProgress();
  }

  /**
   * Obtém status da fila de downloads
   * 
   * @returns {Object} - Status da fila
   * 
   * @example
   * const status = cache.getDownloadQueueStatus();
   * console.log('Downloads ativos:', status.active);
   */
  getDownloadQueueStatus() {
    if (!this.downloadManager) {
      return {
        total: 0,
        pending: 0,
        downloading: 0,
        completed: 0,
        failed: 0,
        active: 0
      };
    }

    return this.downloadManager.getQueueStatus();
  }

  /**
   * Inicia download progressivo em background de todas as seções
   * 
   * @param {Object.<string, string>} sectionsUrls - Mapa de seção -> URL
   * @returns {Promise<void>}
   * 
   * @example
   * await cache.startBackgroundDownload({
   *   filmes: '/api/filmes',
   *   series: '/api/series',
   *   canais: '/api/canais'
   * });
   */
  async startBackgroundDownload(sectionsUrls) {
    this._ensureInitialized();

    if (!this.downloadManager) {
      throw new Error('DownloadManager not initialized');
    }

    console.log('Starting background download for all sections...');

    // Adicionar todas as seções à fila com prioridade baixa
    for (const [section, url] of Object.entries(sectionsUrls)) {
      await this.downloadSection(section, url, 0); // Prioridade baixa
    }

    if (this.config.debug) {
      console.log('Background download started for', Object.keys(sectionsUrls).length, 'sections');
    }
  }

  /**
   * Carrega ou baixa uma seção (smart loading)
   * 
   * @param {string} section - Nome da seção
   * @param {string} url - URL para download (se necessário)
   * @param {number} priority - Prioridade do download
   * @returns {Promise<*>} - Dados da seção
   * 
   * @example
   * // Tenta carregar do cache, se não existir ou expirado, baixa
   * const filmes = await cache.loadOrDownload('filmes', '/api/filmes', 2);
   */
  async loadOrDownload(section, url, priority = 2) {
    this._ensureInitialized();

    // Tentar carregar do cache
    const cached = await this.load(section);

    if (cached) {
      if (this.config.debug) {
        console.log(`Loaded ${section} from cache`);
      }
      return cached;
    }

    // Não está em cache, baixar
    if (this.config.debug) {
      console.log(`${section} not in cache, downloading...`);
    }

    // Adicionar à fila com alta prioridade
    await this.downloadSection(section, url, priority);

    // Aguardar download completar
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const data = await this.load(section);
        
        if (data) {
          clearInterval(checkInterval);
          resolve(data);
        }

        // Verificar se falhou
        const status = this.getDownloadQueueStatus();
        const item = this.downloadManager.queue.find(item => item.section === section);
        
        if (item && item.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(`Download failed for ${section}`));
        }
      }, 500); // Verificar a cada 500ms

      // Timeout de 60 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Download timeout for ${section}`));
      }, 60000);
    });
  }

  // ============================================================
  // SINCRONIZAÇÃO E ATUALIZAÇÃO
  // ============================================================

  /**
   * Verifica se há atualizações disponíveis para uma seção
   * 
   * @param {string} section - Nome da seção
   * @param {string} versionUrl - URL para verificar versão
   * @returns {Promise<boolean>} - true se há atualizações
   * 
   * @example
   * const hasUpdates = await cache.checkForUpdates('filmes', '/api/filmes/version');
   */
  async checkForUpdates(section, versionUrl) {
    this._ensureInitialized();

    if (!this.syncManager) {
      throw new Error('SyncManager not initialized');
    }

    return await this.syncManager.checkForUpdates(section, versionUrl);
  }

  /**
   * Atualiza uma seção específica
   * 
   * @param {string} section - Nome da seção
   * @param {string} dataUrl - URL para baixar dados
   * @returns {Promise<boolean>} - true se atualizou com sucesso
   * 
   * @example
   * await cache.updateSection('filmes', '/api/filmes');
   */
  async updateSection(section, dataUrl) {
    this._ensureInitialized();

    if (!this.syncManager) {
      throw new Error('SyncManager not initialized');
    }

    return await this.syncManager.updateSection(section, dataUrl);
  }

  /**
   * Atualiza todas as seções
   * 
   * @param {Object.<string, string>} sectionsUrls - Mapa de seção -> URL
   * @returns {Promise<Object>} - Resultado das atualizações
   * 
   * @example
   * const result = await cache.updateAll({
   *   filmes: '/api/filmes',
   *   series: '/api/series'
   * });
   */
  async updateAll(sectionsUrls) {
    this._ensureInitialized();

    if (!this.syncManager) {
      throw new Error('SyncManager not initialized');
    }

    return await this.syncManager.updateAll(sectionsUrls);
  }

  /**
   * Verifica atualizações para todas as seções
   * 
   * @param {Object.<string, string>} sectionsVersionUrls - Mapa de seção -> URL de versão
   * @returns {Promise<string[]>} - Seções que têm atualizações
   * 
   * @example
   * const updates = await cache.checkAllForUpdates({
   *   filmes: '/api/filmes/version',
   *   series: '/api/series/version'
   * });
   */
  async checkAllForUpdates(sectionsVersionUrls) {
    this._ensureInitialized();

    if (!this.syncManager) {
      throw new Error('SyncManager not initialized');
    }

    return await this.syncManager.checkAllForUpdates(sectionsVersionUrls);
  }

  /**
   * Atualiza seções em background sem bloquear
   * 
   * @param {Object.<string, string>} sectionsUrls - Mapa de seção -> URL
   * @returns {void}
   * 
   * @example
   * cache.updateInBackground({
   *   filmes: '/api/filmes',
   *   series: '/api/series'
   * });
   */
  updateInBackground(sectionsUrls) {
    if (!this.syncManager) {
      console.warn('SyncManager not initialized');
      return;
    }

    this.syncManager.updateInBackground(sectionsUrls);
  }
}

export default CacheManager;
