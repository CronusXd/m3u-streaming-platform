import { FavoriteService } from './favorite.service';
import { SupabaseService } from '../clients/supabase';

jest.mock('../clients/supabase');

describe('FavoriteService', () => {
  let service: FavoriteService;
  let mockSupabase: jest.Mocked<SupabaseService>;

  const mockUserId = 'user-123';
  const mockChannelId = 'channel-456';

  beforeEach(() => {
    mockSupabase = new SupabaseService('url', 'key') as jest.Mocked<SupabaseService>;
    service = new FavoriteService(mockSupabase);
    jest.clearAllMocks();
  });

  describe('addFavorite', () => {
    it('should add channel to favorites', async () => {
      const mockChannel = {
        id: mockChannelId,
        playlist_id: 'pl1',
        name: 'Test Channel',
        url: 'http://test.m3u8',
        is_hls: true,
        is_active: true,
        raw_meta: {},
        created_at: new Date().toISOString(),
      };

      mockSupabase.getChannelById.mockResolvedValue(mockChannel);
      mockSupabase.addFavorite.mockResolvedValue();

      await service.addFavorite(mockUserId, mockChannelId);

      expect(mockSupabase.getChannelById).toHaveBeenCalledWith(mockChannelId);
      expect(mockSupabase.addFavorite).toHaveBeenCalledWith(mockUserId, mockChannelId);
    });

    it('should throw error if channel not found', async () => {
      mockSupabase.getChannelById.mockResolvedValue(null);

      await expect(service.addFavorite(mockUserId, mockChannelId)).rejects.toThrow(
        'Channel not found'
      );

      expect(mockSupabase.addFavorite).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite', () => {
    it('should remove channel from favorites', async () => {
      mockSupabase.removeFavorite.mockResolvedValue();

      await service.removeFavorite(mockUserId, mockChannelId);

      expect(mockSupabase.removeFavorite).toHaveBeenCalledWith(mockUserId, mockChannelId);
    });
  });

  describe('getUserFavorites', () => {
    it('should get all user favorites', async () => {
      const mockFavorites = [
        {
          id: 'ch1',
          playlist_id: 'pl1',
          name: 'Favorite 1',
          url: 'http://test1.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'ch2',
          playlist_id: 'pl1',
          name: 'Favorite 2',
          url: 'http://test2.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getFavoritesByUser.mockResolvedValue(mockFavorites);

      const result = await service.getUserFavorites(mockUserId);

      expect(result).toEqual(mockFavorites);
      expect(mockSupabase.getFavoritesByUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array if no favorites', async () => {
      mockSupabase.getFavoritesByUser.mockResolvedValue([]);

      const result = await service.getUserFavorites(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    it('should return true if channel is favorited', async () => {
      mockSupabase.isFavorite.mockResolvedValue(true);

      const result = await service.isFavorite(mockUserId, mockChannelId);

      expect(result).toBe(true);
      expect(mockSupabase.isFavorite).toHaveBeenCalledWith(mockUserId, mockChannelId);
    });

    it('should return false if channel is not favorited', async () => {
      mockSupabase.isFavorite.mockResolvedValue(false);

      const result = await service.isFavorite(mockUserId, mockChannelId);

      expect(result).toBe(false);
    });
  });
});
