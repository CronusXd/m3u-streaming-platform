import { Router } from 'express';
import { FavoriteService } from '../services/favorite.service';
import { SupabaseService } from '../clients/supabase';
import { authMiddleware, asyncHandler } from '../middleware';
import { ValidationError } from '../errors';

const router = Router();

// Initialize services
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = new SupabaseService(supabaseUrl, supabaseKey);
const favoriteService = new FavoriteService(supabase);

/**
 * GET /api/favorites
 * List user's favorite channels
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const channels = await favoriteService.getUserFavorites(req.user!.id);

    res.json({
      success: true,
      data: channels,
      meta: {
        count: channels.length,
      },
    });
  })
);

/**
 * POST /api/favorites
 * Add channel to favorites
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { channelId } = req.body;

    if (!channelId) {
      throw new ValidationError('channelId is required');
    }

    await favoriteService.addFavorite(req.user!.id, channelId);

    res.status(201).json({
      success: true,
      message: 'Channel added to favorites',
    });
  })
);

/**
 * DELETE /api/favorites/:channelId
 * Remove channel from favorites
 */
router.delete(
  '/:channelId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    await favoriteService.removeFavorite(req.user!.id, channelId);

    res.status(204).send();
  })
);

/**
 * GET /api/favorites/:channelId/check
 * Check if channel is favorited
 */
router.get(
  '/:channelId/check',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const isFavorite = await favoriteService.isFavorite(req.user!.id, channelId);

    res.json({
      success: true,
      data: {
        isFavorite,
      },
    });
  })
);

export default router;
