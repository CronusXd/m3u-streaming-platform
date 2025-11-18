# 🧪 Como Testar a Correção do Sistema de Cache

## 🎯 Objetivo

Verificar que o sistema **SEMPRE funciona**, independente do pré-carregamento no login.

---

## 🧹 Preparação

### 1. Limpar Cache Existente

Abra o **Console do Navegador** (F12) e execute:

```javascript
// Limpar IndexedDB
indexedDB.deleteDatabase('PlayCoreTVOptimized');

// Recarregar página
location.reload();
```

**Resultado esperado:**
- ✅ Cache limpo
- ✅ Página recarregada

---

## 🧪 Testes

### Teste 1: Página de Séries (Sem Pré-carregamento)

**Objetivo:** Verificar que séries baixam automaticamente

**Passos:**
1. Limpar cache (ver Preparação)
2. Fazer login
3. **NÃO aguardar** pré-carregamento
4. Clicar em "Séries" imediatamente

**Resultado esperado:**
```
Console:
📺 Verificando cache de séries...
⚠️ Cache vazio ou inválido, baixando séries...
📡 Buscando da API de pré-carregamento...
💾 Salvando no cache (30 dias)...
✅ 3500 séries baixadas e salvas no cache
```

**Tela:**
- ✅ Loading por 2-5 segundos
- ✅ Séries aparecem organizadas
- ✅ Categorias na sidebar

---

### Teste 2: Página de Séries (Com Cache)

**Objetivo:** Verificar que cache funciona

**Passos:**
1. Após Teste 1, recarregar página (F5)
2. Clicar em "Séries"

**Resultado esperado:**
```
Console:
📺 Verificando cache de séries...
✅ 3500 séries do CACHE
```

**Tela:**
- ✅ Séries aparecem instantaneamente (< 100ms)
- ✅ Sem loading
- ✅ Zero chamadas HTTP

---

### Teste 3: Página de Filmes (Sem Pré-carregamento)

**Objetivo:** Verificar que filmes baixam automaticamente

**Passos:**
1. Limpar cache (ver Preparação)
2. Fazer login
3. **NÃO aguardar** pré-carregamento
4. Clicar em "Filmes" imediatamente

**Resultado esperado:**
```
Console:
🎬 Verificando cache de filmes...
⚠️ Cache vazio ou inválido, baixando filmes...
📡 Buscando da API de pré-carregamento...
💾 Salvando no cache (30 dias)...
✅ 11387 filmes baixados e salvos no cache
```

**Tela:**
- ✅ Loading por 2-5 segundos
- ✅ Filmes aparecem organizados
- ✅ Categorias na sidebar

---

### Teste 4: Página de Filmes (Com Cache)

**Objetivo:** Verificar que cache funciona

**Passos:**
1. Após Teste 3, recarregar página (F5)
2. Clicar em "Filmes"

**Resultado esperado:**
```
Console:
🎬 Verificando cache de filmes...
✅ 11387 filmes do CACHE
```

**Tela:**
- ✅ Filmes aparecem instantaneamente (< 100ms)
- ✅ Sem loading
- ✅ Zero chamadas HTTP

---

### Teste 5: Página de TV ao Vivo (Sem Pré-carregamento)

**Objetivo:** Verificar que canais baixam automaticamente

**Passos:**
1. Limpar cache (ver Preparação)
2. Fazer login
3. **NÃO aguardar** pré-carregamento
4. Clicar em "TV ao Vivo" imediatamente

**Resultado esperado:**
```
Console:
📺 Verificando cache de canais...
⚠️ Cache vazio ou inválido, baixando canais...
📡 Buscando da API de pré-carregamento...
💾 Salvando no cache (30 dias)...
✅ 2637 canais baixados e salvos no cache
```

**Tela:**
- ✅ Loading por 2-5 segundos
- ✅ Canais aparecem organizados
- ✅ Categorias na sidebar

---

### Teste 6: Página de TV ao Vivo (Com Cache)

**Objetivo:** Verificar que cache funciona

**Passos:**
1. Após Teste 5, recarregar página (F5)
2. Clicar em "TV ao Vivo"

