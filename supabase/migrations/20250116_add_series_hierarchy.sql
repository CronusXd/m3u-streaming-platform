-- ============================================
-- HIERARQUIA DE SÉRIES: Série → Temporada → Episódio
-- ============================================

-- Adicionar campos para hierarquia de séries
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS serie_id UUID;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS temporada_id UUID;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS is_serie_principal BOOLEAN DEFAULT false;
ALTER TABLE iptv ADD COLUMN IF NOT EXISTS is_temporada_principal BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN iptv.serie_id IS 'ID da série principal (para episódios e temporadas)';
COMMENT ON COLUMN iptv.temporada_id IS 'ID da temporada (para episódios)';
COMMENT ON COLUMN iptv.is_serie_principal IS 'TRUE se for o registro principal da série (sem temporada/episódio)';
COMMENT ON COLUMN iptv.is_temporada_principal IS 'TRUE se for o registro principal da temporada';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_iptv_serie_id ON iptv(serie_id) WHERE serie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iptv_temporada_id ON iptv(temporada_id) WHERE temporada_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iptv_serie_principal ON iptv(is_serie_principal) WHERE is_serie_principal = true;

-- ============================================
-- FUNÇÃO: Criar hierarquia de séries
-- ============================================

CREATE OR REPLACE FUNCTION criar_hierarquia_series()
RETURNS void AS $$
DECLARE
  serie_record RECORD;
  temporada_record RECORD;
  serie_principal_id UUID;
  temporada_principal_id UUID;
BEGIN
  -- Para cada série única
  FOR serie_record IN 
    SELECT DISTINCT nome 
    FROM iptv 
    WHERE tipo = 'serie' 
    ORDER BY nome
  LOOP
    -- Criar ou encontrar registro principal da série
    INSERT INTO iptv (
      tipo,
      nome,
      categoria,
      url_stream,
      is_serie_principal,
      is_active,
      logo_url,
      backdrop_url
    )
    SELECT 
      'serie',
      serie_record.nome,
      MAX(categoria),
      '', -- URL vazia para série principal
      true,
      true,
      MAX(logo_url),
      MAX(backdrop_url)
    FROM iptv
    WHERE tipo = 'serie' AND nome = serie_record.nome
    ON CONFLICT (tipo, nome, COALESCE(temporada, 0), COALESCE(episodio, 0))
    DO UPDATE SET
      is_serie_principal = true,
      logo_url = COALESCE(EXCLUDED.logo_url, iptv.logo_url),
      backdrop_url = COALESCE(EXCLUDED.backdrop_url, iptv.backdrop_url)
    RETURNING id INTO serie_principal_id;

    -- Se não retornou ID, buscar o existente
    IF serie_principal_id IS NULL THEN
      SELECT id INTO serie_principal_id
      FROM iptv
      WHERE tipo = 'serie' 
        AND nome = serie_record.nome 
        AND is_serie_principal = true
      LIMIT 1;
    END IF;

    -- Para cada temporada da série
    FOR temporada_record IN
      SELECT DISTINCT temporada
      FROM iptv
      WHERE tipo = 'serie' 
        AND nome = serie_record.nome
        AND temporada IS NOT NULL
      ORDER BY temporada
    LOOP
      -- Criar ou encontrar registro principal da temporada
      INSERT INTO iptv (
        tipo,
        nome,
        categoria,
        url_stream,
        temporada,
        serie_id,
        is_temporada_principal,
        is_active,
        logo_url,
        backdrop_url
      )
      SELECT 
        'serie',
        serie_record.nome,
        MAX(categoria),
        '', -- URL vazia para temporada principal
        temporada_record.temporada,
        serie_principal_id,
        true,
        true,
        MAX(logo_url),
        MAX(backdrop_url)
      FROM iptv
      WHERE tipo = 'serie' 
        AND nome = serie_record.nome
        AND temporada = temporada_record.temporada
      ON CONFLICT (tipo, nome, COALESCE(temporada, 0), COALESCE(episodio, 0))
      DO UPDATE SET
        is_temporada_principal = true,
        serie_id = COALESCE(EXCLUDED.serie_id, iptv.serie_id),
        logo_url = COALESCE(EXCLUDED.logo_url, iptv.logo_url),
        backdrop_url = COALESCE(EXCLUDED.backdrop_url, iptv.backdrop_url)
      RETURNING id INTO temporada_principal_id;

      -- Se não retornou ID, buscar o existente
      IF temporada_principal_id IS NULL THEN
        SELECT id INTO temporada_principal_id
        FROM iptv
        WHERE tipo = 'serie' 
          AND nome = serie_record.nome 
          AND temporada = temporada_record.temporada
          AND is_temporada_principal = true
        LIMIT 1;
      END IF;

      -- Atualizar episódios com serie_id e temporada_id
      UPDATE iptv
      SET 
        serie_id = serie_principal_id,
        temporada_id = temporada_principal_id
      WHERE tipo = 'serie'
        AND nome = serie_record.nome
        AND temporada = temporada_record.temporada
        AND episodio IS NOT NULL
        AND (serie_id IS NULL OR temporada_id IS NULL);
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Hierarquia de séries criada com sucesso!';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Buscar séries (apenas principais)
-- ============================================

