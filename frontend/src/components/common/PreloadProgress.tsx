'use client';

import { useEffect, useState } from 'react';
import { preloadService, type PreloadProgress } from '@/services/preload';

export default function PreloadProgressIndicator() {
  const [progress, setProgress] = useState<PreloadProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Registrar callback de progresso
    const unsubscribe = preloadService.onProgress((p) => {
      setProgress(p);
      
      // Mostrar indicador se não estiver completo
      if (!p.isComplete && p.total > 0) {
        setIsVisible(true);
      }
      
      // Esconder após 3 segundos quando completo
      if (p.isComplete) {
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isVisible || !progress) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md px-6">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          {progress.isComplete ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          {progress.isComplete ? 'Pronto!' : 'Carregando Dados...'}
        </h2>
        
        {/* Subtitle */}
        <p className="mb-8 text-center text-sm text-netflix-lightGray">
          {progress.isComplete 
            ? 'Todos os dados foram carregados com sucesso!' 
            : 'Aguarde enquanto preparamos tudo para você...'}
        </p>

        {/* Main Progress Bar */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-netflix-lightGray">Progresso Total</span>
            <span className="text-lg font-bold text-white">{progress.total}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-netflix-mediumGray">
            <div
              className="h-full bg-gradient-to-r from-netflix-red via-red-600 to-red-700 transition-all duration-500 ease-out"
              style={{ width: `${progress.total}%` }}
            />
          </div>
        </div>

        {/* Detailed Progress (smaller) */}
        <div className="space-y-3 rounded-lg bg-black/40 p-4">
          {/* Séries */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${progress.series === 100 ? 'bg-green-500' : 'bg-netflix-red animate-pulse'}`} />
              <span className="text-xs text-netflix-lightGray">Séries</span>
            </div>
            <span className="text-xs font-medium text-white">{progress.series}%</span>
          </div>

          {/* Filmes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${progress.movies === 100 ? 'bg-green-500' : 'bg-netflix-red animate-pulse'}`} />
              <span className="text-xs text-netflix-lightGray">Filmes</span>
            </div>
            <span className="text-xs font-medium text-white">{progress.movies}%</span>
          </div>

          {/* Canais */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${progress.channels === 100 ? 'bg-green-500' : 'bg-netflix-red animate-pulse'}`} />
              <span className="text-xs text-netflix-lightGray">Canais</span>
            </div>
            <span className="text-xs font-medium text-white">{progress.channels}%</span>
          </div>
        </div>

        {/* Error message */}
        {progress.error && (
          <div className="mt-4 rounded-lg bg-red-900/30 p-3 text-center text-sm text-red-400">
            ⚠️ {progress.error}
          </div>
        )}

        {/* Success message with auto-close */}
        {progress.isComplete && !progress.error && (
          <div className="mt-4 text-center text-sm text-green-400">
            Redirecionando em 3 segundos...
          </div>
        )}
      </div>
    </div>
  );
}
