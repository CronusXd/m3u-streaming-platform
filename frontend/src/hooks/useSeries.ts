import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getSeriesGrouped, getCategoriesWithCounts } from '@/services/api';
import { cacheService } from '@/services/cacheService';

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
      // Tentar obter do cache primeiro (apenas primeira página)
      if (pageParam === 1) {
        try {
          const cachedSeries = await cacheService.getSeries();
          if (cachedSeries && cachedSeries.length > 0) {
            // Filtrar por categoria se necessário
            let filtered = cachedSeries;
            if (categoryId && categoryId !== 'all' && categoryId !== 'recent' && categoryId !== 'history') {
              filtered = cachedSeries.filter((serie: any) => serie.category_id === categoryId);
            }
            
            // Paginar manualmente
            const start = (pageParam - 1) * 50;
            const end = start + 50;
            const paginatedSeries = filtered.slice(start, end);
            
            return {
              series: paginatedSeries,
              total: filtered.length,
              page: pageParam,
              limit: 50
            };
          }
        } catch (error) {
          console.warn('Erro ao obter séries do cache, usando API:', error);
        }
      }

      // Fallback para API
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
