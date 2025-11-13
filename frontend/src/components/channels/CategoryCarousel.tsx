'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import ChannelCard from './ChannelCard';

interface Channel {
  id: string;
  name: string;
  display_name: string;
  logo_url?: string;
  category_name?: string;
  stream_url: string;
  is_hls: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface CategoryCarouselProps {
  category: Category;
  channels: Channel[];
  onChannelClick: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
  isFavorite: (channelId: string) => boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function CategoryCarousel({
  category,
  channels,
  onChannelClick,
  onToggleFavorite,
  isFavorite,
  onLoadMore,
  hasMore = false,
}: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollButtons();

    const handleScroll = () => {
      updateScrollButtons();
      
      // Check if near end for lazy loading
      if (hasMore && onLoadMore) {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        if (scrollLeft + clientWidth >= scrollWidth - 500) {
          onLoadMore();
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, onLoadMore]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  if (channels.length === 0) return null;

  return (
    <div
      className="group relative mb-8 md:mb-12 px-[4%]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Category Title */}
      <h2 className="mb-3 md:mb-4 text-lg md:text-xl lg:text-2xl font-semibold text-white">
        {category.name}
      </h2>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Navigation Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={`hidden md:flex absolute left-0 top-0 z-20 h-full w-[4%] min-w-[40px] items-center justify-center bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Rolar para esquerda"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide smooth-scroll"
        >
          {channels.map((channel, index) => (
            <div
              key={channel.id}
              className="animate-scale-in"
              style={{
                animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
                animationFillMode: 'both',
              }}
            >
              <ChannelCard
                channel={channel}
                onPlay={onChannelClick}
                onToggleFavorite={onToggleFavorite}
                isFavorite={isFavorite(channel.id)}
              />
            </div>
          ))}

          {/* Loading indicator */}
          {hasMore && (
            <div className="flex min-w-[250px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          )}
        </div>

        {/* Right Navigation Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={`hidden md:flex absolute right-0 top-0 z-20 h-full w-[4%] min-w-[40px] items-center justify-center bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Rolar para direita"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>
        )}
      </div>
    </div>
  );
}
