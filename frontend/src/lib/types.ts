export interface User {
  id: string;
  email?: string;
  role?: string;
}

export interface Playlist {
  id: string;
  owner_id: string;
  name: string;
  source_url?: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  playlist_id: string;
  name: string;
  url: string;
  logo?: string;
  group_title?: string;
  language?: string;
  tvg_id?: string;
  raw_meta: Record<string, string>;
  is_hls: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PlaylistWithChannels extends Playlist {
  channels: Channel[];
  channelsCount: number;
  currentPage: number;
  totalPages: number;
}
