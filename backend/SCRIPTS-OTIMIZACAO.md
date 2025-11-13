# 🚀 Scripts de Otimização Paralela (30 Threads)

Todos os scripts foram otimizados para usar **30 threads paralelos**, tornando as operações muito mais rápidas.

## 📊 Status Atual do Banco

- **Total de registros**: 165.214 ✅
- **Filmes**: 0
- **Episódios**: 150.595 (100% com metadados completos) ✅
- **Live TV**: 14.619 ✅
- **Duplicados**: 0 ✅
- **Episódios categorizados**: 150.595 (100%) ✅
- **Logos**: 153.305 (92.8% cobertura) ✅
- **Séries únicas**: 55

## 🎯 Scripts Disponíveis

### 1. Análise de Duplicados
```bash
npm run analyze-duplicates
```
- Analisa o banco em busca de duplicados
- Mostra estatísticas por tipo (filmes, episódios, live TV)
- Identifica duplicados por name + stream_url

### 2. Remover Duplicados (Paralelo)
```bash
npm run remove-duplicates-parallel
```
- Remove duplicados usando 30 threads
- Mantém o registro mais recente
- Usa chave única: name + stream_url

### 3. Organizar Episódios (Paralelo)
```bash
npm run organize-episodes-parallel
```
- Extrai metadados de séries/temporadas/episódios
- Processa 30 episódios simultaneamente
- Adiciona campos:
  - `metadata.series_name`
  - `metadata.season`
  - `metadata.episode`
  - `metadata.is_episode`

### 4. Corrigir Vinculação de Séries (Paralelo)
```bash
npm run fix-series-parallel
```
- Vincula episódios às categorias corretas
- Processa 30 episódios simultaneamente
- Corrige ~74k episódios em poucos minutos

### 5. Otimização Completa (Paralelo) ⭐
```bash
npm run optimize-all-parallel
```
- Executa TODAS as otimizações em sequência
- Remove duplicados → Organiza episódios → Corrige vinculações
- Usa 30 threads em cada etapa

### 6. Verificar Banco de Dados
```bash
npm run verify-database
```
- Verifica integridade completa do banco
- Mostra estatísticas detalhadas
- Identifica problemas pendentes

### 7. Buscar Episódios com Problemas
```bash
npm run find-failed-episodes
```
- Identifica episódios sem categoria
- Mostra detalhes completos
- Sugere correções

### 8. Corrigir Episódios com Problemas
```bash
npm run fix-failed-episodes
```
- Força correção manual de episódios problemáticos
- Usa categoria fallback quando necessário

## ⚡ Performance

### Antes (Sequencial)
- Correção de séries: ~30-40 minutos
- Organização de episódios: ~20-30 minutos
- Total: ~1 hora

### Depois (30 Threads Paralelos)
- Correção de séries: ~2-3 minutos ✅
- Organização de episódios: ~1-2 minutos ✅
- Total: ~5 minutos ✅

**Ganho de performance: ~12x mais rápido!** 🚀

## 📝 Ordem Recomendada

1. **Análise inicial**
   ```bash
   npm run analyze-duplicates
   ```

2. **Remover duplicados** (se houver)
   ```bash
   npm run remove-duplicates-parallel
   ```

3. **Organizar episódios**
   ```bash
   npm run organize-episodes-parallel
   ```

4. **Corrigir vinculações**
   ```bash
   npm run fix-series-parallel
   ```

**OU simplesmente:**
```bash
npm run optimize-all-parallel
```

## 🔧 Tecnologias

- **p-limit**: Controle de concorrência
- **30 threads paralelos**: Máxima velocidade
- **Supabase**: Banco de dados PostgreSQL
- **TypeScript**: Type safety

## 📈 Resultados Esperados

Após executar `optimize-all-parallel`:
- ✅ 0 duplicados
- ✅ 150k+ episódios organizados
- ✅ 74k+ episódios vinculados às categorias
- ✅ Metadados completos para frontend
- ✅ Tempo total: ~5 minutos

## 🎯 Próximos Passos

Após otimização, você pode:
1. Buscar logos faltantes: `npm run fetch-all-logos-parallel`
2. Sincronizar M3U: `npm run sync-m3u-incremental`
3. Corrigir logos adultos: `npm run fix-adult-logos`
