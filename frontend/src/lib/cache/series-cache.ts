/**
 * Cache de Séries - IndexedDB
 * Armazena séries organizadas por 30 dias
 * url_stream é buscado sob demanda (1 dia no store 'streams')
 */

const DB_NAME = 'PlayCoreTVOptimized';
const DB_VERSION = 5; // Sincronizado com optimized-cache

const STORES = {
  SERIES_LIST: 'series_list',
  SERIES_SEASONS: 'series_seasons',
  SERIES_EPISODES: 'series_episodes',
};

const TTL_SERIES = 30 * 24 * 60 * 60 * 1000; // 30 dias

export interface SeriesListEntry {
  nome: string;
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  totalTemporadas: number;
  totalEpisodios: number;
  timestamp: number;
}

export interface SeriesSeason {
  temporada: number;
  totalEpisodios: number;
}

export interface SeriesEpisode {
  id: string;
  nome: string;
  temporada: number;
  episodio: number;
  logo_url: string | null;
}

class SeriesCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Se já está inicializando, aguarda
    if (this.initPromise) return this.initPromise;
    
    // Se já está inicializado, retorna
    if (this.db) return Promise.resolve();

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        console.log('✅ SeriesCache inicializado (versão', DB_VERSION, ')');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.SERIES_LIST)) {
          const store = db.createObjectStore(STORES.SERIES_LIST, { keyPath: 'nome' });
          store.createIndex('categoria', 'categoria', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SERIES_SEASONS)) {
          db.createObjectStore(STORES.SERIES_SEASONS, { keyPath: 'seriesName' });
        }

        if (!db.objectStoreNames.contains(STORES.SERIES_EPISODES)) {
          db.createObjectStore(STORES.SERIES_EPISODES, { keyPath: 'key' });
        }
      };
    });
  }

  async saveSeriesList(series: SeriesListEntry[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SERIES_LIST, 'readwrite');
      const store = transaction.objectStore(STORES.SERIES_LIST);

      series.forEach((serie) => {
        store.put({ ...serie, timestamp: Date.now() });
      });

      transaction.oncomplete = () => {
        console.log(`💾 ${series.length} séries salvas (30 dias)`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSeriesList(): Promise<SeriesListEntry[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.SERIES_LIST, 'readonly');
      const store = transaction.objectStore(STORES.SERIES_LIST);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as SeriesListEntry[];
        const now = Date.now();
        const valid = items.filter((item) => now - item.timestamp < TTL_SERIES);

        if (valid.length > 0) {
          console.log(`✅ Cache HIT: ${valid.length} séries`);
        }

        resolve(valid);
      };

      request.onerror = () => resolve([]);
    });
  }

  async saveSeriesSeasons(seriesName: string, seasons: SeriesSeason[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SERIES_SEASONS, 'readwrite');
      const store = transaction.objectStore(STORES.SERIES_SEASONS);

      store.put({
        seriesName,
        seasons,
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => {
        console.log(`💾 Temporadas de "${seriesName}" salvas`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSeriesSeasons(seriesName: string): Promise<SeriesSeason[] | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.SERIES_SEASONS, 'readonly');
      const store = transaction.objectStore(STORES.SERIES_SEASONS);
      const request = store.get(seriesName);

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        const age = Date.now() - item.timestamp;
        if (age > TTL_SERIES) {
          resolve(null);
          return;
        }

        console.log(`✅ Temporadas HIT: ${seriesName}`);
        resolve(item.seasons);
      };

      request.onerror = () => resolve(null);
    });
  }

  async saveSeriesEpisodes(seriesName: string, seasonNumber: number, episodes: SeriesEpisode[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.SERIES_EPISODES, 'readwrite');
      const store = transaction.objectStore(STORES.SERIES_EPISODES);

      const key = `${seriesName}_${seasonNumber}`;
      store.put({
        key,
        episodes,
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => {
        console.log(`💾 Episódios de "${seriesName}" T${seasonNumber} salvos`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSeriesEpisodes(seriesName: string, seasonNumber: number): Promise<SeriesEpisode[] | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORES.SERIES_EPISODES, 'readonly');
      const store = transaction.objectStore(STORES.SERIES_EPISODES);
      const key = `${seriesName}_${seasonNumber}`;
      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        const age = Date.now() - item.timestamp;
        if (age > TTL_SERIES) {
          resolve(null);
          return;
        }

        console.log(`✅ Episódios HIT: ${seriesName} T${seasonNumber}`);
        resolve(item.episodes);
      };

      request.onerror = () => resolve(null);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const stores = [STORES.SERIES_LIST, STORES.SERIES_SEASONS, STORES.SERIES_EPISODES];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve) => {
        const transaction = this.db!.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        transaction.oncomplete = () => resolve();
      });
    }

    console.log('🗑️ Cache de séries limpo');
  }
}

export const seriesCache = new SeriesCache();
