'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { IPTVService } from '@/services/iptvService';
import { searchMovie, searchSeries, getTMDBImageUrl, extractYear, formatRuntime } from '@/services/tmdb';
import type { ConteudoIPTV } from '@/types/iptv';
import type { TMDBMovie, TMDBSeries } from '@/services/tmdb';
import Hls from 'hls.js';

function PlayerContent() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [conteudo, setConteudo] = useState<ConteudoIPTV | null>(null);
  const [tmdbData, setTmdbData] = useState<TMDBMovie | TMDBSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = searchParams.get('id');
  const tipo = searchParams.get('tipo') as 'canal' | 'filme' | 'serie' | null;

  useEffect(() => {
    if (id && tipo) {
      carregarConteudo();
    }
  }, [id, tipo]);

  useEffect(() => {
    if (conteudo) {
      inicializarPlayer();
      carregarMetadados();
      IPTVService.incrementarVisualizacao(conteudo.id);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [conteudo]);

  const carregarConteudo = async () => {
    try {
      setLoading(true);
      let data: ConteudoIPTV | null = null;

      if (tipo === 'filme') {
        data = await IPTVService.getFilmePorId(id!);
      } else if (tipo === 'canal') {
        data = await IPTVService.getCanalPorId(id!);
      } else {
        // Para séries, buscar pelo ID do episódio
        data = await IPTVService.getEpisodioPorId(id!);
      }

      setConteudo(data);
    } catch (err) {
      setError('Erro ao carregar conteúdo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarMetadados = async () => {
    if (!conteudo) return;

    try {
      const { cleanName, year } = extractYear(conteudo.nome);

      if (conteudo.tipo === 'filme') {
        const data = await searchMovie(cleanName, year);
        setTmdbData(data);
      } else if (conteudo.tipo === 'serie') {
        const data = await searchSeries(cleanName, year);
        setTmdbData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar metadados TMDB:', err);
    }
  };

  const inicializarPlayer = () => {
    if (!videoRef.current || !conteudo) return;

    const video = videoRef.current;
    const url = conteudo.url_stream;

    if (conteudo.is_hls && Hls.isSupported()) {
      // HLS com hls.js
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(console.error);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS Error:', data);
          setError('Erro ao carregar stream');
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // HLS nativo (Safari)
      video.src = url;
      video.play().catch(console.error);
    } else {
      // Stream direto
      video.src = url;
      video.play().catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !conteudo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-xl text-red-600">{error || 'Conteúdo não encontrado'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-white"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const backdropUrl = tmdbData && 'backdrop_path' in tmdbData 
    ? getTMDBImageUrl(tmdbData.backdrop_path, 'original')
    : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Player */}
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full"
          controls
          autoPlay
          playsInline
        />
      </div>

      {/* Informações */}
      <div className="relative">
        {/* Backdrop */}
        {backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}

        <div className="relative mx-auto max-w-7xl p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Poster */}
            {tmdbData && 'poster_path' in tmdbData && (
              <div className="w-48 flex-shrink-0">
                <img
                  src={getTMDBImageUrl(tmdbData.poster_path, 'w300') || ''}
                  alt={conteudo.nome}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Detalhes */}
            <div className="flex-1 text-white">
              <h1 className="text-4xl font-bold">{conteudo.nome}</h1>

              {conteudo.tipo === 'serie' && conteudo.temporada && conteudo.episodio && (
                <p className="mt-2 text-xl text-gray-400">
                  Temporada {conteudo.temporada} • Episódio {conteudo.episodio}
                  {conteudo.nome_episodio && ` - ${conteudo.nome_episodio}`}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
                <span className="rounded bg-gray-800 px-3 py-1">{conteudo.categoria}</span>
                {tmdbData && 'release_date' in tmdbData && tmdbData.release_date && (
                  <span>{new Date(tmdbData.release_date).getFullYear()}</span>
                )}
                {tmdbData && 'runtime' in tmdbData && tmdbData.runtime && (
                  <span>{formatRuntime(tmdbData.runtime)}</span>
                )}
                {tmdbData && 'vote_average' in tmdbData && (
                  <span>⭐ {tmdbData.vote_average.toFixed(1)}/10</span>
                )}
              </div>

              {tmdbData && 'overview' in tmdbData && tmdbData.overview && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold">Sinopse</h2>
                  <p className="mt-2 text-gray-300">{tmdbData.overview}</p>
                </div>
              )}

              {tmdbData && 'genres' in tmdbData && tmdbData.genres && (
                <div className="mt-4">
                  <h3 className="font-semibold">Gêneros</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tmdbData.genres.map((genre) => (
                      <span key={genre.id} className="rounded-full bg-red-600 px-3 py-1 text-sm">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}
