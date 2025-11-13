import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PlaylistInsert {
  owner_id: string;
  name: string;
  source_url?: string;
  visibility: 'public' | 'private';
}

export interface PlaylistUpdate {
  name?: string;
  source_url?: string;
  visibility?: 'public' | 'private';
  updated_at?: Date;
}

export interface Playlist {
  id: string;
  owner_id: string;
  name: string;
  source_url?: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface ChannelInsert {
  name: string;
  display_name?: string;
  stream_url: string;
  logo_url?: string;
  category_id?: string;
  tvg_id?: string;
  is_hls: boolean;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface SeriesInsert {
  name: string;
  logo?: string;
  group_title?: string;
  total_episodes: number;
  content_type: 'series';
}

export interface SeriesRecord {
  id: string;
  name: string;
  logo?: string;
  group_title?: string;
  total_episodes: number;
  content_type: 'series';
  created_at: string;
}

export interface EpisodeInsert {
  series_id: string;
  name: string;
  url: string;
  logo?: string;
  season: number;
  episode: number;
  tvg_id?: string;
  raw_meta: Record<string, string>;
  is_hls: boolean;
  is_active: boolean;
}

export interface ChannelRecord {
  id: string;
  playlist_id: string;
  name: string;
  url: string;
  logo?: string;
  group_title?: string;
  language?: string;
  tvg_id?: string;
  raw_meta: Record<string, string>;
  is_hls: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Favorite {
  user_id: string;
  channel_id: string;
  created_at: string;
}

export class SupabaseService {
  private _client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this._client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Getter público para acesso ao client
  get client(): SupabaseClient {
    return this._client;
  }

  // ============================================
  // PLAYLIST OPERATIONS
  // ============================================

  async createPlaylist(data: PlaylistInsert): Promise<Playlist> {
    const { data: playlist, error } = await this._client
      .from('playlists')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create playlist: ${error.message}`);
    }

    return playlist;
  }

  async getPlaylistsByUser(userId: string): Promise<Playlist[]> {
    const { data, error } = await this._client
      .from('playlists')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get playlists: ${error.message}`);
    }

    return data || [];
  }

  async getPublicPlaylists(): Promise<Playlist[]> {
    const { data, error } = await this._client
      .from('playlists')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get public playlists: ${error.message}`);
    }

    return data || [];
  }

  async getPlaylistById(id: string): Promise<Playlist | null> {
    const { data, error } = await this._client
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get playlist: ${error.message}`);
    }

