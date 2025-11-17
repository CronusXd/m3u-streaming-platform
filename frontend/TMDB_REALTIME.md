# 🎬 Sistema TMDB em Tempo Real

## 📋 Visão Geral

O sistema agora busca metadados do TMDB (The Movie Database) **em tempo real** diretamente no frontend, sem necessidade de sincronização prévia no banco de dados.

## ✨ Funcionalidades

### 🔄 Busca Automática
- Quando um filme ou série é exibido, o sistema automaticamente busca seus metadados no TMDB
- Cache em memória evita requisições duplicadas
- Extração inteligente de ano do nome (ex: "Filme (2023)")

### 📊 Metadados Disponíveis

#### Filmes
- ✅ Título original e traduzido
- ✅ Sinopse em português
- ✅ Poster em alta qualidade (500px)
- ✅ Backdrop/Banner
- ✅ Nota (rating) e votos
- ✅ Data de lançamento
- ✅ Duração (runtime)
- ✅ Gêneros
- ✅ Trailer (YouTube key)
- ✅ Elenco (top 5)
- ✅ Diretor

#### Séries
- ✅ Título original e traduzido
- ✅ Sinopse em português
- ✅ Poster em alta qualidade
- ✅ Backdrop/Banner
- ✅ Nota (rating) e votos
- ✅ Data de estreia
- ✅ Número de temporadas
- ✅ Número de episódios
- ✅ Trailer (YouTube key)
- ✅ Criadores

## 🎨 Componentes

### FilmeCard
```tsx
import { FilmeCard } from '@/components/iptv/FilmeCard';

<FilmeCard
  filme={filme}
  onClick={() => handleClick(filme)}
/>
```

**Recursos:**
- Poster do TMDB ou logo fallback
- Rating com estrela
- Ano de lançamento
- Sinopse (2 linhas)
- Contador de visualizações
- Hover com botões de ação
- Loading state

### SerieCard
```tsx
import { SerieCard } from '@/components/iptv/SerieCard';

<SerieCard
  serie={serie}
  onClick={() => handleClick(serie)}
/>
```

**Recursos:**
- Badge "SÉRIE"
- Informação de temporada/episódio
- Cor roxa (diferenciação visual)
- Todos os recursos do FilmeCard

### CanalCard
```tsx
import { CanalCard } from '@/components/iptv/CanalCard';

<CanalCard
  canal={canal}
  onClick={() => handleClick(canal)}
/>
```

**Recursos:**
- Badge "AO VIVO" animado
- Número do canal
- Logo do EPG
- Cor verde (diferenciação visual)
- Aspect ratio 16:9

## 🔧 Hook Customizado

### useTMDBMetadata

```tsx
import { useTMDBMetadata } from '@/hooks/useTMDBMetadata';

const { metadata, loading, error, posterUrl, backdropUrl } = useTMDBMetadata(
  'Nome do Filme (2023)',
  'filme' // ou 'serie' ou 'canal'
);
```

**Retorno:**
```typescript
{
  metadata: {
    title: string;
    overview: string;
    rating: number;
    releaseDate: string;
    posterUrl: string | null;
    backdropUrl: string | null;
    genres: string[];
    runtime?: number;
    trailerKey?: string | null;
  } | null;
  loading: boolean;
  error: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
}
```

## 🚀 Performance

### Cache em Memória
```typescript
const metadataCache = new Map<string, TMDBMetadata>();
```

- Armazena resultados em memória
- Evita requisições duplicadas
- Chave: `tipo:nome` (ex: `filme:Matrix (1999)`)
- Válido durante a sessão do navegador

### Otimizações
- ✅ Requisições paralelas (múltiplos cards carregam simultaneamente)
- ✅ Cache automático
- ✅ Fallback para logo original se TMDB falhar
- ✅ Loading states individuais por card
- ✅ Error handling silencioso

## 📝 Configuração

### Variável de Ambiente
```env
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_aqui
```

