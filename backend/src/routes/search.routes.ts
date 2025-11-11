import { Router } from 'express';
import { ChannelService } from '../services/channel.service';
import { SupabaseService } from '../clients/supabase';
import { authMiddleware, asyncHandler } from '../middleware';
import { ValidationError } from '../errors';

const router = Router();

// Initialize services
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = new SupabaseService(supabaseUrl, supabaseKey);
const channelService = new ChannelService(supabase);

/**
 * GET /api/search
 * Search channels by name or group
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    if (!query) {
      throw new ValidationError('Search query (q) is required');
    }

    if (query.length < 1 || query.length > 255) {
      throw new ValidationError('Search query must be between 1 and 255 characters');
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    const channels = await channelService.searchChannels(query, limit);

    res.json({
      success: true,
      data: channels,
      meta: {
        query,
        count: channels.length,
        limit,
      },
    });
  })
);

export default router;
