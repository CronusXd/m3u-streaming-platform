import { Router } from 'express';
import { ChannelService } from '../services/channel.service';
import { SupabaseService } from '../clients/supabase';
import { authMiddleware, asyncHandler } from '../middleware';

const router = Router();

// Initialize services
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = new SupabaseService(supabaseUrl, supabaseKey);
const channelService = new ChannelService(supabase);

/**
 * GET /api/channels
 * List channels with filters
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const filters = {
      playlistId: req.query.playlistId as string | undefined,
      groupTitle: req.query.groupTitle as string | undefined,
      language: req.query.language as string | undefined,
      isHls: req.query.isHls ? req.query.isHls === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const result = await channelService.getChannels(filters);

    res.json({
      success: true,
      data: result.channels,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  })
);

/**
 * GET /api/channels/:id
 * Get channel details
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const channel = await channelService.getChannelById(id);

    res.json({
      success: true,
      data: channel,
    });
  })
);

/**
 * POST /api/channels/:id/refresh
 * Refresh channel metadata and validate stream
 */
router.post(
  '/:id/refresh',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const channel = await channelService.refreshChannelMetadata(id);

    res.json({
      success: true,
      data: channel,
      message: 'Channel metadata refreshed successfully',
    });
  })
);

export default router;
