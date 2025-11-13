-- ============================================
-- REMOVER DUPLICADOS - RÁPIDO E EFICIENTE
-- ============================================

-- Remove duplicados mantendo apenas o registro mais recente
-- Duplicados = mesmo nome + mesmo stream_url

DELETE FROM channels
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY name, stream_url 
        ORDER BY created_at DESC
      ) as row_num
    FROM channels
  ) t
  WHERE row_num > 1
);

-- Verificar resultado
DO $$
DECLARE
  total_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Contar total
  SELECT COUNT(*) INTO total_count FROM channels;
  
  -- Contar duplicados restantes
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT name, stream_url, COUNT(*) as cnt
    FROM channels
    GROUP BY name, stream_url
    HAVING COUNT(*) > 1
  ) t;
  
  RAISE NOTICE '✅ Total de registros: %', total_count;
  RAISE NOTICE '❌ Duplicados restantes: %', duplicate_count;
  
  IF duplicate_count = 0 THEN
    RAISE NOTICE '🎉 Todos os duplicados foram removidos!';
  ELSE
    RAISE WARNING '⚠️  Ainda existem % duplicados', duplicate_count;
  END IF;
END $$;
