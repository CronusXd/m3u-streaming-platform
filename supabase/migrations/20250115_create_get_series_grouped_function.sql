-- ============================================
-- 🚀 FUNÇÃO SQL: get_series_grouped
-- ============================================
-- Esta função agrupa séries no banco de dados (muito mais eficiente!)

CREATE OR REPLACE FUNCTION get_series_grouped(
  category_filter TEXT DEFAULT '',
  search_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  series_name TEXT,
  episode_count BIGINT,
  logo_url TEXT,
  category_name TEXT,
  first_episode_id UUID
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      ch.metadata->>''series_name'' as series_name,
      COUNT(ch.id) as episode_count,
      MAX(ch.logo_url) as logo_url,
      MAX(c.name) as category_name,
      MIN(ch.id) as first_episode_id
    FROM channels ch
    LEFT JOIN categories c ON c.id = ch.category_id
    WHERE ch.is_active = true
    AND ch.metadata->>''is_episode'' = ''true''
    AND ch.metadata->>''series_name'' IS NOT NULL
    %s
    %s
    GROUP BY ch.metadata->>''series_name''
    ORDER BY ch.metadata->>''series_name''
  ', category_filter, search_filter);
END;
$$ LANGUAGE plpgsql;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_series_grouped TO authenticated;
GRANT EXECUTE ON FUNCTION get_series_grouped TO anon;
