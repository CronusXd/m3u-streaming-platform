// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

// ============================================
// PLAYLIST TYPES
// ============================================

export interface Playlist {
  id: string;
  ownerId: string;
  name: string;
  sourceUrl?: string;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaylistDTO {
  name: string;
  source: string | Buffer;
  visibility: 'public' | 'private';
  sourceType: 'url' | 'file';
}

export interface PlaylistFilters {
  visibility?: 'public' | 'private';
  page?: number;
  limit?: number;
}

// ============================================
// CHANNEL TYPES
// ============================================

export interface Channel {
  id: string;
  playlistId: string;
  name: string;
  url: string;
  logo?: string;
  groupTitle?: string;
  language?: string;
  tvgId?: string;
  rawMeta: Record<string, string>;
  isHls: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface ChannelFilters {
  playlistId?: string;
  groupTitle?: string;
  language?: string;
  isHls?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// FAVORITE TYPES
// ============================================

export interface Favorite {
  userId: string;
  channelId: string;
  createdAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  statusCode?: number;
}

// ============================================
// REQUEST TYPES
// ============================================

export interface AuthenticatedRequest extends Express.Request {
  user?: AuthUser;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
