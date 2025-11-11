import { z } from 'zod';

export const addFavoriteSchema = z.object({
  channelId: z.string().uuid('Invalid channel ID'),
});

export const removeFavoriteSchema = z.object({
  channelId: z.string().uuid('Invalid channel ID'),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
export type RemoveFavoriteInput = z.infer<typeof removeFavoriteSchema>;
