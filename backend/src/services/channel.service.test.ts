import { ChannelService } from './channel.service';
import { SupabaseService } from '../clients/supabase';
import axios from 'axios';

jest.mock('../clients/supabase');
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ChannelService', () => {
  let service: ChannelService;
  let mockSupabase: jest.Mocked<SupabaseService>;

  beforeEach(() => {
    mockSupabase = new SupabaseService('url', 'key') as jest.Mocked<SupabaseService>;
    service = new ChannelService(mockSupabase);
    jest.clearAllMocks();
  });

  describe('getChannels', () => {
    it('should get channels by playlist', async () => {
      const mockChannels = [
        {
          id: 'ch1',
          playlist_id: 'pl1',
          name: 'Channel 1',
          url: 'http://test.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getChannelsByPlaylist.mockResolvedValue({
        channels: mockChannels,
        total: 1,
      });

      const result = await service.getChannels({ playlistId: 'pl1' });

      expect(result.channels).toEqual(mockChannels);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should throw error if playlistId is missing', async () => {
      await expect(service.getChannels({})).rejects.toThrow('playlistId is required');
    });

    it('should filter channels by group title', async () => {
      const mockChannels = [
        {
          id: 'ch1',
          playlist_id: 'pl1',
          name: 'Channel 1',
          url: 'http://test.m3u8',
          group_title: 'News',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'ch2',
          playlist_id: 'pl1',
          name: 'Channel 2',
          url: 'http://test2.m3u8',
          group_title: 'Sports',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getChannelsByPlaylist.mockResolvedValue({
        channels: mockChannels,
        total: 2,
      });

      const result = await service.getChannels({
        playlistId: 'pl1',
        groupTitle: 'News',
      });

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].group_title).toBe('News');
    });

    it('should filter channels by HLS status', async () => {
      const mockChannels = [
        {
          id: 'ch1',
          playlist_id: 'pl1',
          name: 'HLS Channel',
          url: 'http://test.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'ch2',
          playlist_id: 'pl1',
          name: 'Non-HLS Channel',
          url: 'http://test.mp4',
          is_hls: false,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getChannelsByPlaylist.mockResolvedValue({
        channels: mockChannels,
        total: 2,
      });

      const result = await service.getChannels({
        playlistId: 'pl1',
        isHls: true,
      });

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].is_hls).toBe(true);
    });
  });

  describe('searchChannels', () => {
    it('should search channels by query', async () => {
      const mockChannels = [
        {
          id: 'ch1',
          playlist_id: 'pl1',
          name: 'Test Channel',
          url: 'http://test.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.searchChannels.mockResolvedValue(mockChannels);

      const result = await service.searchChannels('Test');

      expect(result).toEqual(mockChannels);
      expect(mockSupabase.searchChannels).toHaveBeenCalledWith('Test', 50);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchChannels('');

      expect(result).toEqual([]);
      expect(mockSupabase.searchChannels).not.toHaveBeenCalled();
    });

    it('should trim query before searching', async () => {
      mockSupabase.searchChannels.mockResolvedValue([]);

      await service.searchChannels('  test  ');

      expect(mockSupabase.searchChannels).toHaveBeenCalledWith('test', 50);
    });
  });

  describe('refreshChannelMetadata', () => {
    it('should refresh channel metadata with valid stream', async () => {
      const mockChannel = {
        id: 'ch1',
        playlist_id: 'pl1',
        name: 'Channel',
        url: 'http://test.m3u8',
        is_hls: true,
        is_active: true,
        raw_meta: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.getChannelById.mockResolvedValue(mockChannel);
      mockedAxios.head.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      } as any);
      mockSupabase.updateChannel.mockResolvedValue(mockChannel);

      const result = await service.refreshChannelMetadata('ch1');

      expect(result).toEqual(mockChannel);
      expect(mockSupabase.updateChannel).toHaveBeenCalledWith('ch1', {
        is_active: true,
        is_hls: true,
      });
    });

    it('should mark channel as inactive if stream is invalid', async () => {
      const mockChannel = {
        id: 'ch1',
        playlist_id: 'pl1',
        name: 'Channel',
        url: 'http://test.m3u8',
        is_hls: true,
        is_active: true,
        raw_meta: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.getChannelById.mockResolvedValue(mockChannel);
      mockedAxios.head.mockRejectedValue(new Error('Network error'));
      mockSupabase.updateChannel.mockResolvedValue({ ...mockChannel, is_active: false });

      await service.refreshChannelMetadata('ch1');

      expect(mockSupabase.updateChannel).toHaveBeenCalledWith('ch1', {
        is_active: false,
        is_hls: true,
      });
    });

    it('should throw error if channel not found', async () => {
      mockSupabase.getChannelById.mockResolvedValue(null);

      await expect(service.refreshChannelMetadata('ch1')).rejects.toThrow('Channel not found');
    });
  });

  describe('validateStreamUrl', () => {
    it('should validate HLS stream by content type', async () => {
      mockedAxios.head.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      } as any);

      const result = await service.validateStreamUrl('http://test.m3u8');

      expect(result.isValid).toBe(true);
      expect(result.isHls).toBe(true);
    });

    it('should validate HLS stream by URL extension', async () => {
      mockedAxios.head.mockResolvedValue({
        status: 200,
        headers: {},
      } as any);

      const result = await service.validateStreamUrl('http://test.m3u8');

      expect(result.isValid).toBe(true);
      expect(result.isHls).toBe(true);
    });

    it('should handle invalid streams', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Not found'));

      const result = await service.validateStreamUrl('http://invalid.m3u8');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should detect non-HLS streams', async () => {
      mockedAxios.head.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      } as any);

      const result = await service.validateStreamUrl('http://test.mp4');

      expect(result.isValid).toBe(true);
      expect(result.isHls).toBe(false);
    });
  });

  describe('getChannelById', () => {
    it('should get channel by ID', async () => {
      const mockChannel = {
        id: 'ch1',
        playlist_id: 'pl1',
        name: 'Channel',
        url: 'http://test.m3u8',
        is_hls: true,
        is_active: true,
        raw_meta: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.getChannelById.mockResolvedValue(mockChannel);

      const result = await service.getChannelById('ch1');

      expect(result).toEqual(mockChannel);
    });

    it('should throw error if channel not found', async () => {
      mockSupabase.getChannelById.mockResolvedValue(null);

      await expect(service.getChannelById('ch1')).rejects.toThrow('Channel not found');
    });
  });
});
