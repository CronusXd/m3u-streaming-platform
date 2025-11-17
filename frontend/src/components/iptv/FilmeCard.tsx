'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Film, Star, Eye, Clock, Calendar } from 'lucide-react';
import type { FilmeIPTV } from '@/types/iptv';
import { formatViews } from '@/utils/formatters';
import { 
  getPosterUrl, 
  getRating, 
  getTitle,
  formatRuntime,
  formatReleaseYear,
  truncateText,
  getOverview
} from '@/utils/tmdb-helpers';

interface FilmeCardProps {
  filme: FilmeIPTV;
  onClick?: () => void;
}

export const FilmeCard: React.FC<FilmeCardProps> = ({ filme, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Usar helpers para obter dados com fallback inteligente
  const displayTitle = getTitle(filme);
  const posterUrl = getPosterUrl(filme, 'w500');
  const rating = getRating(filme);
  const views = filme.visualizacoes || 0;
  const year = formatReleaseYear(filme.tmdb_release_date);
  const runtime = formatRuntime(filme.tmdb_runtime);
  const overview = truncateText(getOverview(filme), 120);

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-gray-700">
        {(posterUrl || filme.logo_url || filme.backdrop_url) && !imageError ? (
          <Image
            src={posterUrl || filme.logo_url || filme.backdrop_url || ''}
            alt={displayTitle}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority={false}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900 p-4">
            <Film size={64} className="mb-3 opacity-50" />
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

        {/* Year Badge */}
        {year && (
          <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
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

        {/* Runtime Badge */}
        {runtime && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
            <Clock size={12} className="text-gray-300" />
            <span className="text-xs font-semibold text-white">{runtime}</span>
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
