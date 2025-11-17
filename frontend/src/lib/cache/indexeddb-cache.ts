/**
 * Sistema de Cache com IndexedDB
 * TTL: 7 dias
 * Lazy loading e caching
 */

const DB_NAME = 'PlayCoreTVCache';
const DB_VERSION = 1;
const STORES = {
  FILMES: 'filmes',
  SERIES: 'series',
  CANAIS: 'canais',
  TMDB: 'tmdb',
};

const TTL_DAYS = 7;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class IndexedDBCache {
  private db: IDBDatabase | null = null;

  /**
   * Inicializa o banco de dados
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializado');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar stores se não existirem
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
            console.log(`📦 Store criado: ${storeName}`);
          }
        });
      };
    });
  }

  /**
   * Salva dados no cache
   */
  async set<T>(store: string, key: string, data: T): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: TTL_MS,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(entry, key);

      request.onsuccess = () => {
        console.log(`💾 Cached: ${store}/${key}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca dados do cache
   */
  async get<T>(store: string, key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          console.log(`❌ Cache MISS: ${store}/${key}`);
          resolve(null);
          return;
        }

        // Verificar TTL
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
          console.log(`⏰ Cache EXPIRED: ${store}/${key} (${Math.round(age / 1000 / 60 / 60 / 24)} dias)`);
          this.delete(store, key); // Limpar expirado
          resolve(null);
          return;
        }

        console.log(`✅ Cache HIT: ${store}/${key} (${Math.round(age / 1000 / 60 / 60)} horas)`);
        resolve(entry.data);
      };

      request.onerror = () => {
        console.error(`❌ Erro ao buscar cache: ${store}/${key}`);
        resolve(null);
      };
    });
  }

  /**
   * Remove item do cache
   */
  async delete(store: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa todo o cache de um store
   */
  async clear(store: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log(`🗑️ Cache limpo: ${store}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa cache expirado de todos os stores
   */
  async clearExpired(): Promise<void> {
    await this.init();
    if (!this.db) return;

    for (const store of Object.values(STORES)) {
      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry<any>;
          const age = Date.now() - entry.timestamp;

          if (age > entry.ttl) {
            cursor.delete();
            console.log(`🗑️ Removido expirado: ${store}/${cursor.key}`);
          }

          cursor.continue();
        }
      };
    }
  }
}

// Singleton
export const dbCache = new IndexedDBCache();

// Stores disponíveis
export const CACHE_STORES = STORES;

// Limpar cache expirado ao iniciar
if (typeof window !== 'undefined') {
  dbCache.clearExpired().catch(console.error);
}
