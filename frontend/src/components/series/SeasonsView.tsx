'use client';

import { useState, useEffect } from 'react';
import { searchSeries, getTMDBImageUrl } from '@/services/tmdb';

interface SeasonsViewProps {
  series: any;
  onSeasonClick: (season: any) => void;
  onBack: () => void;
}

export default function SeasonsView({ series, onSeasonClick }: SeasonsViewProps) {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tmdbData, setTmdbData] = useState<any>(null);

  useEffect(() => {
    loadSeasons();
    loadTMDBData();
  }, [series.nome]);

  const loadSeasons = async () => {
    setLoading(true);
    try {
      // Buscar temporadas da API (já retorna todas as temporadas agrupadas)
      const response = await fetch(
        `/api/iptv/series/${encodeURIComponent(series.nome)}/seasons`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`✅ ${data.seasons?.length || 0} temporadas carregadas para ${series.nome}`);

      // Mapear para formato esperado
      const seasonsArray = data.seasons.map((season: any) => ({
        temporada: season.temporada,
        logo_url: season.primeiroEpisodio?.logo_url || null,
        backdrop_url: season.primeiroEpisodio?.backdrop_url || null,
        episodios: season.totalEpisodios,
      }));

      setSeasons(seasonsArray);
    } catch (error) {
      console.error('❌ Erro ao carregar temporadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTMDBData = async () => {
    try {
      const data = await searchSeries(series.nome);
      setTmdbData(data);
    } catch (error) {
      console.error('Erro ao carregar dados TMDB:', error);
    }
  };

  const posterUrl = tmdbData?.poster_path
    ? getTMDBImageUrl(tmdbData.poster_path, 'w500')
    : series.logo_url;

  const backdropUrl = tmdbData?.backdrop_path
    ? getTMDBImageUrl(tmdbData.backdrop_path, 'original')
    : series.backdrop_url;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl">
        {/* Backdrop */}
        {backdropUrl && (
          <div className="absolute inset-0">
            <img
              src={backdropUrl}
              alt={series.nome}
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/80 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex gap-6 p-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={series.nome}
                className="h-64 w-44 rounded-lg object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-64 w-44 items-center justify-center rounded-lg bg-netflix-mediumGray">
                <svg
                  className="h-16 w-16 text-netflix-dimGray"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-white">{series.nome}</h1>
              {tmdbData?.first_air_date && (
                <p className="mt-1 text-xl text-netflix-lightGray">
                  ({new Date(tmdbData.first_air_date).getFullYear()})
                </p>
              )}
            </div>

            {tmdbData?.overview && (
              <p className="text-netflix-lightGray leading-relaxed max-w-3xl">
                {tmdbData.overview}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm">
              {tmdbData?.number_of_seasons && (
                <div>
                  <span className="text-netflix-dimGray">Temporadas:</span>
                  <span className="ml-2 text-white font-semibold">
                    {tmdbData.number_of_seasons}
                  </span>
                </div>
              )}
              {tmdbData?.number_of_episodes && (
                <div>
                  <span className="text-netflix-dimGray">Episódios:</span>
                  <span className="ml-2 text-white font-semibold">
                    {tmdbData.number_of_episodes}
                  </span>
                </div>
              )}
              {tmdbData?.vote_average && (
                <div>
                  <span className="text-netflix-dimGray">Avaliação:</span>
                  <span className="ml-2 text-white font-semibold">
                    ⭐ {tmdbData.vote_average.toFixed(1)}/10
                  </span>
                </div>
              )}
            </div>

            {tmdbData?.genres && tmdbData.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tmdbData.genres.map((genre: any) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-netflix-mediumGray px-3 py-1 text-xs text-white"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seasons Grid */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-white">
          📁 Temporadas ({seasons.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {seasons.map((season) => (
            <button
              key={season.temporada}
              onClick={() => onSeasonClick(season)}
              className="group relative overflow-hidden rounded-lg bg-netflix-darkGray transition-transform hover:scale-105"
            >
              {/* Season Poster */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-netflix-mediumGray">
                {season.logo_url || posterUrl ? (
                  <img
                    src={season.logo_url || posterUrl}
                    alt={`Temporada ${season.temporada}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-16 w-16 text-netflix-dimGray"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-full bg-purple-600 p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>

                {/* Season Number Badge */}
                <div className="absolute left-2 top-2 rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white">
                  T{season.temporada}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white">
                  Temporada {season.temporada}
                </h3>
                <p className="mt-1 text-xs text-netflix-dimGray">
                  {season.episodios} episódios
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {seasons.length === 0 && (
        <div className="py-24 text-center text-netflix-dimGray">
          <svg
            className="mx-auto h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Nenhuma temporada encontrada</p>
        </div>
      )}
    </div>
  );
}
