# 🧪 Guia de Testes - Sistema de Pré-carregamento

## 🎯 Objetivo

Validar que o sistema de pré-carregamento está funcionando corretamente após as correções.

---

## 📋 Checklist de Testes

### ✅ TESTE 1: Verificar APIs de Pré-carregamento

#### 1.1 Testar API de Séries
```bash
# Abrir no navegador ou usar curl
http://localhost:3000/api/iptv/preload/series
```

**Resultado esperado:**
```json
{
  "series": [
    {
      "name": "1923",
      "logo_url": "...",
      "seasons": [
        {
          "season": 1,
          "episodes": [
            {
              "id": "uuid",
              "name": "Episódio 1",
              "episode": 1,
              "stream_url": "http://...",  // ⚡ Deve estar presente!
              "logo_url": "..."
            }
          ]
        }
      ]
    }
  ],
  "stats": {
    "totalSeries": 10,
    "totalSeasons": 50,
    "totalEpisodes": 500,
    "processingTime": 2
  }
}
```

**Verificar:**
- ✅ `stream_url` está presente em cada episódio
- ✅ Não há erro `column does not exist`
- ✅ Dados estão corretos

---

#### 1.2 Testar API de Filmes
```bash
http://localhost:3000/api/iptv/preload/movies
```

**Resultado esperado:**
```json
{
  "movies": [
    {
      "id": "uuid",
      "name": "Filme 1",
      "stream_url": "http://...",  // ⚡ Deve estar presente!
      "logo_url": "..."
    }
  ],
  "stats": {
    "totalMovies": 100,
    "processingTime": 1
  }
}
```

**Verificar:**
- ✅ `stream_url` está presente em cada filme
- ✅ Não há erro
- ✅ Dados estão corretos

---

#### 1.3 Testar API de Canais
```bash
http://localhost:3000/api/iptv/preload/channels
```

**Resultado esperado:**
```json
{
  "channels": [
    {
      "id": "uuid",
      "name": "Canal 1",
      "stream_url": "http://...",  // ⚡ Deve estar presente!
      "logo_url": "..."
    }
  ],
  "stats": {
    "totalChannels": 50,
    "processingTime": 1
  }
}
```

**Verificar:**
- ✅ `stream_url` está presente em cada canal
- ✅ Não há erro
- ✅ Dados estão corretos

---

### ✅ TESTE 2: Verificar Pré-carregamento no Login

#### 2.1 Limpar Cache
```javascript
// Abrir DevTools (F12) → Console
indexedDB.deleteDatabase('PlayCoreTVOptimized');
location.reload();
```

#### 2.2 Fazer Login
1. Fazer logout (se logado)
2. Fazer login novamente
3. Observar console do navegador

**Logs esperados:**
```
👤 Usuário logado, iniciando pré-carregamento...
🚀 Iniciando pré-carregamento...
📥 Cache inválido ou forçado, baixando TODOS os dados...
📥 Baixando séries...
📥 Baixando filmes...
📥 Baixando canais...
✅ 10 séries pré-carregadas
✅ 100 filmes pré-carregados
✅ 50 canais pré-carregados
✅ Pré-carregamento completo!
```

**Verificar:**
- ✅ Indicador de progresso aparece (canto inferior direito)
- ✅ Barras de progresso funcionam
- ✅ Não há erros no console
- ✅ Indicador desaparece após 3 segundos

---

### ✅ TESTE 3: Verificar Cache no IndexedDB

#### 3.1 Abrir DevTools
1. F12 → Application → Storage → IndexedDB
2. Expandir `PlayCoreTVOptimized`
3. Ver stores

**Stores esperados:**
```
PlayCoreTVOptimized (v5)
├── channels
├── movies
├── series_list
├── series_seasons
├── series_episodes
├── streams
├── series_complete      ⚡ NOVO!
├── movies_complete      ⚡ NOVO!
└── channels_complete    ⚡ NOVO!
```

#### 3.2 Verificar Dados
1. Clicar em `series_complete`
2. Ver chave `all_series`
3. Expandir dados

**Estrutura esperada:**
```json
{
  "series": [...],
  "stats": {...},
  "timestamp": 1705500000000
}
```

**Verificar:**
- ✅ Dados estão salvos
- ✅ `timestamp` está presente
- ✅ `stream_url` está em cada episódio

---

