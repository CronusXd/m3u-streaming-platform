/**
 * CacheProvider - Provider para inicializar cache globalmente
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cacheService } from '@/services/cacheService';

interface CacheContextType {
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

const CacheContext = createContext<CacheContextType>({
  initialized: false,
  loading: true,
  error: null,
});

export function useCacheContext() {
  return useContext(CacheContext);
}

interface CacheProviderProps {
  children: ReactNode;
}

export function CacheProvider({ children }: CacheProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCache = async () => {
      try {
        console.log('🚀 Inicializando cache global...');
        const success = await cacheService.init();
        
        setInitialized(success);
        
        if (!success) {
          setError('Falha ao inicializar cache');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        console.error('❌ Erro ao inicializar cache:', err);
      } finally {
        setLoading(false);
      }
    };

    initCache();
  }, []);

  return (
    <CacheContext.Provider value={{ initialized, loading, error }}>
      {children}
    </CacheContext.Provider>
  );
}

export default CacheProvider;
