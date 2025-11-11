'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, PlayIcon } from '@heroicons/react/24/solid';
import { useFavorites } from '@/contexts/FavoritesContext';
import VideoPlayer from '@/components/VideoPlayer';

export default function SearchPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  
  // Filtros
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [onlyHls, setOnlyHls] = useState(false);

  const { toggleFavorite, isFavorite } = useFavorites();

  // Debounce da busca (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Buscar quando o query debounced mudar
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, selectedGroup, selectedLanguage, onlyHls]);

  const performSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    
    try {
      const { searchChannels } = await import('@/services/api');
      let results = await searchChannels(searchQuery, 100);

      // Aplicar filtros locais
      if (selectedGroup) {
        results = results.filter(ch => ch.category_name === selectedGroup);
      }
      if (selectedLanguage) {
        results = results.filter(ch => ch.name.includes(selectedLanguage));
      }
      if (onlyHls) {
        results = results.filter(ch => ch.is_hls);
      }

      setResults(results);
    } catch (error) {
      console.error('Erro ao buscar:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, selectedLanguage, onlyHls]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
      ) : (
        part
      )
    );
  };

  // Carregar categorias
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { getCategories } = await import('@/services/api');
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  // Obter grupos únicos das categorias
  const groups = categories.map(cat => cat.name);
  const languages = ['Português', 'English', 'Español']; // Pode ser dinâmico depois

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Buscar Canais
      </h1>

      {/* Search Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, grupo ou idioma..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 font-medium transition-colors ${
              showFilters
                ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filtros
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grupo
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos os grupos</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Idioma
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Todos os idiomas</option>
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyHls}
                    onChange={(e) => setOnlyHls(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Apenas HLS
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Section */}
      {selectedChannel && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedChannel.display_name || selectedChannel.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedChannel.category_name || 'Sem categoria'}
            </p>
          </div>
          <VideoPlayer 
            url={selectedChannel.stream_url} 
            title={selectedChannel.display_name || selectedChannel.name}
            onError={(error) => console.error('Player error:', error)}
          />
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Buscando...</p>
          </div>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((channel) => (
              <div
                key={channel.id}
                className="group relative rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-lg dark:bg-gray-800"
              >
                {/* Channel Logo */}
                <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {channel.logo_url && channel.logo_url.startsWith('http') ? (
                    <img
                      src={channel.logo_url}
                      alt={channel.display_name || channel.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                              <svg class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span class="text-xs">Sem Logo</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Sem Logo</span>
                    </div>
                  )}
                </div>

                {/* Channel Info */}
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {highlightText(channel.display_name || channel.name, debouncedQuery)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {highlightText(channel.category_name || 'Sem categoria', debouncedQuery)}
                  </p>
                  {channel.is_hls && (
                    <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      HLS
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedChannel(channel)}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Play
                  </button>
                  <button
                    onClick={() => toggleFavorite(channel)}
                    className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {isFavorite(channel.id) ? (
                      <HeartSolidIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : query.trim() ? (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhum resultado encontrado
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Tente buscar com outros termos ou ajuste os filtros
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Digite para buscar
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Encontre canais por nome, grupo ou idioma
          </p>
        </div>
      )}
    </div>
  );
}
