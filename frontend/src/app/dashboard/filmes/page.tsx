'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FilmeCard } from '@/components/iptv/FilmeCard';
import MovieDetailsModal from '@/components/movies/MovieDetailsModal';
import type { FilmeIPTV } from '@/types/iptv';
import { optimizedCache, type MetadataEntry } from '@/lib/cache/optimized-cache';

const ITEMS_PER_PAGE = 20; // Carregar 20 filmes por vez

export default function FilmesPage() {
  const [filmes, setFilmes] = useState<FilmeIPTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('Todas');
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [selectedFilme, setSelectedFilme] = useState<FilmeIPTV | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchFilmes() {
      if (!isMounted) return;
      
      // Usar o gerenciador de requisições para evitar duplicatas
      const { requestManager } = await import('@/lib/request-manager');
      
      return requestManager.execute('fetch-filmes', async () => {
        try {
          console.log('🎬 Verificando cache de filmes...');
          
          // 1. Verificar cache de pré-carregamento
          let allMovies = await optimizedCache.getAllMoviesWithStreams();

          // 2. Se cache vazio ou inválido, baixar e salvar
          if (!allMovies || !allMovies.movies || allMovies.movies.length === 0) {
            console.log('⚠️ Cache vazio ou inválido, baixando filmes...');
            
            try {
              const response = await fetch('/api/iptv/preload/movies');
              if (!response.ok) throw new Error('Erro ao buscar filmes');
              
              const data = await response.json();
              
              // Salvar no cache (30 dias)
              await optimizedCache.saveAllMoviesWithStreams(data);
              console.log(`✅ ${data.movies.length} filmes baixados e salvos no cache`);
              
              allMovies = data;
            } catch (error) {
              console.error('❌ Erro ao baixar filmes:', error);
              setLoading(false);
              return;
            }
          } else {
            console.log(`✅ ${allMovies.movies.length} filmes do CACHE`);
          }

          // Converter para formato esperado
          const filmesFormatted: FilmeIPTV[] = allMovies.movies.map((m: any) => ({
            id: m.id,
            nome: m.name,
            categoria: m.category || 'Sem Categoria',
            logo_url: m.logo_url,
            stream_url: m.stream_url, // ⚡ Stream já incluído!
            is_hls: m.is_hls,
          }));

          // Extrair categorias
          const cats = ['Todas', ...new Set(filmesFormatted.map((f) => f.categoria).filter(Boolean))];

          setFilmes(filmesFormatted);
          setCategorias(cats as string[]);
          setLoading(false);
        
        } catch (error) {
          console.error('❌ Erro ao buscar filmes:', error);
          setLoading(false);
        }
      });
    }

    fetchFilmes();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const filmesFiltrados = categoriaSelecionada === 'Todas'
    ? filmes
    : filmes.filter(f => f.categoria === categoriaSelecionada);

  // Filmes a serem exibidos (lazy loading)
  const filmesExibidos = filmesFiltrados.slice(0, displayedCount);
  const hasMore = displayedCount < filmesFiltrados.length;

  // Contar filmes por categoria
  const categoriasComContagem = categorias.map((cat) => ({
    nome: cat,
    count: cat === 'Todas' 
      ? filmes.length 
      : filmes.filter(f => f.categoria === cat).length
  }));

  // Resetar contador quando mudar categoria
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [categoriaSelecionada]);

  // Lazy loading com Intersection Observer
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayedCount(prev => Math.min(prev + ITEMS_PER_PAGE, filmesFiltrados.length));
    }
  }, [hasMore, filmesFiltrados.length]);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando filmes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar de Categorias */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-950 p-4">
        <h2 className="mb-4 text-xl font-bold text-white">📂 Categorias</h2>

        {/* Lista de categorias */}
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
              <span className="ml-2 rounded-full bg-gray-700 px-2 py-1 text-xs">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white">
            🎬 {categoriaSelecionada === 'Todas' ? 'Todos os Filmes' : categoriaSelecionada}
          </h1>
          <p className="mt-2 text-gray-400">
            Exibindo {filmesExibidos.length} de {filmesFiltrados.length} filmes
          </p>
        </div>

        {/* Grid de Filmes */}
        {filmesFiltrados.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Nenhum filme encontrado nesta categoria
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filmesExibidos.map((filme) => (
                <FilmeCard
                  key={filme.id}
                  filme={filme}
                  onClick={() => {
                    setSelectedFilme(filme);
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </div>

            {/* Loading Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-2 text-gray-400">Carregando mais filmes...</p>
              </div>
            )}

            {!hasMore && filmesExibidos.length > 0 && (
              <div className="py-8 text-center text-gray-500">
                ✓ Todos os filmes foram carregados
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedFilme && (
        <MovieDetailsModal
          movie={{
            ...selectedFilme,
            stream_url: selectedFilme.url_stream,
          }}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFilme(null);
          }}
        />
      )}
    </div>
  );
}
