import type { ConteudoIPTV } from '@/types/iptv';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Obtém a URL do poster com fallback inteligente
 * Prioridade: logo_url → epg_logo → tmdb_poster_path → null
 */
export function getPosterUrl(
  item: ConteudoIPTV,
  size: 'w185' | 'w500' | 'original' = 'w500'
): string | null {
  // 1. Tentar logo_url do banco
  if (item.logo_url) {
    return item.logo_url;
  }
  
  // 2. Tentar epg_logo do banco
  if (item.epg_logo) {
    return item.epg_logo;
  }
  
  // 3. Tentar tmdb_poster_path (se já foi buscado)
  if (item.tmdb_poster_path) {
    return `${TMDB_IMAGE_BASE}/${size}${item.tmdb_poster_path}`;
  }
  
  return null;
}

/**
 * Obtém a URL do backdrop com fallback
 * Prioridade: tmdb_backdrop_path → backdrop_url → null
 */
export function getBackdropUrl(
  item: ConteudoIPTV,
  size: 'w780' | 'w1280' | 'original' = 'original'
): string | null {
  if (item.tmdb_backdrop_path) {
    return `${TMDB_IMAGE_BASE}/${size}${item.tmdb_backdrop_path}`;
  }
  
  return item.backdrop_url || null;
}

/**
 * Obtém a avaliação com fallback
 * Prioridade: tmdb_vote_average → avaliacao → 0
 */
export function getRating(item: ConteudoIPTV): number {
  return item.tmdb_vote_average || item.avaliacao || 0;
}

// Função shouldFetchTMDB removida - TMDB agora busca em tempo real

/**
 * Formata duração em minutos para formato legível
 * Exemplo: 125 → "2h 5min"
 */
export function formatRuntime(minutes: number | undefined | null): string | null {
  if (!minutes || minutes <= 0) return null;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}min`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}min`;
}

/**
 * Extrai o ano de uma data de lançamento
 * Exemplo: "2024-01-15" → "2024"
 */
export function formatReleaseYear(date: string | undefined | null): string | null {
  if (!date) return null;
  
  try {
    const year = new Date(date).getFullYear();
    return isNaN(year) ? null : year.toString();
  } catch {
    return null;
  }
}

/**
 * Trunca texto para um tamanho máximo
 * Adiciona "..." se truncado
 */
export function truncateText(text: string | undefined | null, maxLength: number = 150): string | null {
  if (!text) return null;
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Obtém o título preferencial
 * Prioridade: tmdb_title → nome
 */
export function getTitle(item: ConteudoIPTV): string {
  return item.tmdb_title || item.nome;
}

/**
 * Obtém a sinopse com fallback
 */
export function getOverview(item: ConteudoIPTV): string | null {
  return item.tmdb_overview || null;
}

/**
 * Valida se um array JSONB é válido
 */
export function isValidArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Obtém gêneros formatados como string
 * Exemplo: [{id: 28, name: "Ação"}] → "Ação, Aventura"
 */
export function getGenresString(item: ConteudoIPTV): string | null {
  if (!isValidArray(item.tmdb_genres)) return null;
  
  return item.tmdb_genres.map(g => g.name).join(', ');
}

/**
 * Obtém elenco formatado como string
 * Exemplo: [{name: "Actor"}] → "Actor, Actor2"
 */
export function getCastString(item: ConteudoIPTV, maxActors: number = 5): string | null {
  if (!isValidArray(item.tmdb_cast)) return null;
  
  return item.tmdb_cast
    .slice(0, maxActors)
    .map(c => c.name)
    .join(', ');
}

/**
 * Obtém criadores formatados como string (para séries)
 */
export function getCreatorsString(item: ConteudoIPTV): string | null {
  if (!isValidArray(item.tmdb_created_by)) return null;
  
  return item.tmdb_created_by.map(c => c.name).join(', ');
}
