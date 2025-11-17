/**
 * LocalStorageFallback - Fallback para LocalStorage
 * 
 * Fornece fallback quando IndexedDB não está disponível.
 * IMPORTANTE: Apenas para metadados pequenos (<100KB), não para dados grandes.
 * 
 * @example
 * const fallback = new LocalStorageFallback(100 * 1024);
 * if (fallback.isAvailable()) {
 *   await fallback.save('metadata', { timestamp: Date.now() });
 * }
 */

/// <reference path="./cache.types.js" />

import { CACHE_CONFIG, ERROR_CODES } from './cache.config.js';

export class LocalStorageFallback {
  /**
   * @param {number} maxSize - Tamanho máximo em bytes (padrão: 100KB)
   */
  constructor(maxSize = CACHE_CONFIG.LOCALSTORAGE_MAX_SIZE) {
    this.maxSize = maxSize;
    this.prefix = CACHE_CONFIG.LOCALSTORAGE_PREFIX;
    this.available = this._checkAvailability();

    if (!this.available) {
      console.warn('LocalStorage not available. Fallback will not work.');
    }
  }

  /**
   * Verifica se LocalStorage está disponível
   * 
   * @returns {boolean} - true se disponível
   * 
   * @example
   * if (fallback.isAvailable()) {
   *   // Usar LocalStorage
   * }
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Salva dados no LocalStorage
   * 
   * @param {string} key - Chave
   * @param {*} value - Valor a salvar
   * @returns {Promise<boolean>} - true se salvou com sucesso
   * 
   * @example
   * await fallback.save('metadata', { timestamp: Date.now() });
   */
  async save(key, value) {
    if (!this.available) {
      throw new Error(`${ERROR_CODES.STORAGE_NOT_AVAILABLE}: LocalStorage not available`);
    }

    try {
      // Serializar valor
      const serialized = JSON.stringify(value);
      const size = new Blob([serialized]).size;

      // Verificar tamanho
      if (size > this.maxSize) {
        throw new Error(
          `${ERROR_CODES.QUOTA_EXCEEDED}: Data size (${size} bytes) exceeds max size (${this.maxSize} bytes)`
        );
      }

      // Salvar com prefixo
      const prefixedKey = this._getPrefixedKey(key);
      localStorage.setItem(prefixedKey, serialized);

      return true;

    } catch (error) {
      // Verificar se é erro de quota
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.error(`${ERROR_CODES.QUOTA_EXCEEDED}: LocalStorage quota exceeded`);
        throw new Error(`${ERROR_CODES.QUOTA_EXCEEDED}: LocalStorage quota exceeded`);
      }

      console.error('Failed to save to LocalStorage:', error);
      throw error;
    }
  }

  /**
   * Carrega dados do LocalStorage
   * 
   * @param {string} key - Chave
   * @returns {Promise<*|null>} - Valor ou null se não existir
   * 
   * @example
   * const data = await fallback.load('metadata');
   */
  async load(key) {
    if (!this.available) {
      return null;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      const serialized = localStorage.getItem(prefixedKey);

      if (serialized === null) {
        return null;
      }

      return JSON.parse(serialized);

    } catch (error) {
      console.error('Failed to load from LocalStorage:', error);
      return null;
    }
  }

  /**
   * Remove dados do LocalStorage
   * 
   * @param {string} key - Chave
   * @returns {Promise<void>}
   * 
   * @example
   * await fallback.remove('metadata');
   */
  async remove(key) {
    if (!this.available) {
      return;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error('Failed to remove from LocalStorage:', error);
    }
  }

  /**
   * Limpa todos os dados do cache
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await fallback.clear();
   */
  async clear() {
    if (!this.available) {
      return;
    }

    try {
      // Obter todas as chaves com o prefixo
      const keys = this._getAllKeys();

      // Remover cada uma
      for (const key of keys) {
        localStorage.removeItem(key);
      }

    } catch (error) {
      console.error('Failed to clear LocalStorage:', error);
    }
  }

  /**
   * Obtém o tamanho total usado pelo cache
   * 
   * @returns {Promise<number>} - Tamanho em bytes
   * 
   * @example
   * const size = await fallback.getSize();
   * console.log(`Usando ${size} bytes`);
   */
  async getSize() {
    if (!this.available) {
      return 0;
    }

    try {
      let totalSize = 0;
      const keys = this._getAllKeys();

      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      return totalSize;

    } catch (error) {
      console.error('Failed to calculate size:', error);
      return 0;
    }
  }

  /**
   * Obtém todas as chaves do cache
   * 
   * @returns {Promise<string[]>} - Array de chaves (sem prefixo)
   * 
   * @example
   * const keys = await fallback.getAllKeys();
   */
  async getAllKeys() {
    if (!this.available) {
      return [];
    }

    try {
      const prefixedKeys = this._getAllKeys();
      
      // Remover prefixo das chaves
      return prefixedKeys.map(key => key.replace(this.prefix, ''));

    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Verifica se uma chave existe
   * 
   * @param {string} key - Chave
   * @returns {Promise<boolean>} - true se existe
   * 
   * @example
   * if (await fallback.exists('metadata')) {
   *   // Chave existe
   * }
   */
  async exists(key) {
    if (!this.available) {
      return false;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      return localStorage.getItem(prefixedKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém informações sobre o fallback
   * 
   * @returns {Promise<Object>} - Informações
   * 
   * @example
   * const info = await fallback.getInfo();
   * console.log('Espaço usado:', info.usedMB, 'MB');
   */
  async getInfo() {
    const size = await this.getSize();
    const keys = await this.getAllKeys();

    return {
      available: this.available,
      maxSize: this.maxSize,
      maxSizeKB: (this.maxSize / 1024).toFixed(2),
      usedSize: size,
      usedSizeKB: (size / 1024).toFixed(2),
      usedPercentage: ((size / this.maxSize) * 100).toFixed(2),
      keysCount: keys.length,
      prefix: this.prefix
    };
  }

  /**
   * Verifica disponibilidade do LocalStorage
   * @private
   * @returns {boolean}
   */
  _checkAvailability() {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      // Testar se podemos escrever
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém chave com prefixo
   * @private
   * @param {string} key - Chave original
   * @returns {string} - Chave com prefixo
   */
  _getPrefixedKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Obtém todas as chaves com o prefixo
   * @private
   * @returns {string[]} - Array de chaves com prefixo
   */
  _getAllKeys() {
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Estima espaço disponível no LocalStorage
   * 
   * @returns {Promise<number>} - Espaço disponível estimado em bytes
   * 
   * @example
   * const available = await fallback.estimateAvailableSpace();
   */
  async estimateAvailableSpace() {
    if (!this.available) {
      return 0;
    }

    try {
      // LocalStorage geralmente tem limite de 5-10MB
      // Vamos estimar 5MB como padrão
      const estimatedTotal = 5 * 1024 * 1024; // 5MB
      
      // Calcular espaço usado por TODAS as chaves (não só as nossas)
      let totalUsed = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        if (key && value) {
          totalUsed += new Blob([key + value]).size;
        }
      }

      return Math.max(0, estimatedTotal - totalUsed);

    } catch (error) {
      console.error('Failed to estimate available space:', error);
      return 0;
    }
  }

  /**
   * Tenta limpar espaço removendo dados antigos
   * 
   * @param {number} bytesNeeded - Bytes necessários
   * @returns {Promise<boolean>} - true se conseguiu liberar espaço
   * 
   * @example
   * if (await fallback.freeSpace(50000)) {
   *   // Espaço liberado
   * }
   */
  async freeSpace(bytesNeeded) {
    if (!this.available) {
      return false;
    }

    try {
      const currentSize = await this.getSize();
      const available = this.maxSize - currentSize;

      if (available >= bytesNeeded) {
        return true; // Já tem espaço suficiente
      }

      // Limpar tudo para liberar espaço
      await this.clear();

      return true;

    } catch (error) {
      console.error('Failed to free space:', error);
      return false;
    }
  }

  /**
   * Verifica se LocalStorage está disponível (método estático)
   * 
   * @static
   * @returns {boolean}
   * 
   * @example
   * if (LocalStorageFallback.isAvailable()) {
   *   // Usar LocalStorage
   * }
   */
  static isAvailable() {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);

      return true;

    } catch (error) {
      return false;
    }
  }
}

export default LocalStorageFallback;
