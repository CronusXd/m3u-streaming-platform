/**
 * CacheDebug - Componente de debug para ver dados do cache
 */

'use client';

import { useEffect, useState } from 'react';
import { cacheService } from '@/services/cacheService';

export function CacheDebug() {
  const [stats, setStats] = useState<any>(null);
  const [counts, setCounts] = useState({
    movies: 0,
    series: 0,
    channels: 0,
    categories: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const cacheStats = await cacheService.getStats();
        setStats(cacheStats);

        // Contar itens
        const movies = await cacheService.getMovies();
        const series = await cacheService.getSeries();
        const channels = await cacheService.getChannels();
        const categories = await cacheService.getCategories();

        setCounts({
          movies: movies.length,
          series: series.length,
          channels: channels.length,
          categories: categories.length,
        });
      } catch (error) {
        console.error('Erro ao carregar stats:', error);
      }
    };

    loadStats();

    // Atualizar a cada 5 segundos
    const interval = setInterval(loadStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white rounded-lg shadow-lg p-4 max-w-sm z-50 text-xs">
      <h3 className="font-bold mb-2">🔍 Cache Debug</h3>
      
      <div className="space-y-1">
        <div>📽️ Filmes: <span className="font-bold text-green-400">{counts.movies}</span></div>
        <div>📺 Séries: <span className="font-bold text-blue-400">{counts.series}</span></div>
        <div>📡 Canais: <span className="font-bold text-purple-400">{counts.channels}</span></div>
        <div>📁 Categorias: <span className="font-bold text-yellow-400">{counts.categories}</span></div>
      </div>

      {stats && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
          <div>Hit Rate: {stats.hitRatePercentage}%</div>
          <div>Tamanho: {stats.totalSizeMB} MB</div>
          <div>Hits: {stats.hits} / Misses: {stats.misses}</div>
        </div>
      )}
    </div>
  );
}

export default CacheDebug;
