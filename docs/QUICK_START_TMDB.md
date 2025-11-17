# 🚀 Quick Start - TMDB em Tempo Real

## ⚡ Início Rápido (5 minutos)

### 1. Configurar API Key

Adicione no `.env`:
```env
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_aqui
```

**Como obter a chave:**
1. Acesse https://www.themoviedb.org/
2. Crie uma conta gratuita
3. Vá em Settings → API
4. Copie a "API Key (v3 auth)"

### 2. Testar o Sistema

```bash
# Iniciar o frontend
cd frontend
npm run dev
```

Acesse:
- http://localhost:3000/dashboard/filmes
- http://localhost:3000/dashboard/series

### 3. Ver os Metadados Carregando

Abra o DevTools (F12) e veja:
- Network → Requisições para `api.themoviedb.org`
- Console → Logs de cache e requisições

## 📊 Como Funciona

```
1. Usuário acessa /dashboard/filmes
   ↓
2. Página busca lista de filmes do Supabase
   ↓
3. Para cada filme, o FilmeCard:
   - Mostra loading spinner
   - Busca metadados no TMDB
   - Atualiza com poster/rating/sinopse
   ↓
4. Cache armazena resultado por 1 hora
```

## 🎯 Exemplos de Uso

### Usar FilmeCard

```tsx
import { FilmeCard } from '@/components/iptv/FilmeCard';

<FilmeCard
  filme={{
    id: '123',
    nome: 'Avatar (2009)',
    tipo: 'filme',
    categoria: 'Ação',
    logo_url: null,
    visualizacoes: 1000
  }}
/>
```

### Usar SerieCard

```tsx
import { SerieCard } from '@/components/iptv/SerieCard';

<SerieCard
  id="456"
  nome="Breaking Bad"
  categoria="Drama"
  logoUrl={null}
  visualizacoes={5000}
/>
```

### Usar Hook Diretamente

```tsx
import { useTMDBMetadata } from '@/hooks/useTMDBMetadata';

function MeuComponente() {
  const { metadata, loading } = useTMDBMetadata('Avatar', 'filme');

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1>{metadata?.title}</h1>
      <img src={metadata?.posterUrl} />
      <p>Rating: {metadata?.rating}/10</p>
    </div>
  );
}
```

## 🔧 Configurações Opcionais

### Ajustar Delay entre Requisições

Em `frontend/src/hooks/useTMDBMetadata.ts`:
```typescript
const BATCH_DELAY = 100; // ms

// Mais rápido (mais carga na API)
const BATCH_DELAY = 50;

// Mais lento (menos carga na API)
const BATCH_DELAY = 200;
```

### Ajustar Duração do Cache

Em `frontend/src/services/tmdbService.ts`:
```typescript
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

// 30 minutos
const CACHE_DURATION = 1000 * 60 * 30;

// 2 horas
const CACHE_DURATION = 1000 * 60 * 120;
```

### Limpar Cache Manualmente

```typescript
import { clearCache } from '@/services/tmdbService';

// Limpar tudo
clearCache();
```

## 📱 Testar Performance

### 1. Abrir DevTools
```
F12 → Network → Throttling → Fast 3G
```

### 2. Ver Loading States
- Cards mostram spinner enquanto carregam
- Imagens aparecem progressivamente
- Cache evita requisições duplicadas

### 3. Verificar Cache
```javascript
// No console do navegador
localStorage.clear(); // Limpar cache do navegador
location.reload(); // Recarregar página
```

## 🎨 Customizar Aparência

### Mudar Cor dos Cards

**FilmeCard (Azul):**
```tsx
// Em FilmeCard.tsx
className="hover:ring-blue-500"  // Mudar para outra cor
className="bg-blue-600"          // Botão de play
```

**SerieCard (Roxo):**
```tsx
// Em SerieCard.tsx
className="hover:ring-purple-500"  // Mudar para outra cor
className="bg-purple-600"          // Badge e botão
```

### Mudar Tamanho dos Posters

```tsx
// Em FilmeCard.tsx ou SerieCard.tsx
<div className="relative aspect-[2/3]">  // Proporção 2:3

// Outras opções:
aspect-[3/4]   // Mais quadrado
aspect-[9/16]  // Mais vertical
aspect-square  // Quadrado perfeito
```

## 🐛 Troubleshooting

### Imagens não aparecem

**Problema:** Next.js bloqueia domínios externos

**Solução:** Adicionar em `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['image.tmdb.org'],
  },
}
```

### Rate limit da API

**Problema:** Muitas requisições ao mesmo tempo

**Solução:** Aumentar delay:
```typescript
const BATCH_DELAY = 200; // 200ms entre requisições
```

### Cache não funciona

**Problema:** Dados não são reutilizados

**Solução:** Verificar chave do cache:
```typescript
// Deve ser única por filme/série
const cacheKey = `movie:${query}:${year || 'no-year'}`;
```

### Loading infinito

**Problema:** Requisição falha silenciosamente

**Solução:** Verificar API key:
```bash
# No terminal
echo $NEXT_PUBLIC_TMDB_API_KEY

# Deve mostrar sua chave
# Se vazio, adicionar no .env
```

## 📊 Monitorar Uso da API

### Ver Requisições no DevTools

```
F12 → Network → Filter: themoviedb.org
```

Você verá:
- `search/movie?query=Avatar` - Busca
- `movie/123?append_to_response=credits,videos` - Detalhes

### Verificar Rate Limit

TMDB permite:
- ✅ 40 requisições por 10 segundos
- ✅ Sem limite diário (plano gratuito)

Com delay de 100ms:
- 10 requisições por segundo
- 600 requisições por minuto
- ✅ Dentro do limite!

## 🎯 Próximos Passos

1. ✅ Sistema funcionando
2. 🔄 Testar com dados reais
3. 🎨 Customizar aparência
4. 🚀 Otimizar performance
5. 📱 Testar em mobile

## 📚 Documentação Completa

Ver `docs/TMDB_REALTIME.md` para:
- Arquitetura detalhada
- Todos os metadados disponíveis
- Otimizações avançadas
- Comparação com sincronização

---

**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil ⭐  
**Resultado:** Sistema completo funcionando! 🎉
