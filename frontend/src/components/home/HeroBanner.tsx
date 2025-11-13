'use client';

import { PlayIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface Channel {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  category_name?: string;
  stream_url: string;
  description?: string;
}

interface HeroBannerProps {
  channel: Channel;
  onPlay: (channel: Channel) => void;
  onMoreInfo?: (channel: Channel) => void;
}

export default function HeroBanner({ channel, onPlay, onMoreInfo }: HeroBannerProps) {
  const hasValidImage = channel.logo_url && channel.logo_url.startsWith('http');

  return (
    <div className="relative h-[60vh] md:h-[70vh] lg:h-[80vh] w-full animate-fade-in">
      {/* Background Image */}
      <div className="absolute inset-0">
        {hasValidImage ? (
          <img
            src={channel.logo_url}
            alt={channel.display_name || channel.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-netflix-mediumGray via-netflix-darkGray to-netflix-black" />
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-netflix-black/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative flex h-full items-end px-[4%] pb-[20%] md:pb-[15%]">
        <div className="max-w-xl md:max-w-2xl animate-slide-in-left">
          {/* Logo or Title */}
          {hasValidImage ? (
            <div className="mb-3 md:mb-4">
              <img
                src={channel.logo_url}
                alt={channel.display_name || channel.name}
                className="max-h-20 md:max-h-32 w-auto object-contain"
              />
            </div>
          ) : (
            <h1 className="mb-3 md:mb-4 text-3xl md:text-4xl lg:text-6xl font-bold text-white">
              {channel.display_name || channel.name}
            </h1>
          )}

          {/* Category */}
          {channel.category_name && (
            <div className="mb-3 md:mb-4 flex items-center gap-2">
              <span className="rounded bg-netflix-red px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold text-white">
                {channel.category_name}
              </span>
            </div>
          )}

          {/* Description */}
          {channel.description && (
            <p className="mb-4 md:mb-6 text-sm md:text-lg text-netflix-lightGray line-clamp-2 md:line-clamp-3">
              {channel.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              onClick={() => onPlay(channel)}
              className="flex items-center gap-1.5 md:gap-2 rounded bg-white px-4 md:px-8 py-2 md:py-3 text-sm md:text-lg font-semibold text-netflix-black transition-all hover:bg-netflix-lightGray hover:scale-105"
            >
              <PlayIcon className="h-4 w-4 md:h-6 md:w-6" />
              <span>Assistir</span>
            </button>

            {onMoreInfo && (
              <button
                onClick={() => onMoreInfo(channel)}
                className="hidden sm:flex items-center gap-2 rounded bg-netflix-mediumGray/80 px-4 md:px-8 py-2 md:py-3 text-sm md:text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-netflix-dimGray hover:scale-105"
              >
                <InformationCircleIcon className="h-4 w-4 md:h-6 md:w-6" />
                <span>Mais Informações</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-netflix-black to-transparent" />
    </div>
  );
}
