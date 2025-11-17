import { useState, useEffect } from 'react';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TMDBMetadata {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  runtime?: number;
  trailer_key?: string | null;
  cast?: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
  director?: string;
  // Para séries
  name?: string;
  original_name?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: Array<{ id: number; name: string }>;
}

interface UseTMDBMetadataResult {
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

// Cache em memória para evitar requisições duplicadas
const metadataCache = new Map<string, TMDBMetadata>();

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

// Buscar filme no TMDB
async function searchMovie(query: string, year?: number): Promise<TMDBMetadata | null> {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      query: query,
      language: 'pt-BR',
      include_adult: 'false',
    });

    if (year) {
      params.append('year', year.toString());
    }

    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return getMovieDetails(data.results[0].id);
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar filme:', error);
    return null;
  }
}

// Buscar série no TMDB
async function searchSeries(query: string, year?: number): Promise<TMDBMetadata | null> {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      query: query,
      language: 'pt-BR',
      include_adult: 'false',
    });

    if (year) {
      params.append('first_air_date_year', year.toString());
    }

    const response = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return getSeriesDetails(data.results[0].id);
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar série:', error);
    return null;
  }
}

// Detalhes do filme
async function getMovieDetails(movieId: number): Promise<TMDBMetadata | null> {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      language: 'pt-BR',
      append_to_response: 'credits,videos',
    });

    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?${params}`);
    const data = await response.json();

    // Extrair diretor
    const director = data.credits?.crew?.find((person: any) => person.job === 'Director')?.name;

    // Top 5 elenco
    const cast = data.credits?.cast?.slice(0, 5).map((person: any) => ({
      id: person.id,
      name: person.name,
      character: person.character,
      profile_path: person.profile_path,
    }));

    // Trailer
    const trailer = data.videos?.results?.find(
      (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    return {
      id: data.id,
      title: data.title,
      original_title: data.original_title,
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: data.release_date,
      runtime: data.runtime,
      genres: data.genres || [],
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      trailer_key: trailer?.key || null,
      cast: cast || [],
      director: director,
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error);
    return null;
  }
}

// Detalhes da série
async function getSeriesDetails(seriesId: number): Promise<TMDBMetadata | null> {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      language: 'pt-BR',
      append_to_response: 'videos',
    });

    const response = await fetch(`${TMDB_BASE_URL}/tv/${seriesId}?${params}`);
    const data = await response.json();

    // Trailer
    const trailer = data.videos?.results?.find(
      (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
    );

    return {
      id: data.id,
      name: data.name,
      title: data.name, // Alias para compatibilidade
      original_name: data.original_name,
      original_title: data.original_name, // Alias
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      first_air_date: data.first_air_date,
      release_date: data.first_air_date, // Alias
      genres: data.genres || [],
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      trailer_key: trailer?.key || null,
      created_by: data.created_by || [],
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes da série:', error);
    return null;
  }
}

export function useTMDBMetadata(
  name: string,
  type: 'filme' | 'serie' | 'canal'
): UseTMDBMetadataResult {
  const [metadata, setMetadata] = useState<TMDBMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Canais não têm metadados TMDB
    if (type === 'canal') {
      setLoading(false);
      return;
    }

    // Verificar cache
    const cacheKey = `${type}:${name}`;
    if (metadataCache.has(cacheKey)) {
      setMetadata(metadataCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Buscar metadados
    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);

        const { cleanName, year } = extractYear(name);

        let result: TMDBMetadata | null = null;

        if (type === 'filme') {
          result = await searchMovie(cleanName, year);
        } else if (type === 'serie') {
          result = await searchSeries(cleanName, year);
        }

        if (result) {
          metadataCache.set(cacheKey, result);
          setMetadata(result);
        } else {
          setError('Metadados não encontrados');
        }
      } catch (err) {
        setError('Erro ao buscar metadados');
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [name, type]);

  const posterUrl = metadata?.poster_path
    ? `${TMDB_IMAGE_BASE}${metadata.poster_path}`
    : null;

  const backdropUrl = metadata?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${metadata.backdrop_path}`
    : null;

  // Formatar metadados para o formato esperado
  const formattedMetadata = metadata
    ? {
        title: metadata.title || metadata.name || '',
        overview: metadata.overview || '',
        rating: metadata.vote_average || 0,
        releaseDate: metadata.release_date || metadata.first_air_date || '',
        posterUrl,
        backdropUrl,
        genres: metadata.genres?.map((g) => g.name) || [],
        runtime: metadata.runtime,
        trailerKey: metadata.trailer_key,
      }
    : null;

  return {
    metadata: formattedMetadata,
    loading,
    error,
    posterUrl,
    backdropUrl,
  };
}
