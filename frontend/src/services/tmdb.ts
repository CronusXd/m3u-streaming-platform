// TMDB API Integration Service
// API Key: Você precisa criar uma conta em https://www.themoviedb.org/settings/api

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Verificar se TMDB está habilitado
const TMDB_ENABLED = TMDB_API_KEY && TMDB_API_KEY.length > 0 && TMDB_API_KEY !== 'YOUR_API_KEY_HERE';

if (!TMDB_ENABLED && typeof window !== 'undefined') {
  console.warn('⚠️ TMDB desabilitado: API key não configurada');
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  director?: string;
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  videos?: { key: string; type: string; site: string }[];
}

export interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  created_by?: { id: number; name: string }[];
  seasons?: TMDBSeason[];
  videos?: { key: string; type: string; site: string }[];
}

export interface TMDBSeason {
  season_number: number;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
}

// Helper to build image URLs
export const getTMDBImageUrl = (path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string | null => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

// Search for a movie by name
export const searchMovie = async (query: string, year?: number): Promise<TMDBMovie | null> => {
  if (!TMDB_ENABLED) return null;
  
  // Buscar da API TMDB em tempo real
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
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
      const details = await getMovieDetails(data.results[0].id);
      return details;
    }

    return null;
  } catch (error) {
    console.error('Error searching movie:', error);
    return null;
  }
};

// Get detailed movie information
export const getMovieDetails = async (movieId: number): Promise<TMDBMovie | null> => {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'pt-BR',
      append_to_response: 'credits,videos',
    });

    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?${params}`);
    const data = await response.json();

    // Extract director from crew
    const director = data.credits?.crew?.find((person: any) => person.job === 'Director')?.name;

    // Get top 5 cast members
    const cast = data.credits?.cast?.slice(0, 5).map((person: any) => ({
      id: person.id,
      name: person.name,
      character: person.character,
      profile_path: person.profile_path,
    }));

    // Get trailer
    const videos = data.videos?.results
      ?.filter((video: any) => video.type === 'Trailer' && video.site === 'YouTube')
      .map((video: any) => ({
        key: video.key,
        type: video.type,
        site: video.site,
      }));

    return {
      ...data,
      director,
      cast,
      videos,
    };
  } catch (error) {
    console.error('Error getting movie details:', error);
    return null;
  }
};

// Search for a TV series by name
export const searchSeries = async (query: string, year?: number): Promise<TMDBSeries | null> => {
  if (!TMDB_ENABLED) return null;
  
  // Buscar da API TMDB em tempo real
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
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
      const details = await getSeriesDetails(data.results[0].id);
      return details;
    }

    return null;
  } catch (error) {
    console.error('Error searching series:', error);
    return null;
  }
};

// Get detailed series information
export const getSeriesDetails = async (seriesId: number): Promise<TMDBSeries | null> => {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'pt-BR',
      append_to_response: 'videos',
    });

    const response = await fetch(`${TMDB_BASE_URL}/tv/${seriesId}?${params}`);
    const data = await response.json();

    // Get trailer
    const videos = data.videos?.results
      ?.filter((video: any) => video.type === 'Trailer' && video.site === 'YouTube')
      .map((video: any) => ({
        key: video.key,
        type: video.type,
        site: video.site,
      }));

    return {
      ...data,
      videos,
    };
  } catch (error) {
    console.error('Error getting series details:', error);
    return null;
  }
};

// Get season details with episodes
export const getSeasonDetails = async (seriesId: number, seasonNumber: number): Promise<TMDBEpisode[]> => {
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'pt-BR',
    });

    const response = await fetch(`${TMDB_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?${params}`);
    const data = await response.json();

    return data.episodes || [];
  } catch (error) {
    console.error('Error getting season details:', error);
    return [];
  }
};

// Extract year from movie/series name
export const extractYear = (name: string): { cleanName: string; year?: number } => {
  if (!name || typeof name !== 'string') {
    return { cleanName: '' };
  }
  
  const yearMatch = name.match(/\((\d{4})\)/);
  if (yearMatch) {
    return {
      cleanName: name.replace(/\s*\(\d{4}\)\s*/, '').trim(),
      year: parseInt(yearMatch[1]),
    };
  }
  return { cleanName: name };
};

// Format runtime to hours and minutes
export const formatRuntime = (minutes: number | null): string => {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// Format rating to stars (0-5)
export const formatRating = (voteAverage: number): number => {
  return Math.round((voteAverage / 10) * 5);
};
