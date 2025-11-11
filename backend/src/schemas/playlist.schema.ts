import { z } from 'zod';

export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  source: z.union([z.string().url('Invalid URL'), z.instanceof(Buffer)]),
  visibility: z.enum(['public', 'private']),
});

export const playlistFiltersSchema = z.object({
  visibility: z.enum(['public', 'private']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const playlistIdSchema = z.object({
  id: z.string().uuid('Invalid playlist ID'),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type PlaylistFiltersInput = z.infer<typeof playlistFiltersSchema>;
export type PlaylistIdInput = z.infer<typeof playlistIdSchema>;
