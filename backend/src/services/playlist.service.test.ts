import { PlaylistService } from './playlist.service';
import { SupabaseService } from '../clients/supabase';
import { M3UParser } from '../parsers/m3u-parser';

// Mock dependencies
jest.mock('../clients/supabase');
jest.mock('../parsers/m3u-parser');

describe('PlaylistService', () => {
  let service: PlaylistService;
  let mockSupabase: jest.Mocked<SupabaseService>;
  let mockParser: jest.Mocked<M3UParser>;

  const mockUserId = 'user-123';
  const mockPlaylistId = 'playlist-456';

  beforeEach(() => {
    mockSupabase = new SupabaseService('url', 'key') as jest.Mocked<SupabaseService>;
    mockParser = new M3UParser() as jest.Mocked<M3UParser>;
    service = new PlaylistService(mockSupabase, mockParser);
    jest.clearAllMocks();
  });

  describe('createPlaylist', () => {
    it('should create playlist with valid M3U URL', async () => {
      const mockParseResult = {
        channels: [
          {
            name: 'Test Channel',
            url: 'https://example.com/stream.m3u8',
            tvgId: 'test1',
            tvgLogo: 'logo.png',
            groupTitle: 'Test',
            language: 'en',
            rawMeta: {},
            isHls: true,
          },
        ],
        errors: [],
      };

      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test Playlist',
        source_url: 'https://example.com/playlist.m3u',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockParser.parseFromUrl.mockResolvedValue(mockParseResult);
      mockSupabase.createPlaylist.mockResolvedValue(mockPlaylist);
      mockSupabase.bulkInsertChannels.mockResolvedValue();

      const result = await service.createPlaylist(mockUserId, {
        name: 'Test Playlist',
        source: 'https://example.com/playlist.m3u',
        visibility: 'private',
        sourceType: 'url',
      });

      expect(result).toEqual(mockPlaylist);
      expect(mockParser.parseFromUrl).toHaveBeenCalledWith('https://example.com/playlist.m3u');
      expect(mockSupabase.createPlaylist).toHaveBeenCalled();
      expect(mockSupabase.bulkInsertChannels).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            playlist_id: mockPlaylistId,
            name: 'Test Channel',
          }),
        ])
      );
    });

    it('should create playlist from file buffer', async () => {
      const mockBuffer = Buffer.from('#EXTM3U\n#EXTINF:-1,Test\nhttp://test.m3u8');
      const mockParseResult = {
        channels: [
          {
            name: 'Test',
            url: 'http://test.m3u8',
            rawMeta: {},
            isHls: true,
          },
        ],
        errors: [],
      };

      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockParser.parseFromFile.mockReturnValue(mockParseResult);
      mockSupabase.createPlaylist.mockResolvedValue(mockPlaylist);
      mockSupabase.bulkInsertChannels.mockResolvedValue();

      await service.createPlaylist(mockUserId, {
        name: 'Test',
        source: mockBuffer,
        visibility: 'private',
        sourceType: 'file',
      });

      expect(mockParser.parseFromFile).toHaveBeenCalledWith(mockBuffer);
    });

    it('should throw error if no channels found', async () => {
      mockParser.parseFromUrl.mockResolvedValue({
        channels: [],
        errors: [],
      });

      await expect(
        service.createPlaylist(mockUserId, {
          name: 'Empty',
          source: 'https://example.com/empty.m3u',
          visibility: 'private',
          sourceType: 'url',
        })
      ).rejects.toThrow('No valid channels found');
    });
  });

  describe('getPlaylists', () => {
    it('should get user playlists', async () => {
      const mockPlaylists = [
        {
          id: '1',
          owner_id: mockUserId,
          name: 'Playlist 1',
          visibility: 'private' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getPlaylistsByUser.mockResolvedValue(mockPlaylists);

      const result = await service.getPlaylists(mockUserId);

      expect(result).toEqual(mockPlaylists);
      expect(mockSupabase.getPlaylistsByUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should get public playlists when filter is set', async () => {
      const mockPlaylists = [
        {
          id: '1',
          owner_id: 'other-user',
          name: 'Public Playlist',
          visibility: 'public' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getPublicPlaylists.mockResolvedValue(mockPlaylists);

      const result = await service.getPlaylists(mockUserId, { visibility: 'public' });

      expect(result).toEqual(mockPlaylists);
      expect(mockSupabase.getPublicPlaylists).toHaveBeenCalled();
    });
  });

  describe('getPlaylistById', () => {
    it('should get playlist with channels', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChannels = [
        {
          id: 'ch1',
          playlist_id: mockPlaylistId,
          name: 'Channel 1',
          url: 'http://test.m3u8',
          is_hls: true,
          is_active: true,
          raw_meta: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockSupabase.getChannelsByPlaylist.mockResolvedValue({
        channels: mockChannels,
        total: 1,
      });

      const result = await service.getPlaylistById(mockPlaylistId, mockUserId);

      expect(result.channels).toEqual(mockChannels);
      expect(result.channelsCount).toBe(1);
    });

    it('should throw error if playlist not found', async () => {
      mockSupabase.getPlaylistById.mockResolvedValue(null);

      await expect(service.getPlaylistById(mockPlaylistId, mockUserId)).rejects.toThrow(
        'Playlist not found'
      );
    });

    it('should deny access to private playlist from other user', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: 'other-user',
        name: 'Private',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);

      await expect(service.getPlaylistById(mockPlaylistId, mockUserId)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('deletePlaylist', () => {
    it('should delete own playlist', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockSupabase.deletePlaylist.mockResolvedValue();

      await service.deletePlaylist(mockPlaylistId, mockUserId);

      expect(mockSupabase.deletePlaylist).toHaveBeenCalledWith(mockPlaylistId);
    });

    it('should allow admin to delete any playlist', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: 'other-user',
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockSupabase.deletePlaylist.mockResolvedValue();

      await service.deletePlaylist(mockPlaylistId, mockUserId, true);

      expect(mockSupabase.deletePlaylist).toHaveBeenCalled();
    });

    it('should deny deletion of other user playlist', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: 'other-user',
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);

      await expect(service.deletePlaylist(mockPlaylistId, mockUserId, false)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('refreshPlaylist', () => {
    it('should refresh playlist from source URL', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test',
        source_url: 'https://example.com/playlist.m3u',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockParseResult = {
        channels: [
          {
            name: 'Updated Channel',
            url: 'http://new.m3u8',
            rawMeta: {},
            isHls: true,
          },
        ],
        errors: [],
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);
      mockParser.parseFromUrl.mockResolvedValue(mockParseResult);
      mockSupabase.deleteChannelsByPlaylist.mockResolvedValue();
      mockSupabase.bulkInsertChannels.mockResolvedValue();
      mockSupabase.updatePlaylist.mockResolvedValue(mockPlaylist);

      await service.refreshPlaylist(mockPlaylistId, mockUserId);

      expect(mockSupabase.deleteChannelsByPlaylist).toHaveBeenCalledWith(mockPlaylistId);
      expect(mockSupabase.bulkInsertChannels).toHaveBeenCalled();
    });

    it('should throw error if playlist has no source URL', async () => {
      const mockPlaylist = {
        id: mockPlaylistId,
        owner_id: mockUserId,
        name: 'Test',
        visibility: 'private' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.getPlaylistById.mockResolvedValue(mockPlaylist);

      await expect(service.refreshPlaylist(mockPlaylistId, mockUserId)).rejects.toThrow(
        'Cannot refresh playlist without source URL'
      );
    });
  });
});
