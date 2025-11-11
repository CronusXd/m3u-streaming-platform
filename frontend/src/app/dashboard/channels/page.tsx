'use client';

import { useState, useEffect } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import VideoPlayer from '@/components/VideoPlayer';
import { useFavorites } from '@/contexts/FavoritesContext';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toggleFavorite, isFavorite } = useFavorites();

  const ITEMS_PER_PAGE = 50;

  // Carregar categorias
  useEffect(() => {
    loadCategories();
  }, []);

  // Carregar canais quando categoria mudar
  useEffect(() => {
    loadChannels();
  }, [selectedCategory, page]);

  const loadCategories = async () => {
    try {
      const { getCategories } = await import('@/services/api');
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      const { getChannels } = await import('@/services/api');
      const response = await getChannels({
        categoryId: selectedCategory || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });

      console.log('📺 Canais carregados:', response.channels.length);
      console.log('🔍 Primeiro canal:', response.channels[0]);

      if (page === 1) {
        setChannels(response.channels);
      } else {
        setChannels(prev => [...prev, ...response.channels]);
      }
      
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('❌ Erro ao carregar canais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (channel: any) => {
    console.log('▶️ Play clicado:', channel);
    console.log('🔗 URL do stream:', channel.stream_url);
    setSelectedChannel(channel);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Todos os Canais
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {channels.length} canais carregados
        </p>
      </div>

      {/* Filtro de Categorias */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filtrar por Categoria
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
            setChannels([]);
          }}
          className="w-full md:w-96 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Player Section */}
      {selectedChannel && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedChannel.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedChannel.group}
            </p>
          </div>
          <VideoPlayer 
            url={selectedChannel.stream_url} 
            title={selectedChannel.display_name || selectedChannel.name}
            onError={(error) => console.error('Player error:', error)}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && channels.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando canais...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Channels Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="group relative rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-lg dark:bg-gray-800"
              >
                {/* Channel Logo */}
                <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {channel.logo_url && channel.logo_url.startsWith('http') ? (
                    <img
                      src={channel.logo_url}
                      alt={channel.display_name || channel.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                              <svg class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span class="text-xs">Sem Logo</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Sem Logo</span>
                    </div>
                  )}
                </div>

                {/* Channel Info */}
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={channel.display_name || channel.name}>
                    {channel.display_name || channel.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                    {channel.category_name || 'Sem categoria'}
                  </p>
                  {channel.is_hls && (
                    <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      HLS
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePlay(channel)}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Play
                  </button>
                  <button
                    onClick={() => toggleFavorite(channel)}
                    className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {isFavorite(channel.id) ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && !loading && channels.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Carregar Mais Canais
              </button>
            </div>
          )}

          {/* Loading More */}
          {loading && channels.length > 0 && (
            <div className="mt-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carregando mais...</p>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {channels.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhum canal disponível
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Aguarde enquanto carregamos os canais
          </p>
        </div>
      )}
    </div>
  );
}
