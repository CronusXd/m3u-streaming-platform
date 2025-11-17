/**
 * Sistema de Cache Otimizado - IndexedDB
 * 
 * 2 Stores Separados:
 * 1. metadata (30 dias) - Dados leves: id, nome, tipo, categoria, logo_url, rating, ano
 * 2. streams (1 dia) - Dados pesados: url_stream, is_hls (sob demanda)
 */

const DB_NAME = 'PlayCoreTVOptimized';
const DB_VERSION = 1;

// Stores
const STORES = {
  METADATA: 'metadata',
  STREAMS: 'streams',
};

// TTLs
const TTL_METADATA = 30 * 24 * 60 * 60 * 1000; // 30 dias
const TTL_STREAMS = 1 * 24 * 60 * 60 * 1000;   // 1 dia

interface MetadataEntry {
  id: string;
  nome: string;
  tipo: 'filme' | 'serie' | 'canal';
  categoria: string;
  logo_url: string | null;
  epg_logo?: string | null;
  tmdb_vote_average?: number;
  tmdb_release_date?: string;
  visualizacoes?: number;
  timestamp: number;
}

interface StreamEntry {
  id: string;
  url_stream: string;
  is_hls: boolean;
  timestamp: number;
}

class OptimizedCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Cache Otimizado inicializado');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store de Metadados (30 dias)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          const metadataStore = db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
          metadataStore.createIndex('tipo', 'tipo', { unique: false });
          metadataStore.createIndex('categoria', 'categoria', { unique: false });
          console.log('📦 Store criado: metadata (30 dias)');
        }

        // Store de Streams (1 dia)
        if (!db.objectStoreNames.contains(STORES.STREAMS)) {
          db.createObjectStore(STORES.STREAMS, { keyPath: 'id' });
          console.log('📦 Store criado: streams (1 dia)');
        }
      };
    });
  }

  // ============================================
  // METADADOS (30 dias)
  // ============================================

  async saveMetadata(items: MetadataEntry[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.METADATA, 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);

      items.forEach((item) => {
        store.put({ ...item, timestamp: Date.now() });
      });

      transaction.oncomplete = () => {
        console.log(`💾 ${items.length} metadados salvos (TTL: 30 dias)`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMetadata(tipo?: 'filme' | 'serie' | 'canal'): Promise<MetadataEntry[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.METADATA, 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      
      let request: IDBRequest;
      if (tipo) {
        const index = store.index('tipo');
        request = index.getAll(tipo);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const items = request.result as MetadataEntry[];
        const now = Date.now();
        
        // Filtrar expirados
        const valid = items.filter((item) => {
          const age = now - item.timestamp;
          return age < TTL_METADATA;
        });

        if (valid.length > 0) {
          console.log(`✅ Cache HIT: ${valid.length} metadados (${tipo || 'todos'})`);
        } else {
          console.log(`❌ Cache MISS: metadados (${tipo || 'todos'})`);
        }

        resolve(valid);
      };

      request.onerror = () => {
        console.error('❌ Erro ao buscar metadados');
        resolve([]);
      };
    });
  }

  async getMetadataById(id: string): Promise<MetadataEntry | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.METADATA, 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result as MetadataEntry | undefined;
        
        if (!item) {
          resolve(null);
          return;
        }

        // Verificar TTL
        const age = Date.now() - item.timestamp;
        if (age > TTL_METADATA) {
          console.log(`⏰ Metadata expirado: ${id}`);
          resolve(null);
          return;
        }

        resolve(item);
      };

      request.onerror = () => resolve(null);
    });
  }

  // ============================================
  // STREAMS (1 dia - Sob Demanda)
  // ============================================

  async saveStream(id: string, url_stream: string, is_hls: boolean): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readwrite');
      const store = transaction.objectStore(STORES.STREAMS);

      const entry: StreamEntry = {
        id,
        url_stream,
        is_hls,
        timestamp: Date.now(),
      };

      const request = store.put(entry);

      request.onsuccess = () => {
        console.log(`💾 Stream salvo: ${id} (TTL: 1 dia)`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStream(id: string): Promise<StreamEntry | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readonly');
      const store = transaction.objectStore(STORES.STREAMS);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result as StreamEntry | undefined;
        
        if (!item) {
          console.log(`❌ Stream MISS: ${id}`);
          resolve(null);
          return;
        }

        // Verificar TTL
        const age = Date.now() - item.timestamp;
        if (age > TTL_STREAMS) {
          console.log(`⏰ Stream expirado: ${id} (${Math.round(age / 1000 / 60 / 60)} horas)`);
          this.deleteStream(id);
          resolve(null);
          return;
        }

        console.log(`✅ Stream HIT: ${id}`);
        resolve(item);
      };

      request.onerror = () => resolve(null);
    });
  }

  async deleteStream(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readwrite');
      const store = transaction.objectStore(STORES.STREAMS);
      store.delete(id);
      transaction.oncomplete = () => resolve();
    });
  }

  // ============================================
  // LIMPEZA
  // ============================================

  async clearMetadata(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.METADATA, 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Metadados limpos');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearStreams(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readwrite');
      const store = transaction.objectStore(STORES.STREAMS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Streams limpos');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpired(): Promise<{ metadata: number; streams: number }> {
    await this.init();
    if (!this.db) return { metadata: 0, streams: 0 };

    const now = Date.now();
    let metadataDeleted = 0;
    let streamsDeleted = 0;

    // Limpar metadados expirados
    await new Promise<void>((resolve) => {
      const transaction = this.db!.transaction(STORES.METADATA, 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as MetadataEntry;
          if (now - item.timestamp > TTL_METADATA) {
            cursor.delete();
            metadataDeleted++;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    // Limpar streams expirados
    await new Promise<void>((resolve) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readwrite');
      const store = transaction.objectStore(STORES.STREAMS);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as StreamEntry;
          if (now - item.timestamp > TTL_STREAMS) {
            cursor.delete();
            streamsDeleted++;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    if (metadataDeleted > 0 || streamsDeleted > 0) {
      console.log(`🗑️ Expirados removidos: ${metadataDeleted} metadados, ${streamsDeleted} streams`);
    }

    return { metadata: metadataDeleted, streams: streamsDeleted };
  }
}

// Singleton
export const optimizedCache = new OptimizedCache();

// Limpar expirados ao iniciar
if (typeof window !== 'undefined') {
  optimizedCache.clearExpired().catch(console.error);
}

// Tipos exportados
export type { MetadataEntry, StreamEntry };
