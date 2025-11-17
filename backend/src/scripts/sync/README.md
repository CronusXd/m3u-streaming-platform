# 📂 Scripts de Sincronização

Esta pasta contém os scripts principais para sincronizar dados do PlayCoreTV.

## 📋 Scripts Disponíveis

### 1️⃣ `1-sync-m3u-full.ts`
**Sincronização COMPLETA da Lista M3U**

**O que faz:**
- ✅ Limpa TODA a tabela IPTV
- ✅ Importa TODOS os itens do arquivo `lista.m3u`
- ✅ Classifica automaticamente (canal/filme/série)
- ✅ Detecta temporadas e episódios
- ✅ Extrai informações EPG (logo, id, número)

**Quando usar:**
- Quando receber uma nova lista M3U
- Quando quiser resetar o banco de dados

**Como executar:**
```bash
npm run sync:m3u
```

**Tempo estimado:** ~2-5 minutos (depende do tamanho da lista)

---

### 2️⃣ `2-fetch-tmdb-logos.ts`
**Buscar Logos Faltantes do TMDB**

**O que faz:**
- ✅ Busca TODOS os filmes e séries SEM `logo_url` no banco (sem limite)
- ✅ Consulta API TMDB para cada um
- ✅ Salva `poster_path` como `logo_url`
- ✅ Usa multi-threading configurável (padrão: 35 req/s)
- ✅ Menu interativo para escolher o que buscar
- ✅ Mostra resumo final detalhado

**Quando usar:**
- Após sincronizar a lista M3U
- Quando quiser atualizar logos faltantes

**Como executar:**
```bash
npm run sync:tmdb
```

**Tempo estimado:** ~5-15 minutos (depende de quantos logos faltam)

**Requisitos:**
- ✅ API Key do TMDB já está configurada no script

---

## 🚀 Fluxo Recomendado

### Primeira Vez / Nova Lista M3U:

```bash
# 1. Sincronizar lista M3U (limpa tudo e importa novos)
npm run sync:m3u

# 2. Buscar logos faltantes do TMDB
npm run sync:tmdb
```

### Atualização Periódica:

```bash
# Apenas buscar logos novos (não limpa o banco)
npm run sync:tmdb
```

---

## 📊 Exemplo de Saída

### Script 1 (M3U):
```
🎬 SINCRONIZAÇÃO COMPLETA M3U
============================================================
📂 Arquivo: /path/to/lista.m3u
📖 Lendo arquivo M3U...
✅ 15000 itens encontrados

📊 Estatísticas:
   📺 Canais: 2500
   🎬 Filmes: 8000
   📺 Séries: 4500

🗑️  Limpando tabela IPTV...
✅ Tabela limpa com sucesso!

💾 Inserindo dados...
   ⏳ Progresso: 100.0% (15000/15000)

============================================================
✅ SINCRONIZAÇÃO CONCLUÍDA!
⏱️  Tempo: 120.5s
📊 Total: 15000 itens
============================================================
```

### Script 2 (TMDB):
```
🖼️  BUSCAR LOGOS FALTANTES DO TMDB
============================================================

✅ TMDB API Key configurada

📊 Analisando banco de dados...

🔍 Buscando filmes sem logo...
🔍 Buscando séries sem logo...

📊 Estatísticas do Banco:
   🎬 Filmes: 8000 (3500 sem logo)
   📺 Séries: 4500 (2000 sem logo)

🎯 O que deseja fazer?
   1 - Apenas ver quantos logos faltam (não buscar)
   2 - Buscar logos de FILMES
   3 - Buscar logos de SÉRIES
   4 - Buscar logos de FILMES + SÉRIES

Digite a opção (1-4): 4

📊 Selecionado: FILMES + SÉRIES (5500 itens)

⚙️  Configurações:
🧵 Número de threads paralelas (padrão: 10): 15
📊 Requisições por segundo (padrão: 35): 40

✅ Configurações:
   🧵 Threads: 15
   📊 Requisições/segundo: 40

🚀 Iniciar busca? (s/n): s

🔍 Buscando logos no TMDB...

   ⏳ Progresso: 100.0% (5500/5500)
      ✅ Encontrados: 4800 | ❌ Não encontrados: 650 | ⚠️  Erros: 50

============================================================
✅ BUSCA CONCLUÍDA!

📊 RESUMO FINAL:
   📺 Total no banco: 12500
   ❌ Faltavam logos: 5500
   ✅ Encontrados: 4800
   ❌ Não encontrados: 650
   ⚠️  Erros: 50
   🔍 Ainda faltam: 700

⏱️  Tempo total: 137.5s
⚡ Taxa: 40.0 req/s
============================================================
```

