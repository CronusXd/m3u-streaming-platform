import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getSeriesGrouped, getCategoriesWithCounts } from '@/services/api';

// Hook para buscar categorias de séries (com cache)
export function useSeriesCategories() {
  return useQuery({
    queryKey: ['series-categories'],
    queryFn: async () => {
      const categories = await getCategoriesWithCounts('series');
      return categories.filter(cat => 
        cat.name.toUpperCase().startsWith('SERIES |') || 
        cat.name.toUpperCase().startsWith('SÉRIE |') ||
        cat.name.toUpperCase().startsWith('NOVELAS') ||
        cat.name.toUpperCase().startsWith('DORAMAS') ||
        cat.name.toUpperCase().startsWith('MINI SERIES')
      );
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para buscar séries com infinite scroll
export function useSeriesInfinite(categoryId: string | null) {
  return useInfiniteQuery({
    queryKey: ['series', categoryId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getSeriesGrouped({
        categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId || undefined,
        page: pageParam,
        limit: 50,
      });
      return response;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.series.length === 50) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!categoryId,
  });
}

// Hook para buscar séries de uma categoria específica (sem infinite)
export function useSeriesByCategory(categoryId: string | null, page: number = 1) {
  return useQuery({
    queryKey: ['series', categoryId, page],
    queryFn: async () => {
      return getSeriesGrouped({
        categoryId: categoryId === 'all' || categoryId === 'recent' || categoryId === 'history' ? undefined : categoryId || undefined,
        page,
        limit: 50,
      });
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
