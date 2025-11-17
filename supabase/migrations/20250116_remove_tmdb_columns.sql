-- ============================================
-- REMOVER COLUNAS TMDB DA TABELA IPTV
-- ============================================
-- Dados TMDB serão armazenados em cache IndexedDB no frontend

-- Remover índices TMDB
DROP INDEX IF EXISTS idx_iptv_tmdb_id;
DROP INDEX IF EXISTS idx_iptv_missing_tmdb;

-- Remover colunas TMDB
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_id;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_title;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_original_title;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_overview;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_poster_path;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_backdrop_path;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_release_date;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_runtime;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_genres;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_vote_average;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_vote_count;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_trailer_key;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_cast;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_director;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_created_by;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_number_of_seasons;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_number_of_episodes;
ALTER TABLE iptv DROP COLUMN IF EXISTS tmdb_last_sync;

-- Verificar
SELECT 'Colunas TMDB removidas com sucesso! Dados TMDB serão armazenados em cache IndexedDB.' as status;
