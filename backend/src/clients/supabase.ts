import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Channel } from '../parsers/m3u-parser';

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
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // ============================================
  // PLAYLIST OPERATIONS
  // ============================================

  async createPlaylist(data: PlaylistInsert): Promise<Playlist> {
    const { data: playlist, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data: playlist, error } = await this.client
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
    const { error } = await this.client.from('playlists').delete().eq('id', id);

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

      const { error } = await this.client.from('channels').insert(batch);

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
    const { count, error: countError } = await this.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)
      .eq('is_active', true);

    if (countError) {
      throw new Error(`Failed to count channels: ${countError.message}`);
    }

    // Get paginated channels
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { error } = await this.client.from('channels').delete().eq('playlist_id', playlistId);

    if (error) {
      throw new Error(`Failed to delete channels: ${error.message}`);
    }
  }

  async updateChannel(id: string, data: Partial<ChannelInsert>): Promise<ChannelRecord> {
    const { data: channel, error } = await this.client
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
    const { error } = await this.client.from('favorites').insert({
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
    const { error } = await this.client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('channel_id', channelId);

    if (error) {
      throw new Error(`Failed to remove favorite: ${error.message}`);
    }
  }

  async getFavoritesByUser(userId: string): Promise<ChannelRecord[]> {
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
}
