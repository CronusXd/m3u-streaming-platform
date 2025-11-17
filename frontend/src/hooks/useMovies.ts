import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getChannels, getCategoriesWithCounts } from '@/services/api';
import { cacheService } from '@/services/cacheService';

// Hook para buscar categorias de filmes (com cache)
export function useMovieCategories() {
  return useQuery({
    queryKey: ['movie-categories'],
    queryFn: async () => {
      // Tentar obter do cache primeiro
      try {
        const categories = await cacheService.getCategories();
        if (categories && categories.length > 0) {
          return categories.filter((cat: any) => 
            cat.name.toUpperCase().startsWith('FILMES |') || 
            cat.name.toUpperCase().startsWith('FILME |')
          );
        }
      } catch (error) {
        console.warn('Erro ao obter categorias do cache, usando API:', error);
      }

      // Fallback para API
      const categories = await getCategoriesWithCounts('movies');
      return categories.filter(cat => 
        cat.name.toUpperCase().startsWith('FILMES |') || 
        cat.name.toUpperCase().startsWith('FILME |')
      );
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (categorias mudam pouco)
  });
}

// Hook para buscar filmes com infinite scroll
export function useMoviesInfinite(categoryId: string | null) {
  return useInfiniteQuery({
    queryKey: ['movies', categoryId],
    queryFn: async ({ pageParam = 1 }) => {
      // Tentar obter do cache primeiro (apenas primeira página)
      if (pageParam === 1) {
        try {
          const cachedMovies = await cacheService.getMovies();
          if (cachedMovies && cachedMovies.length > 0) {
            // Filtrar por categoria se necessário
            let filtered = cachedMovies;
            if (categoryId && categoryId !== 'all' && categoryId !== 'recent' && categoryId !== 'history') {
              filtered = cachedMovies.filter((movie: any) => movie.category_id === categoryId);
            }
            
            // Paginar manualmente
            const start = (pageParam - 1) * 50;
            const end = start + 50;
            const paginatedMovies = filtered.slice(start, end);
            
            return {
              channels: paginatedMovies,
              total: filtered.length,
              page: pageParam,
              limit: 50
            };
          }
        } catch (error) {
          console.warn('Erro ao obter filmes do cache, usando API:', error);
        }
      }

      // Fallback para API
      const response = await getChannels({
        categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId || undefined,
        contentType: 'movies',
        page: pageParam,
        limit: 50,
      });
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Se a última página tem 50 itens, há mais páginas
      if (lastPage.channels.length === 50) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!categoryId, // Só busca se tiver categoria selecionada
  });
}

// Hook para buscar filmes de uma categoria específica (sem infinite)
export function useMoviesByCategory(categoryId: string | null, page: number = 1) {
  return useQuery({
    queryKey: ['movies', categoryId, page],
    queryFn: async () => {
      return getChannels({
        categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId || undefined,
        contentType: 'movies',
        page,
        limit: 50,
      });
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
