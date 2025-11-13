'use client';

import { useState, useEffect } from 'react';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import { searchMovie, getTMDBImageUrl, formatRuntime, formatRating, extractYear, type TMDBMovie } from '@/services/tmdb';

interface MovieDetailsModalProps {
  movie: {
    id: string;
    name: string;
    stream_url: string;
    logo_url?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MovieDetailsModal({
  movie,
  isOpen,
  onClose,
}: MovieDetailsModalProps) {
  const [tmdbData, setTmdbData] = useState<TMDBMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (isOpen && movie) {
      loadMovieData();
    }
  }, [isOpen, movie]);

  const loadMovieData = async () => {
    if (!movie) return;
    
    setLoading(true);
    try {
      const { cleanName, year } = extractYear(movie.name);
      const data = await searchMovie(cleanName, year);
      setTmdbData(data);
    } catch (error) {
      console.error('Error loading movie data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    setShowPlayer(true);
  };

  const handlePlayTrailer = () => {
    if (tmdbData?.videos && tmdbData.videos.length > 0) {
      setShowTrailer(true);
    }
  };

  if (!isOpen || !movie) return null;

  const posterUrl = tmdbData?.poster_path 
    ? getTMDBImageUrl(tmdbData.poster_path, 'w500')
    : movie.logo_url;

  const backdropUrl = tmdbData?.backdrop_path
    ? getTMDBImageUrl(tmdbData.backdrop_path, 'original')
    : null;

  const trailerUrl = tmdbData?.videos?.[0]
    ? `https://www.youtube.com/embed/${tmdbData.videos[0].key}?autoplay=1`
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed right-6 top-6 z-20 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
          </div>
        ) : (
          <div className="relative min-h-screen">
            {/* Backdrop Image */}
            {backdropUrl && (
              <div className="absolute inset-0 h-screen">
                <img
                  src={backdropUrl}
                  alt={movie.name}
                  className="h-full w-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
              <div className="flex gap-8">
                {/* Movie Poster */}
                <div className="flex-shrink-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movie.name}
                      className="h-96 w-64 rounded-lg object-cover shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-96 w-64 items-center justify-center rounded-lg bg-netflix-mediumGray">
                      <svg className="h-20 w-20 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Movie Details */}
                <div className="flex-1 space-y-6">
                  {/* Title and Rating */}
                  <div>
                    <h1 className="text-4xl font-bold text-white">
                      {tmdbData?.title || movie.name}
                    </h1>
                    {tmdbData?.release_date && (
                      <p className="mt-1 text-xl text-netflix-lightGray">
                        ({new Date(tmdbData.release_date).getFullYear()})
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-6 w-6 ${
                            i < formatRating(tmdbData?.vote_average || 0)
                              ? 'text-yellow-400'
                              : 'text-netflix-dimGray'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      {tmdbData?.vote_average && (
                        <span className="ml-2 text-netflix-lightGray">
                          {tmdbData.vote_average.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {tmdbData?.director && (
                      <div>
                        <span className="text-netflix-dimGray">Dirigido por:</span>
                        <p className="text-white">{tmdbData.director}</p>
                      </div>
                    )}
                    {tmdbData?.release_date && (
                      <div>
                        <span className="text-netflix-dimGray">Data de lançamento:</span>
                        <p className="text-white">
                          {new Date(tmdbData.release_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {tmdbData?.runtime && (
                      <div>
                        <span className="text-netflix-dimGray">Duração:</span>
                        <p className="text-white">{formatRuntime(tmdbData.runtime)}</p>
                      </div>
                    )}
                    {tmdbData?.genres && tmdbData.genres.length > 0 && (
                      <div>
                        <span className="text-netflix-dimGray">Gênero:</span>
                        <p className="text-white">
                          {tmdbData.genres.map(g => g.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cast */}
                  {tmdbData?.cast && tmdbData.cast.length > 0 && (
                    <div>
                      <span className="text-netflix-dimGray">Fundida:</span>
                      <p className="mt-1 text-white">
                        {tmdbData.cast.map(c => c.name).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Overview */}
                  {tmdbData?.overview && (
                    <div>
                      <span className="text-netflix-dimGray">Sinopse:</span>
                      <p className="mt-2 text-netflix-lightGray leading-relaxed">
                        {tmdbData.overview}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handlePlay}
                      className="flex items-center gap-2 rounded-lg bg-blue-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Play
                    </button>

                    {trailerUrl && (
                      <button
                        onClick={handlePlayTrailer}
                        className="flex items-center gap-2 rounded-lg bg-netflix-mediumGray px-6 py-3 font-semibold text-white transition-colors hover:bg-netflix-dimGray"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Trailer
                      </button>
                    )}

                    <button className="rounded-full p-3 text-netflix-red transition-colors hover:bg-netflix-mediumGray">
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailerUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95">
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute right-6 top-6 z-20 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-full max-w-6xl px-4">
            <div className="relative aspect-video">
              <iframe
                src={trailerUrl}
                className="h-full w-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayer && (
        <VideoPlayerModal
          channel={{
            id: movie.id,
            name: movie.name,
            stream_url: movie.stream_url,
            logo_url: movie.logo_url,
            is_hls: true,
          }}
          isOpen={showPlayer}
          onClose={() => setShowPlayer(false)}
          onChannelSelect={() => {}}
        />
      )}
    </>
  );
}
