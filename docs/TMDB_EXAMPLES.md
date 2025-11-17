# 💡 Exemplos Práticos - TMDB em Tempo Real

## 🎯 Casos de Uso Comuns

### 1. Card Simples de Filme

```tsx
import { FilmeCard } from '@/components/iptv/FilmeCard';

export default function MinhaLista() {
  const filmes = [
    {
      id: '1',
      nome: 'Avatar (2009)',
      tipo: 'filme',
      categoria: 'Ação',
      logo_url: null,
     