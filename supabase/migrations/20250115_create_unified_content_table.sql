-- ============================================
-- TABELA ÚNICA IPTV (CANAIS, FILMES, SÉRIES)
-- ============================================

-- Criar extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dropar tabelas antigas se existirem
DROP TABLE IF EXISTS conteudos CASCADE;
DROP TABLE IF EXISTS iptv CASCADE;

-- Criar tabela única IPTV
CREATE TABLE iptv (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Tipo de conteúdo
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('canal', 'filme', 'serie')),
  
  -- Informações básicas
  nome VARCHAR(500) NOT NULL,
  nome_original VARCHAR(500),
  categoria VARCHAR(255),
  
  -- URL do stream
  url_stream TEXT NOT NULL,
  is_hls BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- EPG (para canais)
  epg_id VARCHAR(255),
  epg_logo TEXT,
  epg_numero VARCHAR(50),
  
  -- Séries (apenas para tipo='serie')
  temporada INTEGER,
  episodio INTEGER,
  nome_episodio VARCHAR(500),
  
  -- Imagens (apenas logo, resto vem do TMDB)
  logo_url TEXT,
  backdrop_url TEXT,
  
  -- Estatísticas
  visualizacoes INTEGER DEFAULT 0,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados JSON flexível (para dados extras se necessário)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice por tipo (canal, filme, serie)
CREATE INDEX idx_iptv_tipo ON iptv(tipo);

-- Índice por categoria
CREATE INDEX idx_iptv_categoria ON iptv(categoria);

-- Índice por nome (busca full-text em português)
CREATE INDEX idx_iptv_nome ON iptv USING gin(to_tsvector('portuguese', nome));

-- Índice por temporada/episódio (séries)
CREATE INDEX idx_iptv_serie ON iptv(nome, temporada, episodio) WHERE tipo = 'serie';

-- Índice por EPG ID (canais)
CREATE INDEX idx_iptv_epg_id ON iptv(epg_id) WHERE tipo = 'canal';

-- Índice por ativo
CREATE INDEX idx_iptv_active ON iptv(is_active);

-- Índice composto para busca de séries
CREATE INDEX idx_iptv_serie_lookup ON iptv(nome, tipo, temporada, episodio) 
WHERE tipo = 'serie';

-- Índice para ordenação por visualizações
CREATE INDEX idx_iptv_views ON iptv(visualizacoes DESC);

-- Índice único composto para UPSERT (evitar duplicatas)
-- Para canais e filmes: tipo + nome
-- Para séries: tipo + nome + temporada + episodio
CREATE UNIQUE INDEX idx_iptv_unique_content ON iptv(
  tipo, 
  nome, 
  COALESCE(temporada, 0), 
  COALESCE(episodio, 0)
);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar automaticamente
CREATE TRIGGER update_iptv_updated_at 
    BEFORE UPDATE ON iptv
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO PARA BUSCAR SÉRIES AGRUPADAS
-- ============================================

DROP FUNCTION IF EXISTS get_series_agrupadas(text,text,integer,integer);

