-- Migration: Add Favorites and History Tables by Content Type
-- Created: 2024-01-16
-- Description: Create separate tables for favorites and watch history for movies, series, and live TV

-- =====================================================
-- FAVORITES TABLES
-- =====================================================

-- Table: user_favorites
-- Stores user favorites for all content types
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('movie', 'series', 'live')),
    content_id UUID NOT NULL,
    content_name TEXT NOT NULL,
    content_logo TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type, content_id)
);

-- Indexes for user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_content_type ON user_favorites(content_type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_content ON user_favorites(user_id, content_type);

-- =====================================================
-- WATCH HISTORY TABLES
-- =====================================================

-- Table: user_watch_history
-- Stores watch history for all content types
CREATE TABLE IF NOT EXISTS user_watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('movie', 'series', 'live')),
    content_id UUID NOT NULL,
    content_name TEXT NOT NULL,
    content_logo TEXT,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watch_duration INTEGER DEFAULT 0, -- Duration watched in seconds
    total_duration INTEGER DEFAULT 0, -- Total content duration in seconds
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT FALSE,
    -- For series episodes
    season_number INTEGER,
    episode_number INTEGER,
    episode_name TEXT
);

-- Indexes for user_watch_history
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user_id ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_content_type ON user_watch_history(content_type);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user_content ON user_watch_history(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_watched_at ON user_watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user_content_id ON user_watch_history(user_id, content_id);

-- =====================================================
-- RECENTLY ADDED TRACKING
-- =====================================================

-- Table: recently_added_content
-- Tracks recently added content for quick access
CREATE TABLE IF NOT EXISTS recently_added_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('movie', 'series', 'live')),
    content_id UUID NOT NULL,
    content_name TEXT NOT NULL,
    content_logo TEXT,
    category_name TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_type, content_id)
);

-- Indexes for recently_added_content
CREATE INDEX IF NOT EXISTS idx_recently_added_content_type ON recently_added_content(content_type);
CREATE INDEX IF NOT EXISTS idx_recently_added_added_at ON recently_added_content(added_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Add to favorites
CREATE OR REPLACE FUNCTION add_to_favorites(
    p_user_id UUID,
    p_content_type VARCHAR(20),
    p_content_id UUID,
    p_content_name TEXT,
    p_content_logo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_favorite_id UUID;
BEGIN
    INSERT INTO user_favorites (user_id, content_type, content_id, content_name, content_logo)
    VALUES (p_user_id, p_content_type, p_content_id, p_content_name, p_content_logo)
    ON CONFLICT (user_id, content_type, content_id) DO NOTHING
    RETURNING id INTO v_favorite_id;
    
    RETURN v_favorite_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove from favorites
CREATE OR REPLACE FUNCTION remove_from_favorites(
    p_user_id UUID,
    p_content_type VARCHAR(20),
    p_content_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_deleted BOOLEAN;
BEGIN
    DELETE FROM user_favorites
    WHERE user_id = p_user_id
        AND content_type = p_content_type
        AND content_id = p_content_id;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Add to watch history
CREATE OR REPLACE FUNCTION add_to_watch_history(
    p_user_id UUID,
    p_content_type VARCHAR(20),
    p_content_id UUID,
    p_content_name TEXT,
    p_content_logo TEXT DEFAULT NULL,
    p_watch_duration INTEGER DEFAULT 0,
    p_total_duration INTEGER DEFAULT 0,
    p_season_number INTEGER DEFAULT NULL,
    p_episode_number INTEGER DEFAULT NULL,
    p_episode_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
    v_progress INTEGER;
    v_completed BOOLEAN;
BEGIN
    -- Calculate progress percentage
    IF p_total_duration > 0 THEN
        v_progress := LEAST(100, (p_watch_duration * 100) / p_total_duration);
        v_completed := v_progress >= 90; -- Consider completed if watched 90% or more
    ELSE
        v_progress := 0;
        v_completed := FALSE;
    END IF;

    INSERT INTO user_watch_history (
        user_id, content_type, content_id, content_name, content_logo,
        watch_duration, total_duration, progress_percentage, completed,
        season_number, episode_number, episode_name
    )
    VALUES (
        p_user_id, p_content_type, p_content_id, p_content_name, p_content_logo,
        p_watch_duration, p_total_duration, v_progress, v_completed,
        p_season_number, p_episode_number, p_episode_name
    )
    RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user favorites by type
CREATE OR REPLACE FUNCTION get_user_favorites(
    p_user_id UUID,
    p_content_type VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content_type VARCHAR(20),
    content_id UUID,
    content_name TEXT,
    content_logo TEXT,
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uf.id,
        uf.content_type,
        uf.content_id,
        uf.content_name,
        uf.content_logo,
        uf.added_at
    FROM user_favorites uf
    WHERE uf.user_id = p_user_id
        AND (p_content_type IS NULL OR uf.content_type = p_content_type)
    ORDER BY uf.added_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user watch history by type
CREATE OR REPLACE FUNCTION get_user_watch_history(
    p_user_id UUID,
    p_content_type VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content_type VARCHAR(20),
    content_id UUID,
    content_name TEXT,
    content_logo TEXT,
    watched_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER,
    completed BOOLEAN,
    season_number INTEGER,
    episode_number INTEGER,
    episode_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (uwh.content_id, uwh.season_number, uwh.episode_number)
        uwh.id,
        uwh.content_type,
        uwh.content_id,
        uwh.content_name,
        uwh.content_logo,
        uwh.watched_at,
        uwh.progress_percentage,
        uwh.completed,
        uwh.season_number,
        uwh.episode_number,
        uwh.episode_name
    FROM user_watch_history uwh
    WHERE uwh.user_id = p_user_id
        AND (p_content_type IS NULL OR uwh.content_type = p_content_type)
    ORDER BY uwh.content_id, uwh.season_number, uwh.episode_number, uwh.watched_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recently added content by type
CREATE OR REPLACE FUNCTION get_recently_added_content(
    p_content_type VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content_type VARCHAR(20),
    content_id UUID,
    content_name TEXT,
    content_logo TEXT,
    category_name TEXT,
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rac.id,
        rac.content_type,
        rac.content_id,
        rac.content_name,
        rac.content_logo,
        rac.category_name,
        rac.added_at
    FROM recently_added_content rac
    WHERE (p_content_type IS NULL OR rac.content_type = p_content_type)
    ORDER BY rac.added_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_added_content ENABLE ROW LEVEL SECURITY;

-- Policies for user_favorites
CREATE POLICY "Users can view their own favorites"
    ON user_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
    ON user_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON user_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for user_watch_history
CREATE POLICY "Users can view their own watch history"
    ON user_watch_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
    ON user_watch_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
    ON user_watch_history FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for recently_added_content (public read)
CREATE POLICY "Anyone can view recently added content"
    ON recently_added_content FOR SELECT
    USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_favorites IS 'Stores user favorites for movies, series, and live TV';
COMMENT ON TABLE user_watch_history IS 'Stores user watch history with progress tracking';
COMMENT ON TABLE recently_added_content IS 'Tracks recently added content for quick access';

COMMENT ON FUNCTION add_to_favorites IS 'Add content to user favorites';
COMMENT ON FUNCTION remove_from_favorites IS 'Remove content from user favorites';
COMMENT ON FUNCTION add_to_watch_history IS 'Add content to user watch history with progress';
COMMENT ON FUNCTION get_user_favorites IS 'Get user favorites filtered by content type';
COMMENT ON FUNCTION get_user_watch_history IS 'Get user watch history filtered by content type';
COMMENT ON FUNCTION get_recently_added_content IS 'Get recently added content filtered by type';
