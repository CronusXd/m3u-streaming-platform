'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  name: string;
  logo_url?: string;
  stream_url: string;
  category_name?: string;
  type: 'movie' | 'series' | 'live' | 'episode';
  episodeCount?: number;
  seriesName?: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const { searchGlobal } = await import('@/services/api');
      const searchResults = await searchGlobal(query, 50);
      setResults(searchResults);
      setShowResults(true);
      setLoading(false);
    } catch (error) {
      console.error('Erro na busca:', error);
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return '🎬 Filme';
      case 'series': return '📺 Série';
      case 'live': return '📡 TV ao Vivo';
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return 'bg-orange-500/20 text-orange-400';
      case 'series': return 'bg-purple-500/20 text-purple-400';
      case 'live': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'series') {
      // Navegar para página de séries e abrir modal
      router.push(`/dashboard/series?serie=${encodeURIComponent(result.name)}`);
    } else if (result.type === 'movie') {
      router.push(`/dashboard/filmes?play=${result.id}`);
    } else {
      router.push(`/dashboard/tv-ao-vivo?play=${result.id}`);
    }
    setShowResults(false);
    setQuery('');
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-netflix-dimGray"
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
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filmes, séries ou canais..."
          className="w-full rounded-lg bg-netflix-mediumGray py-3 pl-12 pr-4 text-white placeholder-netflix-dimGray focus:outline-none focus:ring-2 focus:ring-netflix-red"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-netflix-red border-r-transparent"></div>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-[70vh] overflow-y-auto rounded-lg bg-netflix-darkGray shadow-2xl border border-netflix-mediumGray">
          <div className="p-2">
            <p className="px-3 py-2 text-xs text-netflix-dimGray">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-netflix-mediumGray"
              >
                {/* Logo */}
                {result.logo_url && result.logo_url.startsWith('http') ? (
                  <img
                    src={result.logo_url}
                    alt={result.name}
                    className="h-16 w-12 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-netflix-mediumGray">
                    <svg className="h-6 w-6 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {result.name}
                  </p>
                  <p className="text-xs text-netflix-lightGray truncate">
                    {result.category_name || 'Sem categoria'}
                  </p>
                  {result.type === 'series' && result.episodeCount && (
                    <p className="text-xs text-netflix-dimGray">
                      {result.episodeCount} episódios
                    </p>
                  )}
                </div>

                {/* Type Badge */}
                <div className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getTypeColor(result.type)}`}>
                  {getTypeLabel(result.type)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 mt-2 w-full rounded-lg bg-netflix-darkGray shadow-2xl border border-netflix-mediumGray p-6 text-center">
          <p className="text-netflix-lightGray">Nenhum resultado encontrado para "{query}"</p>
        </div>
      )}
    </div>
  );
}
