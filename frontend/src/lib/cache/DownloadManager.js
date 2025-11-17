/**
 * DownloadManager - Gerenciamento de Downloads Progressivos
 * 
 * Gerencia fila de downloads com priorização, retry automático
 * e controle de concorrência.
 * 
 * @example
 * const manager = new DownloadManager(cacheManager);
 * await manager.enqueue('filmes', '/api/filmes', 2);
 * manager.on('download:progress', (data) => console.log(data.progress));
 */

/// <reference path="./cache.types.js" />

import { DOWNLOAD_CONFIG, DOWNLOAD_STATUS, PRIORITY, EVENTS } from './cache.config.js';

export class DownloadManager {
  /**
   * @param {Object} cacheManager - Instância do CacheManager
   */
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    
    /**
     * Fila de downloads
     * @type {QueueItem[]}
     * @private
     */
    this.queue = [];
    
    /**
     * Downloads ativos
     * @type {Map<string, AbortController>}
     * @private
     */
    this.activeDownloads = new Map();
    
    /**
     * Configuração
     * @private
     */
    this.config = {
      maxConcurrent: DOWNLOAD_CONFIG.MAX_CONCURRENT,
      maxRetries: DOWNLOAD_CONFIG.MAX_RETRIES,
      baseDelay: DOWNLOAD_CONFIG.RETRY_BASE_DELAY,
      maxDelay: DOWNLOAD_CONFIG.RETRY_MAX_DELAY
    };
  }

  /**
   * Adiciona download à fila
   * 
   * @param {string} section - Nome da seção
   * @param {string} url - URL para download
   * @param {number} priority - Prioridade (0=baixa, 1=média, 2=alta)
   * @returns {Promise<void>}
   * 
   * @example
   * await manager.enqueue('filmes', '/api/filmes', PRIORITY.HIGH);
   */
  async enqueue(section, url, priority = PRIORITY.LOW) {
    // Verificar se já está na fila
    const existing = this.queue.find(item => item.section === section);
    if (existing) {
      // Atualizar prioridade se for maior
      if (priority > existing.priority) {
        existing.priority = priority;
        this._sortQueue();
      }
      return;
    }

    // Adicionar à fila
    const item = {
      section,
      url,
      priority,
      status: DOWNLOAD_STATUS.PENDING,
      progress: 0,
      retries: 0,
      error: null
    };

    this.queue.push(item);
    this._sortQueue();

    // Emitir evento
    this._emit(EVENTS.DOWNLOAD_START, { section, url });

    // Processar fila
    await this._processQueue();
  }

  /**
   * Remove download da fila
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<void>}
   * 
   * @example
   * await manager.dequeue('filmes');
   */
  async dequeue(section) {
    const index = this.queue.findIndex(item => item.section === section);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Cancela download em andamento
   * 
   * @param {string} section - Nome da seção
   * @returns {Promise<void>}
   * 
   * @example
   * await manager.cancel('filmes');
   */
  async cancel(section) {
    // Cancelar se estiver ativo
    if (this.activeDownloads.has(section)) {
      const controller = this.activeDownloads.get(section);
      controller.abort();
      this.activeDownloads.delete(section);
    }

    // Remover da fila
    const item = this.queue.find(item => item.section === section);
    if (item) {
      item.status = DOWNLOAD_STATUS.CANCELLED;
      await this.dequeue(section);
    }
  }

  /**
   * Cancela todos os downloads
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await manager.cancelAll();
   */
  async cancelAll() {
    // Cancelar todos os ativos
    for (const [section, controller] of this.activeDownloads.entries()) {
      controller.abort();
    }
    this.activeDownloads.clear();

    // Limpar fila
    this.queue = [];
  }

  /**
   * Realiza download de uma seção
   * 
   * @param {string} section - Nome da seção
   * @param {string} url - URL para download
   * @returns {Promise<*>} - Dados baixados
   * @private
   */
  async download(section, url) {
    const controller = new AbortController();
    this.activeDownloads.set(section, controller);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Obter tamanho total
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Ler resposta com progresso
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Calcular progresso
        const progress = total > 0 ? (loaded / total) * 100 : 0;

        // Atualizar item na fila
        const item = this.queue.find(item => item.section === section);
        if (item) {
          item.progress = progress;
        }

        // Emitir evento de progresso
        this._emit(EVENTS.DOWNLOAD_PROGRESS, {
          section,
          progress: Math.round(progress),
          loaded,
          total
        });
      }

      // Concatenar chunks
      const blob = new Blob(chunks);
      const text = await blob.text();
      const data = JSON.parse(text);

      this.activeDownloads.delete(section);

      return data;

    } catch (error) {
      this.activeDownloads.delete(section);

      // Se foi cancelado, não é erro
      if (error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }

      throw error;
    }
  }

  /**
   * Tenta download com retry automático
   * 
   * @param {string} section - Nome da seção
   * @param {string} url - URL para download
   * @param {number} attempt - Tentativa atual
   * @returns {Promise<*>} - Dados baixados
   * @private
   */
  async retry(section, url, attempt = 0) {
    try {
      const startTime = Date.now();
      const data = await this.download(section, url);
      const duration = Date.now() - startTime;

      // Emitir evento de sucesso
      this._emit(EVENTS.DOWNLOAD_COMPLETE, {
        section,
        size: JSON.stringify(data).length,
        duration
      });

      return data;

    } catch (error) {
      // Se foi cancelado, não tentar novamente
      if (error.message === 'Download cancelled') {
        throw error;
      }

      // Se atingiu máximo de tentativas, falhar
      if (attempt >= this.config.maxRetries - 1) {
        this._emit(EVENTS.DOWNLOAD_ERROR, {
          section,
          error,
          retries: attempt + 1
        });
        throw error;
      }

      // Calcular delay com backoff exponencial
      const delay = Math.min(
        this.config.baseDelay * Math.pow(2, attempt),
        this.config.maxDelay
      );

      console.warn(`Download failed for ${section}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.config.maxRetries})`);

      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, delay));

      // Tentar novamente
      return this.retry(section, url, attempt + 1);
    }
  }

  /**
   * Processa fila de downloads
   * @private
   */
  async _processQueue() {
    // Verificar quantos downloads ativos
    if (this.activeDownloads.size >= this.config.maxConcurrent) {
      return;
    }

    // Obter próximo item pendente
    const item = this.queue.find(
      item => item.status === DOWNLOAD_STATUS.PENDING
    );

    if (!item) {
      return;
    }

    // Marcar como downloading
    item.status = DOWNLOAD_STATUS.DOWNLOADING;

    try {
      // Realizar download com retry
      const data = await this.retry(item.section, item.url, item.retries);

      // Salvar no cache
      if (this.cacheManager) {
        await this.cacheManager.save(item.section, data);
      }

      // Marcar como completo
      item.status = DOWNLOAD_STATUS.COMPLETED;
      item.progress = 100;

      // Remover da fila
      await this.dequeue(item.section);

    } catch (error) {
      // Marcar como falho
      item.status = DOWNLOAD_STATUS.FAILED;
      item.error = error;

      console.error(`Download failed for ${item.section}:`, error);
    }

    // Processar próximo item
    await this._processQueue();
  }

  /**
   * Ordena fila por prioridade
   * @private
   */
  _sortQueue() {
    this.queue.sort((a, b) => {
      // Prioridade maior primeiro
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      
      // Mesma prioridade: ordem de chegada (FIFO)
      return 0;
    });
  }

  /**
   * Obtém progresso de um download
   * 
   * @param {string} section - Nome da seção
   * @returns {number|null} - Progresso (0-100) ou null
   * 
   * @example
   * const progress = manager.getProgress('filmes');
   */
  getProgress(section) {
    const item = this.queue.find(item => item.section === section);
    return item ? item.progress : null;
  }

  /**
   * Obtém progresso de todos os downloads
   * 
   * @returns {Object.<string, number>} - Mapa de seção -> progresso
   * 
   * @example
   * const allProgress = manager.getAllProgress();
   * console.log('Filmes:', allProgress.filmes, '%');
   */
  getAllProgress() {
    const progress = {};
    
    for (const item of this.queue) {
      progress[item.section] = item.progress;
    }

    return progress;
  }

  /**
   * Obtém status da fila
   * 
   * @returns {Object} - Status da fila
   * 
   * @example
   * const status = manager.getQueueStatus();
   * console.log('Downloads ativos:', status.active);
   */
  getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(item => item.status === DOWNLOAD_STATUS.PENDING).length,
      downloading: this.queue.filter(item => item.status === DOWNLOAD_STATUS.DOWNLOADING).length,
      completed: this.queue.filter(item => item.status === DOWNLOAD_STATUS.COMPLETED).length,
      failed: this.queue.filter(item => item.status === DOWNLOAD_STATUS.FAILED).length,
      active: this.activeDownloads.size
    };
  }

  /**
   * Emite evento através do CacheManager
   * @private
   */
  _emit(event, data) {
    if (this.cacheManager && this.cacheManager.eventEmitter) {
      this.cacheManager.eventEmitter.emit(event, data);
    }
  }

  /**
   * Registra listener de evento
   * 
   * @param {string} event - Nome do evento
   * @param {Function} callback - Callback
   * 
   * @example
   * manager.on('download:progress', (data) => {
   *   console.log(`${data.section}: ${data.progress}%`);
   * });
   */
  on(event, callback) {
    if (this.cacheManager && this.cacheManager.eventEmitter) {
      this.cacheManager.eventEmitter.on(event, callback);
    }
  }

  /**
   * Remove listener de evento
   * 
   * @param {string} event - Nome do evento
   * @param {Function} callback - Callback
   */
  off(event, callback) {
    if (this.cacheManager && this.cacheManager.eventEmitter) {
      this.cacheManager.eventEmitter.off(event, callback);
    }
  }
}

export default DownloadManager;
