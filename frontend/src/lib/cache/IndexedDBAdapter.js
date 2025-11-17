/**
 * IndexedDBAdapter - Abstração do IndexedDB
 * 
 * Fornece uma interface simplificada para operações CRUD no IndexedDB,
 * com tratamento de erros e suporte a transações.
 * 
 * @example
 * const adapter = new IndexedDBAdapter('AppCache', 1);
 * await adapter.open();
 * await adapter.put('sections', 'filmes', { data: [...] });
 * const data = await adapter.get('sections', 'filmes');
 */

/// <reference path="./cache.types.js" />

import { DB_CONFIG, ERROR_CODES } from './cache.config.js';

export class IndexedDBAdapter {
  /**
   * @param {string} dbName - Nome do banco
   * @param {number} dbVersion - Versão do banco
   */
  constructor(dbName = DB_CONFIG.DB_NAME, dbVersion = DB_CONFIG.DB_VERSION) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    
    /**
     * @type {IDBDatabase|null}
     * @private
     */
    this.db = null;
    
    /**
     * @type {boolean}
     * @private
     */
    this.isOpen = false;
  }

  /**
   * Abre conexão com o banco IndexedDB
   * Cria os object stores se necessário
   * 
   * @returns {Promise<boolean>} - true se abriu com sucesso
   * @throws {Error} - Se IndexedDB não estiver disponível ou falhar
   * 
   * @example
   * const success = await adapter.open();
   * if (success) console.log('Banco aberto!');
   */
  async open() {
    // Verificar se IndexedDB está disponível
    if (!('indexedDB' in window)) {
      throw new Error(`${ERROR_CODES.INDEXEDDB_NOT_AVAILABLE}: IndexedDB not available in this browser`);
    }

    // Se já estiver aberto, retornar true
    if (this.isOpen && this.db) {
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        // Evento de upgrade - criar/atualizar stores
        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Criar store "sections" se não existir
          if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SECTIONS)) {
            db.createObjectStore(DB_CONFIG.STORES.SECTIONS, { keyPath: 'sectionName' });
          }

          // Criar store "metadata" se não existir
          if (!db.objectStoreNames.contains(DB_CONFIG.STORES.METADATA)) {
            const metadataStore = db.createObjectStore(DB_CONFIG.STORES.METADATA, { keyPath: 'sectionName' });
            
            // Criar índices
            metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
            metadataStore.createIndex('ttl', 'ttl', { unique: false });
            metadataStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          }
        };

        // Sucesso ao abrir
        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.isOpen = true;

          // Handler para erros não capturados
          this.db.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
          };

          resolve(true);
        };

        // Erro ao abrir
        request.onerror = (event) => {
          const error = event.target.error;
          console.error('Failed to open IndexedDB:', error);
          reject(new Error(`${ERROR_CODES.INITIALIZATION_FAILED}: ${error.message}`));
        };

        // Bloqueado (outra aba está usando versão antiga)
        request.onblocked = () => {
          console.warn('IndexedDB upgrade blocked. Close other tabs using this database.');
        };

      } catch (error) {
        reject(new Error(`${ERROR_CODES.INITIALIZATION_FAILED}: ${error.message}`));
      }
    });
  }

  /**
   * Fecha a conexão com o banco
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await adapter.close();
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isOpen = false;
    }
  }

  /**
   * Salva ou atualiza um registro no store
   * 
   * @param {string} storeName - Nome do store
   * @param {string} key - Chave do registro
   * @param {*} value - Valor a salvar
   * @returns {Promise<void>}
   * @throws {Error} - Se a operação falhar
   * 
   * @example
   * await adapter.put('sections', 'filmes', { sectionName: 'filmes', data: [...] });
   */
  async put(storeName, key, value) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Garantir que o valor tenha a chave correta
        const valueWithKey = { ...value, sectionName: key };
        
        const request = store.put(valueWithKey);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to put data in ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to put data: ${error.message}`));
      }
    });
  }

  /**
   * Obtém um registro do store
   * 
   * @param {string} storeName - Nome do store
   * @param {string} key - Chave do registro
   * @returns {Promise<*|null>} - Valor ou null se não existir
   * 
   * @example
   * const data = await adapter.get('sections', 'filmes');
   */
  async get(storeName, key) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error(`Failed to get data from ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to get data: ${error.message}`));
      }
    });
  }

  /**
   * Remove um registro do store
   * 
   * @param {string} storeName - Nome do store
   * @param {string} key - Chave do registro
   * @returns {Promise<void>}
   * 
   * @example
   * await adapter.delete('sections', 'filmes');
   */
  async delete(storeName, key) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to delete data: ${error.message}`));
      }
    });
  }

  /**
   * Limpa todos os registros de um store
   * 
   * @param {string} storeName - Nome do store
   * @returns {Promise<void>}
   * 
   * @example
   * await adapter.clear('sections');
   */
  async clear(storeName) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to clear store: ${error.message}`));
      }
    });
  }

  /**
   * Obtém todas as chaves de um store
   * 
   * @param {string} storeName - Nome do store
   * @returns {Promise<string[]>} - Array com as chaves
   * 
   * @example
   * const keys = await adapter.getAllKeys('sections');
   */
  async getAllKeys(storeName) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get keys from ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to get keys: ${error.message}`));
      }
    });
  }

  /**
   * Conta o número de registros em um store
   * 
   * @param {string} storeName - Nome do store
   * @returns {Promise<number>} - Número de registros
   * 
   * @example
   * const count = await adapter.count('sections');
   */
  async count(storeName) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(new Error(`Failed to count records in ${storeName}: ${request.error.message}`));

      } catch (error) {
        reject(new Error(`Failed to count records: ${error.message}`));
      }
    });
  }

  /**
   * Executa uma transação customizada
   * 
   * @param {string[]} storeNames - Nomes dos stores
   * @param {'readonly'|'readwrite'} mode - Modo da transação
   * @param {Function} callback - Função que recebe a transação
   * @returns {Promise<*>} - Resultado do callback
   * 
   * @example
   * await adapter.transaction(['sections', 'metadata'], 'readwrite', (tx) => {
   *   const sectionsStore = tx.objectStore('sections');
   *   const metadataStore = tx.objectStore('metadata');
   *   // ... operações
   * });
   */
  async transaction(storeNames, mode, callback) {
    this._ensureOpen();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(storeNames, mode);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error.message}`));
        transaction.onabort = () => reject(new Error('Transaction aborted'));

        // Executar callback com a transação
        try {
          const result = callback(transaction);
          resolve(result);
        } catch (error) {
          transaction.abort();
          reject(error);
        }

      } catch (error) {
        reject(new Error(`Failed to create transaction: ${error.message}`));
      }
    });
  }

  /**
   * Verifica se o banco está aberto
   * @private
   * @throws {Error} - Se o banco não estiver aberto
   */
  _ensureOpen() {
    if (!this.isOpen || !this.db) {
      throw new Error('Database is not open. Call open() first.');
    }
  }

  /**
   * Verifica se IndexedDB está disponível
   * 
   * @static
   * @returns {boolean}
   * 
   * @example
   * if (IndexedDBAdapter.isAvailable()) {
   *   // Usar IndexedDB
   * }
   */
  static isAvailable() {
    return 'indexedDB' in window;
  }
}

export default IndexedDBAdapter;
