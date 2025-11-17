'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Channel {
  id: string;
  name: string;
  display_name?: string;
  logo_url?: string;
  category_name?: string;
  stream_url: string;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onResultSelect?: (channel: Channel) => void;
  autoFocus?: boolean;
}

export default function SearchBar({ onSearch, onResultSelect, autoFocus = false }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(autoFocus);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { searchChannels } = await import('@/services/api');
        const searchResults = await searchChannels(query);
        setResults(searchResults.slice(0, 8)); // Limit to 8 results
        setShowResults(true);
        onSearch?.(query);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        if (!autoFocus) {
          setIsOpen(false);
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autoFocus]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleResultClick = (channel: Channel) => {
    setShowResults(false);
    setQuery('');
    if (!autoFocus) {
      setIsOpen(false);
    }
    onResultSelect?.(channel);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="font-semibold text-white">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  if (autoFocus) {
    // Full search page version
    return (
      <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-netflix-dimGray" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canais..."
            className="w-full rounded-lg border border-netflix-mediumGray bg-netflix-darkGray py-3 pl-12 pr-12 text-white placeholder-netflix-dimGray focus:border-netflix-red focus:outline-none focus:ring-2 focus:ring-netflix-red/50"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-netflix-dimGray hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-[500px] overflow-y-auto rounded-lg border border-netflix-mediumGray bg-netflix-darkGray/95 backdrop-blur-netflix shadow-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleResultClick(channel)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-netflix-mediumGray"
                  >
                    {/* Channel Logo */}
                    <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-netflix-mediumGray">
                      {channel.logo_url && channel.logo_url.startsWith('http') ? (
                        <img
                          src={channel.logo_url}
                          alt={channel.display_name || channel.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-6 w-6 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Channel Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-netflix-lightGray truncate">
                        {highlightMatch(channel.display_name || channel.name, query)}
                      </p>
                      {channel.category_name && (
                        <p className="text-xs text-netflix-dimGray truncate">
                          {channel.category_name}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-netflix-lightGray">Nenhum resultado encontrado</p>
                <p className="mt-1 text-sm text-netflix-dimGray">
                  Tente buscar por outro termo
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Header compact version
  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center overflow-hidden rounded-lg border transition-all duration-300 ${
          isOpen
            ? 'w-[300px] border-netflix-mediumGray bg-netflix-darkGray'
            : 'w-10 border-transparent bg-transparent'
        }`}
      >
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-10 w-10 items-center justify-center text-white hover:text-netflix-lightGray transition-colors"
            aria-label="Abrir busca"
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
        ) : (
          <>
            <MagnifyingGlassIcon className="ml-3 h-5 w-5 flex-shrink-0 text-netflix-dimGray" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent py-2 px-3 text-sm text-white placeholder-netflix-dimGray focus:outline-none"
            />
            {query && (
              <button
                onClick={handleClear}
                className="mr-2 text-netflix-dimGray hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && showResults && (
        <div className="absolute top-full right-0 mt-2 w-[400px] max-h-[400px] overflow-y-auto rounded-lg border border-netflix-mediumGray bg-netflix-darkGray/95 backdrop-blur-netflix shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleResultClick(channel)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-netflix-mediumGray"
                >
                  {/* Channel Logo */}
                  <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded bg-netflix-mediumGray">
                    {channel.logo_url && channel.logo_url.startsWith('http') ? (
                      <img
                        src={channel.logo_url}
                        alt={channel.display_name || channel.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-5 w-5 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-netflix-lightGray truncate">
                      {highlightMatch(channel.display_name || channel.name, query)}
                    </p>
                    {channel.category_name && (
                      <p className="text-xs text-netflix-dimGray truncate">
                        {channel.category_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-netflix-lightGray">Nenhum resultado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
