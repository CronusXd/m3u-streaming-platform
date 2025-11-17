/**
 * CacheError - Classe de Erro Customizada
 * 
 * Fornece erros estruturados com códigos e detalhes para
 * facilitar debugging e tratamento de erros.
 */

import { ERROR_CODES } from './cache.config.js';

/**
 * Classe de erro customizada para o sistema de cache
 * 
 * @extends Error
 */
export class CacheError extends Error {
  /**
   * @param {string} message - Mensagem do erro
   * @param {string} code - Código do erro (E001-E009)
   * @param {*} details - Detalhes adicionais
   */
  constructor(message, code, details = null) {
    super(message);
    
    this.name = 'CacheError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    
    // Capturar stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheError);
    }
  }

  /**
   * Converte erro para JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Converte erro para string formatada
   * @returns {string}
   */
  toString() {
    let str = `${this.name} [${this.code}]: ${this.message}`;
    
    if (this.details) {
      str += `\nDetails: ${JSON.stringify(this.details, null, 2)}`;
    }
    
    return str;
  }

  /**
   * Cria erro de IndexedDB não disponível
   * @static
   * @param {string} details - Detalhes adicionais
   * @returns {CacheError}
   */
  static indexedDBNotAvailable(details = null) {
    return new CacheError(
      'IndexedDB is not available in this browser',
      ERROR_CODES.INDEXEDDB_NOT_AVAILABLE,
      details
    );
  }

  /**
   * Cria erro de quota excedida
   * @static
   * @param {Object} quotaInfo - Informações de quota
   * @returns {CacheError}
   */
  static quotaExceeded(quotaInfo = null) {
    return new CacheError(
      'Storage quota exceeded',
      ERROR_CODES.QUOTA_EXCEEDED,
      quotaInfo
    );
  }

  /**
   * Cria erro de download falhou
   * @static
   * @param {string} section - Nome da seção
   * @param {Error} originalError - Erro original
   * @returns {CacheError}
   */
  static downloadFailed(section, originalError = null) {
    return new CacheError(
      `Download failed for section: ${section}`,
      ERROR_CODES.DOWNLOAD_FAILED,
      {
        section,
        originalError: originalError?.message,
        stack: originalError?.stack
      }
    );
  }

  /**
   * Cria erro de compactação falhou
   * @static
   * @param {Error} originalError - Erro original
   * @returns {CacheError}
   */
  static compressionFailed(originalError = null) {
    return new CacheError(
      'Data compression failed',
      ERROR_CODES.COMPRESSION_FAILED,
      {
        originalError: originalError?.message
      }
    );
  }

  /**
   * Cria erro de seção inválida
   * @static
   * @param {string} section - Nome da seção
   * @returns {CacheError}
   */
  static invalidSection(section) {
    return new CacheError(
      `Invalid section name: ${section}`,
      ERROR_CODES.INVALID_SECTION,
      { section }
    );
  }

  /**
   * Cria erro de dados expirados
   * @static
   * @param {string} section - Nome da seção
   * @param {number} expiredAt - Timestamp de expiração
   * @returns {CacheError}
   */
  static expiredData(section, expiredAt) {
    return new CacheError(
      `Data expired for section: ${section}`,
      ERROR_CODES.EXPIRED_DATA,
      {
        section,
        expiredAt,
        expiredDate: new Date(expiredAt).toISOString()
      }
    );
  }

  /**
   * Cria erro de dados corrompidos
   * @static
   * @param {string} section - Nome da seção
   * @param {string} reason - Razão da corrupção
   * @returns {CacheError}
   */
  static corruptedData(section, reason) {
    return new CacheError(
      `Corrupted data for section: ${section}`,
      ERROR_CODES.CORRUPTED_DATA,
      {
        section,
        reason
      }
    );
  }

  /**
   * Cria erro de inicialização falhou
   * @static
   * @param {Error} originalError - Erro original
   * @returns {CacheError}
   */
  static initializationFailed(originalError = null) {
    return new CacheError(
      'Cache initialization failed',
      ERROR_CODES.INITIALIZATION_FAILED,
      {
        originalError: originalError?.message,
        stack: originalError?.stack
      }
    );
  }

  /**
   * Cria erro de storage não disponível
   * @static
   * @returns {CacheError}
   */
  static storageNotAvailable() {
    return new CacheError(
      'No storage mechanism available (IndexedDB or LocalStorage)',
      ERROR_CODES.STORAGE_NOT_AVAILABLE
    );
  }
}

/**
 * ErrorHandler - Gerenciador de Erros
 * 
 * Centraliza o tratamento de erros do sistema de cache.
 */
export class ErrorHandler {
  constructor() {
    /**
     * Contadores de erros por tipo
     * @type {Map<string, number>}
     * @private
     */
    this.errorCounts = new Map();

    /**
     * Histórico de erros
     * @type {Array}
     * @private
     */
    this.errorHistory = [];

    /**
     * Limite do histórico
     * @private
     */
    this.maxHistorySize = 100;
  }

  /**
   * Trata um erro
   * 
   * @param {Error} error - Erro a tratar
   * @param {Object} context - Contexto adicional
   * @returns {CacheError} - Erro tratado
   */
  handle(error, context = {}) {
    // Converter para CacheError se não for
    let cacheError;
    
    if (error instanceof CacheError) {
      cacheError = error;
    } else {
      cacheError = new CacheError(
        error.message || 'Unknown error',
        'E000',
        {
          originalError: error.message,
          stack: error.stack,
          context
        }
      );
    }

    // Registrar erro
    this._recordError(cacheError);

    // Log no console
    console.error(cacheError.toString());

    return cacheError;
  }

  /**
   * Registra erro no histórico
   * @private
   * @param {CacheError} error - Erro
   */
  _recordError(error) {
    // Incrementar contador
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);

    // Adicionar ao histórico
    this.errorHistory.push({
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      details: error.details
    });

    // Limitar tamanho do histórico
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Obtém contadores de erros
   * @returns {Object}
   */
  getErrorCounts() {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Obtém histórico de erros
   * @returns {Array}
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Obtém últimos N erros
   * @param {number} count - Número de erros
   * @returns {Array}
   */
  getRecentErrors(count = 10) {
    return this.errorHistory.slice(-count);
  }

  /**
   * Limpa histórico de erros
   */
  clearHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  /**
   * Gera relatório de erros
   * @returns {string}
   */
  getReport() {
    let report = '=== Error Report ===\n\n';
    
    report += 'Error Counts:\n';
    for (const [code, count] of this.errorCounts.entries()) {
      report += `  ${code}: ${count}\n`;
    }
    
    report += `\nTotal Errors: ${this.errorHistory.length}\n`;
    
    if (this.errorHistory.length > 0) {
      report += '\nRecent Errors:\n';
      const recent = this.getRecentErrors(5);
      
      for (const error of recent) {
        const date = new Date(error.timestamp).toISOString();
        report += `  [${date}] ${error.code}: ${error.message}\n`;
      }
    }
    
    return report;
  }
}

export default CacheError;
