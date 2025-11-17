# Requirements Document - Correção de TTL do Cache

## Introdução

O sistema de cache otimizado (optimized-cache.ts) foi implementado com TTLs corretos (30 dias para metadados, 1 dia para streams), mas as páginas ainda estão usando o CacheManager antigo ou salvando com TTL incorreto de 7 dias. Esta spec corrige essas inconsistências para garantir que todas as páginas usem o cache otimizado com os TTLs corretos.

## Requirements

### Requirement 1: Migrar páginas para optimizedCache

**User Story:** Como desenvolvedor, quero que todas as páginas usem o optimizedCache novo, para que o sistema de cache seja consistente e otimizado.

#### Acceptance Criteria

1. WHEN uma página de filmes carrega THEN ela SHALL usar `optimizedCache.saveMetadata()` com TTL de 30 dias
2. WHEN uma página de séries carrega THEN ela SHALL usar `optimizedCache.saveMetadata()` com TTL de 30 dias
3. WHEN uma página de canais carrega THEN ela SHALL usar `optimizedCache.saveMetadata()` com TTL de 30 dias
4. WHEN qualquer página salva streams THEN ela SHALL usar `optimizedCache.saveStream()` com TTL de 1 dia
5. IF uma página ainda usa CacheManager antigo THEN ela SHALL ser atualizada para optimizedCache

### Requirement 2: Remover referências ao CacheManager antigo

**User Story:** Como desenvolvedor, quero remover todas as referências ao CacheManager antigo, para evitar confusão e uso incorreto do cache.

#### Acceptance Criteria

1. WHEN busco por "CacheManager" no código THEN não SHALL existir imports ou uso dele
2. WHEN busco por TTL de 7 dias THEN não SHALL existir referências a esse valor
3. IF existe código usando cache antigo THEN ele SHALL ser substituído por optimizedCache

### Requirement 3: Validar TTLs corretos

**User Story:** Como usuário, quero que os metadados sejam cacheados por 30 dias e streams por 1 dia, para ter melhor performance sem dados desatualizados.

#### Acceptance Criteria

1. WHEN metadados são salvos THEN o TTL SHALL ser 30 dias (TTL_METADATA)
2. WHEN streams são salvos THEN o TTL SHALL ser 1 dia (TTL_STREAMS)
3. WHEN dados expiram THEN eles SHALL ser automaticamente removidos do cache
4. IF uma página tenta usar TTL diferente THEN ela SHALL ser corrigida

### Requirement 4: Garantir consistência de tipos

**User Story:** Como desenvolvedor, quero que os tipos TypeScript estejam corretos, para evitar erros de compilação e runtime.

#### Acceptance Criteria

1. WHEN uso optimizedCache THEN os tipos MetadataEntry e StreamEntry SHALL estar corretos
2. WHEN salvo metadados THEN os campos SHALL corresponder à interface MetadataEntry
3. IF existem erros de tipo THEN eles SHALL ser corrigidos
4. WHEN compilo o projeto THEN não SHALL existir erros TypeScript relacionados ao cache
