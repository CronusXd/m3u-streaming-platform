-- ============================================
-- ADICIONAR COLUNAS TMDB À TABELA IPTV
-- ============================================

-- Adicionar colunas de metadados TMDB
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_title TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_original_title TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_overview TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_poster_path TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_backdrop_path TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_release_date DATE;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_runtime INTEGER;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_genres JSONB DEFAULT '[]'::jsonb;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_vote_average DECIMAL(3,1);
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_vote_count INTEGER;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_trailer_key TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_cast JSONB DEFAULT '[]'::jsonb;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_director TEXT;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_created_by JSONB DEFAULT '[]'::jsonb;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_number_of_seasons INTEGER;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_number_of_episodes INTEGER;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS tmdb_last_sync TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca por TMDB ID
CREATE INDEX IF NOT EXISTS idx_iptv_tmdb_id ON iptv(tmdb_id) WHERE tmdb_id IS NOT NULL;

-- Criar índice para identificar registros sem metadados TMDB
CREATE INDEX IF NOT EXISTS idx_iptv_missing_tmdb ON iptv(tipo, tmdb_id) WHERE tmdb_id IS NULL AND is_active = true;

-- Comentários
COMMENT ON COLUMN iptv.tmdb_id IS 'ID do conteúdo no TMDB';
COMMENT ON COLUMN iptv.tmdb_title IS 'Título do conteúdo no TMDB';
COMMENT ON COLUMN iptv.tmdb_overview IS 'Sinopse/descrição do TMDB';
COMMENT ON COLUMN iptv.tmdb_poster_path IS 'Caminho do poster no TMDB (ex: /abc123.jpg)';
COMMENT ON COLUMN iptv.tmdb_backdrop_path IS 'Caminho do backdrop no TMDB';
COMMENT ON COLUMN iptv.tmdb_release_date IS 'Data de lançamento (filmes) ou primeira exibição (séries)';
COMMENT ON COLUMN iptv.tmdb_runtime IS 'Duração em minutos (filmes)';
COMMENT ON COLUMN iptv.tmdb_genres IS 'Array de gêneros do TMDB';
COMMENT ON COLUMN iptv.tmdb_vote_average IS 'Avaliação média (0-10)';
COMMENT ON COLUMN iptv.tmdb_trailer_key IS 'Chave do trailer no YouTube';
COMMENT ON COLUMN iptv.tmdb_cast IS 'Elenco principal (top 5)';
COMMENT ON COLUMN iptv.tmdb_director IS 'Diretor (filmes)';
COMMENT ON COLUMN iptv.tmdb_created_by IS 'Criadores (séries)';
COMMENT ON COLUMN iptv.tmdb_last_sync IS 'Data da última sincronização com TMDB';

-- Verificar
SELECT 'Colunas TMDB adicionadas com sucesso!' as status;