CREATE OR REPLACE FUNCTION get_series_agrupadas(
  categoria_filter TEXT DEFAULT '',
  search_filter TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  nome TEXT,
  categoria TEXT,
  total_episodios BIGINT,
  total_temporadas BIGINT,
  logo_url TEXT,
  backdrop_url TEXT,
  primeiro_episodio_id UUID,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.nome::TEXT,
    i.categoria::TEXT,
    COUNT(*)::BIGINT as total_episodios,
    COUNT(DISTINCT i.temporada)::BIGINT as total_temporadas,
    MAX(i.logo_url)::TEXT,
    MAX(i.backdrop_url)::TEXT,
    MIN(i.id)::UUID as primeiro_episodio_id,
    MAX(i.updated_at)::TIMESTAMP WITH TIME ZONE as ultima_atualizacao
  FROM iptv i
  WHERE i.tipo = 'serie'
    AND i.is_active = true
    AND (categoria_filter = '' OR i.categoria ILIKE '%' || categoria_filter || '%')
    AND (search_filter = '' OR i.nome ILIKE '%' || search_filter || '%')
  GROUP BY i.nome, i.categoria
  ORDER BY i.nome
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO PARA BUSCAR EPISÓDIOS DE UMA SÉRIE
-- ============================================

DROP FUNCTION IF EXISTS get_episodios_serie(text,integer);

CREATE OR REPLACE FUNCTION get_episodios_serie(
  nome_serie TEXT,
  temporada_filter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  temporada INTEGER,
  episodio INTEGER,
  nome_episodio TEXT,
  url_stream TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nome::TEXT,
    i.temporada,
    i.episodio,
    i.nome_episodio::TEXT,
    i.url_stream::TEXT,
    i.logo_url::TEXT,
    i.created_at
  FROM iptv i
  WHERE i.tipo = 'serie'
    AND i.nome = nome_serie
    AND i.is_active = true
    AND (temporada_filter IS NULL OR i.temporada = temporada_filter)
  ORDER BY i.temporada, i.episodio;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO PARA BUSCAR CANAIS POR CATEGORIA
-- ============================================

DROP FUNCTION IF EXISTS get_canais_por_categoria(text);

CREATE OR REPLACE FUNCTION get_canais_por_categoria(
  categoria_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  categoria TEXT,
  url_stream TEXT,
  epg_id TEXT,
  epg_logo TEXT,
  epg_numero TEXT,
  logo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nome::TEXT,
    i.categoria::TEXT,
    i.url_stream::TEXT,
    i.epg_id::TEXT,
    i.epg_logo::TEXT,
    i.epg_numero::TEXT,
    i.logo_url::TEXT
  FROM iptv i
  WHERE i.tipo = 'canal'
    AND i.is_active = true
    AND (categoria_filter = '' OR i.categoria ILIKE '%' || categoria_filter || '%')
  ORDER BY i.categoria, i.nome;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO PARA BUSCAR FILMES
-- ============================================

DROP FUNCTION IF EXISTS get_filmes(text,text,integer,integer);

CREATE OR REPLACE FUNCTION get_filmes(
  categoria_filter TEXT DEFAULT '',
  search_filter TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  categoria TEXT,
  url_stream TEXT,
  logo_url TEXT,
  backdrop_url TEXT,
  visualizacoes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nome::TEXT,
    i.categoria::TEXT,
    i.url_stream::TEXT,
    i.logo_url::TEXT,
    i.backdrop_url::TEXT,
    i.visualizacoes
  FROM iptv i
  WHERE i.tipo = 'filme'
    AND i.is_active = true
    AND (categoria_filter = '' OR i.categoria ILIKE '%' || categoria_filter || '%')
    AND (search_filter = '' OR i.nome ILIKE '%' || search_filter || '%')
  ORDER BY i.visualizacoes DESC, i.nome
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEGURANÇA (RLS - Row Level Security)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE iptv ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem LER conteúdo ativo
CREATE POLICY "Permitir leitura pública de conteúdo ativo"
ON iptv FOR SELECT
USING (is_active = true);

-- Política: Apenas autenticados podem INSERIR
CREATE POLICY "Apenas autenticados podem inserir"
ON iptv FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Apenas autenticados podem ATUALIZAR
CREATE POLICY "Apenas autenticados podem atualizar"
ON iptv FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Apenas autenticados podem DELETAR
CREATE POLICY "Apenas autenticados podem deletar"
ON iptv FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE iptv IS 'Tabela única IPTV para armazenar canais, filmes e séries. Dados TMDB (descrição, ano, duração, etc) são buscados em tempo real via API.';
COMMENT ON COLUMN iptv.tipo IS 'Tipo de conteúdo: canal, filme ou serie';
COMMENT ON COLUMN iptv.temporada IS 'Número da temporada (apenas para séries)';
COMMENT ON COLUMN iptv.episodio IS 'Número do episódio (apenas para séries)';
COMMENT ON COLUMN iptv.epg_id IS 'ID do EPG (apenas para canais)';
COMMENT ON COLUMN iptv.metadata IS 'Metadados flexíveis em formato JSON para dados extras';
COMMENT ON COLUMN iptv.logo_url IS 'Logo do conteúdo (extraído do M3U)';
COMMENT ON COLUMN iptv.backdrop_url IS 'Backdrop/banner do conteúdo';

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Verificar criação
SELECT 'Tabela IPTV criada com sucesso!' as status;
SELECT COUNT(*) as total_indices FROM pg_indexes WHERE tablename = 'iptv';