---

## ⚙️ Configurações

### Rate Limiting (Script 2):
```typescript
const REQUESTS_PER_SECOND = 35;  // Ajuste se necessário
const MAX_CONCURRENT = 10;        // Threads paralelas
```

### Batch Size (Script 1):
```typescript
const BATCH_SIZE = 500;           // Itens por batch
const MAX_CONCURRENT = 5;         // Threads paralelas
```

---

## 🔧 Troubleshooting

### Erro: "Arquivo lista.m3u não encontrado"
**Solução:** Coloque o arquivo `lista.m3u` na raiz do projeto backend.

### Erro: "Rate limit exceeded"
**Solução:** Reduza `REQUESTS_PER_SECOND` no script 2.

### Muitos "Não encontrados"
**Possíveis causas:**
- Nomes muito diferentes do TMDB
- Filmes/séries muito antigos ou obscuros
- Nomes com caracteres especiais

---

## 📝 Notas

- Os scripts usam `SUPABASE_SERVICE_KEY` (não a anon key)
- Logs são salvos no console
- Progresso é mostrado em tempo real
- Scripts podem ser interrompidos com Ctrl+C

---

## 🗑️ Scripts Antigos

Os scripts antigos foram movidos para `backend/src/scripts/old/` para referência.
Use apenas os scripts desta pasta (`sync/`) para sincronização.


---

### 3️⃣ `3-organize-series-hierarchy.ts`
**Organizar Hierarquia de Séries**

**O que faz:**
- ✅ Cria registros principais para cada série
- ✅ Cria registros principais para cada temporada
- ✅ Vincula episódios às temporadas e séries
- ✅ Estrutura: Série → Temporada → Episódio

**Quando usar:**
- Após sincronizar a lista M3U
- Quando quiser organizar séries existentes

**Como executar:**
```bash
npm run sync:organize-series
```

**Tempo estimado:** ~2-5 minutos (depende da quantidade de séries)

---

## 🎯 Fluxo Completo Recomendado

### Primeira Vez / Nova Lista M3U:

```bash
# 1. Sincronizar lista M3U
npm run sync:m3u

# 2. Organizar hierarquia de séries
npm run sync:organize-series

# 3. Buscar logos faltantes do TMDB
npm run sync:tmdb
```

### Atualização Periódica:

```bash
# Apenas buscar logos novos
npm run sync:tmdb
```

---

## 📁 Scripts .bat (Windows)

Para facilitar a execução, use os scripts .bat:

- **run-sync-m3u.bat** - Sincroniza M3U
- **run-organize-series.bat** - Organiza séries
- **run-fetch-logos.bat** - Busca logos

Basta clicar duas vezes no arquivo!

---

## 📚 Documentação Adicional

- **COMO-USAR.md** - Guia completo de uso
- **HIERARQUIA-SERIES.md** - Estrutura de séries
- **RESUMO-IMPLEMENTACAO.md** - Detalhes dos 15 métodos de busca

---

## 🎉 Novidades

### 15 Métodos de Busca TMDB
O script de logos agora usa 15 métodos inteligentes de limpeza de nome:
1. Básico
2. Agressivo
3. Sem artigos
4. Sem palavras comuns
5. Antes de separador
6. Sem números
7. Tradução completa PT→EN
8. Tradução básica PT→EN
9. Tradução sem ano
10. Curto
11. Sem ano
12. Variações
13. Sem pontuação
14. Apenas letras
15. Primeira palavra

**Taxa de sucesso:** 60-70% (antes era 25%)!

### Hierarquia de Séries
Séries agora são organizadas em 3 níveis:
- **Série Principal** - Agrupa todas as temporadas
- **Temporada Principal** - Agrupa todos os episódios
- **Episódio** - Conteúdo real para assistir

**Benefícios:**
- Navegação intuitiva (como Netflix)
- Queries otimizadas
- Metadados TMDB por nível
- Estatísticas precisas

---

**Última atualização:** 16/01/2025
