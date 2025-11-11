'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/solid';

interface VideoPlayerProps {
  url: string;
  title?: string;
  autoplay?: boolean;
  onError?: (error: string) => void;
}

export default function VideoPlayer({ 
  url, 
  title, 
  autoplay = false,
  onError 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) {
      setError('URL do stream não fornecida');
      setIsLoading(false);
      return;
    }

    // Limpar player anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Resetar estados
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Verificar se é HLS
    const isHLS = url.includes('.m3u8');

    if (isHLS) {
      // Verificar suporte MSE
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          // Sempre tentar reproduzir quando carregar
          video.play().catch(err => {
            console.error('Autoplay falhou:', err);
            // Se autoplay falhar, mostrar mensagem
            if (err.name === 'NotAllowedError') {
              console.log('Clique no botão Play para iniciar');
            }
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Tentar reconectar uma vez
                console.log('Tentando reconectar...');
                setError('Erro de rede ao carregar o stream. Tentando reconectar...');
                setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, 1000);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Tentando recuperar erro de mídia...');
                setError('Erro de mídia. Tentando recuperar...');
                hls.recoverMediaError();
                break;
              default:
                if (data.response?.code === 403) {
                  setError('Acesso negado pelo servidor. Este canal pode estar protegido.');
                } else {
                  setError('Erro ao reproduzir o stream. O canal pode estar offline.');
                }
                hls.destroy();
                break;
            }
            onError?.(data.type);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Suporte nativo (Safari)
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(err => {
            console.error('Autoplay falhou:', err);
          });
        }, { once: true });
      } else {
        setError('Seu navegador não suporta reprodução HLS');
        setIsLoading(false);
      }
    } else {
      // Stream não-HLS
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(err => {
          console.error('Autoplay falhou:', err);
        });
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [url]);

  // Event listeners do vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    if (newVolume > 0 && video.muted) {
      video.muted = false;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = parseFloat(e.target.value);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error && !error.includes('Tentando')) {
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
    <div className="relative w-full rounded-lg overflow-hidden bg-black group">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onClick={togglePlay}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-2"></div>
            <p>Carregando stream...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        {duration > 0 && (
          <div className="mb-3">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isPlaying ? (
              <PauseIcon className="h-6 w-6" />
            ) : (
              <PlayIcon className="h-6 w-6" />
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <SpeakerXMarkIcon className="h-6 w-6" />
              ) : (
                <SpeakerWaveIcon className="h-6 w-6" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Title */}
          {title && (
            <div className="flex-1 text-white text-sm truncate">
              {title}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <ArrowsPointingOutIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
