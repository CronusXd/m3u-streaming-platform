'use client';

import { useState } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useFavorites } from '@/contexts/FavoritesContext';

interface FavoriteButtonProps {
  contentId: string;
  contentType: 'movie' | 'series' | 'live';
  contentName: string;
  contentLogo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FavoriteButton({
  contentId,
  contentType,
  contentName,
  contentLogo,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);
  const favorite = isFavorite(contentId);

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir o modal
    
    setIsAnimating(true);
    await toggleFavorite(contentId, contentType, contentName, contentLogo);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        group relative rounded-full p-2 transition-all duration-200
        hover:bg-black/50 hover:scale-110
        ${isAnimating ? 'scale-125' : ''}
        ${className}
      `}
      aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      {favorite ? (
        <HeartIconSolid
          className={`
            ${sizeClasses[size]}
            text-netflix-red
            transition-all duration-200
            ${isAnimating ? 'animate-pulse' : ''}
          `}
        />
      ) : (
        <HeartIcon
          className={`
            ${sizeClasses[size]}
            text-white
            transition-all duration-200
            group-hover:text-netflix-red
          `}
        />
      )}
    </button>
  );
}
