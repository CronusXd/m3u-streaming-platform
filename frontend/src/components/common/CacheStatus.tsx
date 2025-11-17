/**
 * CacheStatus - Componente para mostrar status do cache
 */

'use client';

import { useCache } from '@/hooks/useCache';
import { useEffect, useState } from 'react';

export function CacheStatus() {
  const { initialized, loading, stats, downloadProgress } = useCache();
  const [isVisible, setIsVisible] = useState(false);

  // Mostrar apenas se houver downloads em andamento
  useEffect(() => {
    const hasDownloads = Object.keys(downloadProgress).length > 0;
    setIsVisible(hasDownloads || loading);
  }, [downloadProgress, loading]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Cache Status</h3>
        {initialized && (
          <span className="text-xs text-green-400">✓ Ativo</span>
        )}
      </div>

      {loading && (
        <div className="text-xs text-gray-400 mb-2">
          Inicializando cache...
        </div>
      )}

      {Object.entries(downloadProgress).map(([section, progress]) => (
        <div key={section} className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="capitalize">{section}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ))}

      {stats && Object.keys(downloadProgress).length === 0 && (
        <div className="text-xs text-gray-400 mt-2">
          <div>Hit Rate: {stats.hitRatePercentage}%</div>
          <div>Tamanho: {stats.totalSizeMB} MB</div>
          <div>Seções: {stats.sectionsCount}</div>
        </div>
      )}
    </div>
  );
}

export default CacheStatus;
