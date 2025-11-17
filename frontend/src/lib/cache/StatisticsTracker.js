/**
 * StatisticsTracker - Rastreamento de Métricas e Estatísticas
 * 
 * Coleta e agrega métricas de uso do cache para monitoramento
 * e análise de performance.
 * 
 * @example
 * const stats = new StatisticsTracker();
 * stats.recordHit();
 * stats.recordOperation('save', 150);
 * const metrics = stats.getStats();
 */

/// <reference path="./cache.types.js" />

export class StatisticsTracker {
  constructor() {
    /**
     * @type {Statistics}
     * @private
     */
    this.stats = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      sectionsCount: 0,
      operations: {},
      errors: {}
    };

    // Timestamp de início
    this.startTime = Date.now();
  }

  /**
   * Registra um cache hit
   * 
   * @example
   * stats.recordHit();
   */
  recordHit() {
    this.stats.hits++;
  }

  /**
   * Registra um cache miss
   * 
   * @example
   * stats.recordMiss();
   */
  recordMiss() {
    this.stats.misses++;
  }

  /**
   * Registra uma operação com seu tempo de execução
   * 
   * @param {string} type - Tipo da operação (save, load, clear, etc.)
   * @param {number} duration - Duração em milissegundos
   * 
   * @example
   * const start = Date.now();
   * // ... operação
   * stats.recordOperation('save', Date.now() - start);
   */
  recordOperation(type, duration) {
    if (!this.stats.operations[type]) {
      this.stats.operations[type] = {
        count: 0,
        totalTime: 0
      };
    }

    this.stats.operations[type].count++;
    this.stats.operations[type].totalTime += duration;
  }

  /**
   * Registra um erro
   * 
   * @param {string} type - Tipo do erro (indexeddb, compression, download, quota)
   * 
   * @example
   * stats.recordError('download');
   */
  recordError(type) {
    if (!this.stats.errors[type]) {
      this.stats.errors[type] = 0;
    }

    this.stats.errors[type]++;
  }

  /**
   * Atualiza o tamanho total do cache
   * 
   * @param {number} size - Tamanho em bytes
   * 
   * @example
   * stats.updateTotalSize(1024000);
   */
  updateTotalSize(size) {
    this.stats.totalSize = size;
  }

  /**
   * Atualiza o número de seções
   * 
   * @param {number} count - Número de seções
   * 
   * @example
   * stats.updateSectionsCount(5);
   */
  updateSectionsCount(count) {
    this.stats.sectionsCount = count;
  }

  /**
   * Obtém estatísticas completas
   * 
   * @returns {Statistics} - Estatísticas com médias calculadas
   * 
   * @example
   * const stats = tracker.getStats();
   * console.log('Cache hits:', stats.hits);
   * console.log('Tempo médio de save:', stats.operations.save.avgTime);
   */
  getStats() {
    // Calcular médias para cada operação
    const operations = {};
    
    for (const [type, data] of Object.entries(this.stats.operations)) {
      operations[type] = {
        count: data.count,
        totalTime: data.totalTime,
        avgTime: data.count > 0 ? data.totalTime / data.count : 0
      };
    }

    // Calcular hit rate
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    // Calcular uptime
    const uptime = Date.now() - this.startTime;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate,
      hitRatePercentage: (hitRate * 100).toFixed(2),
      totalSize: this.stats.totalSize,
      totalSizeMB: (this.stats.totalSize / (1024 * 1024)).toFixed(2),
      sectionsCount: this.stats.sectionsCount,
      operations: operations,
      errors: { ...this.stats.errors },
      uptime: uptime,
      uptimeSeconds: Math.floor(uptime / 1000)
    };
  }

  /**
   * Obtém estatísticas de uma operação específica
   * 
   * @param {string} type - Tipo da operação
   * @returns {OperationStats|null} - Estatísticas da operação
   * 
   * @example
   * const saveStats = tracker.getOperationStats('save');
   * console.log('Saves realizados:', saveStats.count);
   */
  getOperationStats(type) {
    if (!this.stats.operations[type]) {
      return null;
    }

    const data = this.stats.operations[type];
    
    return {
      count: data.count,
      totalTime: data.totalTime,
      avgTime: data.count > 0 ? data.totalTime / data.count : 0
    };
  }

  /**
   * Obtém estatísticas de erros
   * 
   * @returns {Object.<string, number>} - Contadores de erros
   * 
   * @example
   * const errors = tracker.getErrorStats();
   * console.log('Erros de download:', errors.download);
   */
  getErrorStats() {
    return { ...this.stats.errors };
  }

  /**
   * Obtém taxa de hit do cache
   * 
   * @returns {number} - Taxa de hit (0-1)
   * 
   * @example
   * const hitRate = tracker.getHitRate();
   * console.log(`Hit rate: ${(hitRate * 100).toFixed(2)}%`);
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Obtém tempo médio de uma operação
   * 
   * @param {string} type - Tipo da operação
   * @returns {number} - Tempo médio em ms
   * 
   * @example
   * const avgTime = tracker.getAverageTime('load');
   * console.log(`Tempo médio de load: ${avgTime}ms`);
   */
  getAverageTime(type) {
    const stats = this.getOperationStats(type);
    return stats ? stats.avgTime : 0;
  }

  /**
   * Obtém total de erros
   * 
   * @returns {number} - Total de erros
   * 
   * @example
   * const totalErrors = tracker.getTotalErrors();
   */
  getTotalErrors() {
    return Object.values(this.stats.errors).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Reseta todas as estatísticas
   * 
   * @example
   * tracker.reset();
   */
  reset() {
    this.stats = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      sectionsCount: 0,
      operations: {},
      errors: {}
    };

    this.startTime = Date.now();
  }

  /**
   * Reseta estatísticas de uma operação específica
   * 
   * @param {string} type - Tipo da operação
   * 
   * @example
   * tracker.resetOperation('save');
   */
  resetOperation(type) {
    if (this.stats.operations[type]) {
      delete this.stats.operations[type];
    }
  }

  /**
   * Reseta contadores de erros
   * 
   * @example
   * tracker.resetErrors();
   */
  resetErrors() {
    this.stats.errors = {};
  }

  /**
   * Exporta estatísticas em formato JSON
   * 
   * @returns {string} - JSON string
   * 
   * @example
   * const json = tracker.exportJSON();
   * localStorage.setItem('cache-stats', json);
   */
  exportJSON() {
    return JSON.stringify(this.getStats(), null, 2);
  }

  /**
   * Importa estatísticas de JSON
   * 
   * @param {string} json - JSON string
   * @returns {boolean} - true se importou com sucesso
   * 
   * @example
   * const json = localStorage.getItem('cache-stats');
   * tracker.importJSON(json);
   */
  importJSON(json) {
    try {
      const data = JSON.parse(json);
      
      this.stats.hits = data.hits || 0;
      this.stats.misses = data.misses || 0;
      this.stats.totalSize = data.totalSize || 0;
      this.stats.sectionsCount = data.sectionsCount || 0;
      
      // Importar operações (remover avgTime pois é calculado)
      if (data.operations) {
        this.stats.operations = {};
        for (const [type, stats] of Object.entries(data.operations)) {
          this.stats.operations[type] = {
            count: stats.count || 0,
            totalTime: stats.totalTime || 0
          };
        }
      }
      
      if (data.errors) {
        this.stats.errors = { ...data.errors };
      }

      return true;

    } catch (error) {
      console.error('Failed to import statistics:', error);
      return false;
    }
  }

  /**
   * Gera relatório resumido em texto
   * 
   * @returns {string} - Relatório formatado
   * 
   * @example
   * console.log(tracker.getReport());
   */
  getReport() {
    const stats = this.getStats();
    
    let report = '=== Cache Statistics Report ===\n\n';
    
    report += `Cache Performance:\n`;
    report += `  Hits: ${stats.hits}\n`;
    report += `  Misses: ${stats.misses}\n`;
    report += `  Hit Rate: ${stats.hitRatePercentage}%\n\n`;
    
    report += `Storage:\n`;
    report += `  Total Size: ${stats.totalSizeMB} MB\n`;
    report += `  Sections: ${stats.sectionsCount}\n\n`;
    
    if (Object.keys(stats.operations).length > 0) {
      report += `Operations:\n`;
      for (const [type, data] of Object.entries(stats.operations)) {
        report += `  ${type}: ${data.count} ops, avg ${data.avgTime.toFixed(2)}ms\n`;
      }
      report += '\n';
    }
    
    if (Object.keys(stats.errors).length > 0) {
      report += `Errors:\n`;
      for (const [type, count] of Object.entries(stats.errors)) {
        report += `  ${type}: ${count}\n`;
      }
      report += '\n';
    }
    
    report += `Uptime: ${stats.uptimeSeconds}s\n`;
    
    return report;
  }

  /**
   * Obtém snapshot das estatísticas atuais
   * 
   * @returns {Object} - Snapshot das estatísticas
   * 
   * @example
   * const snapshot = tracker.snapshot();
   */
  snapshot() {
    return {
      timestamp: Date.now(),
      stats: this.getStats()
    };
  }
}

export default StatisticsTracker;
