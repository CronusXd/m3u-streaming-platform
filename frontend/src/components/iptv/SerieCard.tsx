'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Tv, Star, Eye, Calendar, Film } from 'lucide-react';
import type { SerieIPTV } from '@/types/iptv';
import { formatViews } from '@/utils/formatters';
import { 
  getPosterUrl, 
  getRating, 
  getTitle,
  formatReleaseYear,
  truncateText,
  getOverview
} from '@/utils/tmdb-helpers';

interface SerieCardProps {
  serie: SerieIPTV;
  onClick?: () => void;
}

export const SerieCard: React.FC<SerieCardProps> = ({ serie, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Usar helpers para obter dados com fallback inteligente
  const displayTitle = getTitle(serie);
  const posterUrl = getPosterUrl(serie, 'w500');
  const rating = getRating(serie);
  const views = serie.visualizacoes || 0;
  const year = formatReleaseYear(serie.tmdb_release_date);
  const seasons = serie.tmdb_number_of_seasons;
  const episodes = serie.tmdb_number_of_episodes;
  const overview = truncateText(getOverview(serie), 120);

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-gray-700">
        {(posterUrl || serie.logo_url || serie.backdrop_url) && !imageError ? (
          <Image
            src={posterUrl || serie.logo_url || serie.backdrop_url || ''}
            alt={displayTitle}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority={false}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900 p-4">
            <Tv size={64} className="mb-3 opacity-50" />
            <p className="text-xs text-center text-gray-600 line-clamp-3">{displayTitle}</p>
          </div>
        )}

        {/* Overlay ao hover com Play */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>

        {/* Badge de Série */}
        <div className="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded text-xs font-semibold">
          SÉRIE
        </div>

        {/* Year Badge */}
        {year && (
          <div className="absolute top-12 left-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
            <Calendar size={12} className="text-gray-300" />
            <span className="text-xs font-semibold text-white">{year}</span>
          </div>
        )}

        {/* Rating Badge */}
        {rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Seasons/Episodes Badge */}
        {(seasons || episodes) && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              {seasons && (
                <span className="flex items-center gap-1">
                  <Tv size={12} className="text-gray-300" />
                  {seasons} {seasons === 1 ? 'temp' : 'temps'}
                </span>
              )}
              {episodes && (
                <span className="flex items-center gap-1">
                  <Film size={12} className="text-gray-300" />
                  {episodes} eps
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tooltip com sinopse */}
        {showTooltip && overview && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-gray-200 line-clamp-3">{overview}</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
          {displayTitle}
        </h3>
        
        {/* Views */}
        {views > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Eye size={12} />
            <span>{formatViews(views)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
