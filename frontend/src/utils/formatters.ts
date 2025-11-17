/**
 * Utilitários de formatação
 */

/**
 * Limpa o nome do filme/série removendo metadados M3U
 * 
 * Exemplos:
 * "(2024)" tvg-logo="" group-title="Filmes | Drama/Suspense/Romance",Apesar De, (2024)
 * → "Apesar De, (2024)"
 * 
 * "10 (2016)" tvg-logo="" group-title="Filmes | Ficcao/Fantasia",Rua Cloverfield, 10 (2016)
 * → "Rua Cloverfield, 10 (2016)"
 */
export function cleanContentName(name: string): string {
  if (!name) return '';
  
  // Padrão: tudo antes da vírgula final é metadado, depois da vírgula é o nome real
  // Exemplo: '(2024)" tvg-logo="" group-title="...",Apesar De, (2024)'
  
  // Procurar pela última vírgula seguida de texto (que é o nome real)
  const lastCommaMatch = name.match(/,([^,]+)$/);
  
  if (lastCommaMatch) {
    // Pegar tudo após a última vírgula
    return lastCommaMatch[1].trim();
  }
  
  // Fallback: remover tudo após aspas duplas seguidas de espaço
  let cleaned = name.split('" ')[0].trim();
  
  // Remover aspas extras no início e fim
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  
  return cleaned;
}

/**
 * Extrai o ano do nome
 */
export function extractYear(name: string): { cleanName: string; year?: number } {
  const yearMatch = name.match(/\((\d{4})\)/);
  if (yearMatch) {
    return {
      cleanName: name.replace(/\s*\(\d{4}\)\s*/, '').trim(),
      year: parseInt(yearMatch[1]),
    };
  }
  return { cleanName: name };
}

/**
 * Formata duração em minutos para horas e minutos
 */
export function formatRuntime(minutes: number | null): string {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/**
 * Formata avaliação de 0-10 para 0-5 estrelas
 */
export function formatRating(voteAverage: number): number {
  return Math.round((voteAverage / 10) * 5);
}

/**
 * Formata número de visualizações
 */
export function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
}
