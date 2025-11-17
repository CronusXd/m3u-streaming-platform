/**
 * CompressionModule - Compactação de Dados usando LZ-String
 * 
 * Fornece métodos para comprimir e descomprimir dados grandes,
 * reduzindo o espaço de armazenamento necessário.
 * 
 * @example
 * const compression = new CompressionModule(1024);
 * const compressed = compression.compress(largeData);
 * const decompressed = compression.decompress(compressed);
 */

/// <reference path="./cache.types.js" />

import { CACHE_CONFIG, ERROR_CODES } from './cache.config.js';

export class CompressionModule {
  /**
   * @param {number} threshold - Tamanho mínimo em bytes para compactar (padrão: 1KB)
   */
  constructor(threshold = CACHE_CONFIG.COMPRESSION_THRESHOLD) {
    this.threshold = threshold;
    
    /**
     * Verifica se LZ-String está disponível
     * @type {boolean}
     */
    this.enabled = this._checkLZStringAvailability();
    
    if (!this.enabled) {
      console.warn('LZ-String not available. Compression will be disabled.');
    }
  }

  /**
   * Verifica se os dados devem ser compactados
   * 
   * @param {*} data - Dados a verificar
   * @returns {boolean} - true se deve comprimir
   * 
   * @example
   * if (compression.shouldCompress(data)) {
   *   data = compression.compress(data);
   * }
   */
  shouldCompress(data) {
    // Se compactação não está disponível, retornar false
    if (!this.enabled) {
      return false;
    }

    // Estimar tamanho dos dados
    const size = this.estimateSize(data);
    
    // Comprimir apenas se maior que threshold
    return size > this.threshold;
  }

  /**
   * Comprime dados usando LZ-String
   * 
   * @param {*} data - Dados a comprimir
   * @returns {string|*} - Dados comprimidos ou originais se falhar
   * 
   * @example
   * const compressed = compression.compress({ large: 'data' });
   */
  compress(data) {
    // Se compactação não está disponível, retornar dados originais
    if (!this.enabled) {
      return data;
    }

    try {
      // Serializar para JSON
      const jsonString = JSON.stringify(data);
      
      // Verificar se vale a pena comprimir
      const originalSize = new Blob([jsonString]).size;
      
      if (originalSize <= this.threshold) {
        return data;
      }

      // Comprimir usando LZ-String
      const compressed = LZString.compress(jsonString);
      
      // Verificar se compactação reduziu o tamanho
      const compressedSize = new Blob([compressed]).size;
      
      if (compressedSize >= originalSize) {
        // Compactação não ajudou, retornar original
        console.warn('Compression did not reduce size. Using original data.');
        return data;
      }

      return compressed;

    } catch (error) {
      console.error(`${ERROR_CODES.COMPRESSION_FAILED}: Failed to compress data:`, error);
      // Retornar dados originais em caso de erro
      return data;
    }
  }

  /**
   * Descomprime dados usando LZ-String
   * 
   * @param {string|*} data - Dados a descomprimir
   * @returns {*} - Dados descomprimidos ou originais se não for string
   * 
   * @example
   * const decompressed = compression.decompress(compressedData);
   */
  decompress(data) {
    // Se não for string, assumir que não está comprimido
    if (typeof data !== 'string') {
      return data;
    }

    // Se compactação não está disponível, retornar dados originais
    if (!this.enabled) {
      return data;
    }

    try {
      // Tentar descomprimir
      const decompressed = LZString.decompress(data);
      
      // Se descompressão falhou, retornar original
      if (decompressed === null || decompressed === undefined) {
        console.warn('Failed to decompress data. Returning original.');
        return data;
      }

      // Parsear JSON
      return JSON.parse(decompressed);

    } catch (error) {
      console.error(`${ERROR_CODES.COMPRESSION_FAILED}: Failed to decompress data:`, error);
      
      // Tentar retornar como JSON se possível
      try {
        return JSON.parse(data);
      } catch {
        // Se não for JSON válido, retornar original
        return data;
      }
    }
  }

  /**
   * Estima o tamanho dos dados em bytes
   * 
   * @param {*} data - Dados a estimar
   * @returns {number} - Tamanho estimado em bytes
   * 
   * @example
   * const size = compression.estimateSize(data);
   * console.log(`Tamanho: ${size} bytes`);
   */
  estimateSize(data) {
    try {
      // Se for string, calcular tamanho direto
      if (typeof data === 'string') {
        return new Blob([data]).size;
      }

      // Serializar para JSON e calcular tamanho
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;

    } catch (error) {
      console.error('Failed to estimate size:', error);
      return 0;
    }
  }

  /**
   * Calcula a taxa de compressão
   * 
   * @param {*} original - Dados originais
   * @param {string} compressed - Dados comprimidos
   * @returns {number} - Taxa de compressão (0-1)
   * 
   * @example
   * const ratio = compression.getCompressionRatio(original, compressed);
   * console.log(`Compressão: ${(ratio * 100).toFixed(2)}%`);
   */
  getCompressionRatio(original, compressed) {
    try {
      const originalSize = this.estimateSize(original);
      const compressedSize = this.estimateSize(compressed);
      
      if (originalSize === 0) {
        return 0;
      }

      return 1 - (compressedSize / originalSize);

    } catch (error) {
      console.error('Failed to calculate compression ratio:', error);
      return 0;
    }
  }

  /**
   * Verifica se LZ-String está disponível
   * @private
   * @returns {boolean}
   */
  _checkLZStringAvailability() {
    try {
      // Verificar se LZ-String está disponível globalmente
      if (typeof LZString !== 'undefined') {
        return true;
      }

      // Verificar se está disponível como módulo
      if (typeof window !== 'undefined' && window.LZString) {
        return true;
      }

      return false;

    } catch (error) {
      return false;
    }
  }

  /**
   * Retorna informações sobre o módulo
   * 
   * @returns {Object} - Informações do módulo
   * 
   * @example
   * const info = compression.getInfo();
   * console.log('Compactação habilitada:', info.enabled);
   */
  getInfo() {
    return {
      enabled: this.enabled,
      threshold: this.threshold,
      thresholdKB: (this.threshold / 1024).toFixed(2),
      library: this.enabled ? 'LZ-String' : 'none'
    };
  }

  /**
   * Verifica se LZ-String está disponível (método estático)
   * 
   * @static
   * @returns {boolean}
   * 
   * @example
   * if (CompressionModule.isAvailable()) {
   *   // Usar compactação
   * }
   */
  static isAvailable() {
    try {
      return typeof LZString !== 'undefined' || 
             (typeof window !== 'undefined' && typeof window.LZString !== 'undefined');
    } catch {
      return false;
    }
  }
}

export default CompressionModule;
