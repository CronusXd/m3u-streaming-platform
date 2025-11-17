import { supabase } from '@/lib/supabase';
import type { ConteudoIPTV, FilmeIPTV, SerieIPTV, CanalIPTV, SerieAgrupada, FiltrosConteudo } from '@/types/iptv';

/**
 * Valida e sanitiza dados JSONB do banco
 */
function sanitizeJSONB<T>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Processa dados do banco garantindo que campos TMDB JSONB sejam arrays válidos
 */
function processConteudo<T extends ConteudoIPTV>(item: any): T {
  return {
    ...item,
    tmdb_genres: sanitizeJSONB(item.tmdb_genres),
    tmdb_cast: sanitizeJSONB(item.tmdb_cast),
    tmdb_created_by: sanitizeJSONB(item.tmdb_created_by),
  } as T;
}

export class IPTVService {
  // ============================================
  // FILMES
  // ============================================
  
  static async getFilmes(filtros: FiltrosConteudo = {}) {
    const { categoria, busca, limit = 50, offset = 0 } = filtros;
    
    // select('*') retorna todos os campos incluindo TMDB metadata
    let query = supabase
      .from('iptv')
      .select('*')
      .eq('tipo', 'filme')
      .eq('is_active', true)
      .order('visualizacoes', { ascending: false })
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (categoria) {
      query = query.eq('categoria', categoria);
    }
    
    if (busca) {
      query = query.ilike('nome', `%${busca}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []).map(item => processConteudo<FilmeIPTV>(item));
  }
  
  static async getFilmePorId(id: string) {
    const { data, error } = await supabase
      .from('iptv')
      .select('*')
      .eq('id', id)
      .eq('tipo', 'filme')
      .single();
    
    if (error) throw error;
    return processConteudo<FilmeIPTV>(data);
  }
  
  static async getCategoriasFilmes() {
    const { data, error } = await supabase
      .from('iptv')
      .select('categoria')
      .eq('tipo', 'filme')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Contar itens por categoria
    const contagem = data.reduce((acc, item) => {
      const cat = item.categoria || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(contagem)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
  
  // ============================================
  // SÉRIES
  // ============================================
  
  static async getSeriesAgrupadas(filtros: FiltrosConteudo = {}) {
    const { categoria, busca, limit = 50, offset = 0 } = filtros;
    
    const { data, error } = await supabase.rpc('get_series_agrupadas', {
      categoria_filter: categoria || '',
      search_filter: busca || '',
      limit_count: limit,
      offset_count: offset,
    });
    
    if (error) throw error;
    return data as SerieAgrupada[];
  }
  
  static async getEpisodiosSerie(nomeSerie: string, temporada?: number) {
    const { data, error } = await supabase.rpc('get_episodios_serie', {
      nome_serie: nomeSerie,
      temporada_filter: temporada || null,
    });
    
    if (error) throw error;
    return (data || []).map(item => processConteudo<SerieIPTV>(item));
  }
  
  static async getTemporadasSerie(nomeSerie: string) {
    const { data, error } = await supabase
      .from('iptv')
      .select('temporada')
      .eq('tipo', 'serie')
      .eq('nome', nomeSerie)
      .eq('is_active', true)
      .order('temporada', { ascending: true });
    
    if (error) throw error;
    
    const temporadas = [...new Set(data.map(item => item.temporada))].filter(t => t !== null);
    return temporadas as number[];
  }
  
  static async getCategoriasSeries() {
    const { data, error } = await supabase
      .from('iptv')
      .select('categoria')
      .eq('tipo', 'serie')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Contar itens por categoria
    const contagem = data.reduce((acc, item) => {
      const cat = item.categoria || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(contagem)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
  
  // ============================================
  // CANAIS
  // ============================================
  
  static async getCanais(filtros: FiltrosConteudo = {}) {
    const { categoria, busca } = filtros;
    
    const { data, error } = await supabase.rpc('get_canais_por_categoria', {
      categoria_filter: categoria || '',
    });
    
    if (error) throw error;
    
    let canais = (data || []).map(item => processConteudo<CanalIPTV>(item));
    
    if (busca) {
      canais = canais.filter(canal => 
        canal.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }
    
    return canais;
  }
  
  static async getCanalPorId(id: string) {
    const { data, error } = await supabase
      .from('iptv')
      .select('*')
      .eq('id', id)
      .eq('tipo', 'canal')
      .single();
    
    if (error) throw error;
    return processConteudo<CanalIPTV>(data);
  }
  
  static async getCategoriasCanais() {
    const { data, error } = await supabase
      .from('iptv')
      .select('categoria')
      .eq('tipo', 'canal')
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Contar itens por categoria
    const contagem = data.reduce((acc, item) => {
      const cat = item.categoria || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(contagem)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
  
  // ============================================
  // BUSCA GERAL
  // ============================================
  
  static async buscarConteudo(termo: string, limit = 20) {
    const { data, error } = await supabase
      .from('iptv')
      .select('*')
      .eq('is_active', true)
      .ilike('nome', `%${termo}%`)
      .limit(limit);
    
    if (error) throw error;
    return (data || []).map(item => processConteudo<ConteudoIPTV>(item));
  }
  
  // ============================================
  // ESTATÍSTICAS
  // ============================================
  
  static async incrementarVisualizacao(id: string) {
    const { error } = await supabase.rpc('increment', {
      row_id: id,
      x: 1,
    });
    
    if (error) {
      // Fallback: incrementar manualmente
      const { data: conteudo } = await supabase
        .from('iptv')
        .select('visualizacoes')
        .eq('id', id)
        .single();
      
      if (conteudo) {
        await supabase
          .from('iptv')
          .update({ visualizacoes: conteudo.visualizacoes + 1 })
          .eq('id', id);
      }
    }
  }
  
  static async getConteudoPopular(tipo?: 'canal' | 'filme' | 'serie', limit = 10) {
    let query = supabase
      .from('iptv')
      .select('*')
      .eq('is_active', true)
      .order('visualizacoes', { ascending: false })
      .limit(limit);
    
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []).map(item => processConteudo<ConteudoIPTV>(item));
  }
}

