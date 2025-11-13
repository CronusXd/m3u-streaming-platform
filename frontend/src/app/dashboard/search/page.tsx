'use client';

import { useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import ChannelCard from '@/components/channels/ChannelCard';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
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

export default function SearchPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();

  return (
    <div className="min-h-screen px-[4%] py-8">
      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-bold text-white">Buscar Canais</h1>
        <SearchBar
          autoFocus
          onResultSelect={(channel) => setSelectedChannel(channel)}
        />
      </div>

      <div className="text-center text-netflix-lightGray">
        <svg
          className="mx-auto mb-4 h-16 w-16 text-netflix-dimGray"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg">Digite para buscar canais</p>
        <p className="mt-2 text-sm text-netflix-dimGray">
          Busque por nome, categoria ou grupo
        </p>
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        channel={selectedChannel}
        isOpen={!!selectedChannel}
        onClose={() => setSelectedChannel(null)}
        onChannelSelect={setSelectedChannel}
      />
    </div>
  );
}