### Obter API Key
1. Acesse https://www.themoviedb.org/
2. Crie uma conta
3. Vá em Settings > API
4. Solicite uma API Key (gratuita)
5. Adicione no `.env`

## 🎯 Vantagens

### ✅ Tempo Real
- Sem necessidade de sincronização prévia
- Dados sempre atualizados
- Novos filmes/séries funcionam imediatamente

### ✅ Simplicidade
- Não precisa de script de sincronização
- Não ocupa espaço no banco de dados
- Menos complexidade no backend

### ✅ Escalabilidade
- Cache em memória é rápido
- TMDB tem rate limit generoso (40 req/10s)
- Funciona com 165k+ itens sem problemas

### ✅ Manutenção
- Menos código para manter
- Sem jobs de sincronização
- Sem preocupação com dados desatualizados

## 🔄 Fluxo de Dados

```
1. Usuário acessa página de filmes
   ↓
2. Componente FilmeCard renderiza
   ↓
3. Hook useTMDBMetadata é chamado
   ↓
4. Verifica cache em memória
   ↓
5a. Se encontrado: retorna imediatamente
5b. Se não encontrado: busca no TMDB
   ↓
6. Extrai ano do nome (se houver)
   ↓
7. Busca no TMDB com nome + ano
   ↓
8. Busca detalhes completos (poster, sinopse, etc)
   ↓
9. Armazena no cache
   ↓
10. Retorna para o componente
   ↓
11. Card exibe com metadados
```

## 🎨 Exemplos de Uso

### Página de Filmes
```tsx
export default function FilmesPage() {
  const [filmes, setFilmes] = useState<FilmeIPTV[]>([]);

  return (
    <div className="grid grid-cols-6 gap-4">
      {filmes.map((filme) => (
        <FilmeCard
          key={filme.id}
          filme={filme}
          onClick={() => handlePlay(filme)}
        />
      ))}
    </div>
  );
}
```

### Página de Séries
```tsx
export default function SeriesPage() {
  const [series, setSeries] = useState<SerieIPTV[]>([]);

  return (
    <div className="grid grid-cols-6 gap-4">
      {series.map((serie) => (
        <SerieCard
          key={serie.id}
          serie={serie}
          onClick={() => handlePlay(serie)}
        />
      ))}
    </div>
  );
}
```

## 🐛 Troubleshooting

### Metadados não aparecem
1. Verifique se `NEXT_PUBLIC_TMDB_API_KEY` está configurada
2. Abra o console do navegador para ver erros
3. Verifique se o nome do filme/série está correto

### Imagens não carregam
1. Verifique se o TMDB retornou `poster_path`
2. Verifique se a URL está correta
3. Fallback para logo original deve funcionar

### Performance lenta
1. Verifique rate limit do TMDB (40 req/10s)
2. Cache deve resolver na segunda visualização
3. Considere implementar cache persistente (localStorage)

## 🔮 Melhorias Futuras

### Cache Persistente
```typescript
// Salvar no localStorage
localStorage.setItem(`tmdb:${cacheKey}`, JSON.stringify(metadata));

// Carregar do localStorage
const cached = localStorage.getItem(`tmdb:${cacheKey}`);
```

### Pré-carregamento
```typescript
// Pré-carregar metadados dos primeiros 20 itens
useEffect(() => {
  filmes.slice(0, 20).forEach(filme => {
    useTMDBMetadata(filme.nome, 'filme');
  });
}, [filmes]);
```

### Service Worker
- Cache de imagens offline
- Sincronização em background
- PWA support

## 📚 Referências

- [TMDB API Docs](https://developers.themoviedb.org/3)
- [Next.js Image Optimization](https://nextjs.org/docs/api-reference/next/image)
- [React Hooks](https://react.dev/reference/react)

---

**Criado em:** 16/01/2025  
**Versão:** 1.0.0  
**Mantido por:** Equipe PlayCoreTV
