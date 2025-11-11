import { SupabaseService, ChannelRecord } from '../clients/supabase';
import axios from 'axios';

export interface ChannelFilters {
  playlistId?: string;
  groupTitle?: string;
  language?: string;
  isHls?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedChannels {
  channels: ChannelRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StreamValidation {
  isValid: boolean;
  isHls: boolean;
  contentType?: string;
  error?: string;
}

export class ChannelService {
  constructor(private supabase: SupabaseService) {}

  async getChannels(filters: ChannelFilters = {}): Promise<PaginatedChannels> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    if (!filters.playlistId) {
      throw new Error('playlistId is required');
    }

    const { channels, total } = await this.supabase.getChannelsByPlaylist(
      filters.playlistId,
      page,
      limit
    );

    // Apply additional filters in memory (could be optimized with DB queries)
    let filteredChannels = channels;

    if (filters.groupTitle) {
      filteredChannels = filteredChannels.filter(
        (ch) => ch.group_title?.toLowerCase() === filters.groupTitle?.toLowerCase()
      );
    }

    if (filters.language) {
      filteredChannels = filteredChannels.filter(
        (ch) => ch.language?.toLowerCase() === filters.language?.toLowerCase()
      );
    }

    if (filters.isHls !== undefined) {
      filteredChannels = filteredChannels.filter((ch) => ch.is_hls === filters.isHls);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      channels: filteredChannels,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async searchChannels(query: string, limit: number = 50): Promise<ChannelRecord[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return this.supabase.searchChannels(query.trim(), limit);
  }

  async refreshChannelMetadata(channelId: string): Promise<ChannelRecord> {
    const channel = await this.supabase.getChannelById(channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Validate stream URL
    const validation = await this.validateStreamUrl(channel.url);

    // Update channel with validation results
    return this.supabase.updateChannel(channelId, {
      is_active: validation.isValid,
      is_hls: validation.isHls,
    });
  }

  async validateStreamUrl(url: string): Promise<StreamValidation> {
    try {
      // Make HEAD request to check if URL is accessible
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept redirects and client errors
      });

      const contentType = response.headers['content-type'] || '';
      const isHls =
        url.toLowerCase().includes('.m3u8') ||
        contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegurl');

      return {
        isValid: response.status >= 200 && response.status < 400,
        isHls,
        contentType,
      };
    } catch (error) {
      return {
        isValid: false,
        isHls: url.toLowerCase().includes('.m3u8'),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getChannelById(channelId: string): Promise<ChannelRecord> {
    const channel = await this.supabase.getChannelById(channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    return channel;
  }
}
