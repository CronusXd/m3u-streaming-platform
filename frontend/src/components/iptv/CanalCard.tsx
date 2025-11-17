'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Tv } from 'lucide-react';
import type { CanalIPTV } from '@/types/iptv';

interface CanalCardProps {
  canal: CanalIPTV;
  onClick?: () => void;
}

export const CanalCard: React.FC<CanalCardProps> = ({ canal, onClick }) => {
  const [imageError, setImageError] = useState(false);

  const displayTitle = canal.nome;
  
  // Prioridade: logo_url → epg_logo → backdrop_url → placeholder
  const logoUrl = canal.logo_url || canal.epg_logo || canal.backdrop_url;

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Logo */}
      <div className="relative aspect-[2/3] bg-gray-700">
        {logoUrl && !imageError ? (
          <Image
            src={logoUrl}
            alt={displayTitle}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
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

        {/* Badge AO VIVO */}
        <div className="absolute top-2 right-2 bg-red-600 px-2 py-1 rounded text-xs font-semibold">
          ● AO VIVO
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2">
          {displayTitle}
        </h3>
        
        {/* Categoria */}
        {canal.categoria && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-1">
            {canal.categoria}
          </p>
        )}
      </div>
    </div>
  );
};
