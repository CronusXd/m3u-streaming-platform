import { SupabaseService, ChannelRecord } from '../clients/supabase';

export class FavoriteService {
  constructor(private supabase: SupabaseService) {}

  async addFavorite(userId: string, channelId: string): Promise<void> {
    // Verify channel exists
    const channel = await this.supabase.getChannelById(channelId);

    if (!channel) {
      throw new Error('Channel not found');
    }

    await this.supabase.addFavorite(userId, channelId);
  }

  async removeFavorite(userId: string, channelId: string): Promise<void> {
    await this.supabase.removeFavorite(userId, channelId);
  }

  async getUserFavorites(userId: string): Promise<ChannelRecord[]> {
    return this.supabase.getFavoritesByUser(userId);
  }

  async isFavorite(userId: string, channelId: string): Promise<boolean> {
    return this.supabase.isFavorite(userId, channelId);
  }
}
