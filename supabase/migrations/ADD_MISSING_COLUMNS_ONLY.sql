-- ============================================
-- Adicionar APENAS as colunas que faltam
-- Baseado na estrutura atual da tabela
-- ============================================

-- Ver estrutura atual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'channels' 
ORDER BY ordinal_position;

-- A tabela channels já tem:
-- - id, tvg_id, name, display_name, logo_url, stream_url
-- - category_id, is_hls, is_active, metadata
-- - created_at, updated_at

-- Não precisa adicionar nada!
-- A estrutura atual já suporta tudo via metadata (JSONB)

-- Verificar se metadata está como JSONB
DO $$ 
BEGIN
    -- Garantir que metadata é JSONB
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' 
        AND column_name = 'metadata'
        AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE public.channels 
        ALTER COLUMN metadata TYPE JSONB USING metadata::jsonb;
    END IF;
END $$;

-- Garantir que metadata tem valor padrão
UPDATE public.channels 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Criar índice GIN para busca no metadata
CREATE INDEX IF NOT EXISTS idx_channels_metadata_gin 
ON public.channels USING gin(metadata);

-- Verificação final
SELECT 
    'Estrutura verificada!' as status,
    COUNT(*) as total_channels,
    COUNT(*) FILTER (WHERE metadata IS NOT NULL) as com_metadata
FROM public.channels;
