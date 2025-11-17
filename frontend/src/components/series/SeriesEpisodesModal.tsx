'use client';

import { useState, useEffect } from 'react';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import { searchSeries, getSeasonDetails, getTMDBImageUrl, formatRating, extractYear, type TMDBSeries, type TMDBEpisode } from '@/services/tmdb';

interface Episode {
  id: string;
  name: string;
  season: number;
  episode: number;
  streamUrl: string;
  logo?: string;
  plot?: string;
  duration?: string;
  rating?: number;
}

interface SeriesInfo {
  name: string;
  logo?: string;
  director?: string;
  releaseDate?: string;
  genre?: string;
  plot?: string;
  rating?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
}

interface SeasonGroup {
  season: number;
  episodes: Episode[];
}

interface SeriesEpisodesModalProps {
  seriesName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SeriesEpisodesModal({
  seriesName,
  isOpen,
  onClose,
}: SeriesEpisodesModalProps) {
  const [seasons, setSeasons] = useState<SeasonGroup[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'episodes' | 'info'>('episodes');
  const [tmdbData, setTmdbData] = useState<TMDBSeries | null>(null);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<Map<number, TMDBEpisode[]>>(new Map());

  useEffect(() => {
    if (isOpen && seriesName) {
      setTmdbData(null); // Reset data
      setTmdbEpisodes(new Map()); // Reset episodes
      loadEpisodes();
      loadTMDBData();
    } else {
      setTmdbData(null);
      setTmdbEpisodes(new Map());
      setLoading(true);
    }
  }, [isOpen, seriesName]); // seriesName é string, não causa loop

  useEffect(() => {
    if (tmdbData && selectedSeason) {
      loadTMDBEpisodes(selectedSeason);
    }
  }, [selectedSeason, tmdbData]);

  const loadTMDBData = async () => {
    try {
      const { cleanName, year } = extractYear(seriesName);
      const data = await searchSeries(cleanName, year);
      setTmdbData(data);
    } catch (error) {
      console.error('Error loading TMDB data:', error);
    }
  };

  const loadTMDBEpisodes = async (seasonNumber: number) => {
    if (!tmdbData || tmdbEpisodes.has(seasonNumber)) return;
    
    try {
      const episodes = await getSeasonDetails(tmdbData.id, seasonNumber);
      setTmdbEpisodes(prev => new Map(prev).set(seasonNumber, episodes));
    } catch (error) {
      console.error('Error loading TMDB episodes:', error);
    }
  };

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      const { getSeriesEpisodes } = await import('@/services/api');
      const seasonsData = await getSeriesEpisodes(seriesName);
      setSeasons(seasonsData);
      if (seasonsData.length > 0) {
        setSelectedSeason(seasonsData[0].season);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading episodes:', error);
      setLoading(false);
    }
  };

  // Merge TMDB data with local episode data
  const getEnrichedEpisode = (episode: Episode): Episode => {
    const tmdbEpisode = tmdbEpisodes.get(episode.season)?.find(
      e => e.episode_number === episode.episode
    );

    if (tmdbEpisode) {
      return {
        ...episode,
        name: tmdbEpisode.name || episode.name,
        plot: tmdbEpisode.overview || episode.plot,
        logo: tmdbEpisode.still_path ? getTMDBImageUrl(tmdbEpisode.still_path, 'w500') || episode.logo : episode.logo,
        rating: tmdbEpisode.vote_average ? formatRating(tmdbEpisode.vote_average) : episode.rating,
        duration: tmdbEpisode.runtime ? `${tmdbEpisode.runtime}m` : episode.duration,
      };
    }

    return episode;
  };

  const currentSeasonEpisodes = seasons.find(s => s.season === selectedSeason)?.episodes || [];
  const enrichedEpisodes = currentSeasonEpisodes.map(getEnrichedEpisode);

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode({
      id: episode.id,
      name: episode.name,
      stream_url: episode.streamUrl,
      logo_url: episode.logo,
      is_hls: true,
    });
  };

  if (!isOpen) return null;

  // Use TMDB data if available
  const posterUrl = tmdbData?.poster_path 
    ? getTMDBImageUrl(tmdbData.poster_path, 'w500')
    : seriesInfo?.logo;

  const backdropUrl = tmdbData?.backdrop_path
    ? getTMDBImageUrl(tmdbData.backdrop_path, 'original')
    : null;

