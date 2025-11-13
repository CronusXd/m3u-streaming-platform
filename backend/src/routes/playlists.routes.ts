import { Router } from 'express';
import multer from 'multer';
import { PlaylistService } from '../services/playlist.service';
import { SupabaseService } from '../clients/supabase';
import { M3UParser } from '../parsers/m3u-parser';
import {
  authMiddleware,
  uploadLimiter,
  asyncHandler,
} from '../middleware';
import { ValidationError } from '../errors';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024, // 10MB default
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'audio/x-mpegurl',
      'application/vnd.apple.mpegurl',
      'text/plain',
      'application/octet-stream',
    ];

    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.m3u')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only .m3u files are allowed'));
    }
  },
});

// Initialize services
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = new SupabaseService(supabaseUrl, supabaseKey);
const parser = new M3UParser();
const playlistService = new PlaylistService(supabase, parser);

/**
 * POST /api/playlists
 * Create a new playlist from URL or file upload
 */
router.post(
  '/',
  authMiddleware,
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { name, visibility, sourceUrl } = req.body;

    if (!name || !visibility) {
      throw new ValidationError('Name and visibility are required');
    }

    if (!sourceUrl && !req.file) {
      throw new ValidationError('Either sourceUrl or file upload is required');
    }

    const dto = {
      name,
      visibility: visibility as 'public' | 'private',
      source: req.file ? req.file.buffer : sourceUrl,
      sourceType: req.file ? ('file' as const) : ('url' as const),
    };

    const playlist = await playlistService.createPlaylist(req.user!.id, dto);

    res.status(201).json({
      success: true,
      data: playlist,
    });
  })
);

/**
 * GET /api/playlists
 * List playlists visible to the user
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const filters = {
      visibility: req.query.visibility as 'public' | 'private' | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const playlists = await playlistService.getPlaylists(req.user!.id, filters);

    res.json({
      success: true,
      data: playlists,
    });
  })
);

/**
 * GET /api/playlists/:id
 * Get playlist details with channels (paginated)
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const playlist = await playlistService.getPlaylistById(id, req.user!.id, page, limit);

    res.json({
      success: true,
      data: playlist,
      meta: {
        page: playlist.currentPage,
        limit,
        total: playlist.channelsCount,
        totalPages: playlist.totalPages,
      },
    });
  })
);

/**
 * DELETE /api/playlists/:id
 * Delete a playlist (owner or admin only)
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isAdmin = req.user!.role === 'admin';

    await playlistService.deletePlaylist(id, req.user!.id, isAdmin);

    res.status(204).send();
  })
);

/**
 * POST /api/playlists/:id/refresh
 * Refresh playlist from source URL
 */
router.post(
  '/:id/refresh',
  authMiddleware,
  uploadLimiter,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const playlist = await playlistService.refreshPlaylist(id, req.user!.id);

    res.json({
      success: true,
      data: playlist,
      message: 'Playlist refreshed successfully',
    });
  })
);

export default router;
