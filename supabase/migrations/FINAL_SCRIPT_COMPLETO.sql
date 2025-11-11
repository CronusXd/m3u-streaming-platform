-- ============================================
-- SCRIPT ÚNICO E COMPLETO
-- Execute este script DEPOIS de apagar as tabelas manualmente
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CRIAR TABELAS
-- ============================================

-- Tabela de Categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(255),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Canais
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tvg_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  logo_url TEXT,
  stream_url TEXT NOT NULL,
  category_id UUID,
  is_hls BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key DEPOIS de criar ambas as tabelas
ALTER TABLE channels 
  ADD CONSTRAINT fk_category 
  FOREIGN KEY (category_id) 
  REFERENCES categories(id) 
  ON DELETE SET NULL;

-- Tabela de Favoritos
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign keys DEPOIS de criar a tabela
ALTER TABLE favorites 
  ADD CONSTRAINT fk_user 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE favorites 
  ADD CONSTRAINT fk_channel 
  FOREIGN KEY (channel_id) 
  REFERENCES channels(id) 
  ON DELETE CASCADE;

ALTER TABLE favorites 
  ADD CONSTRAINT unique_user_channel 
  UNIQUE(user_id, channel_id);

-- ============================================
-- CRIAR ÍNDICES
-- ============================================
CREATE INDEX idx_channels_category ON channels(category_id);
CREATE INDEX idx_channels_name ON channels USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_channels_display_name ON channels USING gin(to_tsvector('portuguese', display_name));
CREATE INDEX idx_channels_active ON channels(is_active) WHERE is_active = true;
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_channel ON favorites(channel_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================
-- CRIAR FUNÇÃO DE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- CRIAR TRIGGERS
-- ============================================
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at 
  BEFORE UPDATE ON channels
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABILITAR ROW LEVEL SECURITY
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CRIAR POLÍTICAS RLS
-- ============================================

-- Políticas para categories (leitura pública)
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Políticas para channels (leitura pública de canais ativos)
CREATE POLICY "Channels are viewable by everyone"
  ON channels FOR SELECT
  USING (is_active = true);

-- Políticas para favorites (cada usuário vê apenas os seus)
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CRIAR FUNÇÃO DE BUSCA OTIMIZADA
-- ============================================
CREATE OR REPLACE FUNCTION get_channels_with_favorites(
  p_user_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tvg_id VARCHAR,
  name VARCHAR,
  display_name VARCHAR,
  logo_url TEXT,
  stream_url TEXT,
  category_id UUID,
  category_name VARCHAR,
  is_hls BOOLEAN,
  is_favorite BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.tvg_id,
    c.name,
    c.display_name,
    c.logo_url,
    c.stream_url,
    c.category_id,
    cat.name as category_name,
    c.is_hls,
    CASE 
      WHEN p_user_id IS NOT NULL THEN EXISTS(
        SELECT 1 FROM favorites f 
        WHERE f.channel_id = c.id AND f.user_id = p_user_id
      )
      ELSE false
    END as is_favorite,
    c.created_at
  FROM channels c
  LEFT JOIN categories cat ON c.category_id = cat.id
  WHERE c.is_active = true
    AND (p_category_id IS NULL OR c.category_id = p_category_id)
    AND (p_search IS NULL OR 
         c.name ILIKE '%' || p_search || '%' OR 
         c.display_name ILIKE '%' || p_search || '%' OR
         cat.name ILIKE '%' || p_search || '%')
  ORDER BY c.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$
DECLARE
  tables_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('categories', 'channels', 'favorites');
  
  IF tables_count = 3 THEN
    RAISE NOTICE '✅ SUCESSO! Todas as 3 tabelas foram criadas corretamente!';
    RAISE NOTICE '📊 Tabelas: categories, channels, favorites';
    RAISE NOTICE '🚀 Agora execute: node scripts/import-m3u.js';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Apenas % tabelas foram criadas. Esperado: 3', tables_count;
  END IF;
END $$;
