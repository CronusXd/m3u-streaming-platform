'use client';

import { useState, useEffect } from 'react';
import { getSeasonDetails, getTMDBImageUrl } from '@/services/tmdb';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';

interface EpisodesViewProps {
  series: any;
  season: any;
  onBack: () => void;
}

export default function EpisodesView({ series, season, onBack }: EpisodesViewProps) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<any[]>([]);

  useEffect(() => {
    loadEpisodes();
    loadTMDBEpisodes();
  }, [series.nome, season.temporada]);

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      // Buscar episódios da API (já retorna ordenados)
      const response = await fetch(
        `/api/iptv/series/${encodeURIComponent(series.nome)}/seasons/${season.temporada}/episodes`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(
        `✅ ${data.episodes?.length || 0} episódios carregados para ${series.nome} - Temporada ${season.temporada}`
      );

      setEpisodes(data.episodes || []);
    } catch (error) {
      console.error('❌ Erro ao carregar episódios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTMDBEpisodes = async () => {
    try {
      // Buscar dados TMDB da série primeiro
      const { searchSeries } = await import('@/services/tmdb');
      const seriesData = await searchSeries(series.nome);
      
      if (seriesData) {
        const episodesData = await getSeasonDetails(seriesData.id, season.temporada);
        setTmdbEpisodes(episodesData);
      }
    } catch (error) {
      console.error('Erro ao carregar episódios TMDB:', error);
    }
  };

  const getEnrichedEpisode = (episode: any) => {
    const tmdbEpisode = tmdbEpisodes.find(
      (e) => e.episode_number === episode.episodio
    );

    return {
      ...episode,
      tmdb_name: tmdbEpisode?.name,
      tmdb_overview: tmdbEpisode?.overview,
      tmdb_still_path: tmdbEpisode?.still_path,
      tmdb_vote_average: tmdbEpisode?.vote_average,
      tmdb_runtime: tmdbEpisode?.runtime,
    };
  };

  const handleEpisodeClick = (episode: any) => {
    setSelectedEpisode({
      id: episode.id,
      name: `${series.nome} - S${String(season.temporada).padStart(2, '0')}E${String(episode.episodio).padStart(2, '0')}`,
      stream_url: episode.stream_url,
      logo_url: episode.logo_url,
      is_hls: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            {series.nome} - Temporada {season.temporada}
          </h1>
          <p className="mt-2 text-netflix-dimGray">
            {episodes.length} episódios disponíveis
          </p>
        </div>

        {/* Episodes Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((episode) => {
            const enriched = getEnrichedEpisode(episode);
            const stillUrl = enriched.tmdb_still_path
              ? getTMDBImageUrl(enriched.tmdb_still_path, 'w500')
              : enriched.logo_url;

            return (
              <button
                key={episode.id}
                onClick={() => handleEpisodeClick(episode)}
                className="group relative overflow-hidden rounded-lg bg-netflix-darkGray transition-transform hover:scale-105"
              >
                {/* Episode Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-netflix-mediumGray">
                  {stillUrl ? (
                    <img
                      src={stillUrl}
                      alt={enriched.tmdb_name || episode.nome_episodio || `Episódio ${episode.episodio}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        className="h-12 w-12 text-netflix-dimGray"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-full bg-purple-600 p-4">
                      <svg
                        className="h-8 w-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </div>

                  {/* Episode Number Badge */}
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-bold text-white">
                    E{String(episode.episodio).padStart(2, '0')}
                  </div>

                  {/* Duration */}
                  {enriched.tmdb_runtime && (
                    <div className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      {enriched.tmdb_runtime}m
                    </div>
                  )}
                </div>

                {/* Episode Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {enriched.tmdb_name || episode.nome_episodio || `Episódio ${episode.episodio}`}
                    </h3>
                    {enriched.tmdb_vote_average && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <svg
                          className="h-4 w-4 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs text-netflix-lightGray">
                          {enriched.tmdb_vote_average.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {enriched.tmdb_overview && (
                    <p className="text-xs text-netflix-dimGray line-clamp-3">
                      {enriched.tmdb_overview}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {episodes.length === 0 && (
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
            <p>Nenhum episódio encontrado</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedEpisode && (
        <VideoPlayerModal
          channel={selectedEpisode}
          isOpen={!!selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onChannelSelect={() => {}}
        />
      )}
    </>
  );
}
