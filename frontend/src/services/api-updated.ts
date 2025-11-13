import { createClient } from '@/lib/supabase';

const supabase = createClient();

// Categorias de séries
const SERIES_CATEGORY_NAMES = [
  'Canais | Filmes e Series',
  'Mini Series (shorts)',
  'Series | Amazon Prime Video',
  'Series | Apple TV',
  'Series | Brasil Paralelo',
  'Series | Crunchyroll',
  'Series | Discovery+',
  'Series | Disney+',
  'Series | Globoplay',
  'Series | Legendado',
  'Series | Max',
  'Series | NBC',
  'Series | Netflix',
  'Series | Outros Streamings',
  'Series | Paramount+',
  'Series | STAR+',
  'Shows',
];

// Cache para IDs das categorias de séries
let seriesCategoryIds: string[] | null = null;

async function getSeriesCategoryIds(): Promise<string[]> {
  if (seriesCategoryIds) {
    return seriesCategoryIds;
  }

  const { data } = await supabase
    .from('categories')
    .select('id')
    .in('name', SERIES_CATEGORY_NAMES);

  seriesCategoryIds = data?.map(c => c.id) || [];
  return seriesCategoryIds;
}

// ============================================
// CONTAGENS POR TIPO
// ============================================

export interface ContentCounts {
  movies: number;
  series: number;
  live: number;
  total: number;
}

export async function getContentCounts(): Promise<ContentCounts> {
  const seriesIds = await getSeriesCategoryIds();

  // Filmes: não episódios, fora das categorias de séries
  const { count: movies } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .not('category_id', 'in', `(${seriesIds.join(',')})`)
    .eq('is_active', true)
    .is('metadata->is_episode', null);

  // Séries: episódios nas categorias de séries
  const { count: series } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .in('category_id', seriesIds)
    .eq('is_active', true)
    .eq('metadata->is_episode', true);

  // Canais ao vivo: não episódios, não filmes
  const { count: live } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('metadata->is_episode', null)
    .is('metadata->is_movie', null);

  return {
    movies: movies || 0,
    series: series || 0,
    live: live || 0,
    total: (movies || 0) + (series || 0) + (live || 0),
  };
}

// ============================================
// CATEGORIAS COM CONTAGEM
// ============================================

export interface CategoryWithCount {
  id: string;
  name: string;
  type: string;
  count: number;
}

export async function getCategoriesWithCounts(contentType: 'movies' | 'series' | 'live'): Promise<CategoryWithCount[]> {
  const seriesIds = await getSeriesCategoryIds();

  // Buscar categorias
  let categoriesQuery = supabase
    .from('categories')
    .select('id, name, type')
    .order('name', { ascending: true });

  if (contentType === 'series') {
    categoriesQuery = categoriesQuery.in('id', seriesIds);
  } else if (contentType === 'movies') {
    categoriesQuery = categoriesQuery.not('id', 'in', `(${seriesIds.join(',')})`);
  }

  const { data: categories } = await categoriesQuery;

  if (!categories) {
    return [];
  }

  // Contar canais em cada categoria
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      let countQuery = supabase
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
        .eq('is_active', true);

      if (contentType === 'series') {
        countQuery = countQuery.eq('metadata->is_episode', true);
      } else if (contentType === 'movies') {
        countQuery = countQuery.is('metadata->is_episode', null);
      } else if (contentType === 'live') {
        countQuery = countQuery.is('metadata->is_episode', null).is('metadata->is_movie', null);
      }

      const { count } = await countQuery;

      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        count: count || 0,
      };
    })
  );

  return categoriesWithCounts.filter(c => c.count > 0).sort((a, b) => b.count - a.count);
}

// ============================================
// ADICIONADO RECENTEMENTE
// ============================================

export interface Channel {
  id: string;
  name: string;
  logo_url?: string;
  stream_url: string;
  category_name?: string;
  created_at: string;
}

export async function getRecentlyAdded(contentType: 'movies' | 'series' | 'live', limit: number = 50): Promise<Channel[]> {
  const seriesIds = await getSeriesCategoryIds();

  let query = supabase
    .from('channels')
    .select(`
      id,
      name,
      logo_url,
      stream_url,
      created_at,
      categories (
        name
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (contentType === 'series') {
    query = query.in('category_id', seriesIds).eq('metadata->is_episode', true);
  } else if (contentType === 'movies') {
    query = query.not('category_id', 'in', `(${seriesIds.join(',')})`).is('metadata->is_episode', null);
  } else if (contentType === 'live') {
    query = query.is('metadata->is_episode', null).is('metadata->is_movie', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar adicionados recentemente:', error);
    throw error;
  }

  return (data || []).map((ch: any) => ({
    ...ch,
    category_name: ch.categories?.name || 'Sem categoria',
  }));
}

// ============================================
// CANAIS POR CATEGORIA
// ============================================

export interface ChannelsResponse {
  channels: Channel[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getChannelsByCategory(params: {
  categoryId: string;
  contentType: 'movies' | 'series' | 'live';
  page?: number;
  limit?: number;
}): Promise<ChannelsResponse> {
  const { categoryId, contentType, page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('channels')
    .select(`
      id,
      name,
      logo_url,
      stream_url,
      created_at,
      categories (
        name
      )
    `, { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('is_active', true);

  if (contentType === 'series') {
    query = query.eq('metadata->is_episode', true);
  } else if (contentType === 'movies') {
    query = query.is('metadata->is_episode', null);
  } else if (contentType === 'live') {
    query = query.is('metadata->is_episode', null).is('metadata->is_movie', null);
  }

  query = query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Erro ao buscar canais:', error);
    throw error;
  }

  const channels = (data || []).map((ch: any) => ({
    ...ch,
    category_name: ch.categories?.name || 'Sem categoria',
  }));

  return {
    channels,
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > offset + limit,
  };
}
