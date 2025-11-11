-- PlayCoreTV - Row Level Security Policies
-- This migration sets up RLS policies to secure data access

-- Enable Row Level Security on all tables
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PLAYLISTS POLICIES
-- ============================================

-- Users can view their own playlists
CREATE POLICY "Users can view own playlists"
  ON playlists
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can view public playlists
CREATE POLICY "Users can view public playlists"
  ON playlists
  FOR SELECT
  USING (visibility = 'public');

-- Users can create their own playlists
CREATE POLICY "Users can create own playlists"
  ON playlists
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own playlists
CREATE POLICY "Users can update own playlists"
  ON playlists
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own playlists
CREATE POLICY "Users can delete own playlists"
  ON playlists
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- CHANNELS POLICIES
-- ============================================

-- Users can view channels from playlists they have access to
CREATE POLICY "Users can view channels from accessible playlists"
  ON channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = channels.playlist_id
      AND (
        playlists.owner_id = auth.uid()
        OR playlists.visibility = 'public'
      )
    )
  );

-- Only playlist owners can insert channels
CREATE POLICY "Playlist owners can insert channels"
  ON channels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = channels.playlist_id
      AND playlists.owner_id = auth.uid()
    )
  );

-- Only playlist owners can update channels
CREATE POLICY "Playlist owners can update channels"
  ON channels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = channels.playlist_id
      AND playlists.owner_id = auth.uid()
    )
  );

-- Only playlist owners can delete channels
CREATE POLICY "Playlist owners can delete channels"
  ON channels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = channels.playlist_id
      AND playlists.owner_id = auth.uid()
    )
  );

-- ============================================
-- FAVORITES POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own favorites
CREATE POLICY "Users can create own favorites"
  ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ADMIN POLICIES (Optional - for future use)
-- ============================================

-- Note: Admin role can be implemented by adding a custom claim to JWT
-- For now, we rely on service_role key for admin operations

-- Comments for documentation
COMMENT ON POLICY "Users can view own playlists" ON playlists IS 'Allows users to see their own playlists';
COMMENT ON POLICY "Users can view public playlists" ON playlists IS 'Allows anyone to see public playlists';
COMMENT ON POLICY "Users can view channels from accessible playlists" ON channels IS 'Channels inherit visibility from their parent playlist';
COMMENT ON POLICY "Users can view own favorites" ON favorites IS 'Users can only see their own favorites';
