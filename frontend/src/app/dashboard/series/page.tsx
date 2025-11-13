'use client';

import { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import SeriesEpisodesModal from '@/components/series/SeriesEpisodesModal';
import FavoriteButton from '@/components/common/FavoriteButton';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface SeriesItem {
  name: string;
  episodeCount: number;
  logo?: string;
  categoryName?: string;
  firstEpisodeId?: string;
}

interface Category {
  id: string;
  name: string;
  count?: number;
}

const ITEMS_PER_PAGE = 50;

export default function SeriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalSeries, setTotalSeries] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { favorites } = useFavorites();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      // Reset ao mudar categoria
      setSeries([]);
      setCurrentPage(1);
      setHasMore(true);
      loadSeries(selectedCategory, 1);
    }
  }, [selectedCategory, favorites]); // Recarregar quando favoritos mudarem

  const loadData = async () => {
    try {
      const { getCategoriesWithCounts, getSeriesGrouped } = await import('@/services/api');
      const categoriesData = await getCategoriesWithCounts('series');
      
      // Buscar total de TODAS as séries para mostrar no "TODAS AS SÉRIES"
      const allSeriesResponse = await getSeriesGrouped({ categoryId: 'all' });
      
      console.log('🔍 DEBUG loadData:');
      console.log('📊 Categories:', categoriesData.length);
      console.log('📊 Total series from getSeriesGrouped:', allSeriesResponse.total);
      console.log('📊 Series array length:', allSeriesResponse.series.length);
      
      setCategories(categoriesData);
      setTotalSeries(allSeriesResponse.total);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadSeries = async (categoryId: string, page: number) => {
    const isFirstPage = page === 1;
    
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Se for favoritos, filtrar pelos favoritos do contexto
      if (categoryId === 'favorites') {
        const seriesFavorites = favorites.filter(fav => fav.content_type === 'series');
        
        if (seriesFavorites.length === 0) {
          setSeries([]);
          setTotalSeries(0);
          setHasMore(false);
          setCurrentPage(1);
          return;
        }

        // Buscar informações dos episódios
        const { supabase } = await import('@/lib/supabase');
        const contentIds = seriesFavorites.map(fav => fav.content_id);
        
        const { data: channelsData } = await supabase
          .from('channels')
          .select('id, name')
          .in('id', contentIds);

        // Mapear favoritos para o formato de SeriesItem
        const favoriteSeries: SeriesItem[] = seriesFavorites.map(fav => {
          const channelData = channelsData?.find(ch => ch.id === fav.content_id);
          return {
            name: fav.content_name,
            logo: fav.content_logo,
            episodeCount: 0, // Não temos essa informação nos favoritos
            firstEpisodeId: fav.content_id,
          };
        });

        // Ordenar alfabeticamente (com validação)
        favoriteSeries.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        });

        setSeries(favoriteSeries);
        setTotalSeries(favoriteSeries.length);
        setHasMore(false);
        setCurrentPage(1);
      } else {
        const { getSeriesGrouped } = await import('@/services/api');
        
        const response = await getSeriesGrouped({ 
          categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId,
          page,
          limit: ITEMS_PER_PAGE 
        });

        // Séries já vêm ordenadas do backend
        // Backend retorna TODAS as séries, frontend pagina com scroll infinito
        
        if (isFirstPage) {
          // Primeira página: mostrar primeiras 50
          setSeries(response.series.slice(0, ITEMS_PER_PAGE));
          setTotalSeries(response.total);
          setHasMore(response.series.length > ITEMS_PER_PAGE);
          setCurrentPage(1);
          
          // Guardar todas as séries para paginação local
          (window as any).__allSeries = response.series;
        } else {
          // Páginas seguintes: carregar mais do cache local
          const allSeries = (window as any).__allSeries || [];
          const offset = (page - 1) * ITEMS_PER_PAGE;
          const nextBatch = allSeries.slice(offset, offset + ITEMS_PER_PAGE);
          
          setSeries(prev => [...prev, ...nextBatch]);
          setHasMore(offset + ITEMS_PER_PAGE < allSeries.length);
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && selectedCategory) {
      loadSeries(selectedCategory, currentPage + 1);
    }
  };

  const { loadMoreRef } = useInfiniteScroll({
    loading: loadingMore,
    hasMore,
    onLoadMore: loadMore,
    threshold: 500,
  });

  const handleSeriesClick = (seriesName: string) => {
    setSelectedSeries(seriesName);
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
        totalChannels={totalSeries}
        favoritesCount={favorites.filter(fav => fav.content_type === 'series').length}
      >
        <div className="border-b border-netflix-mediumGray bg-netflix-darkGray p-6">
          <h1 className="text-2xl font-bold text-white">
            SÉRIES | {selectedCategory === 'all' ? 'TODAS' : 
                      selectedCategory === 'favorites' ? 'FAVORITOS' :
                      selectedCategory === 'history' ? 'HISTÓRICO' :
                      selectedCategory === 'recent' ? 'ADICIONADO RECENTEMENTE' :
                      categories.find(c => c.id === selectedCategory)?.name}
          </h1>
          <p className="mt-1 text-sm text-netflix-lightGray">
            {totalSeries} séries disponíveis
          </p>
        </div>

        <div className="p-6">
          {loading && series.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          ) : series.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {series.map((seriesItem, index) => (
                  <div
                    key={`${seriesItem.name}-${seriesItem.firstEpisodeId || index}`}
                    className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-netflix-mediumGray transition-transform hover:scale-105 hover:z-10"
                  >
                    <button
                      onClick={() => handleSeriesClick(seriesItem.name)}
                      className="h-full w-full"
                    >
                      {seriesItem.logo && seriesItem.logo.startsWith('http') ? (
                        <img
                          src={seriesItem.logo}
                          alt={seriesItem.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                          <svg className="h-12 w-12 text-netflix-dimGray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                          <span className="text-xs text-netflix-lightGray line-clamp-2">
                            {seriesItem.name}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-xs font-semibold text-white line-clamp-2">
                            {seriesItem.name}
                          </p>
                          <p className="text-xs text-netflix-lightGray mt-1">
                            {seriesItem.episodeCount} episódios
                          </p>
                        </div>
                      </div>

                      <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-1">
                        <span className="text-xs text-white font-semibold">
                          {seriesItem.episodeCount}
                        </span>
                      </div>
                    </button>

                    {/* Favorite Button */}
                    {seriesItem.firstEpisodeId && seriesItem.name && (
                      <div className="absolute right-2 top-2 z-10">
                        <FavoriteButton
                          contentId={seriesItem.firstEpisodeId}
                          contentType="series"
                          contentName={seriesItem.name}
                          contentLogo={seriesItem.logo || ''}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="py-8">
                {loadingMore && (
                  <div className="flex items-center justify-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
                    <p className="ml-3 text-netflix-lightGray">Carregando mais séries...</p>
                  </div>
                )}
                {!hasMore && series.length > 0 && (
                  <p className="text-center text-netflix-dimGray">
                    Você chegou ao fim da lista
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-netflix-lightGray">Nenhuma série encontrada</p>
            </div>
          )}
        </div>
      </SidebarLayout>

      {selectedSeries && (
        <SeriesEpisodesModal
          seriesName={selectedSeries}
          isOpen={!!selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}
    </>
  );
}