**Resultado esperado:**
```
Console:
📺 Verificando cache de canais...
✅ 2637 canais do CACHE
```

**Tela:**
- ✅ Canais aparecem instantaneamente (< 100ms)
- ✅ Sem loading
- ✅ Zero chamadas HTTP

---

### Teste 7: Reprodução de Episódio (Com Cache)

**Objetivo:** Verificar que streams vêm do cache

**Passos:**
1. Após Teste 2 (séries em cache)
2. Clicar em uma série
3. Clicar em um episódio

**Resultado esperado:**
```
Console:
✅ Cache HIT: Nome da Série (X temporadas)
✅ Stream encontrado no cache de pré-carregamento
✅ Reproduzindo episódio: S01E01
```

**Tela:**
- ✅ Modal abre instantaneamente
- ✅ Episódios aparecem organizados
- ✅ Player inicia imediatamente
- ✅ Zero delay

---

### Teste 8: Reprodução de Filme (Com Cache)

**Objetivo:** Verificar que streams vêm do cache

**Passos:**
1. Após Teste 4 (filmes em cache)
2. Clicar em um filme

**Resultado esperado:**
```
Console:
✅ 11387 filmes do CACHE
✅ Stream do cache de pré-carregamento
```

**Tela:**
- ✅ Modal abre instantaneamente
- ✅ Player inicia imediatamente
- ✅ Zero delay

---

### Teste 9: Reprodução de Canal (Com Cache)

**Objetivo:** Verificar que streams vêm do cache

**Passos:**
1. Após Teste 6 (canais em cache)
2. Clicar em um canal

**Resultado esperado:**
```
Console:
✅ 2637 canais do CACHE
✅ Stream do cache de pré-carregamento
```

**Tela:**
- ✅ Player inicia imediatamente
- ✅ Zero delay

---

### Teste 10: Navegação Offline

**Objetivo:** Verificar que funciona sem internet

**Passos:**
1. Após qualquer teste com cache válido
2. Desconectar internet (modo avião)
3. Navegar entre Séries/Filmes/Canais
4. Tentar reproduzir mídia

**Resultado esperado:**
```
Console:
✅ 3500 séries do CACHE
✅ 11387 filmes do CACHE
✅ 2637 canais do CACHE
✅ Stream do cache de pré-carregamento
```

**Tela:**
- ✅ Navegação funciona normalmente
- ✅ Reprodução funciona normalmente
- ✅ Zero erros de rede

---

### Teste 11: Pré-carregamento no Login (Cenário Ideal)

**Objetivo:** Verificar que pré-carregamento ainda funciona

**Passos:**
1. Limpar cache (ver Preparação)
2. Fazer login
3. **Aguardar** pré-carregamento completo (2-5s)
4. Navegar entre páginas

**Resultado esperado:**
```
Console (durante login):
🚀 Iniciando pré-carregamento...
📺 Baixando séries...
✅ 3500 séries pré-carregadas
🎬 Baixando filmes...
✅ 11387 filmes pré-carregados
📺 Baixando canais...
✅ 2637 canais pré-carregados
✅ Pré-carregamento completo!

Console (ao navegar):
✅ 3500 séries do CACHE
✅ 11387 filmes do CACHE
✅ 2637 canais do CACHE
```

**Tela:**
- ✅ Indicador de progresso (canto inferior direito)
- ✅ Navegação instantânea após pré-carregamento
- ✅ Zero loading nas páginas

---

## 🔍 Verificação de Cache

### Verificar IndexedDB

**Console do Navegador:**
```javascript
// Listar databases
indexedDB.databases().then(dbs => {
  console.log('Databases:', dbs);
  // Deve mostrar: PlayCoreTVOptimized
});
```

### Verificar Dados no Cache

**Console do Navegador:**
```javascript
// Importar cache
const cache = await import('/lib/cache/optimized-cache');

// Verificar séries
const series = await cache.optimizedCache.getAllSeriesWithStreams();
console.log('Séries:', series?.series?.length || 0);

// Verificar filmes
const movies = await cache.optimizedCache.getAllMoviesWithStreams();
console.log('Filmes:', movies?.movies?.length || 0);

// Verificar canais
const channels = await cache.optimizedCache.getAllChannelsWithStreams();
console.log('Canais:', channels?.channels?.length || 0);
```

