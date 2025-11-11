'use client';

import { useFavorites } from '@/contexts/FavoritesContext';
import { HeartIcon as HeartSolidIcon, PlayIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import VideoPlayer from '@/components/VideoPlayer';

export default function FavoritesPage() {
  const { favorites, loading, removeFavorite } = useFavorites();
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando favoritos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meus Favoritos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {favorites.length} {favorites.length === 1 ? 'canal' : 'canais'}
          </p>
        </div>
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

      {/* Favorites Grid */}
      {favorites.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((channel) => (
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
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {channel.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {channel.group || 'Sem grupo'}
                </p>
                {channel.isHls && (
                  <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    HLS
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedChannel(channel)}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  Play
                </button>
                <button
                  onClick={() => removeFavorite(channel.id)}
                  className="rounded-lg border border-red-300 p-2 hover:bg-red-50 dark:border-red-600 dark:hover:bg-red-900/20"
                  title="Remover dos favoritos"
                >
                  <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </button>
              </div>

              {/* Favorite Badge */}
              <div className="absolute top-2 right-2">
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
              </div>
            </div>
          ))}
        </div>
      ) : (
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhum favorito ainda
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Adicione canais aos favoritos para vê-los aqui
          </p>
        </div>
      )}
    </div>
  );
}
