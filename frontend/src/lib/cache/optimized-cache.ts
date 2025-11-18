/**
 * Sistema de Cache Otimizado - IndexedDB
 * 
 * Estratégia:
 * - Canais: 30 dias (dados estáveis)
 * - Filmes: 30 dias (dados estáveis)
 * - Séries: 30 dias (dados estáveis)
 * - Streams: 1 dia (URLs podem mudar)
 */

const DB_NAME = 'PlayCoreTVOptimized';
const DB_VERSION = 5; // Incrementado para adicionar stores de pré-carregamento

const STORES = {
  CHANNELS: 'channels',
  MOVIES: 'movies',
  SERIES_LIST: 'series_list',
  SERIES_SEASONS: 'series_seasons',
  SERIES_EPISODES: 'series_episodes',
  STREAMS: 'streams',
  // Novos stores para pré-carregamento
  SERIES_COMPLETE: 'series_complete',
  MOVIES_COMPLETE: 'movies_complete',
  CHANNELS_COMPLETE: 'channels_complete',
};

const TTL = {
  CHANNELS: 30 * 24 * 60 * 60 * 1000, // 30 dias
  MOVIES: 30 * 24 * 60 * 60 * 1000,   // 30 dias
  SERIES: 30 * 24 * 60 * 60 * 1000,   // 30 dias
  STREAMS: 30 * 24 * 60 * 60 * 1000,  // 30 dias (atualizado!)
};

// Interfaces
export interface CachedChannel {
  id: string;
  nome: string;
  categoria: string;
  logo_url: string | null;
  timestamp: number;
}

export interface CachedMovie {
  id: string;
  nome: string;
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  timestamp: number;
}

export interface CachedSeries {
  nome: string;
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  totalTemporadas: number;
  totalEpisodios: number;
  timestamp: number;
}

export interface CachedStream {
  id: string;
  url: string;
  timestamp: number;
}

export interface MetadataEntry {
  id: string;
  nome: string;
  tipo: 'filme' | 'canal';
  categoria: string;
  logo_url: string | null;
  epg_logo?: string | null;
  backdrop_url?: string | null;
  tmdb_vote_average?: number | null;
  tmdb_release_date?: string | null;
  visualizacoes?: number;
  timestamp: number;
}

class OptimizedCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Limpa o banco de dados (útil para forçar recriação)
   */
  async clearDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        console.log('🗑️ Banco de dados deletado');
        resolve();
      };
      request.onerror = () => {
        console.error('❌ Erro ao deletar banco:', request.error);
        reject(request.error);
      };
    });
  }

  async init(): Promise<void> {
    // Se já está inicializando, aguarda
    if (this.initPromise) return this.initPromise;
    
    // Se já está inicializado, retorna
    if (this.db) return Promise.resolve();

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Erro ao abrir IndexedDB:', request.error);
        this.initPromise = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔄 Atualizando IndexedDB para versão', DB_VERSION);

        // Criar stores se não existirem
        if (!db.objectStoreNames.contains(STORES.CHANNELS)) {
          const store = db.createObjectStore(STORES.CHANNELS, { keyPath: 'id' });
          store.createIndex('categoria', 'categoria', { unique: false });
          console.log('📦 Store criado: channels');
        }

        if (!db.objectStoreNames.contains(STORES.MOVIES)) {
          const store = db.createObjectStore(STORES.MOVIES, { keyPath: 'id' });
          store.createIndex('categoria', 'categoria', { unique: false });
          console.log('📦 Store criado: movies');
        }

        if (!db.objectStoreNames.contains(STORES.SERIES_LIST)) {
          const store = db.createObjectStore(STORES.SERIES_LIST, { keyPath: 'nome' });
          store.createIndex('categoria', 'categoria', { unique: false });
          console.log('📦 Store criado: series_list');
        }

        if (!db.objectStoreNames.contains(STORES.SERIES_SEASONS)) {
          db.createObjectStore(STORES.SERIES_SEASONS, { keyPath: 'seriesName' });
          console.log('📦 Store criado: series_seasons');
        }

        if (!db.objectStoreNames.contains(STORES.SERIES_EPISODES)) {
          db.createObjectStore(STORES.SERIES_EPISODES, { keyPath: 'key' });
          console.log('📦 Store criado: series_episodes');
        }

        if (!db.objectStoreNames.contains(STORES.STREAMS)) {
          db.createObjectStore(STORES.STREAMS, { keyPath: 'id' });
          console.log('📦 Store criado: streams');
        }

        // Novos stores para pré-carregamento
        if (!db.objectStoreNames.contains(STORES.SERIES_COMPLETE)) {
          db.createObjectStore(STORES.SERIES_COMPLETE);
          console.log('📦 Store criado: series_complete');
        }

        if (!db.objectStoreNames.contains(STORES.MOVIES_COMPLETE)) {
          db.createObjectStore(STORES.MOVIES_COMPLETE);
          console.log('📦 Store criado: movies_complete');
        }

        if (!db.objectStoreNames.contains(STORES.CHANNELS_COMPLETE)) {
          db.createObjectStore(STORES.CHANNELS_COMPLETE);
          console.log('📦 Store criado: channels_complete');
        }
      };
    });
  }

  // ==================== CANAIS ====================
  async saveChannels(channels: CachedChannel[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHANNELS, 'readwrite');
      const store = transaction.objectStore(STORES.CHANNELS);

      channels.forEach((channel) => {
        store.put({ ...channel, timestamp: Date.now() });
      });

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChannels(): Promise<CachedChannel[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.CHANNELS, 'readonly');
      const store = transaction.objectStore(STORES.CHANNELS);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedChannel[];
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp < TTL.CHANNELS);

        resolve(valid);
      };

      request.onerror = () => resolve([]);
    });
  }

  // ==================== FILMES ====================
  async saveMovies(movies: CachedMovie[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.MOVIES, 'readwrite');
      const store = transaction.objectStore(STORES.MOVIES);

      movies.forEach((movie) => {
        store.put({ ...movie, timestamp: Date.now() });
      });

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMovies(): Promise<CachedMovie[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.MOVIES, 'readonly');
      const store = transaction.objectStore(STORES.MOVIES);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMovie[];
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp < TTL.MOVIES);

        resolve(valid);
      };

      request.onerror = () => resolve([]);
    });
  }

  // ==================== SÉRIES ====================
  async saveSeries(series: CachedSeries[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SERIES_LIST, 'readwrite');
      const store = transaction.objectStore(STORES.SERIES_LIST);

      series.forEach((s) => {
        store.put({ ...s, timestamp: Date.now() });
      });

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSeries(): Promise<CachedSeries[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.SERIES_LIST, 'readonly');
      const store = transaction.objectStore(STORES.SERIES_LIST);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedSeries[];
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp < TTL.SERIES);

        resolve(valid);
      };

      request.onerror = () => resolve([]);
    });
  }

  // ==================== STREAMS ====================
  async saveStream(id: string, url: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      // Verificar se o store existe
      if (!this.db.objectStoreNames.contains(STORES.STREAMS)) {
        console.error(`❌ Store "streams" não encontrado!`);
        return;
      }

      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction(STORES.STREAMS, 'readwrite');
          const store = transaction.objectStore(STORES.STREAMS);

          store.put({
            id,
            url,
            timestamp: Date.now(),
          });

          transaction.oncomplete = () => {
            resolve();
          };
          
          transaction.onerror = () => {
            console.error(`❌ Erro ao salvar stream:`, transaction.error);
            resolve();
          };
        } catch (error) {
          console.error(`❌ Erro ao criar transação:`, error);
          resolve();
        }
      });
    } catch (error) {
      console.error('❌ Erro ao salvar stream:', error);
    }
  }

  async getStream(id: string): Promise<string | null> {
    try {
      await this.init();
      if (!this.db) return null;

      // Verificar se o store existe
      if (!this.db.objectStoreNames.contains(STORES.STREAMS)) {
        console.warn(`⚠️ Store "streams" não encontrado`);
        return null;
      }

      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction(STORES.STREAMS, 'readonly');
          const store = transaction.objectStore(STORES.STREAMS);
          const request = store.get(id);

          request.onsuccess = () => {
            const item = request.result as CachedStream | undefined;
            if (!item) {
              resolve(null);
              return;
            }

            const age = Date.now() - item.timestamp;
            if (age > TTL.STREAMS) {
              resolve(null);
              return;
            }

            resolve(item.url);
          };

          request.onerror = () => {
            console.error(`❌ Erro ao buscar stream:`, request.error);
            resolve(null);
          };
          
          transaction.onerror = () => {
            console.error(`❌ Erro na transação:`, transaction.error);
            resolve(null);
          };
        } catch (error) {
          console.error(`❌ Erro ao criar transação:`, error);
          resolve(null);
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar stream:', error);
      return null;
    }
  }

  // ==================== METADADOS (GENÉRICO) ====================
  async saveMetadata(items: MetadataEntry[]): Promise<void> {
    if (items.length === 0) return;
    
    try {
      const type = items[0].tipo;
      const storeName = type === 'filme' ? STORES.MOVIES : STORES.CHANNELS;
      await this.init();
      
      if (!this.db) {
        console.warn('⚠️ IndexedDB não disponível');
        return;
      }

      // Verificar se o store existe
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.error(`❌ Store "${storeName}" não encontrado!`);
        return;
      }

      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);

          // Salvar em lote para melhor performance
          const timestamp = Date.now();
          const promises: Promise<any>[] = [];
          
          items.forEach((item) => {
            const request = store.put({ ...item, timestamp });
            promises.push(new Promise((res) => {
              request.onsuccess = () => res(true);
              request.onerror = () => res(false);
            }));
          });

          transaction.oncomplete = () => {
            resolve();
          };
          
          transaction.onerror = () => {
            console.error(`❌ Erro ao salvar ${type}s:`, transaction.error);
            resolve();
          };
        } catch (error) {
          console.error(`❌ Erro ao criar transação:`, error);
          resolve();
        }
      });
    } catch (error) {
      console.error('❌ Erro ao salvar metadata:', error);
    }
  }

  async getMetadata(type: 'filme' | 'canal'): Promise<any[]> {
    try {
      const storeName = type === 'filme' ? STORES.MOVIES : STORES.CHANNELS;
      const ttl = type === 'filme' ? TTL.MOVIES : TTL.CHANNELS;
      
      await this.init();
      
      if (!this.db) {
        console.warn('⚠️ IndexedDB não disponível');
        return [];
      }

      // Verificar se o store existe
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store "${storeName}" não encontrado`);
        return [];
      }

      return new Promise((resolve) => {
        try {
          const startTime = performance.now();
          const transaction = this.db!.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            const items = request.result;
            const now = Date.now();
            const valid = items.filter((item: any) => now - item.timestamp < ttl);

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            resolve(valid);
          };

          request.onerror = () => {
            console.error(`❌ Erro ao buscar ${type}s:`, request.error);
            resolve([]);
          };
          
          transaction.onerror = () => {
            console.error(`❌ Erro na transação:`, transaction.error);
            resolve([]);
          };
        } catch (error) {
          console.error(`❌ Erro ao criar transação:`, error);
          resolve([]);
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar metadata:', error);
      return [];
    }
  }

  // ==================== LIMPEZA ====================
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const stores = Object.values(STORES);
    for (const storeName of stores) {
      await new Promise<void>((resolve) => {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        transaction.oncomplete = () => resolve();
      });
    }

  }

  async clearExpired(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();

    // Limpar canais expirados
    await this.clearExpiredFromStore(STORES.CHANNELS, TTL.CHANNELS, now);
    
    // Limpar filmes expirados
    await this.clearExpiredFromStore(STORES.MOVIES, TTL.MOVIES, now);
    
    // Limpar séries expiradas
    await this.clearExpiredFromStore(STORES.SERIES_LIST, TTL.SERIES, now);
    
    // Limpar streams expirados
    await this.clearExpiredFromStore(STORES.STREAMS, TTL.STREAMS, now);
  }

  private async clearExpiredFromStore(
    storeName: string,
    ttl: number,
    now: number
  ): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (now - item.timestamp > ttl) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
    });
  }

  // ==================== ESTATÍSTICAS ====================
  async getStats(): Promise<{
    channels: number;
    movies: number;
    series: number;
    streams: number;
  }> {
    await this.init();
    if (!this.db) return { channels: 0, movies: 0, series: 0, streams: 0 };

    const channels = await this.getChannels();
    const movies = await this.getMovies();
    const series = await this.getSeries();

    // Contar streams
    const streams = await new Promise<number>((resolve) => {
      const transaction = this.db!.transaction(STORES.STREAMS, 'readonly');
      const store = transaction.objectStore(STORES.STREAMS);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });

    return {
      channels: channels.length,
      movies: movies.length,
      series: series.length,
      streams,
    };
  }

  // ==================== PRÉ-CARREGAMENTO ====================
  
  /**
   * Salva TODAS as séries com streams (pré-carregamento)
   */
  async saveAllSeriesWithStreams(data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SERIES_COMPLETE, 'readwrite');
      const store = transaction.objectStore(STORES.SERIES_COMPLETE);

      const cacheData = {
        ...data,
        timestamp: Date.now(),
      };

      store.put(cacheData, 'all_series');

      transaction.oncomplete = () => {
        const totalEpisodes = data.series?.reduce(
          (acc: number, s: any) => 
            acc + s.seasons.reduce((sum: number, season: any) => sum + season.episodes.length, 0),
          0
        ) || 0;
        console.log(`💾 ${data.series?.length || 0} séries salvas com ${totalEpisodes} episódios (30 dias)`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Busca TODAS as séries do cache
   */
  async getAllSeriesWithStreams(): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.SERIES_COMPLETE, 'readonly');
      const store = transaction.objectStore(STORES.SERIES_COMPLETE);
      const request = store.get('all_series');

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        const age = Date.now() - item.timestamp;
        if (age > TTL.SERIES) {
          resolve(null);
          return;
        }

        resolve(item);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Salva TODOS os filmes com streams (pré-carregamento)
   */
  async saveAllMoviesWithStreams(data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.MOVIES_COMPLETE, 'readwrite');
      const store = transaction.objectStore(STORES.MOVIES_COMPLETE);

      const cacheData = {
        ...data,
        timestamp: Date.now(),
      };

      store.put(cacheData, 'all_movies');

      transaction.oncomplete = () => {
        console.log(`💾 ${data.movies?.length || 0} filmes salvos com streams (30 dias)`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Busca TODOS os filmes do cache
   */
  async getAllMoviesWithStreams(): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.MOVIES_COMPLETE, 'readonly');
      const store = transaction.objectStore(STORES.MOVIES_COMPLETE);
      const request = store.get('all_movies');

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        const age = Date.now() - item.timestamp;
        if (age > TTL.MOVIES) {
          resolve(null);
          return;
        }

        resolve(item);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Salva TODOS os canais com streams (pré-carregamento)
   */
  async saveAllChannelsWithStreams(data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHANNELS_COMPLETE, 'readwrite');
      const store = transaction.objectStore(STORES.CHANNELS_COMPLETE);

      const cacheData = {
        ...data,
        timestamp: Date.now(),
      };

      store.put(cacheData, 'all_channels');

      transaction.oncomplete = () => {
        console.log(`💾 ${data.channels?.length || 0} canais salvos com streams (30 dias)`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Busca TODOS os canais do cache
   */
  async getAllChannelsWithStreams(): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.CHANNELS_COMPLETE, 'readonly');
      const store = transaction.objectStore(STORES.CHANNELS_COMPLETE);
      const request = store.get('all_channels');

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        const age = Date.now() - item.timestamp;
        if (age > TTL.CHANNELS) {
          resolve(null);
          return;
        }

        resolve(item);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Verifica se tem cache completo válido
   */
  async hasValidCache(): Promise<boolean> {
    const series = await this.getAllSeriesWithStreams();
    const movies = await this.getAllMoviesWithStreams();
    const channels = await this.getAllChannelsWithStreams();

    return !!(series && movies && channels);
  }
}

export const optimizedCache = new OptimizedCache();
