'use client';

import { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import FavoriteButton from '@/components/common/FavoriteButton';
import { useFavorites } from '@/contexts/FavoritesContext';

interface Channel {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  category_name?: string;
  category_id?: string;
  stream_url: string;
  is_hls: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function TVAoVivoPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalChannels, setTotalChannels] = useState(0);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadChannels(selectedCategory);
    }
  }, [selectedCategory, favorites]); // Recarregar quando favoritos mudarem

  const loadData = async () => {
    try {
      const { getCategoriesWithCounts } = await import('@/services/api');
      const categoriesData = await getCategoriesWithCounts('live');
      
      setCategories(categoriesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadChannels = async (categoryId: string) => {
    setLoading(true);
    try {
      const { getChannels, getRecentlyAdded } = await import('@/services/api');
      
      if (categoryId === 'all') {
        const response = await getChannels({ contentType: 'live', page: 1, limit: 1000 });
        setChannels(response.channels);
        setTotalChannels(response.total);
      } else if (categoryId === 'favorites') {
        // Filtrar apenas favoritos de tipo 'live'
        const liveFavorites = favorites.filter(fav => fav.content_type === 'live');
        
        if (liveFavorites.length === 0) {
          setChannels([]);
          setTotalChannels(0);
          setLoading(false);
          return;
        }

        // Buscar stream_url APENAS dos canais favoritos
        const { supabase } = await import('@/lib/supabase');
        const contentIds = liveFavorites.map(fav => fav.content_id);
        
        const { data: channelsData } = await supabase
          .from('channels')
          .select('id, stream_url, is_hls')
          .in('id', contentIds);

        // Mapear favoritos para o formato de Channel
        const favoriteChannels: Channel[] = liveFavorites.map(fav => {
          const channelData = channelsData?.find(ch => ch.id === fav.content_id);
          return {
            id: fav.content_id,
            name: fav.content_name,
            stream_url: channelData?.stream_url || '',
            logo_url: fav.content_logo,
            is_hls: channelData?.is_hls || true,
          };
        });
        
        setChannels(favoriteChannels);
        setTotalChannels(favoriteChannels.length);
      } else if (categoryId === 'recent') {
        const recentChannels = await getRecentlyAdded('live', 50);
        setChannels(recentChannels);
        setTotalChannels(recentChannels.length);
      } else {
        const response = await getChannels({ categoryId, contentType: 'live', page: 1, limit: 1000 });
        setChannels(response.channels);
        setTotalChannels(response.total);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading channels:', error);
      setLoading(false);
    }
  };

  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
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
        totalChannels={totalChannels}
        favoritesCount={favorites.filter(fav => fav.content_type === 'live').length}
      >
        {/* Header */}
        <div className="border-b border-netflix-mediumGray bg-netflix-darkGray p-6">
          <h1 className="text-2xl font-bold text-white">
            {selectedCategory === 'all' && 'Todos os Canais'}
            {selectedCategory === 'favorites' && 'Meus Favoritos'}
            {selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'favorites' && 
              categories.find(c => c.id === selectedCategory)?.name
            }
          </h1>
          <p className="mt-1 text-sm text-netflix-lightGray">
            {channels.length} canais disponíveis
          </p>
        </div>

        {/* Channels Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          ) : channels.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-netflix-mediumGray transition-transform hover:scale-105 hover:z-10"
                >
                  <button
                    onClick={() => handleChannelClick(channel)}
                    className="h-full w-full"
                  >
                    {/* Channel Logo/Poster */}
                    {channel.logo_url && channel.logo_url.startsWith('http') ? (
                      <img
                        src={channel.logo_url}
                        alt={channel.display_name || channel.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                        <svg className="h-12 w-12 text-netflix-dimGray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-netflix-lightGray line-clamp-2">
                          {channel.display_name || channel.name}
                        </span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-xs font-semibold text-white line-clamp-2">
                          {channel.display_name || channel.name}
                        </p>
                        {channel.category_name && (
                          <p className="text-xs text-netflix-lightGray line-clamp-1">
                            {channel.category_name}
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
                      contentId={channel.id}
                      contentType="live"
                      contentName={channel.name}
                      contentLogo={channel.logo_url}
                      size="sm"
                    />
                  </div>

                  {/* Live Badge */}
                  <div className="absolute left-2 top-2 rounded bg-netflix-red px-2 py-1 text-xs font-semibold text-white">
                    AO VIVO
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-netflix-lightGray">Nenhum canal encontrado</p>
            </div>
          )}
        </div>
      </SidebarLayout>

      {/* Video Player Modal */}
      <VideoPlayerModal
        channel={selectedChannel}
        isOpen={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onChannelSelect={handleChannelClick}
      />
    </>
  );
}
