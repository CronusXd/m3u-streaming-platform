'use client';

import { useState, useEffect } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { supabase } from '@/lib/supabase';
import MovieDetailsModal from '@/components/movies/MovieDetailsModal';
import SeriesEpisodesModal from '@/components/series/SeriesEpisodesModal';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import FavoriteButton from '@/components/common/FavoriteButton';

interface FavoriteItem {
  id: string;
  name: string;
  logo_url?: string;
  stream_url: string;
  content_type: 'movie' | 'series' | 'live';
  channel_id: string;
}

export default function FavoritesPage() {
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series' | 'live'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  useEffect(() => {
    console.log('Favorites:', { count: favorites.length, loading: favoritesLoading });
    
    if (!favoritesLoading && favorites.length > 0) {
      loadFavoriteItems();
    } else if (!favoritesLoading) {
      setLoading(false);
      setItems([]);
    }
  }, [favorites, favoritesLoading]);

  const loadFavoriteItems = async () => {
    setLoading(true);
    try {
      // Buscar stream_url dos canais
      const contentIds = favorites.map(fav => fav.content_id);
      
      if (contentIds.length === 0) {
        setItems([]);
        return;
      }

      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('id, stream_url')
        .in('id', contentIds);

      if (error) {
        console.error('Error loading channels data:', error);
      }

      // Mapear favoritos com stream_url
      const mappedItems = favorites.map(fav => {
        const channelData = channelsData?.find(ch => ch.id === fav.content_id);
        return {
          id: fav.content_id,
          name: fav.content_name,
          logo_url: fav.content_logo || '',
          stream_url: channelData?.stream_url || '',
          content_type: fav.content_type,
          channel_id: fav.content_id,
        };
      });

      setItems(mappedItems);
    } catch (error) {
      console.error('Error loading favorite items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedType === 'all' 
    ? items 
    : items.filter(item => item.content_type === selectedType);

  const handleItemClick = (item: FavoriteItem) => {
    if (item.content_type === 'movie') {
      setSelectedMovie(item);
    } else if (item.content_type === 'series') {
      setSelectedSeries(item.name);
    } else {
      setSelectedChannel(item);
    }
  };

  if (favoritesLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-netflix-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
          <p className="mt-4 text-netflix-lightGray">Carregando favoritos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Header */}
      <div className="border-b border-netflix-mediumGray bg-netflix-darkGray p-6">
        <h1 className="text-3xl font-bold text-white">Meus Favoritos</h1>
        <p className="mt-2 text-netflix-lightGray">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
        </p>
      </div>

      {/* Filters */}
      <div className="border-b border-netflix-mediumGray bg-netflix-darkGray px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'all'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setSelectedType('movie')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'movie'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Filmes ({items.filter(i => i.content_type === 'movie').length})
          </button>
          <button
            onClick={() => setSelectedType('series')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'series'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Séries ({items.filter(i => i.content_type === 'series').length})
          </button>
          <button
            onClick={() => setSelectedType('live')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'live'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            TV ao Vivo ({items.filter(i => i.content_type === 'live').length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-netflix-mediumGray transition-transform hover:scale-105 hover:z-10"
              >
                <button
                  onClick={() => handleItemClick(item)}
                  className="h-full w-full"
                >
                  {item.logo_url && item.logo_url.startsWith('http') ? (
                    <img
                      src={item.logo_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                      <svg className="h-12 w-12 text-netflix-dimGray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                      <span className="text-xs text-netflix-lightGray line-clamp-2">
                        {item.name}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs font-semibold text-white line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-xs text-netflix-lightGray mt-1">
                        {item.content_type === 'movie' ? 'Filme' : 
                         item.content_type === 'series' ? 'Série' : 'TV ao Vivo'}
                      </p>
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
                    contentId={item.channel_id}
                    contentType={item.content_type}
                    contentName={item.name}
                    contentLogo={item.logo_url}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="h-24 w-24 text-netflix-dimGray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhum favorito ainda
            </h2>
            <p className="text-netflix-lightGray text-center max-w-md">
              Clique no coração ❤️ nos filmes, séries ou canais que você gosta para adicioná-los aos favoritos
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {selectedSeries && (
        <SeriesEpisodesModal
          seriesName={selectedSeries}
          isOpen={!!selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {selectedChannel && (
        <VideoPlayerModal
          channel={{
            id: selectedChannel.id,
            name: selectedChannel.name,
            stream_url: selectedChannel.stream_url,
            logo_url: selectedChannel.logo_url,
            is_hls: true,
          }}
          isOpen={!!selectedChannel}
          onClose={() => setSelectedChannel(null)}
          onChannelSelect={() => {}}
        />
      )}
    </div>
  );
}
