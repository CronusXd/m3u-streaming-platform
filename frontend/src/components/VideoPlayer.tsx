'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  autoplay?: boolean;
  onError?: (error: string) => void;
}

export default function VideoPlayer({ 
  url, 
  title, 
  onError 
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const clapprRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!url || !playerRef.current) {
      setError('URL do stream não fornecida');
      setIsLoading(false);
      return;
    }

    // Importar Clappr dinamicamente (client-side only)
    const loadPlayer = async () => {
      try {
        const Clappr = (await import('clappr')).default;

        // Destruir player anterior
        if (clapprRef.current) {
          clapprRef.current.destroy();
          clapprRef.current = null;
        }

        console.log('🎬 Carregando stream...');

        // Criar player Clappr
        const player = new Clappr.Player({
          source: url,
          parentId: `#${playerRef.current?.id}`,
          width: '100%',
          height: '100%',
          autoPlay: true,
          mute: false,
          playback: {
            playInline: true,
            recycleVideo: true,
          },
          mediacontrol: {
            seekbar: '#E50914',
            buttons: '#FFFFFF',
          },
        });

        clapprRef.current = player;

        // Event listeners
        player.on(Clappr.Events.PLAYER_READY, () => {
          setIsLoading(false);
          setError(null);
        });

        player.on(Clappr.Events.PLAYER_PLAY, () => {
          setIsLoading(false);
        });

        player.on(Clappr.Events.PLAYER_ERROR, (error: any) => {
          // Logar apenas erros críticos (não 404 de recursos opcionais)
          if (error?.code !== 404) {
            console.error('❌ Erro crítico no player');
          }
          setError('Erro ao reproduzir o stream. O canal pode estar offline.');
          setIsLoading(false);
          onError?.(error?.message || 'Player error');
        });

        player.on(Clappr.Events.PLAYER_TIMEUPDATE, () => {
          // Player está funcionando
          if (isLoading) {
            setIsLoading(false);
          }
        });

      } catch (error) {
        console.error('❌ Erro ao inicializar player');
        setError('Erro ao inicializar o player');
        setIsLoading(false);
      }
    };

    loadPlayer();

    return () => {
      if (clapprRef.current) {
        clapprRef.current.destroy();
        clapprRef.current = null;
      }
    };
  }, [url]);

  // Validar URL
  if (!url) {
    return (
      <div className="aspect-video w-full rounded-lg bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <svg
            className="mx-auto h-12 w-12 text-yellow-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-semibold mb-2">URL não disponível</p>
          <p className="text-sm text-gray-400">Este canal não possui uma URL de stream válida</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video w-full rounded-lg bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white p-6 max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-semibold mb-2">Erro ao reproduzir</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            💡 Dica: Tente outro canal ou volte mais tarde
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Clappr Player Container */}
      <div 
        id={`player-${Math.random().toString(36).substr(2, 9)}`}
        ref={playerRef}
        className="w-full h-full"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-center text-white">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-2"></div>
            <p>Carregando stream...</p>
            {title && <p className="text-sm text-gray-400 mt-2">{title}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
