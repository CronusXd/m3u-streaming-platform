export type TipoConteudo = 'canal' | 'filme' | 'serie';

export interface ConteudoIPTV {
  id: string;
  tipo: TipoConteudo;
  nome: string;
  nome_original?: string;
  categoria: string;
  url_stream: string;
  is_hls: boolean;
  is_active: boolean;
  
  // EPG (canais)
  epg_id?: string;
  epg_logo?: string;
  epg_numero?: string;
  
  // Séries
  temporada?: number;
  episodio?: number;
  nome_episodio?: string;
  
  // Imagens (campos antigos - manter para compatibilidade)
  logo_url?: string;
  backdrop_url?: string;
  
  // Estatísticas (campos antigos - manter para compatibilidade)
  visualizacoes: number;
  avaliacao?: number; // Avaliação 0-10
  
  // Controle
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
  
  metadata?: Record<string, any>;
  
  // TMDB Metadata
  tmdb_id?: number;
  tmdb_title?: string;
  tmdb_original_title?: string;
  tmdb_overview?: string;
  tmdb_poster_path?: string;
  tmdb_backdrop_path?: string;
  tmdb_release_date?: string;
  tmdb_runtime?: number;
  tmdb_genres?: Array<{ id: number; name: string }>;
  tmdb_vote_average?: number;
  tmdb_vote_count?: number;
  tmdb_trailer_key?: string;
  tmdb_cast?: Array<{ name: string; character: string }>;
  tmdb_director?: string;
  tmdb_created_by?: Array<{ name: string }>;
  tmdb_number_of_seasons?: number;
  tmdb_number_of_episodes?: number;
  tmdb_last_sync?: string;
}

export interface FilmeIPTV extends ConteudoIPTV {
  tipo: 'filme';
}

export interface SerieIPTV extends ConteudoIPTV {
  tipo: 'serie';
  temporada: number;
  episodio: number;
  nome_episodio: string;
}

export interface CanalIPTV extends ConteudoIPTV {
  tipo: 'canal';
  epg_id: string;
  epg_numero?: string;
  stream_url?: string; // Alias para url_stream (compatibilidade)
}

export interface SerieAgrupada {
  nome: string;
  categoria: string;
  total_episodios: number;
  total_temporadas: number;
  logo_url?: string;
  backdrop_url?: string;
  primeiro_episodio_id: string;
  ultima_atualizacao: string;
}

export interface FiltrosConteudo {
  tipo?: TipoConteudo;
  categoria?: string;
  busca?: string;
  limit?: number;
  offset?: number;
}
