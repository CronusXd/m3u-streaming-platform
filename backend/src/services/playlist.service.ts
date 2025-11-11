import { M3UParser, ParseResult } from '../parsers/m3u-parser';
import {
  SupabaseService,
  Playlist,
  PlaylistInsert,
  ChannelInsert,
  ChannelRecord,
} from '../clients/supabase';

export interface CreatePlaylistDTO {
  name: string;
  source: string | Buffer;
  visibility: 'public' | 'private';
  sourceType: 'url' | 'file';
}

export interface PlaylistFilters {
  visibility?: 'public' | 'private';
  page?: number;
  limit?: number;
}

export interface PlaylistWithChannels extends Playlist {
  channels: ChannelRecord[];
  channelsCount: number;
  currentPage: number;
  totalPages: number;
}

export class PlaylistService {
  constructor(
    private supabase: SupabaseService,
    private parser: M3UParser
  ) {}

  async createPlaylist(userId: string, dto: CreatePlaylistDTO): Promise<Playlist> {
    // Parse M3U content
    const parseResult = await this.processM3U(dto.source, dto.sourceType);

    if (parseResult.channels.length === 0) {
      throw new Error('No valid channels found in M3U file');
    }

    // Create playlist
    const playlistData: PlaylistInsert = {
      owner_id: userId,
      name: dto.name,
      source_url: dto.sourceType === 'url' ? (dto.source as string) : undefined,
      visibility: dto.visibility,
    };

    const playlist = await this.supabase.createPlaylist(playlistData);

    // Insert channels
    const channelInserts: ChannelInsert[] = parseResult.channels.map((channel) => ({
      playlist_id: playlist.id,
      name: channel.name,
      url: channel.url,
      logo: channel.tvgLogo,
      group_title: channel.groupTitle,
      language: channel.language,
      tvg_id: channel.tvgId,
      raw_meta: channel.rawMeta,
      is_hls: channel.isHls,
      is_active: true,
    }));

    await this.supabase.bulkInsertChannels(channelInserts);

    return playlist;
  }

  async getPlaylists(userId: string, filters: PlaylistFilters = {}): Promise<Playlist[]> {
    if (filters.visibility === 'public') {
      return this.supabase.getPublicPlaylists();
    }

    return this.supabase.getPlaylistsByUser(userId);
  }

  async getPlaylistById(
    id: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PlaylistWithChannels> {
    const playlist = await this.supabase.getPlaylistById(id);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check access permissions
    if (playlist.visibility === 'private' && playlist.owner_id !== userId) {
      throw new Error('Access denied to private playlist');
    }

    // Get channels with pagination
    const { channels, total } = await this.supabase.getChannelsByPlaylist(id, page, limit);

    const totalPages = Math.ceil(total / limit);

    return {
      ...playlist,
      channels,
      channelsCount: total,
      currentPage: page,
      totalPages,
    };
  }

  async deletePlaylist(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const playlist = await this.supabase.getPlaylistById(id);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check permissions
    if (!isAdmin && playlist.owner_id !== userId) {
      throw new Error('Access denied: You can only delete your own playlists');
    }

    // Delete playlist (channels will be deleted by CASCADE)
    await this.supabase.deletePlaylist(id);
  }

  async refreshPlaylist(id: string, userId: string): Promise<Playlist> {
    const playlist = await this.supabase.getPlaylistById(id);

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check permissions
    if (playlist.owner_id !== userId) {
      throw new Error('Access denied: You can only refresh your own playlists');
    }

    if (!playlist.source_url) {
      throw new Error('Cannot refresh playlist without source URL');
    }

    // Parse M3U from source URL
    const parseResult = await this.processM3U(playlist.source_url, 'url');

    if (parseResult.channels.length === 0) {
      throw new Error('No valid channels found in M3U file');
    }

    // Delete existing channels
    await this.supabase.deleteChannelsByPlaylist(id);

    // Insert new channels
    const channelInserts: ChannelInsert[] = parseResult.channels.map((channel) => ({
      playlist_id: playlist.id,
      name: channel.name,
      url: channel.url,
      logo: channel.tvgLogo,
      group_title: channel.groupTitle,
      language: channel.language,
      tvg_id: channel.tvgId,
      raw_meta: channel.rawMeta,
      is_hls: channel.isHls,
      is_active: true,
    }));

    await this.supabase.bulkInsertChannels(channelInserts);

    // Update playlist timestamp
    return this.supabase.updatePlaylist(id, {
      updated_at: new Date(),
    });
  }

  private async processM3U(source: string | Buffer, sourceType: 'url' | 'file'): Promise<ParseResult> {
    if (sourceType === 'url') {
      return this.parser.parseFromUrl(source as string);
    } else {
      return this.parser.parseFromFile(source as Buffer);
    }
  }
}
