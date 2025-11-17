# Implementation Plan - Correção de TTL do Cache

- [x] 1. Atualizar página de canais para usar optimizedCache



  - Remover imports e código do CacheManager antigo
  - Adicionar import do optimizedCache
  - Implementar lógica de carregamento com getMetadata('canal')
  - Implementar lógica de salvamento com saveMetadata()
  - Atualizar extração de categorias para usar dados do cache


  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

- [ ] 2. Validar tipos TypeScript
  - Verificar que MetadataEntry está sendo usado corretamente

  - Garantir que campos obrigatórios estão presentes
  - Corrigir erros de compilação se existirem
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Testar funcionalidade do cache
  - Testar cache MISS (primeira carga)
  - Testar cache HIT (segunda carga)


  - Verificar logs no console
  - Validar badge "⚡ CACHE" aparece corretamente
  - Confirmar que dados estão sendo salvos com TTL de 30 dias
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Verificar consistência entre páginas
  - Confirmar que filmes, séries e canais usam optimizedCache
  - Verificar que não há mais referências ao CacheManager
  - Validar que TTLs estão corretos (30 dias para metadados)
  - _Requirements: 2.1, 2.2, 2.3, 3.4_
