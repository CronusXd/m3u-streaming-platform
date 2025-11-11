import { createClient } from '@/lib/supabase';

const supabase = createClient();

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
}): Promise<ChannelsResponse> {
  const { categoryId, search, page = 1, limit = 50 } = params;
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
      created_at,
      categories (
        name
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  // Filtrar por categoria
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Buscar por nome
  if (search) {
    query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

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
// SEARCH
// ============================================

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
