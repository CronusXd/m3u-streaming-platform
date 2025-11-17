import { supabase } from '@/lib/supabase';

export type ContentType = 'movie' | 'series' | 'live';

export interface Favorite {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_name: string;
  content_logo?: string;
  added_at: string;
}

export interface WatchHistory {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_name: string;
  content_logo?: string;
  watched_at: string;
  progress_percentage: number;
  completed: boolean;
  season_number?: number;
  episode_number?: number;
  episode_name?: string;
}

export interface RecentlyAdded {
  id: string;
  content_type: ContentType;
  content_id: string;
  content_name: string;
  content_logo?: string;
  category_name?: string;
  added_at: string;
}

// =====================================================
// FAVORITES
// =====================================================

export const addToFavorites = async (
  contentType: ContentType,
  contentId: string,
  contentName: string,
  contentLogo?: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('add_to_favorites', {
      p_user_id: user.id,
      p_content_type: contentType,
      p_content_id: contentId,
      p_content_name: contentName,
      p_content_logo: contentLogo || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return null;
  }
};

export const removeFromFavorites = async (
  contentType: ContentType,
  contentId: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('remove_from_favorites', {
      p_user_id: user.id,
      p_content_type: contentType,
      p_content_id: contentId,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
};

export const getUserFavorites = async (
  contentType?: ContentType,
  limit: number = 50,
  offset: number = 0
): Promise<Favorite[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_user_favorites', {
      p_user_id: user.id,
      p_content_type: contentType || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

export const isFavorite = async (
  contentType: ContentType,
  contentId: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
};

// =====================================================
// WATCH HISTORY
// =====================================================

export const addToWatchHistory = async (
  contentType: ContentType,
  contentId: string,
  contentName: string,
  contentLogo?: string,
  watchDuration: number = 0,
  totalDuration: number = 0,
  seasonNumber?: number,
  episodeNumber?: number,
  episodeName?: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('add_to_watch_history', {
      p_user_id: user.id,
      p_content_type: contentType,
      p_content_id: contentId,
      p_content_name: contentName,
      p_content_logo: contentLogo || null,
      p_watch_duration: watchDuration,
      p_total_duration: totalDuration,
      p_season_number: seasonNumber || null,
      p_episode_number: episodeNumber || null,
      p_episode_name: episodeName || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding to watch history:', error);
    return null;
  }
};