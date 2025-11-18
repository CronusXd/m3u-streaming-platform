/**
 * Utilitários para URLs de Streams
 * 
 * Com Clappr, não precisamos mais de conversões complexas!
 * Clappr reproduz HTTP/HTTPS sem problemas.
 */

/**
 * Retorna URL do stream (sem conversões)
 * 
 * @param url - URL original do stream
 * @returns URL original (Clappr aceita HTTP/HTTPS)
 * 
 * @example
 * getSecureStreamUrl('http://play.dnsrot.vip/live/...')
 * // → 'http://play.dnsrot.vip/live/...' (sem conversão!)
 */
export function getSecureStreamUrl(url: string | null | undefined): string | null {
  // Validar URL
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Clappr aceita HTTP/HTTPS sem problemas!
  return url;
}

/**
 * Valida se URL é válida
 * 
 * @param url - URL para validar
 * @returns true se URL é válida
 */
export function isValidStreamUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