    return data;
  }

  async updatePlaylist(id: string, data: PlaylistUpdate): Promise<Playlist> {
    const { data: playlist, error } = await this._client
      .from('playlists')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update playlist: ${error.message}`);
    }

    return playlist;
  }

  async deletePlaylist(id: string): Promise<void> {
    const { error } = await this._client.from('playlists').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete playlist: ${error.message}`);
    }
  }

  // ============================================
  // CHANNEL OPERATIONS
  // ============================================

  async bulkInsertChannels(channels: ChannelInsert[]): Promise<void> {
    // Insert in batches of 500 for better performance
    const batchSize = 500;

    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);

      const { error } = await this._client.from('channels').insert(batch);

      if (error) {
        throw new Error(`Failed to insert channels batch ${i / batchSize + 1}: ${error.message}`);
      }
    }
  }

  async getChannelsByPlaylist(
    playlistId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ channels: ChannelRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await this._client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)
      .eq('is_active', true);

    if (countError) {
      throw new Error(`Failed to count channels: ${countError.message}`);
    }

    // Get paginated channels
    const { data, error } = await this._client
      .from('channels')
      .select('*')
      .eq('playlist_id', playlistId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get channels: ${error.message}`);
    }

    return {
      channels: data || [],
      total: count || 0,
    };
  }

  async getChannelById(id: string): Promise<ChannelRecord | null> {
    const { data, error } = await this._client
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get channel: ${error.message}`);
    }

    return data;
  }

  async searchChannels(query: string, limit: number = 50): Promise<ChannelRecord[]> {
    const { data, error } = await this._client
      .from('channels')
      .select('*')
      .or(`name.ilike.%${query}%,group_title.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search channels: ${error.message}`);
    }

    return data || [];
  }

  async deleteChannelsByPlaylist(playlistId: string): Promise<void> {
    const { error } = await this._client.from('channels').delete().eq('playlist_id', playlistId);

    if (error) {
      throw new Error(`Failed to delete channels: ${error.message}`);
    }
  }

  async updateChannel(id: string, data: Partial<ChannelInsert>): Promise<ChannelRecord> {
    const { data: channel, error } = await this._client
      .from('channels')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update channel: ${error.message}`);
    }

    return channel;
  }

  // ============================================
  // FAVORITE OPERATIONS
  // ============================================

  async addFavorite(userId: string, channelId: string): Promise<void> {
    const { error } = await this._client.from('favorites').insert({
      user_id: userId,
      channel_id: channelId,
    });

    if (error) {
      // Ignore duplicate key errors (already favorited)
      if (error.code !== '23505') {
        throw new Error(`Failed to add favorite: ${error.message}`);
      }
    }
  }

  async removeFavorite(userId: string, channelId: string): Promise<void> {
    const { error } = await this._client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('channel_id', channelId);

    if (error) {
      throw new Error(`Failed to remove favorite: ${error.message}`);
    }
  }

  async getFavoritesByUser(userId: string): Promise<ChannelRecord[]> {
    const { data, error } = await this._client
      .from('favorites')
      .select('channel_id, channels(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get favorites: ${error.message}`);
    }

    // Extract channels from the join result
    return (data || []).map((item: any) => item.channels).filter(Boolean);
  }

  async isFavorite(userId: string, channelId: string): Promise<boolean> {
    const { data, error } = await this._client
      .from('favorites')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw new Error(`Failed to check favorite: ${error.message}`);
    }

    return !!data;
  }

  // ============================================
  // SYNC OPERATIONS (para script automático)
  // ============================================

  /**
   * Remove TODAS as séries e episódios
   */
  async deleteAllSeries(): Promise<number> {
    // Primeiro deletar episódios
    const { count: episodesCount, error: episodesCountError } = await this._client
      .from('episodes')
      .select('*', { count: 'exact', head: true });

    if (!episodesCountError && episodesCount && episodesCount > 0) {
      await this._client
        .from('episodes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Depois deletar séries
    const { count, error: countError } = await this._client
      .from('series')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn(`Aviso ao contar séries: ${countError.message}`);
      return 0;
    }

    if (count && count > 0) {
      const { error } = await this._client
        .from('series')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.warn(`Aviso ao deletar séries: ${error.message}`);
        return 0;
      }
    }

    return (count || 0) + (episodesCount || 0);
  }

  /**
   * Remove TODOS os canais (usado antes de sincronização)
   */
  async deleteAllChannels(): Promise<number> {
    const { count, error: countError } = await this._client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count channels: ${countError.message}`);
    }

    const { error } = await this._client.from('channels').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      throw new Error(`Failed to delete all channels: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Insere canais em lote
   */
  async bulkUpsertChannels(channels: ChannelInsert[]): Promise<void> {
    const batchSize = 500;

    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);

      const { error } = await this._client
        .from('channels')
        .insert(batch);

      if (error) {
        throw new Error(`Failed to insert channels batch ${i / batchSize + 1}: ${error.message}`);
      }
    }
  }

  // ============================================
  // SERIES OPERATIONS
  // ============================================

  async insertSeries(data: SeriesInsert): Promise<SeriesRecord> {
    const { data: series, error } = await this._client
      .from('series')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert series: ${error.message}`);
    }

    return series;
  }

  async bulkInsertEpisodes(episodes: EpisodeInsert[]): Promise<void> {
    const batchSize = 500;

    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);

      // Usar upsert com ignoreDuplicates para evitar erro de constraint
      const { error } = await this._client
        .from('episodes')
        .upsert(batch, { 
          onConflict: 'series_id,season,episode',
          ignoreDuplicates: true 
        });

      if (error) {
        throw new Error(`Failed to insert episodes batch ${i / batchSize + 1}: ${error.message}`);
      }
    }
  }

  async getSeriesWithEpisodes(seriesId: string): Promise<any> {
    const { data, error } = await this._client
      .from('series')
      .select('*, episodes(*)')
      .eq('id', seriesId)
      .single();

    if (error) {
      throw new Error(`Failed to get series: ${error.message}`);
    }

    return data;
  }

  async searchSeries(query: string, limit: number = 50): Promise<SeriesRecord[]> {
    const { data, error } = await this._client
      .from('series')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search series: ${error.message}`);
    }

    return data || [];
  }
}
