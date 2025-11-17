'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import SeriesListView from './SeriesListView';
import SeasonsView from './SeasonsView';
import EpisodesView from './EpisodesView';

export type ViewMode = 'series' | 'seasons' | 'episodes';

export default function SeriesHierarchyView() {
  const [viewMode, setViewMode] = useState<ViewMode>('series');
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Buscar categorias únicas de séries
      const { data, error } = await supabase
        .from('iptv')
        .select('categoria')
        .eq('tipo', 'serie')
        .eq('is_active', true);

      if (error) throw error;

      // Extrair categorias únicas
      const uniqueCategories = [...new Set(data?.map((item) => item.categoria).filter(Boolean))];
      setCategories(uniqueCategories.sort());
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navegação: Série → Temporadas
  const handleSeriesClick = (series: any) => {
    setSelectedSeries(series);
    setViewMode('seasons');
  };

  // Navegação: Temporada → Episódios
  const handleSeasonClick = (season: any) => {
    setSelectedSeason(season);
    setViewMode('episodes');
  };

  // Voltar: Episódios → Temporadas
  const handleBackToSeasons = () => {
    setSelectedSeason(null);
    setViewMode('seasons');
  };

  // Voltar: Temporadas → Séries
  const handleBackToSeries = () => {
    setSelectedSeries(null);
    setSelectedSeason(null);
    setViewMode('series');
  };

  return (
    <div className="flex min-h-screen bg-netflix-black">
      {/* Sidebar de Categorias */}
      <aside className="w-64 flex-shrink-0 border-r border-netflix-mediumGray bg-netflix-darkGray">
        <div className="sticky top-16 p-4">
          <h2 className="mb-4 text-lg font-bold text-white">📺 Categorias</h2>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-r-transparent"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Todas */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  handleBackToSeries();
                }}
                className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-netflix-lightGray hover:bg-netflix-mediumGray hover:text-white'
                }`}
              >
                Todas as Séries
              </button>

              {/* Categorias */}
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    handleBackToSeries();
                  }}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-netflix-lightGray hover:bg-netflix-mediumGray hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1">
        {/* Breadcrumb Navigation */}
        {viewMode !== 'series' && (
          <div className="sticky top-16 z-10 border-b border-netflix-mediumGray bg-netflix-darkGray/95 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={handleBackToSeries}
                  className="text-netflix-lightGray transition-colors hover:text-white"
                >
                  📺 Séries
                </button>

                {viewMode === 'seasons' && selectedSeries && (
                  <>
                    <span className="text-netflix-dimGray">/</span>
                    <span className="font-semibold text-white">{selectedSeries.nome}</span>
                  </>
                )}

                {viewMode === 'episodes' && selectedSeries && selectedSeason && (
                  <>
                    <span className="text-netflix-dimGray">/</span>
                    <button
                      onClick={handleBackToSeasons}
                      className="text-netflix-lightGray transition-colors hover:text-white"
                    >
                      {selectedSeries.nome}
                    </button>
                    <span className="text-netflix-dimGray">/</span>
                    <span className="font-semibold text-white">
                      Temporada {selectedSeason.temporada}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        <div className="p-6">
          {viewMode === 'series' && (
            <SeriesListView
              categoryId={selectedCategory === 'all' ? undefined : selectedCategory}
              onSeriesClick={handleSeriesClick}
            />
          )}

          {viewMode === 'seasons' && selectedSeries && (
            <SeasonsView
              series={selectedSeries}
              onSeasonClick={handleSeasonClick}
              onBack={handleBackToSeries}
            />
          )}

          {viewMode === 'episodes' && selectedSeries && selectedSeason && (
            <EpisodesView
              series={selectedSeries}
              season={selectedSeason}
              onBack={handleBackToSeasons}
            />
          )}
        </div>
      </div>
    </div>
  );
}
