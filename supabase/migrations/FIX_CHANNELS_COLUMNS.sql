-- ============================================
-- Fix: Adicionar colunas faltantes na tabela channels
-- ============================================

-- 1. Adicionar group_title
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' AND column_name = 'group_title'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN group_title VARCHAR(255);
    END IF;
END $$;

-- 2. Adicionar language
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' AND column_name = 'language'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN language VARCHAR(50);
    END IF;
END $$;

-- 3. Adicionar raw_meta
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' AND column_name = 'raw_meta'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN raw_meta JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Adicionar url (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' AND column_name = 'url'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN url TEXT;
    END IF;
END $$;

-- 5. Adicionar logo (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'channels' AND column_name = 'logo'
    ) THEN
        ALTER TABLE public.channels ADD COLUMN logo TEXT;
    END IF;
END $$;

-- Copiar dados de stream_url para url se url estiver vazio
UPDATE public.channels 
SET url = stream_url 
WHERE url IS NULL AND stream_url IS NOT NULL;

-- Copiar dados de logo_url para logo se logo estiver vazio
UPDATE public.channels 
SET logo = logo_url 
WHERE logo IS NULL AND logo_url IS NOT NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_channels_group_title ON public.channels(group_title);
CREATE INDEX IF NOT EXISTS idx_channels_language ON public.channels(language);

-- Verificação
SELECT 
    'Colunas adicionadas com sucesso!' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'group_title') as group_title_existe,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'language') as language_existe,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'raw_meta') as raw_meta_existe,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'url') as url_existe,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'logo') as logo_existe;
