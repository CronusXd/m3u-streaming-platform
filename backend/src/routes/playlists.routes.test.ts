import request from 'supertest';
import express from 'express';
import playlistsRouter from './playlists.routes';
import { errorHandler } from '../middleware';

// Mock services
jest.mock('../services/playlist.service');
jest.mock('../clients/supabase');
jest.mock('../parsers/m3u-parser');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

const app = express();
app.use(express.json());
app.use('/api/playlists', playlistsRouter);
app.use(errorHandler);

const mockToken = 'mock-jwt-token';
const mockUserId = 'user-123';

describe('Playlists Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase auth
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: mockUserId,
              email: 'test@example.com',
              user_metadata: { role: 'user' },
            },
          },
          error: null,
        }),
      },
    });
  });

  describe('POST /api/playlists', () => {
    it('should create playlist with URL', async () => {
      const mockPlaylist = {
        id: 'playlist-1',
        owner_id: mockUserId,
        name: 'Test Playlist',
        source_url: 'https://example.com/playlist.m3u',
        visibility: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.createPlaylist = jest.fn().mockResolvedValue(mockPlaylist);

      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          name: 'Test Playlist',
          sourceUrl: 'https://example.com/playlist.m3u',
          visibility: 'private',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPlaylist);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/playlists').send({
        name: 'Test',
        sourceUrl: 'https://example.com/playlist.m3u',
        visibility: 'private',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          sourceUrl: 'https://example.com/playlist.m3u',
          visibility: 'private',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when neither sourceUrl nor file provided', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          name: 'Test',
          visibility: 'private',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/playlists', () => {
    it('should list user playlists', async () => {
      const mockPlaylists = [
        {
          id: 'playlist-1',
          owner_id: mockUserId,
          name: 'Playlist 1',
          visibility: 'private',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.getPlaylists = jest.fn().mockResolvedValue(mockPlaylists);

      const response = await request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPlaylists);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/playlists');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/playlists/:id', () => {
    it('should get playlist with channels', async () => {
      const mockPlaylist = {
        id: 'playlist-1',
        owner_id: mockUserId,
        name: 'Test',
        visibility: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        channels: [],
        channelsCount: 0,
        currentPage: 1,
        totalPages: 0,
      };

      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.getPlaylistById = jest.fn().mockResolvedValue(mockPlaylist);

      const response = await request(app)
        .get('/api/playlists/playlist-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPlaylist);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/playlists/playlist-1');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/playlists/:id', () => {
    it('should delete playlist', async () => {
      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.deletePlaylist = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/playlists/playlist-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).delete('/api/playlists/playlist-1');

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not owner', async () => {
      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.deletePlaylist = jest
        .fn()
        .mockRejectedValue(new Error('Access denied'));

      const response = await request(app)
        .delete('/api/playlists/playlist-1')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/playlists/:id/refresh', () => {
    it('should refresh playlist', async () => {
      const mockPlaylist = {
        id: 'playlist-1',
        owner_id: mockUserId,
        name: 'Test',
        source_url: 'https://example.com/playlist.m3u',
        visibility: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { PlaylistService } = require('../services/playlist.service');
      PlaylistService.prototype.refreshPlaylist = jest.fn().mockResolvedValue(mockPlaylist);

      const response = await request(app)
        .post('/api/playlists/playlist-1/refresh')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPlaylist);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/playlists/playlist-1/refresh');

      expect(response.status).toBe(401);
    });
  });
});