**Resultado esperado:**
```
Séries: 3500
Filmes: 11387
Canais: 2637
```

### Verificar Idade do Cache

**Console do Navegador:**
```javascript
const cache = await import('/lib/cache/optimized-cache');
const series = await cache.optimizedCache.getAllSeriesWithStreams();

if (series) {
  const age = Date.now() - series.timestamp;
  const days = Math.floor(age / (1000 * 60 * 60 * 24));
  console.log(`Cache age: ${days} dias`);
  console.log(`Válido: ${days < 30 ? 'SIM' : 'NÃO'}`);
}
```

---

## ✅ Checklist de Validação

### Funcionalidade Básica
- [ ] Séries baixam automaticamente quando cache vazio
- [ ] Filmes baixam automaticamente quando cache vazio
- [ ] Canais baixam automaticamente quando cache vazio
- [ ] Cache persiste por 30 dias
- [ ] Navegação instantânea com cache válido

### Reprodução de Mídia
- [ ] Episódios reproduzem com stream do cache
- [ ] Filmes reproduzem com stream do cache
- [ ] Canais reproduzem com stream do cache
- [ ] Zero delay na reprodução
- [ ] Zero chamadas HTTP para streams

### Resiliência
- [ ] Funciona sem pré-carregamento no login
- [ ] Funciona com pré-carregamento no login
- [ ] Funciona offline (com cache válido)
- [ ] Fallback automático transparente
- [ ] Sem erros no console

### Performance
- [ ] Navegação < 100ms (com cache)
- [ ] Reprodução instantânea (0ms)
- [ ] Zero chamadas HTTP (com cache)
- [ ] Cache persiste entre sessões
- [ ] Cache persiste após reload

---

## 🐛 Troubleshooting

### Problema: Cache não salva

**Sintomas:**
- "0 séries salvas"
- Pré-carregamento roda sempre

**Solução:**
```javascript
// 1. Verificar quota do IndexedDB
navigator.storage.estimate().then(quota => {
  console.log('Storage:', quota);
});

// 2. Limpar cache corrompido
indexedDB.deleteDatabase('PlayCoreTVOptimized');
location.reload();
```

---

### Problema: Séries não aparecem

**Sintomas:**
- Página vazia
- "Cache vazio - aguarde"

**Solução:**
```javascript
// 1. Verificar se API está funcionando
fetch('/api/iptv/preload/series')
  .then(r => r.json())
  .then(d => console.log('API OK:', d.series.length));

// 2. Forçar download
const cache = await import('/lib/cache/optimized-cache');
const response = await fetch('/api/iptv/preload/series');
const data = await response.json();
await cache.optimizedCache.saveAllSeriesWithStreams(data);
console.log('Salvo:', data.series.length);
```

---

### Problema: Streams não reproduzem

**Sintomas:**
- "Stream não encontrado"
- Player não inicia

**Solução:**
```javascript
// 1. Verificar se streams estão no cache
const cache = await import('/lib/cache/optimized-cache');
const channels = await cache.optimizedCache.getAllChannelsWithStreams();
const canal = channels.channels[0];
console.log('Stream URL:', canal.stream_url);

// 2. Verificar se stream_url existe
if (!canal.stream_url) {
  console.error('❌ Stream não incluído no cache');
  // Recarregar cache
  indexedDB.deleteDatabase('PlayCoreTVOptimized');
  location.reload();
}
```

---

## 🎉 Resultado Esperado

Após todos os testes:

```
✅ Sistema funciona SEMPRE
✅ Com ou sem pré-carregamento
✅ Navegação instantânea
✅ Reprodução imediata
✅ Funciona offline
✅ Zero erros
✅ Experiência premium
```

---

**Data:** 17/01/2025  
**Status:** ✅ PRONTO PARA TESTE  
**Tempo estimado:** 15-20 minutos
