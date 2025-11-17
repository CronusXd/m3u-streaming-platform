// Serviço para buscar dados do TMDB em tempo real
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Verificar se TMDB está habilitado
const TMDB_ENABLED = TMDB_API_KEY && TMDB_API_KEY.length > 0;

if (!TMDB_ENABLED) {
  console.warn('⚠️ TMDB API Key não configurada. Metadados de filmes/séries não serão buscados.');
  console.warn('Configure NEXT_PUBLIC_TMDB_API_KEY no .env.local para habilitar.');
}

// Cache em memória para evitar requisições duplicadas
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  vote_count: number;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string }>;
  };
  videos?: {
    results: Array<{ key: string; type: string; site: string }>;
  };
}

interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  vote_count: number;
  number_of_seasons: number;
  number_of_episodes: number;
  created_by: Array<{ id: number; name: string }>;
  videos?: {
    results: Array<{ key: string; type: string; site: string }>;
  };
}

// ========================================
// 15 MÉTODOS DE LIMPEZA DE NOME
// ========================================

// Extrair ano do nome
function extractYear(name: string): { cleanName: string; year?: number } {
  const yearMatch = name.match(/\((\d{4})\)/);
  if (yearMatch) {
    return {
      cleanName: name.replace(/\s*\(\d{4}\)\s*/, '').trim(),
      year: parseInt(yearMatch[1]),
    };
  }
  return { cleanName: name };
}

