import { createClient } from '@/lib/supabase';

const supabase = createClient();

// ============================================
// CATEGORIAS POR TIPO (usando campo 'type')
// ============================================

// Cache para IDs das categorias por tipo
const categoryIdsCache: { [key: string]: string[] | null } = {
  movie: null,
  series: null,
  live: null,
};

async function getCategoryIdsByType(type: 'movie' | 'series' | 'live'): Promise<string[]> {
  if (categoryIdsCache[type]) {
    return categoryIdsCache[type]!;
  }

  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('type', type);

  categoryIdsCache[type] = data?.map(c => c.id) || [];
  return categoryIdsCache[type]!;
}

// Manter compatibilidade com código antigo
async function getSeriesCategoryIds(): Promise<string[]> {
  return getCategoryIdsByType('series');
}

// ============================================
// CATEGORIES
// ============================================

export interface Category {
  id: string;
  name: string;
  type: string;
  slug: string;
  icon?: string;
  order_index: number;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar categorias:', error);
    throw error;
  }

  return data || [];
}

export async function getCategoriesByType(type: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar categorias por tipo:', error);
    throw error;
  }

  return data || [];
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
  const movieIds = await getCategoryIdsByType('movie');
  const seriesIds = await getCategoryIdsByType('series');
  const liveIds = await getCategoryIdsByType('live');

  // Filmes: categorias do tipo 'movie'
  const { count: movies } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .in('category_id', movieIds)
    .eq('is_active', true);

  // Séries: contar séries únicas (não episódios)
  const { data: seriesEpisodes } = await supabase
    .from('channels')
    .select('metadata')
    .in('category_id', seriesIds)
    .eq('is_active', true)
    .eq('metadata->is_episode', true)
    .not('metadata->series_name', 'is', null);

  const uniqueSeries = new Set(
    seriesEpisodes?.map(ep => ep.metadata?.series_name).filter(Boolean) || []
  );

  // Canais ao vivo: categorias do tipo 'live'
  const { count: live } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .in('category_id', liveIds)
    .eq('is_active', true);

  return {
    movies: movies || 0,
    series: uniqueSeries.size,
    live: live || 0,
    total: (movies || 0) + uniqueSeries.size + (live || 0),
  };
}

// ============================================
// CATEGORIAS COM CONTAGEM
// ============================================

export interface CategoryWithCount extends Category {
  count: number;
}

export async function getCategoriesWithCounts(contentType: 'movies' | 'series' | 'live'): Promise<CategoryWithCount[]> {
  // Mapear contentType para o valor do campo 'type' no banco
  const typeMap = {
    'movies': 'movie',
    'series': 'series',
    'live': 'live'
  };
  
  const dbType = typeMap[contentType];
  
  // Buscar categorias filtradas pelo campo 'type'
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('type', dbType)
    .order('name', { ascending: true });

  if (!categories) {
    return [];
  }

  // Contar canais em cada categoria
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      let count = 0;
      
      if (contentType === 'series') {
        // Para séries, contar SÉRIES ÚNICAS (não episódios)
        const { data: episodes } = await supabase
          .from('channels')
          .select('metadata')
          .eq('category_id', cat.id)
          .eq('is_active', true)
          .eq('metadata->is_episode', true)
          .not('metadata->series_name', 'is', null);
        
        // Contar séries únicas
        const uniqueSeries = new Set(
          episodes?.map(ep => ep.metadata?.series_name).filter(Boolean) || []
        );
        count = uniqueSeries.size;
      } else {
        // Para filmes e canais, contar normalmente
        const { count: channelCount } = await supabase
          .from('channels')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id)
          .eq('is_active', true);
        
        count = channelCount || 0;
      }

      return {
        ...cat,
        count,
      };
    })
  );

  return categoriesWithCounts.filter(c => c.count > 0).sort((a, b) => b.count - a.count);
}

// ============================================
// CHANNELS
// ============================================

