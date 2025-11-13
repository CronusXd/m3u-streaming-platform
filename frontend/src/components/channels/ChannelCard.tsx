'use client';

import { useState } from 'react';
import { PlayIcon, HeartIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';

interface Channel {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  category_name?: string;
  stream_url: string;
  is_hls: boolean;
}

interface ChannelCardProps {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
  isFavorite: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function ChannelCard({
  channel,
  onPlay,
  onToggleFavorite,
  isFavorite,
  size = 'medium',
}: ChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: 'min-w-[150px] sm:min-w-[180px] md:min-w-[200px]',
    medium: 'min-w-[180px] sm:min-w-[220px] md:min-w-[250px]',
    large: 'min-w-[220px] sm:min-w-[260px] md:min-w-[300px]',
  };

  const hasValidImage = channel.logo_url && channel.logo_url.startsWith('http') && !imageError;

  return (
    <div
      className={`${sizeClasses[size]} group relative cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-video w-full overflow-hidden rounded bg-netflix-mediumGray transition-all duration-300 ease-out-expo group-hover:scale-110 group-hover:shadow-2xl">
        {/* Image or Placeholder */}
        {hasValidImage ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
              </div>
            )}
            <img
              src={channel.logo_url}
              alt={channel.display_name || channel.name}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-netflix-mediumGray to-netflix-darkGray p-4">
            <svg
              className="h-12 w-12 text-netflix-dimGray mb-2"
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
            <span className="text-xs text-center text-netflix-dimGray line-clamp-2">
              {channel.display_name || channel.name}
            </span>
          </div>
        )}

        {/* HLS Badge */}
        {channel.is_hls && (
          <div className="absolute top-2 right-2 rounded bg-green-600/90 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            HD
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Channel Info */}
            <h3 className="mb-1 text-sm font-semibold text-white line-clamp-1">
              {channel.display_name || channel.name}
            </h3>
            <p className="mb-3 text-xs text-netflix-lightGray line-clamp-1">
              {channel.category_name || 'Sem categoria'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(channel);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-netflix-black transition-transform hover:scale-110"
                aria-label="Assistir"
              >
                <PlayIcon className="h-4 w-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(channel);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50 bg-black/50 text-white backdrop-blur-sm transition-all hover:scale-110 hover:border-white"
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {isFavorite ? (
                  <HeartIcon className="h-4 w-4 text-netflix-red" />
                ) : (
                  <HeartOutlineIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
