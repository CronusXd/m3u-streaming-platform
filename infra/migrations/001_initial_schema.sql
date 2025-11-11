-- PlayCoreTV - Initial Schema
-- This migration creates the core tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  source_url TEXT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  group_title VARCHAR(255),
  language VARCHAR(50),
  tvg_id VARCHAR(255),
  raw_meta JSONB,
  is_hls BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_owner ON playlists(owner_id);
CREATE INDEX IF NOT EXISTS idx_playlists_visibility ON playlists(visibility);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channels_playlist ON channels(playlist_id);
CREATE INDEX IF NOT EXISTS idx_channels_group ON channels(group_title);
CREATE INDEX IF NOT EXISTS idx_channels_language ON channels(language);
CREATE INDEX IF NOT EXISTS idx_channels_is_hls ON channels(is_hls);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);

-- Full-text search index for channel names
CREATE INDEX IF NOT EXISTS idx_channels_name_search ON channels USING gin(to_tsvector('english', name));

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_channel ON favorites(channel_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE playlists IS 'Stores M3U playlists uploaded by users';
COMMENT ON TABLE channels IS 'Stores individual channels extracted from M3U playlists';
COMMENT ON TABLE favorites IS 'Stores user favorite channels';

COMMENT ON COLUMN playlists.visibility IS 'Determines if playlist is public or private';
COMMENT ON COLUMN channels.is_hls IS 'Indicates if the stream is HLS compatible (.m3u8)';
COMMENT ON COLUMN channels.is_active IS 'Indicates if the channel is currently active';
COMMENT ON COLUMN channels.raw_meta IS 'Stores all raw metadata from M3U file as JSON';