export interface Channel {
  id: string;
  tvg_id?: string;
  name: string;
  display_name?: string;
  logo_url?: string;
  stream_url: string;
  category_id?: string;
  category_name?: string;
  is_hls: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ChannelsResponse {
  channels: Channel[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getChannels(params: {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  contentType?: 'movies' | 'series' | 'live' | 'all';
}): Promise<ChannelsResponse> {
  const { categoryId, search, page = 1, limit = 50, contentType = 'movies' } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('channels')
    .select(`
      id,
      tvg_id,
      name,
      display_name,
      logo_url,
      stream_url,
      category_id,
      is_hls,
      is_active,
      metadata,
      created_at,
      categories (
        name
      )
    `, { count: 'exact' })
    .eq('is_active', true);

  // Filtrar por tipo de conteúdo baseado no campo 'type' das categorias
  if (contentType !== 'all') {
    // Mapear contentType para o valor do campo 'type' no banco
    const typeMap = {
      'movies': 'movie',
      'series': 'series',
      'live': 'live'
    };
    
    const dbType = typeMap[contentType as keyof typeof typeMap];
    
    // Buscar IDs das categorias do tipo especificado usando o campo 'type'
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('type', dbType);
    
    if (categories && categories.length > 0) {
      const categoryIds = categories.map(cat => cat.id);
      query = query.in('category_id', categoryIds);
    } else {
      // Se não encontrou categorias, retornar vazio
      return {
        channels: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }
  }

  // Filtrar por categoria específica
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Buscar por nome
  if (search) {
    query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  query = query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Erro ao buscar canais:', error);
    throw error;
  }

  // Transformar dados
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

// ============================================
// ADICIONADO RECENTEMENTE
// ============================================

export async function getRecentlyAdded(contentType: 'movies' | 'series' | 'live', limit: number = 50): Promise<Channel[]> {
  let query = supabase
    .from('channels')
    .select(`
      id,
      tvg_id,
      name,
      display_name,
      logo_url,
      stream_url,
      category_id,
      is_hls,
      is_active,
      created_at,
      categories (
        name,
        type
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Buscar IDs das categorias do tipo especificado
  const categoryIds = await getCategoryIdsByType(
    contentType === 'movies' ? 'movie' : contentType === 'series' ? 'series' : 'live'
  );

  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds);
  }

  if (contentType === 'series') {
    query = query.eq('metadata->is_episode', true);
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

export async function getChannelById(id: string): Promise<Channel | null> {
  const { data, error } = await supabase
    .from('channels')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar canal:', error);
    return null;
  }

  return {
    ...data,
    category_name: data.categories?.name || 'Sem categoria',
  };
}

// ============================================
// FAVORITES
// ============================================

export interface Favorite {
  id: string;
  user_id: string;
  channel_id: string;
  created_at: string;
}

export async function getFavorites(userId: string): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      channel_id,
      channels (
        id,
        tvg_id,
        name,
        display_name,
        logo_url,
        stream_url,
        category_id,
        is_hls,
        is_active,
        created_at,
        categories (
          name
        )
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao buscar favoritos:', error);
    throw error;
  }

  // Transformar dados
  const channels = (data || [])
    .filter((fav: any) => fav.channels)
    .map((fav: any) => ({
      ...fav.channels,
      category_name: fav.channels.categories?.name || 'Sem categoria',
    }));

  return channels;
}

export async function addFavorite(userId: string, channelId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, channel_id: channelId });

  if (error) {
    console.error('Erro ao adicionar favorito:', error);
    throw error;
  }
}

export async function removeFavorite(userId: string, channelId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('channel_id', channelId);

  if (error) {
    console.error('Erro ao remover favorito:', error);
    throw error;
  }
}

export async function isFavorite(userId: string, channelId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('channel_id', channelId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }

  return !!data;
}

// ============================================
// SEARCH GLOBAL
// ============================================

export interface SearchResult {
  id: string;
  name: string;
  logo_url?: string;
  stream_url: string;
  category_name?: string;
  type: 'movie' | 'series' | 'live' | 'episode';
  episodeCount?: number; // Para séries
  seriesName?: string; // Para episódios
}

export async function searchGlobal(query: string, limit: number = 100): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const seriesIds = await getSeriesCategoryIds();
  const searchPattern = `%${query}%`;

  const { data, error } = await supabase
    .from('channels')
    .select(`
      id,
      name,
      logo_url,
      stream_url,
      metadata,
      category_id,
      categories (
        name
      )
    `)
    .eq('is_active', true)
    .or(`name.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar:', error);
    throw error;
  }

  const results: SearchResult[] = [];
  const seriesMap = new Map<string, SearchResult>();

  (data || []).forEach((ch: any) => {
    const isInSeriesCategory = seriesIds.includes(ch.category_id);
    const isEpisode = ch.metadata?.is_episode === true;
    const isMovie = ch.metadata?.is_movie === true;

    if (isInSeriesCategory && isEpisode) {
      // É um episódio - agrupar por série
      const seriesName = ch.metadata?.series_name;
      if (seriesName) {
        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, {
            id: ch.id,
            name: seriesName,
            logo_url: ch.logo_url,
            stream_url: ch.stream_url,
            category_name: ch.categories?.name,
            type: 'series',
            episodeCount: 0,
          });
        }
        seriesMap.get(seriesName)!.episodeCount! += 1;
      }
    } else if (isMovie || (!isInSeriesCategory && !isEpisode)) {
      // É um filme
      results.push({
        id: ch.id,
        name: ch.name,
        logo_url: ch.logo_url,
        stream_url: ch.stream_url,
        category_name: ch.categories?.name,
        type: 'movie',
      });
    } else {
      // É TV ao vivo
      results.push({
        id: ch.id,
        name: ch.name,
        logo_url: ch.logo_url,
        stream_url: ch.stream_url,
        category_name: ch.categories?.name,
        type: 'live',
      });
    }
  });

  // Adicionar séries agrupadas
  seriesMap.forEach(series => results.push(series));

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchChannels(query: string, limit: number = 50): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar canais:', error);
    throw error;
  }

  return (data || []).map((ch: any) => ({
    ...ch,
    category_name: ch.categories?.name || 'Sem categoria',
  }));
}

// ============================================
// SERIES OPERATIONS
// ============================================

export interface Series {
  name: string;
  episodeCount: number;
  logo?: string;
  categoryName?: string;
}

export async function getSeries(params: {
  categoryId?: string;
  search?: string;
}): Promise<Series[]> {
  const { categoryId, search } = params;

  let query = supabase
    .from('channels')
    .select('metadata, logo_url, categories(name)')
    .eq('is_active', true)
    .not('metadata->series_name', 'is', null);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.ilike('metadata->>series_name', `%${search}%`);
  }

  const { data: episodes, error } = await query;

  if (error) {
    console.error('Erro ao buscar séries:', error);
    throw error;
  }

  // Agrupar por série
  const seriesMap = new Map<string, Series>();
  
  episodes?.forEach((ep: any) => {
    const name = ep.metadata?.series_name;
    if (name) {
      if (!seriesMap.has(name)) {
        seriesMap.set(name, {
          name,
          episodeCount: 0,
          logo: ep.logo_url,
          categoryName: ep.categories?.name,
        });
      }
      seriesMap.get(name)!.episodeCount++;
    }
  });

  return Array.from(seriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface Episode {
  id: string;
  name: string;
  season: number;
  episode: number;
  streamUrl: string;
  logo?: string;
}

export interface SeasonGroup {
  season: number;
  episodes: Episode[];
}

export async function getSeriesEpisodes(seriesName: string): Promise<SeasonGroup[]> {
  const sanitizedName = seriesName.trim();
  
  console.log('🔍 [getSeriesEpisodes] Buscando temporadas:', sanitizedName);
  
  try {
    const { optimizedCache } = await import('@/lib/cache/optimized-cache');
    
    // Buscar APENAS do cache completo (pré-carregado)
    const allSeries = await optimizedCache.getAllSeriesWithStreams();
    
    if (!allSeries || !allSeries.series) {
      console.log('❌ Cache vazio - aguarde o pré-carregamento');
      return [];
    }
    
    // Buscar série específica no cache
    const serie = allSeries.series.find((s: any) => s.name === sanitizedName);
    
    if (!serie || !serie.seasons) {
      console.log(`⚠️ Série "${sanitizedName}" não encontrada no cache`);
      return [];
    }
    
    console.log(`✅ Cache HIT: ${sanitizedName} (${serie.seasons.length} temporadas)`);
    
    // Converter para formato esperado
    const seasonGroups: SeasonGroup[] = serie.seasons.map((season: any) => ({
      season: season.season,
      episodes: season.episodes.map((ep: any) => ({
        id: ep.id,
        name: ep.name,
        season: season.season,
        episode: ep.episode,
        streamUrl: ep.stream_url || '', // ⚡ Stream já incluído!
        logo: ep.logo_url || undefined,
      })),
    }));
    
    return seasonGroups.sort((a, b) => a.season - b.season);
  } catch (error) {
    console.error('❌ Erro ao buscar episódios:', error);
    return [];
  }
}

// ============================================
// SÉRIES AGRUPADAS
// ============================================

export interface SeriesGroup {
  name: string;
  episodeCount: number;
  logo?: string;
  categoryName?: string;
  firstEpisodeId?: string;
}

export async function getSeriesGrouped(params: {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ series: SeriesGroup[]; total: number }> {
  const { categoryId, search, page = 1, limit = 50 } = params;

  // Construir filtro de categoria
  let categoryFilter = '';
  if (categoryId && categoryId !== 'all' && categoryId !== 'favorites' && categoryId !== 'recent') {
    console.log('🔍 getSeriesGrouped: Filtering by specific category:', categoryId);
    categoryFilter = `AND category_id = '${categoryId}'`;
  } else {
    // Se for 'all', buscar apenas categorias do tipo 'series'
    const seriesIds = await getCategoryIdsByType('series');
    console.log('🔍 getSeriesGrouped: categoryId is "all", using series category IDs:', seriesIds.length);
    categoryFilter = `AND category_id IN (${seriesIds.map(id => `'${id}'`).join(',')})`;
  }

  // Construir filtro de busca
  const searchFilter = search ? `AND metadata->>'series_name' ILIKE '%${search}%'` : '';

  // Query SQL que agrupa no banco de dados (muito mais eficiente!)
  const { data, error } = await supabase.rpc('get_series_grouped', {
    category_filter: categoryFilter,
    search_filter: searchFilter
  });

  if (error) {
    console.error('❌ Erro ao buscar séries agrupadas:', error);
    console.log('⚠️ Fallback: Usando método antigo (pode ser lento)');
    
    // Fallback: método antigo (buscar em lotes)
    return await getSeriesGroupedFallback(params);
  }

  console.log('✅ getSeriesGrouped: Séries únicas encontradas:', data?.length || 0);

  const allSeries: SeriesGroup[] = (data || []).map((row: any) => ({
    name: row.series_name,
    episodeCount: row.episode_count,
    logo: row.logo_url,
    categoryName: row.category_name,
    firstEpisodeId: row.first_episode_id,
  }));

  return {
    series: allSeries,
    total: allSeries.length,
  };
}

// Fallback: método antigo que busca em lotes
async function getSeriesGroupedFallback(params: {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ series: SeriesGroup[]; total: number }> {
  const { categoryId, search } = params;
  
  let query = supabase
    .from('channels')
    .select('metadata, logo_url, id, category_id, categories(name, type)')
    .eq('is_active', true)
    .eq('metadata->is_episode', true)
    .not('metadata->series_name', 'is', null);

  if (categoryId && categoryId !== 'all' && categoryId !== 'favorites' && categoryId !== 'recent') {
    query = query.eq('category_id', categoryId);
  } else {
    const seriesIds = await getCategoryIdsByType('series');
    query = query.in('category_id', seriesIds);
  }

  if (search) {
    query = query.ilike('metadata->>series_name', `%${search}%`);
  }

  // Buscar TODOS os episódios (sem limite)
  let allEpisodes: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await query
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Erro ao buscar lote de episódios:', error);
      break;
    }

    if (batch && batch.length > 0) {
      allEpisodes = allEpisodes.concat(batch);
      from += batchSize;
      hasMore = batch.length === batchSize;
      console.log(`📦 Lote carregado: ${batch.length} episódios (total: ${allEpisodes.length})`);
    } else {
      hasMore = false;
    }
  }

  console.log('📊 Total de episódios carregados:', allEpisodes.length);

  // Agrupar por série
  const seriesMap = new Map<string, SeriesGroup>();
  
  allEpisodes.forEach((ep: any) => {
    const name = ep.metadata?.series_name;
    if (name) {
      if (!seriesMap.has(name)) {
        seriesMap.set(name, {
          name,
          episodeCount: 0,
          logo: ep.logo_url,
          categoryName: ep.categories?.name,
          firstEpisodeId: ep.id,
        });
      }
      seriesMap.get(name)!.episodeCount++;
    }
  });

  const allSeries = Array.from(seriesMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log('✅ Séries únicas encontradas (fallback):', allSeries.length);

  return {
    series: allSeries,
    total: allSeries.length,
  };
}
