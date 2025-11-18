'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SeriesEpisodesModal from '@/components/series/SeriesEpisodesModal';

const ITEMS_PER_PAGE = 20;

interface Serie {
  nome: string;
  categoria: string;
  logo_url: string | null;
  backdrop_url: string | null;
  totalTemporadas: number;
  totalEpisodios: number;
  visualizacoes?: number;
}

export default function SeriesPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('Todas');
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [selectedSerie, setSelectedSerie] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSeriesInterno = async () => {
      if (!isMounted) return;
      
      // Usar o gerenciador de requisições para evitar duplicatas
      const { requestManager } = await import('@/lib/request-manager');
      
      return requestManager.execute('fetch-series', async () => {
        await fetchSeries();
      });
    };
    
    fetchSeriesInterno();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchSeries = async () => {
    try {
      console.log('📺 Verificando cache de séries...');

      // 1. Verificar cache de pré-carregamento
      const { optimizedCache } = await import('@/lib/cache/optimized-cache');
      let allSeries = await optimizedCache.getAllSeriesWithStreams();

      // 2. Se cache vazio ou inválido, baixar e salvar
      if (!allSeries || !allSeries.series || allSeries.series.length === 0) {
        console.log('⚠️ Cache vazio ou inválido, baixando séries...');
        
        try {
          const response = await fetch('/api/iptv/preload/series');
          if (!response.ok) throw new Error('Erro ao buscar séries');
          
          const data = await response.json();
          
          // Salvar no cache (30 dias)
          await optimizedCache.saveAllSeriesWithStreams(data);
          console.log(`✅ ${data.series.length} séries baixadas e salvas no cache`);
          
          allSeries = data;
        } catch (error) {
          console.error('❌ Erro ao baixar séries:', error);
          setLoading(false);
          return;
        }
      } else {
        console.log(`✅ ${allSeries.series.length} séries do CACHE`);
      }

      // Converter para formato esperado
      const seriesFormatted: Serie[] = allSeries.series.map((s: any) => ({
        nome: s.name,
        categoria: s.category || 'Sem Categoria',
        logo_url: s.logo_url,
        totalTemporadas: s.seasons?.length || 0,
        totalEpisodios: s.seasons?.reduce((acc: number, season: any) => acc + season.episodes.length, 0) || 0,
      }));

      // Extrair categorias
      const cats = ['Todas', ...new Set(seriesFormatted.map((s) => s.categoria).filter(Boolean))];

      setSeries(seriesFormatted);
      setCategorias(cats as string[]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro ao buscar séries:', error);
      setLoading(false);
    }
  };

  const seriesFiltradas =
    categoriaSelecionada === 'Todas'
      ? series
      : series.filter((s) => s.categoria === categoriaSelecionada);

  const seriesExibidas = seriesFiltradas.slice(0, displayedCount);
  const hasMore = displayedCount < seriesFiltradas.length;

  const categoriasComContagem = categorias.map((cat) => ({
    nome: cat,
    count: cat === 'Todas' ? series.length : series.filter((s) => s.categoria === cat).length,
  }));

  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [categoriaSelecionada]);

  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, seriesFiltradas.length));
    }
  }, [hasMore, seriesFiltradas.length]);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p className="text-gray-400">Carregando séries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar de Categorias */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-950 p-4">
        <h2 className="mb-4 text-xl font-bold text-white">📂 Categorias</h2>

        <div className="space-y-1">
          {categoriasComContagem.map((cat) => (
            <button
              key={cat.nome}
              onClick={() => setCategoriaSelecionada(cat.nome)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                categoriaSelecionada === cat.nome
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="truncate">{cat.nome}</span>
              <span className="ml-2 rounded-full bg-gray-700 px-2 py-1 text-xs">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white">
            📺 {categoriaSelecionada === 'Todas' ? 'Todas as Séries' : categoriaSelecionada}
          </h1>
          <p className="mt-2 text-gray-400">
            Exibindo {seriesExibidas.length} de {seriesFiltradas.length} séries
          </p>
        </div>

        {seriesFiltradas.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Nenhuma série encontrada nesta categoria
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {seriesExibidas.map((serie) => (
                <button
                  key={serie.nome}
                  onClick={() => {
                    setSelectedSerie(serie.nome);
                    setIsModalOpen(true);
                  }}
                  className="group relative overflow-hidden rounded-lg transition-transform hover:scale-105"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-800">
                    {serie.logo_url ? (
                      <img
                        src={serie.logo_url}
                        alt={serie.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-16 w-16 text-gray-600"
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

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="rounded-full bg-blue-600 p-3">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{serie.nome}</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {serie.totalTemporadas} temp. • {serie.totalEpisodios} eps.
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <div className="mx-auto inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-2 text-gray-400">Carregando mais séries...</p>
              </div>
            )}

            {!hasMore && seriesExibidas.length > 0 && (
              <div className="py-8 text-center text-gray-500">
                ✓ Todas as séries foram carregadas
              </div>
            )}
          </>
        )}
      </div>

      {selectedSerie && (
        <SeriesEpisodesModal
          seriesName={selectedSerie}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSerie(null);
          }}
        />
      )}
    </div>
  );
}
