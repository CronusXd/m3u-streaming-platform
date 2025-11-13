-- ============================================
-- Migration Simplificada: Séries e Episódios
-- Execute este SQL no Supabase Dashboard
-- ============================================

-- 1. Criar tabela de Séries
CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    logo TEXT,
    group_title VARCHAR(255),
    total_episodes INTEGER DEFAULT 0,
    content_type VARCHAR(20) DEFAULT 'series',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_series_name ON public.series(name);
CREATE INDEX IF NOT EXISTS idx_series_group_title ON public.series(group_title);
CREATE INDEX IF NOT EXISTS idx_series_created_at ON public.series(created_at DESC);

-- 2. Criar tabela de Episódios
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    tvg_id VARCHAR(255),
    raw_meta JSONB DEFAULT '{}'::jsonb,
    is_hls BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON public.episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON public.episodes(season, episode);
CREATE INDEX IF NOT EXISTS idx_episodes_tvg_id ON public.episodes(tvg_id);
CREATE INDEX IF NOT EXISTS idx_episodes_is_active ON public.episodes(is_active);
CREATE INDEX IF NOT EXISTS idx_episodes_series_order ON public.episodes(series_id, season, episode);

-- 3. Adicionar coluna content_type na tabela channels (se existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'channels'
    ) THEN
        ALTER TABLE public.channels 
        ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'channel';
        
        CREATE INDEX IF NOT EXISTS idx_channels_content_type ON public.channels(content_type);
    END IF;
END $$;

-- 4. Constraint único para evitar episódios duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_unique 
ON public.episodes(series_id, season, episode);

-- 5. Função para atualizar total_episodes automaticamente
CREATE OR REPLACE FUNCTION update_series_episode_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.series
    SET total_episodes = (
        SELECT COUNT(*)
        FROM public.episodes
        WHERE series_id = COALESCE(NEW.series_id, OLD.series_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.series_id, OLD.series_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contagem
DROP TRIGGER IF EXISTS trigger_update_episode_count ON public.episodes;
CREATE TRIGGER trigger_update_episode_count
AFTER INSERT OR DELETE ON public.episodes
FOR EACH ROW
EXECUTE FUNCTION update_series_episode_count();

-- 6. RLS Policies
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
DROP POLICY IF EXISTS "Séries são públicas para leitura" ON public.series;
CREATE POLICY "Séries são públicas para leitura"
ON public.series FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Episódios são públicos para leitura" ON public.episodes;
CREATE POLICY "Episódios são públicos para leitura"
ON public.episodes FOR SELECT
TO authenticated, anon
USING (true);

-- Políticas de modificação (apenas service role)
DROP POLICY IF EXISTS "Apenas service role pode modificar séries" ON public.series;
CREATE POLICY "Apenas service role pode modificar séries"
ON public.series FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas service role pode modificar episódios" ON public.episodes;
CREATE POLICY "Apenas service role pode modificar episódios"
ON public.episodes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Grants de permissão
GRANT SELECT ON public.series TO anon, authenticated;
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.series TO service_role;
GRANT ALL ON public.episodes TO service_role;

-- 8. Comentários
COMMENT ON TABLE public.series IS 'Tabela de séries de TV/streaming';
COMMENT ON TABLE public.episodes IS 'Tabela de episódios vinculados a séries';
COMMENT ON COLUMN public.episodes.season IS 'Número da temporada';
COMMENT ON COLUMN public.episodes.episode IS 'Número do episódio dentro da temporada';
COMMENT ON COLUMN public.series.total_episodes IS 'Total de episódios (atualizado automaticamente)';

-- ============================================
-- Verificação Final
-- ============================================
SELECT 
    'Tabelas criadas com sucesso!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'series') as series_existe,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'episodes') as episodes_existe;