  const director = tmdbData?.created_by?.[0]?.name || 'N/A';
  const releaseDate = tmdbData?.first_air_date 
    ? new Date(tmdbData.first_air_date).toLocaleDateString('pt-BR')
    : 'N/A';
  const genres = tmdbData?.genres?.map(g => g.name).join(', ') || 'N/A';
  const overview = tmdbData?.overview || 'Informações não disponíveis.';
  const rating = tmdbData?.vote_average ? formatRating(tmdbData.vote_average) : 4;
  const totalSeasons = tmdbData?.number_of_seasons || seasons.length;
  const totalEpisodes = tmdbData?.number_of_episodes || seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  const trailerUrl = tmdbData?.videos?.[0]
    ? `https://www.youtube.com/embed/${tmdbData.videos[0].key}`
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/90"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 min-h-screen">
          <div className="mx-auto max-w-6xl p-4">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-6 top-6 z-20 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hero Section with Series Info */}
                <div className="flex gap-6 rounded-xl bg-netflix-darkGray p-6">
                  {/* Series Poster */}
                  <div className="flex-shrink-0">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={seriesName}
                        className="h-64 w-44 rounded-lg object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-64 w-44 items-center justify-center rounded-lg bg-netflix-mediumGray">
                        <svg className="h-16 w-16 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Series Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-3xl font-bold text-white">{seriesName}</h1>
                      <div className="mt-2 flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-5 w-5 ${i < rating ? 'text-yellow-400' : 'text-netflix-dimGray'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        {tmdbData?.vote_average && (
                          <span className="ml-2 text-sm text-netflix-lightGray">
                            {tmdbData.vote_average.toFixed(1)}/10
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-netflix-dimGray">Dirigido por:</span>
                        <p className="text-white">{director}</p>
                      </div>
                      <div>
                        <span className="text-netflix-dimGray">Data de lançamento:</span>
                        <p className="text-white">{releaseDate}</p>
                      </div>
                      <div>
                        <span className="text-netflix-dimGray">Gênero:</span>
                        <p className="text-white">{genres}</p>
                      </div>
                      <div>
                        <span className="text-netflix-dimGray">Temporadas:</span>
                        <p className="text-white">{totalSeasons} temporadas, {totalEpisodes} episódios</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-netflix-dimGray">Enredo:</span>
                      <p className="mt-1 text-sm text-netflix-lightGray leading-relaxed">
                        {overview}
                      </p>
                      {trailerUrl && (
                        <a
                          href={trailerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-netflix-red hover:underline"
                        >
                          Assistir Trailer
                        </a>
                      )}
                    </div>

                    {/* Resume Button and Season Selector */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => currentSeasonEpisodes[0] && handleEpisodeClick(currentSeasonEpisodes[0])}
                        className="rounded-lg bg-blue-500 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-600"
                      >
                        Retomar - S{selectedSeason}:E{currentSeasonEpisodes[0]?.episode || 1}
                      </button>
                      
                      <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(Number(e.target.value))}
                        className="rounded-lg bg-netflix-mediumGray px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                      >
                        {seasons.map((season) => (
                          <option key={season.season} value={season.season}>
                            Estação - {season.season}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-netflix-mediumGray">
                  <button
                    onClick={() => setActiveTab('episodes')}
                    className={`pb-3 text-sm font-semibold transition-colors ${
                      activeTab === 'episodes'
                        ? 'border-b-2 border-netflix-red text-white'
                        : 'text-netflix-dimGray hover:text-white'
                    }`}
                  >
                    EPISÓDIOS ({currentSeasonEpisodes.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`pb-3 text-sm font-semibold transition-colors ${
                      activeTab === 'info'
                        ? 'border-b-2 border-netflix-red text-white'
                        : 'text-netflix-dimGray hover:text-white'
                    }`}
                  >
                    Fundida
                  </button>
                </div>

                {/* Episodes Grid */}
                {activeTab === 'episodes' && (
                  <div className="grid gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
                    {enrichedEpisodes.map((episode) => (
                      <button
                        key={episode.id}
                        onClick={() => handleEpisodeClick(episode)}
                        className="group relative overflow-hidden rounded-lg bg-netflix-darkGray transition-transform hover:scale-105"
                      >
                        {/* Episode Thumbnail */}
                        <div className="relative aspect-video w-full overflow-hidden bg-netflix-mediumGray">
                          {episode.logo && episode.logo.startsWith('http') ? (
                            <img
                              src={episode.logo}
                              alt={episode.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg className="h-12 w-12 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Play Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="rounded-full bg-netflix-red p-3">
                              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>

                          {/* Episode Number Badge */}
                          <div className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                            {episode.episode}
                          </div>

                          {/* Duration */}
                          {episode.duration && (
                            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                              {episode.duration}
                            </div>
                          )}
                        </div>

                        {/* Episode Info */}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white line-clamp-2">
                              {seriesName} - S{String(episode.season).padStart(2, '0')}E{String(episode.episode).padStart(2, '0')} - {episode.name}
                            </h3>
                          </div>
                          {episode.rating && (
                            <div className="mt-1 flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`h-3 w-3 ${i < episode.rating! ? 'text-yellow-400' : 'text-netflix-dimGray'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          )}
                          {episode.plot && (
                            <p className="mt-2 text-xs text-netflix-dimGray line-clamp-2">
                              {episode.plot}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Cast Tab */}
                {activeTab === 'info' && (
                  <div className="pb-8 text-center text-netflix-dimGray">
                    <p>Informações de elenco não disponíveis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <VideoPlayerModal
        channel={selectedEpisode}
        isOpen={!!selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
        onChannelSelect={() => {}}
      />
    </>
  );
}
