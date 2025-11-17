/**
 * useCache Hook - Hook React para usar o sistema de cache
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '@/services/cacheService';

interface CacheStats {
  hits: number;
  misses: number;
  hitRatePercentage: string;
  totalSizeMB: string;
  sectionsCount: number;
}

interface DownloadProgress {
  [section: string]: number;
}

interface UseCacheReturn {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  stats: CacheStats | null;
  downloadProgress: DownloadProgress;
  getMovies: () => Promise<any[]>;
  getSeries: () => Promise<any[]>;
  getChannels: () => Promise<any[]>;
  getCategories: () => Promise<any[]>;
  refreshData: () => Promise<void>;
  clearCache: () => Promise<void>;
  prioritizeSection: (section: string) => Promise<void>;
}

/**
 * Hook para usar o sistema de cache
 */
export function useCache(): UseCacheReturn {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({});

  // Inicializar cache
  useEffect(() => {
    const initCache = async () => {
      try {
        setLoading(true);
        const success = await cacheService.init();
        setInitialized(success);

        if (success) {
          // Obter estatísticas iniciais
          const initialStats = await cacheService.getStats();
          setStats(initialStats);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao inicializar cache');
        console.error('Erro ao inicializar cache:', err);
      } finally {
        setLoading(false);
      }
    };

    initCache();
  }, []);

  // Escutar eventos de progresso
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleProgress = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { section, progress } = customEvent.detail;
      
      setDownloadProgress(prev => ({
        ...prev,
        [section]: progress
      }));
    };

    const handleComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { section } = customEvent.detail;
      
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[section];
        return newProgress;
      });

      // Atualizar estatísticas
      cacheService.getStats().then(setStats);
    };

    const handleError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { section, error: downloadError } = customEvent.detail;
      
      console.error(`Erro no download de ${section}:`, downloadError);
      
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[section];
        return newProgress;
      });
    };

    window.addEventListener('cache:download:progress', handleProgress);
    window.addEventListener('cache:download:complete', handleComplete);
    window.addEventListener('cache:download:error', handleError);

    return () => {
      window.removeEventListener('cache:download:progress', handleProgress);
      window.removeEventListener('cache:download:complete', handleComplete);
      window.removeEventListener('cache:download:error', handleError);
    };
  }, []);

  // Métodos
  const getMovies = useCallback(async () => {
    try {
      return await cacheService.getMovies();
    } catch (err) {
      console.error('Erro ao obter filmes:', err);
      return [];
    }
  }, []);

  const getSeries = useCallback(async () => {
    try {
      return await cacheService.getSeries();
    } catch (err) {
      console.error('Erro ao obter séries:', err);
      return [];
    }
  }, []);

  const getChannels = useCallback(async () => {
    try {
      return await cacheService.getChannels();
    } catch (err) {
      console.error('Erro ao obter canais:', err);
      return [];
    }
  }, []);

  const getCategories = useCallback(async () => {
    try {
      return await cacheService.getCategories();
    } catch (err) {
      console.error('Erro ao obter categorias:', err);
      return [];
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      await cacheService.refreshData();
      const newStats = await cacheService.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await cacheService.clearCache();
      setStats(null);
      setDownloadProgress({});
    } catch (err) {
      console.error('Erro ao limpar cache:', err);
    }
  }, []);

  const prioritizeSection = useCallback(async (section: string) => {
    try {
      await cacheService.prioritizeSection(section);
    } catch (err) {
      console.error('Erro ao priorizar seção:', err);
    }
  }, []);

  return {
    initialized,
    loading,
    error,
    stats,
    downloadProgress,
    getMovies,
    getSeries,
    getChannels,
    getCategories,
    refreshData,
    clearCache,
    prioritizeSection,
  };
}

export default useCache;