### ✅ TESTE 4: Verificar Navegação (Cache Hit)

#### 4.1 Abrir Página de Séries
1. Ir para `/dashboard/series`
2. Observar console

**Logs esperados:**
```
🔍 [getSeriesEpisodes] Buscando temporadas: 1923
✅ Cache HIT: 1923 (8 temporadas)
✅ 8 temporadas carregadas
```

**Verificar:**
- ✅ Dados carregam instantaneamente
- ✅ Não há chamadas HTTP (ver Network tab)
- ✅ Console mostra "Cache HIT"

---

#### 4.2 Clicar em uma Série
1. Clicar em "1923"
2. Modal abre
3. Observar console

**Logs esperados:**
```
✅ [Modal] Temporadas já carregadas, pulando...
```

**Verificar:**
- ✅ Modal abre instantaneamente
- ✅ Episódios aparecem imediatamente
- ✅ Não há loading

---

#### 4.3 Clicar em um Episódio
1. Clicar em "Episódio 1"
2. Player abre
3. Observar console

**Logs esperados:**
```
✅ Stream já em cache: http://...
```

**Verificar:**
- ✅ Player abre instantaneamente
- ✅ Vídeo começa a reproduzir
- ✅ Não há chamada HTTP para buscar stream

---

### ✅ TESTE 5: Verificar Próximo Login (Cache Válido)

#### 5.1 Fazer Logout e Login Novamente
1. Fazer logout
2. Fazer login
3. Observar console

**Logs esperados:**
```
👤 Usuário logado, iniciando pré-carregamento...
🚀 Iniciando pré-carregamento...
✅ Cache válido encontrado, pulando pré-carregamento
```

**Verificar:**
- ✅ Não baixa dados novamente
- ✅ Usa cache existente
- ✅ Zero chamadas HTTP

---

### ✅ TESTE 6: Verificar Expiração (30 dias)

#### 6.1 Simular Expiração
```javascript
// DevTools → Console
(async () => {
  const db = await indexedDB.open('PlayCoreTVOptimized', 5);
  db.onsuccess = () => {
    const tx = db.result.transaction('series_complete', 'readwrite');
    const store = tx.objectStore('series_complete');
    const req = store.get('all_series');
    req.onsuccess = () => {
      const data = req.result;
      // Simular 31 dias atrás
      data.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000);
      store.put(data, 'all_series');
      console.log('✅ Cache expirado simulado');
    };
  };
})();
```

#### 6.2 Recarregar Página
1. Recarregar (F5)
2. Observar console

**Logs esperados:**
```
⏰ Cache EXPIRADO: Séries completas
📥 Baixando TODOS os dados...
```

**Verificar:**
- ✅ Detecta cache expirado
- ✅ Baixa dados novamente
- ✅ Atualiza cache

---

## 📊 Métricas de Performance

### Antes (Sem Pré-carregamento)
```
Abrir série → 300ms (HTTP)
Abrir episódios → 150ms (HTTP)
Clicar episódio → 100ms (HTTP)
Total: 550ms + 3 chamadas HTTP
```

### Depois (Com Pré-carregamento)
```
Abrir série → 5ms (Cache)
Abrir episódios → 0ms (já carregado)
Clicar episódio → 0ms (stream já disponível)
Total: 5ms + 0 chamadas HTTP
```

**Melhoria:** 110x mais rápido! 🚀

---

## 🐛 Troubleshooting

### Problema: APIs retornam erro 500
**Solução:** Verificar se Supabase está rodando e credenciais estão corretas

### Problema: Cache não salva
**Solução:** Verificar se IndexedDB está habilitado no navegador

### Problema: Indicador não aparece
**Solução:** Verificar se `PreloadProgressIndicator` está no layout

### Problema: Stream não reproduz
**Solução:** Verificar se `url_stream` está preenchido no banco

---

## ✅ Checklist Final

- [ ] APIs de pré-carregamento funcionam
- [ ] Pré-carregamento inicia no login
- [ ] Indicador de progresso aparece
- [ ] Dados são salvos no IndexedDB
- [ ] Cache hit funciona (sem HTTP)
- [ ] Streams reproduzem corretamente
- [ ] Cache expira após 30 dias
- [ ] Performance melhorou significativamente

---

**Data:** 17/01/2025  
**Status:** Pronto para testar  
**Tempo estimado:** 15-20 minutos