CREATE OR REPLACE FUNCTION get_series_principais(
  categoria_filter TEXT DEFAULT '',
  search_filter TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  categoria TEXT,
  logo_url TEXT,
  backdrop_url TEXT,
  total_temporadas BIGINT,
  total_episodios BIGINT,
  visualizacoes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.nome::TEXT,
    s.categoria::TEXT,
    s.logo_url::TEXT,
    s.backdrop_url::TEXT,
    COUNT(DISTINCT e.temporada)::BIGINT as total_temporadas,
    COUNT(e.id)::BIGINT as total_episodios,
    s.visualizacoes
  FROM iptv s
  LEFT JOIN iptv e ON e.serie_id = s.id AND e.episodio IS NOT NULL
  WHERE s.tipo = 'serie'
    AND s.is_serie_principal = true
    AND s.is_active = true
    AND (categoria_filter = '' OR s.categoria ILIKE '%' || categoria_filter || '%')
    AND (search_filter = '' OR s.nome ILIKE '%' || search_filter || '%')
  GROUP BY s.id, s.nome, s.categoria, s.logo_url, s.backdrop_url, s.visualizacoes
  ORDER BY s.nome
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Buscar temporadas de uma série
-- ============================================

CREATE OR REPLACE FUNCTION get_temporadas_serie(
  serie_id_param UUID
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  temporada INTEGER,
  logo_url TEXT,
  backdrop_url TEXT,
  total_episodios BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.nome::TEXT,
    t.temporada,
    t.logo_url::TEXT,
    t.backdrop_url::TEXT,
    COUNT(e.id)::BIGINT as total_episodios
  FROM iptv t
  LEFT JOIN iptv e ON e.temporada_id = t.id AND e.episodio IS NOT NULL
  WHERE t.serie_id = serie_id_param
    AND t.is_temporada_principal = true
    AND t.is_active = true
  GROUP BY t.id, t.nome, t.temporada, t.logo_url, t.backdrop_url
  ORDER BY t.temporada;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Buscar episódios de uma temporada
-- ============================================

CREATE OR REPLACE FUNCTION get_episodios_temporada(
  temporada_id_param UUID
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  temporada INTEGER,
  episodio INTEGER,
  nome_episodio TEXT,
  url_stream TEXT,
  logo_url TEXT,
  backdrop_url TEXT,
  visualizacoes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nome::TEXT,
    e.temporada,
    e.episodio,
    e.nome_episodio::TEXT,
    e.url_stream::TEXT,
    e.logo_url::TEXT,
    e.backdrop_url::TEXT,
    e.visualizacoes
  FROM iptv e
  WHERE e.temporada_id = temporada_id_param
    AND e.episodio IS NOT NULL
    AND e.is_active = true
  ORDER BY e.episodio;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO: Buscar episódios de uma série (todas temporadas)
-- ============================================

CREATE OR REPLACE FUNCTION get_todos_episodios_serie(
  serie_id_param UUID
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  temporada INTEGER,
  episodio INTEGER,
  nome_episodio TEXT,
  url_stream TEXT,
  logo_url TEXT,
  backdrop_url TEXT,
  visualizacoes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nome::TEXT,
    e.temporada,
    e.episodio,
    e.nome_episodio::TEXT,
    e.url_stream::TEXT,
    e.logo_url::TEXT,
    e.backdrop_url::TEXT,
    e.visualizacoes
  FROM iptv e
  WHERE e.serie_id = serie_id_param
    AND e.episodio IS NOT NULL
    AND e.is_active = true
  ORDER BY e.temporada, e.episodio;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXECUTAR: Criar hierarquia para séries existentes
-- ============================================

-- Comentar a linha abaixo se não quiser executar automaticamente
-- SELECT criar_hierarquia_series();

-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT 'Hierarquia de séries configurada com sucesso!' as status;
