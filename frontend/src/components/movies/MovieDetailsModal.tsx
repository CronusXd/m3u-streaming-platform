'use client';

import { useState, useEffect } from 'react';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import { searchMovie, getTMDBImageUrl, formatRuntime, formatRating, extractYear } from '@/services/tmdb';
import { getPosterUrl, getBackdropUrl } from '@/utils/tmdb-helpers';
import { optimizedCache } from '@/lib/cache/optimized-cache';
import type { ConteudoIPTV } from '@/types/iptv';

interface MovieDetailsModalProps {
  movie: (ConteudoIPTV & {
    stream_url: string;
  }) | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MovieDetailsModal({
  movie,
  isOpen,
  onClose,
}: MovieDetailsModalProps) {
  const [tmdbData, setTmdbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);

  useEffect(() => {
    if (isOpen && movie) {
      loadMovieData();
    } else {
      setTmdbData(null);
      setLoading(true);
    }
  }, [isOpen, movie?.id]);

  const loadMovieData = async () => {
    if (!movie || !movie.nome) return;
    
    // Buscar da API TMDB em tempo real
    setLoading(true);
    try {
      const { cleanName, year } = extractYear(movie.nome || '');
      const data = await searchMovie(cleanName, year);
      
      if (data) {
        setTmdbData(data);
      } else {
        // Fallback para dados do banco se API falhar
        setTmdbData({
          title: movie.tmdb_title || movie.nome,
          overview: movie.tmdb_overview,
          poster_path: movie.tmdb_poster_path,
          backdrop_path: movie.tmdb_backdrop_path,
          release_date: movie.tmdb_release_date,
          runtime: movie.tmdb_runtime,
          genres: movie.tmdb_genres || [],
          vote_average: movie.tmdb_vote_average || movie.avaliacao,
          director: movie.tmdb_director,
          cast: movie.tmdb_cast || []
        });
      }
    } catch (error) {
      console.error('Error loading movie data:', error);
      // Usar dados do banco como fallback
      setTmdbData({
        title: movie.tmdb_title || movie.nome,
        overview: movie.tmdb_overview,
        vote_average: movie.tmdb_vote_average || movie.avaliacao
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    // 1. Stream já incluído no filme (do cache de pré-carregamento)
    if (movie?.stream_url) {
      console.log('✅ Stream do cache de pré-carregamento');
      
      // Converter para URL segura (proxy se HTTP)
      const { getSecureStreamUrl } = await import('@/utils/stream-url');
      const secureUrl = getSecureStreamUrl(movie.stream_url);
      
      if (secureUrl) {
        setStreamUrl(secureUrl);
        setShowPlayer(true);
      } else {
        alert('URL do stream inválida');
      }
      return;
    }

    // 2. Fallback: Buscar do cache completo
    setLoadingStream(true);
    try {
      const allMovies = await optimizedCache.getAllMoviesWithStreams();
      
      if (allMovies && allMovies.movies) {
        const filmeComStream = allMovies.movies.find((m: any) => m.id === movie!.id);
        
        if (filmeComStream && filmeComStream.stream_url) {
          console.log('✅ Stream encontrado no cache completo');
          
          // Converter para URL segura (proxy se HTTP)
          const { getSecureStreamUrl } = await import('@/utils/stream-url');
          const secureUrl = getSecureStreamUrl(filmeComStream.stream_url);
          
          if (secureUrl) {
            setStreamUrl(secureUrl);
            setShowPlayer(true);
          } else {
            alert('URL do stream inválida');
          }
          setLoadingStream(false);
          return;
        }
      }

      // 3. Último recurso: Buscar da API
      console.log('⚠️ Stream não encontrado no cache, buscando da API...');
      const response = await fetch(`/api/iptv/filmes/${movie!.id}/stream`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar stream');
      }
      
      const data = await response.json();
      
      if (data.url_stream) {
        // Converter para URL segura (proxy se HTTP)
        const { getSecureStreamUrl } = await import('@/utils/stream-url');
        const secureUrl = getSecureStreamUrl(data.url_stream);
        
        if (secureUrl) {
          setStreamUrl(secureUrl);
          setShowPlayer(true);
        } else {
          alert('URL do stream inválida');
        }
      } else {
        alert('Stream não disponível para este filme');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar stream:', error);
      alert('Erro ao carregar stream. Tente novamente.');
    } finally {
      setLoadingStream(false);
    }
  };

  const handlePlayTrailer = () => {
    if (tmdbData?.videos && tmdbData.videos.length > 0) {
      setShowTrailer(true);
    }
  };

  if (!isOpen || !movie) return null;

  // Usar dados TMDB com fallback inteligente
  const posterUrl = tmdbData?.poster_path 
    ? getTMDBImageUrl(tmdbData.poster_path, 'w500')
    : getPosterUrl(movie, 'w500');

  const backdropUrl = tmdbData?.backdrop_path
    ? getTMDBImageUrl(tmdbData.backdrop_path, 'original')
    : getBackdropUrl(movie, 'original');

  const trailerUrl = tmdbData?.videos?.[0]
    ? `https://www.youtube.com/embed/${tmdbData.videos[0].key}?autoplay=1`
    : null;
  
  const title = tmdbData?.title || movie.tmdb_title || movie.nome;
  const overview = tmdbData?.overview || movie.tmdb_overview;
  const releaseDate = tmdbData?.release_date || movie.tmdb_release_date;
  const runtime = tmdbData?.runtime || movie.tmdb_runtime;
  const voteAverage = tmdbData?.vote_average || movie.tmdb_vote_average || movie.avaliacao;
  const director = tmdbData?.director || movie.tmdb_director;
  const genres = tmdbData?.genres || movie.tmdb_genres || [];
  const cast = tmdbData?.cast || movie.tmdb_cast || [];

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
                  alt={movie.nome}
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
                  {posterUrl || backdropUrl ? (
                    <img
                      src={posterUrl || backdropUrl || ''}
                      alt={title}
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
                      {title}
                    </h1>
                    {releaseDate && (
                      <p className="mt-1 text-xl text-netflix-lightGray">
                        ({new Date(releaseDate).getFullYear()})
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-6 w-6 ${
                            i < formatRating(voteAverage || 0)
                              ? 'text-yellow-400'
                              : 'text-netflix-dimGray'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      {voteAverage && (
                        <span className="ml-2 text-netflix-lightGray">
                          {voteAverage.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {director && (
                      <div>
                        <span className="text-netflix-dimGray">Dirigido por:</span>
                        <p className="text-white">{director}</p>
                      </div>
                    )}
                    {releaseDate && (
                      <div>
                        <span className="text-netflix-dimGray">Data de lançamento:</span>
                        <p className="text-white">
                          {new Date(releaseDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {runtime && (
                      <div>
                        <span className="text-netflix-dimGray">Duração:</span>
                        <p className="text-white">{formatRuntime(runtime)}</p>
                      </div>
                    )}
                    {genres && genres.length > 0 && (
                      <div>
                        <span className="text-netflix-dimGray">Gênero:</span>
                        <p className="text-white">
                          {genres.map((g: any) => g.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cast */}
                  {cast && cast.length > 0 && (
                    <div>
                      <span className="text-netflix-dimGray">Elenco:</span>
                      <p className="mt-1 text-white">
                        {cast.map((c: any) => c.name).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Overview */}
                  {overview && (
                    <div>
                      <span className="text-netflix-dimGray">Sinopse:</span>
                      <p className="mt-2 text-netflix-lightGray leading-relaxed">
                        {overview}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handlePlay}
                      disabled={loadingStream}
                      className="flex items-center gap-3 rounded-lg bg-netflix-red px-12 py-4 text-lg font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingStream ? (
                        <>
                          <div className="h-7 w-7 animate-spin rounded-full border-4 border-white border-r-transparent"></div>
                          Carregando...
                        </>
                      ) : (
                        <>
                          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>

                    {trailerUrl && (
                      <button
                        onClick={handlePlayTrailer}
                        className="flex items-center gap-3 rounded-lg bg-netflix-red px-10 py-4 text-lg font-bold text-white transition-colors hover:bg-red-700"
                      >
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Trailer
                      </button>
                    )}
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
      {showPlayer && streamUrl && (
        <VideoPlayerModal
          channel={{
            id: movie.id,
            name: movie.nome,
            display_name: movie.nome,
            stream_url: streamUrl,
            logo_url: posterUrl || undefined,
            is_hls: true,
          }}
          isOpen={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setStreamUrl(null);
          }}
          onChannelSelect={() => {}}
        />
      )}
    </>
  );
}
