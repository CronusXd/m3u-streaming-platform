'use client';

import { useState, useEffect } from 'react';

interface SeriesListViewProps {
  categoryId?: string;
  onSeriesClick: (series: any) => void;
}

export default function SeriesListView({ categoryId, onSeriesClick }: SeriesListViewProps) {
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSeries();
  }, [categoryId]);

  const loadSeries = async () => {
    setLoading(true);
    try {
      // Buscar séries agrupadas da API (já retorna séries únicas)
      const url = categoryId && categoryId !== 'all'
        ? `/api/iptv/series?categoria=${encodeURIComponent(categoryId)}`
        : '/api/iptv/series';

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`✅ ${data.series?.length || 0} séries únicas carregadas`);

      setSeries(data.series || []);
    } catch (error) {
      console.error('❌ Erro ao carregar séries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSeries = series.filter((s) =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">📺 Séries</h1>
        <div className="text-netflix-dimGray">
          {filteredSeries.length} séries disponíveis
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar série..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg bg-netflix-darkGray px-4 py-3 text-white placeholder-netflix-dimGray focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
        <svg
          className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-netflix-dimGray"
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
      </div>

      {/* Series Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredSeries.map((serie) => (
          <button
            key={serie.nome}
            onClick={() => onSeriesClick(serie)}
            className="group relative overflow-hidden rounded-lg transition-transform hover:scale-105"
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-netflix-mediumGray">
              {serie.logo_url ? (
                <img
                  src={serie.logo_url}
                  alt={serie.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    className="h-16 w-16 text-netflix-dimGray"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                    />
                  </svg>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Play Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <div className="rounded-full bg-purple-600 p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <h3 className="text-sm font-semibold text-white line-clamp-2">
                {serie.nome}
              </h3>
              <p className="mt-1 text-xs text-netflix-dimGray">
                {serie.totalTemporadas > 0 && `${serie.totalTemporadas} temp.`}
                {serie.totalTemporadas > 0 && serie.totalEpisodios > 0 && ' • '}
                {serie.totalEpisodios > 0 && `${serie.totalEpisodios} eps.`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredSeries.length === 0 && (
        <div className="py-24 text-center text-netflix-dimGray">
          <svg
            className="mx-auto h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Nenhuma série encontrada</p>
        </div>
      )}
    </div>
  );
}
