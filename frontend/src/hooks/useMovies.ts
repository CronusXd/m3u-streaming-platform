import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getChannels, getCategoriesWithCounts } from '@/services/api';

// Hook para buscar categorias de filmes (com cache)
export function useMovieCategories() {
  return useQuery({
    queryKey: ['movie-categories'],
    queryFn: async () => {
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
