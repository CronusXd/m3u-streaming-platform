import { z } from 'zod';

export const channelFiltersSchema = z.object({
  playlistId: z.string().uuid('Invalid playlist ID').optional(),
  groupTitle: z.string().max(255).optional(),
  language: z.string().max(50).optional(),
  isHls: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const channelIdSchema = z.object({
  id: z.string().uuid('Invalid channel ID'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(255),
  limit: z.number().int().positive().max(100).optional(),
});

export type ChannelFiltersInput = z.infer<typeof channelFiltersSchema>;
export type ChannelIdInput = z.infer<typeof channelIdSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
