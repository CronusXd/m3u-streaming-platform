'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IPTVService } from '@/services/iptvService';
import { searchSeries, getTMDBImageUrl, extractYear } from '@/services/tmdb';
import type { SerieIPTV } from '@/types/iptv';
import type { TMDBSeries } from '@/services/tmdb';

export default function EpisodiosPage() {
  const params = useParams();
  const nomeSerie = decodeURIComponent(params.nome as string);

  const [episodios, setEpisodios] = useState<SerieIPTV[]>([]);
  const [temporadas, setTemporadas] = useState<number[]>([]);
  const [temporadaSelecionada, setTemporadaSelecionada] = useState<number | null>(null);
  const [tmdbData, setTmdbData] = useState<TMDBSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTemporadas();
    carregarMetadados();
  }, [nomeSerie]);

  useEffect(() => {
    if (temporadaSelecionada !== null) {
      carregarEpisodios();
    }
  }, [temporadaSelecionada]);

  const carregarTemporadas = async () => {
    try {
      const temps = await IPTVService.getTemporadasSerie(nomeSerie);
      setTemporadas(temps);
      if (temps.length > 0) {
        setTemporadaSelecionada(temps[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar temporadas:', error);
    }
  };

  const carregarEpisodios = async () => {
    try {
      setLoading(true);
      const data = await IPTVService.getEpisodiosSerie(nomeSerie, temporadaSelecionada || undefined);
      setEpisodios(data);
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarMetadados = async () => {
    try {
      const { cleanName, year } = extractYear(nomeSerie);
      const data = await searchSeries(cleanName, year);
      setTmdbData(data);
    } catch (error) {
      console.error('Erro ao carregar metadados:', error);
    }
  };

  const handleEpisodioClick = (episodio: SerieIPTV) => {
    window.location.href = `/dashboard/player?id=${episodio.id}&tipo=serie`;
  };

  const backdropUrl = tmdbData ? getTMDBImageUrl(tmdbData.backdrop_path, 'original') : null;
  const posterUrl = tmdbData ? getTMDBImageUrl(tmdbData.poster_path, 'w500') : null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header com Backdrop */}
      <div className="relative h-96 overflow-hidden">
        {backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end p-6">
          <div className="flex gap-6">
            {/* Poster */}
            {posterUrl && (
              <img
                src={posterUrl}
                alt={nomeSerie}
                className="h-64 w-44 rounded-lg shadow-2xl"
              />
            )}

            {/* Info */}
            <div className="flex flex-col justify-end pb-4 text-white">
              <h1 className="text-5xl font-bold">{nomeSerie}</h1>
              {tmdbData && (
                <>
                  <div className="mt-4 flex gap-4 text-sm">
                    {tmdbData.first_air_date && (
                      <span>{new Date(tmdbData.first_air_date).getFullYear()}</span>
                    )}
                    <span>⭐ {tmdbData.vote_average.toFixed(1)}/10</span>
                    <span>{tmdbData.number_of_seasons} temporadas</span>
                    <span>{tmdbData.number_of_episodes} episódios</span>
                  </div>
                  {tmdbData.overview && (
                    <p className="mt-4 max-w-3xl text-gray-300">{tmdbData.overview}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Temporada */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {temporadas.map((temp) => (
            <button
              key={temp}
              onClick={() => setTemporadaSelecionada(temp)}
              className={`rounded-lg px-6 py-2 font-semibold transition-colors ${
                temporadaSelecionada === temp
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Temporada {temp}
            </button>
          ))}
        </div>

        {/* Lista de Episódios */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          </div>
        ) : episodios.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Nenhum episódio encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {episodios.map((episodio) => (
              <div
                key={episodio.id}
                onClick={() => handleEpisodioClick(episodio)}
                className="group flex cursor-pointer gap-4 rounded-lg bg-gray-800 p-4 transition-all hover:bg-gray-700"
              >
                {/* Thumbnail */}
                <div className="flex h-24 w-40 flex-shrink-0 items-center justify-center rounded bg-gray-700">
                  {episodio.logo_url ? (
                    <img
                      src={episodio.logo_url}
                      alt={`Episódio ${episodio.episodio}`}
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-600">
                      {episodio.episodio}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {episodio.episodio}. {episodio.nome_episodio || `Episódio ${episodio.episodio}`}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Temporada {episodio.temporada} • Episódio {episodio.episodio}
                      </p>
                    </div>
                    <button className="rounded-full bg-red-600 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