// MÉTODO 1: Limpeza Básica
function cleanNameBasic(nome: string): string {
  let clean = nome;
  clean = clean.replace(/\(\d{4}\)/g, '');
  clean = clean.replace(/\[\d{4}\]/g, '');
  clean = clean.replace(/\b(HD|4K|1080p|720p|480p|BluRay|WEB-DL|WEBRip|DVDRip|BRRip|HDTV)\b/gi, '');
  const lastQuoteIndex = clean.lastIndexOf('"');
  if (lastQuoteIndex > 0) {
    const afterQuote = clean.substring(lastQuoteIndex + 1);
    if (afterQuote.includes(',')) {
      clean = afterQuote.substring(afterQuote.indexOf(',') + 1).trim();
    } else {
      clean = afterQuote.trim();
    }
  }
  clean = clean.replace(/[_\-\.]+/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// MÉTODO 2: Limpeza Agressiva
function cleanNameAggressive(nome: string): string {
  let clean = nome;
  clean = clean.split(/[\(\[\{]/)[0];
  clean = clean.replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, ' ');
  clean = clean.replace(/\b(dublado|legendado|dual|audio|nacional|completo|temporada|episodio)\b/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// MÉTODO 3: Apenas Título Principal
function cleanNameShort(nome: string): string {
  let clean = cleanNameBasic(nome);
  const words = clean.split(' ').filter((w) => w.length > 0);
  if (words.length > 4) {
    clean = words.slice(0, 4).join(' ');
  }
  return clean;
}

// MÉTODO 4: Remover Números e Temporadas
function cleanNameNoNumbers(nome: string): string {
  let clean = cleanNameAggressive(nome);
  clean = clean.replace(/\b[Ss]\d+[Ee]\d+\b/g, '');
  clean = clean.replace(/\b\d+x\d+\b/g, '');
  clean = clean.replace(/\btemporada\s*\d+\b/gi, '');
  clean = clean.replace(/\bepisodio\s*\d+\b/gi, '');
  clean = clean.replace(/\s+\d+\s*$/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// MÉTODO 5: Tradução Comum PT→EN
function cleanNameTranslate(nome: string): string {
  let clean = cleanNameBasic(nome);
  const translations: { [key: string]: string } = {
    'homem aranha': 'spider man',
    'homem de ferro': 'iron man',
    'capitao america': 'captain america',
    'vingadores': 'avengers',
    'guardioes da galaxia': 'guardians of the galaxy',
    'pantera negra': 'black panther',
    'viuva negra': 'black widow',
    'doutor estranho': 'doctor strange',
    'liga da justica': 'justice league',
    'esquadrao suicida': 'suicide squad',
    'mulher maravilha': 'wonder woman',
    'velozes e furiosos': 'fast and furious',
    'senhor dos aneis': 'lord of the rings',
    'guerra nas estrelas': 'star wars',
  };
  const cleanLower = clean.toLowerCase();
  for (const [pt, en] of Object.entries(translations)) {
    if (cleanLower.includes(pt)) {
      clean = en;
      break;
    }
  }
  return clean;
}

// MÉTODO 6: Remover Após Separador
function cleanNameBeforeSeparator(nome: string): string {
  let clean = cleanNameBasic(nome);
  if (clean.includes(':')) {
    clean = clean.split(':')[0].trim();
  } else if (clean.includes(' - ')) {
    clean = clean.split(' - ')[0].trim();
  }
  return clean;
}

// MÉTODO 7: Apenas Letras
function cleanNameLettersOnly(nome: string): string {
  let clean = nome;
  clean = clean.split(/[\d\(\[\{]/)[0];
  clean = clean.replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ');
  const words = clean.split(' ').filter((w) => w.length >= 3);
  clean = words.join(' ');
  const mainWords = clean.split(' ').slice(0, 3);
  clean = mainWords.join(' ');
  return clean.trim();
}

// MÉTODO 8: Sem Ano
function cleanNameNoYear(nome: string): string {
  let clean = cleanNameAggressive(nome);
  clean = clean.replace(/\b(19|20)\d{2}\b/g, '');
  return clean.trim();
}

// MÉTODO 9: Sem Artigos
function cleanNameNoArticles(nome: string): string {
  let clean = cleanNameBasic(nome);
  clean = clean.replace(/^(The|A|An|O|A|Os|As)\s+/gi, '');
  return clean.trim();
}

// MÉTODO 10: Tradução Completa PT→EN
function cleanNameFullTranslate(nome: string): string {
  let clean = cleanNameBasic(nome);
  const translations: { [key: string]: string } = {
    'homem aranha': 'spider man',
    'homem de ferro': 'iron man',
    'capitao america': 'captain america',
    'capitão américa': 'captain america',
    'vingadores': 'avengers',
    'guardioes da galaxia': 'guardians of the galaxy',
    'guardiões da galáxia': 'guardians of the galaxy',
    'pantera negra': 'black panther',
    'viuva negra': 'black widow',
    'viúva negra': 'black widow',
    'doutor estranho': 'doctor strange',
    'liga da justica': 'justice league',
    'liga da justiça': 'justice league',
    'esquadrao suicida': 'suicide squad',
    'esquadrão suicida': 'suicide squad',
    'mulher maravilha': 'wonder woman',
    'senhor dos aneis': 'lord of the rings',
    'senhor dos anéis': 'lord of the rings',
    'guerra nas estrelas': 'star wars',
    'de volta para o futuro': 'back to the future',
    'o poderoso chefao': 'the godfather',
    'o poderoso chefão': 'the godfather',
    'clube da luta': 'fight club',
    'a origem': 'inception',
    'interestelar': 'interstellar',
    'coracao valente': 'braveheart',
    'coração valente': 'braveheart',
    'casa de papel': 'money heist',
    'la casa de papel': 'money heist',
    'velozes e furiosos': 'fast and furious',
    'duro de matar': 'die hard',
    'missao impossivel': 'mission impossible',
    'missão impossível': 'mission impossible',
    'rei leao': 'lion king',
    'rei leão': 'lion king',
    'procurando nemo': 'finding nemo',
  };
  const cleanLower = clean.toLowerCase();
  for (const [pt, en] of Object.entries(translations)) {
    if (cleanLower.includes(pt)) {
      clean = en;
      break;
    }
  }
  return clean;
}

// MÉTODO 11: Variações de Escrita
function cleanNameVariations(nome: string): string {
  let clean = cleanNameBasic(nome);
  clean = clean.replace(/-/g, '');
  clean = clean.replace(/\s+/g, '');
  return clean.trim();
}

// MÉTODO 12: Primeira Palavra
function cleanNameFirstWord(nome: string): string {
  let clean = cleanNameAggressive(nome);
  const words = clean.split(' ').filter((w) => w.length > 3);
  if (words.length > 0) {
    return words[0];
  }
  return clean.split(' ')[0] || clean;
}

// MÉTODO 13: Tradução Sem Ano
function cleanNameEnglishNoYear(nome: string): string {
  let clean = cleanNameFullTranslate(nome);
  clean = clean.replace(/\b(19|20)\d{2}\b/g, '');
  return clean.trim();
}

// MÉTODO 14: Sem Palavras Comuns
function cleanNameNoCommonWords(nome: string): string {
  let clean = cleanNameBasic(nome);
  const palavrasRemover = [
    'dublado',
    'legendado',
    'dual',
    'audio',
    'nacional',
    'completo',
    'temporada',
    'episodio',
    'episódio',
    'season',
    'episode',
    'hd',
    '4k',
    '1080p',
    '720p',
    'bluray',
    'web-dl',
    'webrip',
    'dvdrip',
    'brrip',
    'hdtv',
    'extended',
    'unrated',
    'directors cut',
    'remastered',
    'special edition',
    'ultimate edition',
  ];
  const regex = new RegExp(`\\b(${palavrasRemover.join('|')})\\b`, 'gi');
  clean = clean.replace(regex, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// MÉTODO 15: Sem Pontuação
function cleanNameNoPunctuation(nome: string): string {
  let clean = cleanNameBasic(nome);
  clean = clean.replace(/[^\w\s]/gi, ' ');
  clean = clean.replace(/\d+/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter((w) => w.length > 2);
  if (words.length > 3) {
    clean = words.slice(0, 3).join(' ');
  } else {
    clean = words.join(' ');
  }
  return clean;
}

// Buscar filme no TMDB com 15 métodos de limpeza
export async function searchMovie(query: string, year?: number): Promise<TMDBMovie | null> {
  // Se TMDB não está habilitado, retornar null silenciosamente
  if (!TMDB_ENABLED) {
    return null;
  }

  try {
    const cacheKey = `movie:${query}:${year || 'no-year'}`;
    
    // Verificar cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Array de métodos (do mais confiável ao mais agressivo)
    const metodos = [
      cleanNameBasic(query),
      cleanNameAggressive(query),
      cleanNameNoArticles(query),
      cleanNameNoCommonWords(query),
      cleanNameBeforeSeparator(query),
      cleanNameNoNumbers(query),
      cleanNameFullTranslate(query),
      cleanNameTranslate(query),
      cleanNameEnglishNoYear(query),
      cleanNameShort(query),
      cleanNameNoYear(query),
      cleanNameVariations(query),
      cleanNameNoPunctuation(query),
      cleanNameLettersOnly(query),
      cleanNameFirstWord(query),
    ];

    // Testar cada método sequencialmente
    for (let i = 0; i < metodos.length; i++) {
      const nomeClean = metodos[i];
      if (!nomeClean || nomeClean.length < 2) continue;

      // Evitar nomes duplicados
      const nomesJaTestados = metodos.slice(0, i);
      if (nomesJaTestados.includes(nomeClean)) continue;

      const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query: nomeClean,
        language: 'pt-BR',
        include_adult: 'false',
      });

      if (year) {
        params.append('year', year.toString());
      }

      const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const movieDetails = await getMovieDetails(data.results[0].id);
        
        // Salvar no cache
        cache.set(cacheKey, { data: movieDetails, timestamp: Date.now() });
        
        console.log(`✅ Filme encontrado com método ${i + 1}: "${nomeClean}"`);
        return movieDetails;
      }
    }

    console.log(`❌ Filme não encontrado após 15 métodos: "${query}"`);
    return null;
  } catch (error) {
    console.error('Erro ao buscar filme:', error);
    return null;
  }
}

// Buscar série no TMDB com 15 métodos de limpeza
export async function searchSeries(query: string, year?: number): Promise<TMDBSeries | null> {
  // Se TMDB não está habilitado, retornar null silenciosamente
  if (!TMDB_ENABLED) {
    return null;
  }

  try {
    const cacheKey = `series:${query}:${year || 'no-year'}`;
    
    // Verificar cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // Array de métodos (do mais confiável ao mais agressivo)
    const metodos = [
      cleanNameBasic(query),
      cleanNameAggressive(query),
      cleanNameNoArticles(query),
      cleanNameNoCommonWords(query),
      cleanNameBeforeSeparator(query),
      cleanNameNoNumbers(query),
      cleanNameFullTranslate(query),
      cleanNameTranslate(query),
      cleanNameEnglishNoYear(query),
      cleanNameShort(query),
      cleanNameNoYear(query),
      cleanNameVariations(query),
      cleanNameNoPunctuation(query),
      cleanNameLettersOnly(query),
      cleanNameFirstWord(query),
    ];

    // Testar cada método sequencialmente
    for (let i = 0; i < metodos.length; i++) {
      const nomeClean = metodos[i];
      if (!nomeClean || nomeClean.length < 2) continue;

      // Evitar nomes duplicados
      const nomesJaTestados = metodos.slice(0, i);
      if (nomesJaTestados.includes(nomeClean)) continue;

      const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query: nomeClean,
        language: 'pt-BR',
        include_adult: 'false',
      });

      if (year) {
        params.append('first_air_date_year', year.toString());
      }

      const response = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const seriesDetails = await getSeriesDetails(data.results[0].id);
        
        // Salvar no cache
        cache.set(cacheKey, { data: seriesDetails, timestamp: Date.now() });
        
        console.log(`✅ Série encontrada com método ${i + 1}: "${nomeClean}"`);
        return seriesDetails;
      }
    }

    console.log(`❌ Série não encontrada após 15 métodos: "${query}"`);
    return null;
  } catch (error) {
    console.error('Erro ao buscar série:', error);
    return null;
  }
}

// Detalhes do filme
async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'pt-BR',
    append_to_response: 'credits,videos',
  });

  const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?${params}`);
  return response.json();
}

// Detalhes da série
async function getSeriesDetails(seriesId: number): Promise<TMDBSeries> {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'pt-BR',
    append_to_response: 'videos',
  });

  const response = await fetch(`${TMDB_BASE_URL}/tv/${seriesId}?${params}`);
  return response.json();
}

// Buscar metadados para um item IPTV
export async function getIPTVMetadata(nome: string, tipo: 'filme' | 'serie') {
  const { cleanName, year } = extractYear(nome);

  if (tipo === 'filme') {
    const movie = await searchMovie(cleanName, year);
    if (!movie) return null;

    return {
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview,
      posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      director: movie.credits?.crew?.find((person) => person.job === 'Director')?.name,
      cast: movie.credits?.cast?.slice(0, 5).map((person) => ({
        name: person.name,
        character: person.character,
        profileUrl: person.profile_path ? `${TMDB_IMAGE_BASE}/w185${person.profile_path}` : null,
      })),
      trailerKey: movie.videos?.results?.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
      )?.key,
    };
  } else {
    const series = await searchSeries(cleanName, year);
    if (!series) return null;

    return {
      title: series.name,
      originalTitle: series.original_name,
      overview: series.overview,
      posterUrl: series.poster_path ? `${TMDB_IMAGE_BASE}/w500${series.poster_path}` : null,
      backdropUrl: series.backdrop_path ? `${TMDB_IMAGE_BASE}/original${series.backdrop_path}` : null,
      releaseDate: series.first_air_date,
      genres: series.genres,
      rating: series.vote_average,
      voteCount: series.vote_count,
      numberOfSeasons: series.number_of_seasons,
      numberOfEpisodes: series.number_of_episodes,
      createdBy: series.created_by?.map((creator) => creator.name),
      trailerKey: series.videos?.results?.find(
        (video) => video.type === 'Trailer' && video.site === 'YouTube'
      )?.key,
    };
  }
}

// Limpar cache (útil para desenvolvimento)
export function clearCache() {
  cache.clear();
}

// Obter URLs de imagens
export function getTMDBImageUrl(path: string | null, size: 'w185' | 'w500' | 'original' = 'w500') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
