'use client';

import { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import MovieDetailsModal from '@/components/movies/MovieDetailsModal';
import FavoriteButton from '@/components/common/FavoriteButton';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface Movie {
  id: string;
  name: string;
  stream_url: string;
  logo_url?: string;
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
  count?: number;
}

const ITEMS_PER_PAGE = 50;

export default function FilmesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalMovies, setTotalMovies] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { favorites } = useFavorites();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      // Reset ao mudar categoria
      setMovies([]);
      setCurrentPage(1);
      setHasMore(true);
      loadMovies(selectedCategory, 1);
    }
  }, [selectedCategory, favorites]); // Recarregar quando favoritos mudarem

  const loadData = async () => {
    try {
      const { getCategoriesWithCounts } = await import('@/services/api');
      const categoriesData = await getCategoriesWithCounts('movies');
      
      // Agora getCategoriesWithCounts já filtra pelo campo 'type' = 'movie'
      setCategories(categoriesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadMovies = async (categoryId: string, page: number) => {
    const isFirstPage = page === 1;
    
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Se for favoritos, filtrar pelos favoritos do contexto
      if (categoryId === 'favorites') {
        const movieFavorites = favorites.filter(fav => fav.content_type === 'movie');
        
        if (movieFavorites.length === 0) {
          setMovies([]);
          setTotalMovies(0);
          setHasMore(false);
          setCurrentPage(1);
          return;
        }

        // Buscar stream_url dos canais
        const { supabase } = await import('@/lib/supabase');
        const contentIds = movieFavorites.map(fav => fav.content_id);
        
        const { data: channelsData } = await supabase
          .from('channels')
          .select('id, stream_url')
          .in('id', contentIds);

        // Mapear favoritos para o formato de Movie
        const favoriteMovies: Movie[] = movieFavorites.map(fav => {
          const channelData = channelsData?.find(ch => ch.id === fav.content_id);
          return {
            id: fav.content_id,
            name: fav.content_name,
            stream_url: channelData?.stream_url || '',
            logo_url: fav.content_logo,
          };
        });

        setMovies(favoriteMovies);
        setTotalMovies(favoriteMovies.length);
        setHasMore(false);
        setCurrentPage(1);
      } else {
        const { getChannels } = await import('@/services/api');
        
        const response = await getChannels({ 
          categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId,
          contentType: 'movies',
          page,
          limit: ITEMS_PER_PAGE 
        });

        if (isFirstPage) {
          setMovies(response.channels);
        } else {
          setMovies(prev => [...prev, ...response.channels]);
        }

        setTotalMovies(response.total);
        setHasMore(response.channels.length === ITEMS_PER_PAGE);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && selectedCategory) {
      loadMovies(selectedCategory, currentPage + 1);
    }
  };

  const { loadMoreRef } = useInfiniteScroll({
    loading: loadingMore,
    hasMore,
    onLoadMore: loadMore,
    threshold: 500,
  });

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-netflix-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
          <p className="mt-4 text-netflix-lightGray">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SidebarLayout
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        totalChannels={totalMovies}
        favoritesCount={favorites.filter(fav => fav.content_type === 'movie').length}
      >
        <div className="border-b border-netflix-mediumGray bg-netflix-darkGray p-6">
          <h1 className="text-2xl font-bold text-white">
            FILMES | {selectedCategory === 'all' ? 'TODOS' : 
                      selectedCategory === 'favorites' ? 'FAVORITOS' :
                      selectedCategory === 'history' ? 'HISTÓRICO' :
                      selectedCategory === 'recent' ? 'ADICIONADO RECENTEMENTE' :
                      categories.find(c => c.id === selectedCategory)?.name}
          </h1>
          <p className="mt-1 text-sm text-netflix-lightGray">
            {movies.length} de {totalMovies} filmes
          </p>
        </div>

        <div className="p-6">
          {loading && movies.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-netflix-mediumGray transition-transform hover:scale-105 hover:z-10"
                  >
                    <button
                      onClick={() => handleMovieClick(movie)}
                      className="h-full w-full"
                    >
                      {movie.logo_url && movie.logo_url.startsWith('http') ? (
                        <img
                          src={movie.logo_url}
                          alt={movie.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                          <svg className="h-12 w-12 text-netflix-dimGray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                          <span className="text-xs text-netflix-lightGray line-clamp-2">
                            {movie.name}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs font-semibold text-white line-clamp-2">
                            {movie.name}
                          </p>
                          {movie.category_name && (
                            <p className="text-xs text-netflix-lightGray mt-1">
                              {movie.category_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Play Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="rounded-full bg-netflix-red/90 p-4">
                          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Favorite Button */}
                    <div className="absolute right-2 top-2 z-10">
                      <FavoriteButton
                        contentId={movie.id}
                        contentType="movie"
                        contentName={movie.name}
                        contentLogo={movie.logo_url}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="py-8">
                {loadingMore && (
                  <div className="flex items-center justify-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
                    <p className="ml-3 text-netflix-lightGray">Carregando mais filmes...</p>
                  </div>
                )}
                {!hasMore && movies.length > 0 && (
                  <p className="text-center text-netflix-dimGray">
                    Você chegou ao fim da lista
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-netflix-lightGray">Nenhum filme encontrado</p>
            </div>
          )}
        </div>
      </SidebarLayout>

      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}
