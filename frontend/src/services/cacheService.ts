/**
 * Cache Service - Serviço de Cache Integrado
 * 
 * Gerencia cache de filmes, séries e canais do Supabase.
 */

'use client';

import { CacheManager } from '@/lib/cache/CacheManager';
import { PRIORITY } from '@/lib/cache/cache.config';
import { createClient } from '@/lib/supabase';

// Função para obter cliente Supabase (apenas no cliente)
function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser');
  }
  return createClient();
}

/**
 * Busca todos os filmes do Supabase
 */
async function fetchAllMovies(): Promise<any[]> {
  console.log('📥 Buscando TODOS os filmes do Supabase...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Buscar IDs de categorias de filmes
    const { data: movieCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('type', 'movie');

    const categoryIds = movieCategories?.map(c => c.id) || [];

    if (categoryIds.length === 0) {
      console.warn('Nenhuma categoria de filmes encontrada');
      return [];
    }

    // Buscar TODOS os filmes dessas categorias
    const { data: movies, error } = await supabase
      .from('unified_content')
      .select('*')
      .in('category_id', categoryIds)
      .order('name');

    if (error) {
      console.error('Erro ao buscar filmes:', error);
      return [];
    }

    console.log(`✅ ${movies?.length || 0} filmes carregados`);
    return movies || [];
  } catch (error) {
    console.error('Erro ao buscar filmes:', error);
    return [];
  }
}

/**
 * Busca todas as séries do Supabase
 */
async function fetchAllSeries(): Promise<any[]> {
  console.log('📥 Buscando TODAS as séries do Supabase...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Buscar IDs de categorias de séries
    const { data: seriesCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('type', 'series');

    const categoryIds = seriesCategories?.map(c => c.id) || [];

    if (categoryIds.length === 0) {
      console.warn('Nenhuma categoria de séries encontrada');
      return [];
    }

    // Buscar TODAS as séries dessas categorias
    const { data: series, error } = await supabase
      .from('unified_content')
      .select('*')
      .in('category_id', categoryIds)
      .order('name');

    if (error) {
      console.error('Erro ao buscar séries:', error);
      return [];
    }

    console.log(`✅ ${series?.length || 0} séries carregadas`);
    return series || [];
  } catch (error) {
    console.error('Erro ao buscar séries:', error);
    return [];
  }
}

/**
 * Busca todos os canais do Supabase
 */
async function fetchAllChannels(): Promise<any[]> {
  console.log('📥 Buscando TODOS os canais do Supabase...');
  
  try {
    const supabase = getSupabaseClient();
    
    // Buscar IDs de categorias de canais
    const { data: channelCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('type', 'live');

    const categoryIds = channelCategories?.map(c => c.id) || [];

    if (categoryIds.length === 0) {
      console.warn('Nenhuma categoria de canais encontrada');
      return [];
    }

    // Buscar TODOS os canais dessas categorias
    const { data: channels, error } = await supabase
      .from('unified_content')
      .select('*')
      .in('category_id', categoryIds)
      .order('name');

    if (error) {
      console.error('Erro ao buscar canais:', error);
      return [];
    }

    console.log(`✅ ${channels?.length || 0} canais carregados`);
    return channels || [];
  } catch (error) {
    console.error('Erro ao buscar canais:', error);
    return [];
  }
}

/**
 * Busca todas as categorias do Supabase
 */
async function fetchAllCategories(): Promise<any[]> {
  console.log('📥 Buscando TODAS as categorias do Supabase...');
  
  try {
    const supabase = getSupabaseClient();
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }

    console.log(`✅ ${categories?.length || 0} categorias carregadas`);
    return categories || [];
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

// Seções do cache
const CACHE_SECTIONS = {
  MOVIES: 'movies',
  SERIES: 'series',
  CHANNELS: 'channels',
  CATEGORIES: 'categories',
};

/**
 * Classe CacheService
 */
class CacheService {
  private cache: CacheManager | null = null;
  private initialized = false;
  private initializing = false;

  /**
   * Inicializa o cache
   */
  async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initializing) {
      // Aguardar inicialização em andamento
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.initializing = true;

    try {
      console.log('🚀 Inicializando cache...');

      this.cache = new CacheManager({
        defaultTTL: 604800, // 7 dias
        compressionEnabled: true,
        cleanupOnInit: true,
        debug: process.env.NODE_ENV === 'development',
      });

      const success = await this.cache.init();

      if (success) {
        this.initialized = true;
        console.log('✅ Cache inicializado com sucesso!');

        // Configurar listeners de eventos
        this.setupEventListeners();

        // Verificar se precisa baixar dados
        await this.checkAndDownloadData();
      }

      return success;
    } catch (error) {
      console.error('❌ Erro ao inicializar cache:', error);
      return false;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners() {
    if (!this.cache) return;

    // Progresso de download
    this.cache.on('download:progress', (data: any) => {
      console.log(`📥 ${data.section}: ${data.progress}%`);
      
      // Emitir evento customizado para UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cache:download:progress', { detail: data }));
      }
    });

    // Download completo
    this.cache.on('download:complete', (data: any) => {
      console.log(`✅ Download completo: ${data.section}`);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cache:download:complete', { detail: data }));
      }
    });

    // Erro de download
    this.cache.on('download:error', (data: any) => {
      console.error(`❌ Erro no download: ${data.section}`, data.error);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cache:download:error', { detail: data }));
      }
    });

    // Warning de quota
    this.cache.on('quota:warning', (data: any) => {
      console.warn(`⚠️ Quota alta: ${(data.percentage * 100).toFixed(2)}%`);
    });
  }

  /**
   * Verifica e baixa dados se necessário
   */
  private async checkAndDownloadData() {
    if (!this.cache) return;

    try {
      // Verificar quais seções existem
      const hasMovies = await this.cache.exists(CACHE_SECTIONS.MOVIES);
      const hasSeries = await this.cache.exists(CACHE_SECTIONS.SERIES);
      const hasChannels = await this.cache.exists(CACHE_SECTIONS.CHANNELS);

      // Se não tem nada, iniciar download em background
      if (!hasMovies && !hasSeries && !hasChannels) {
        console.log('📥 Iniciando download inicial de dados...');
        await this.downloadAllData();
      } else {
        console.log('✅ Dados já existem no cache');
      }
    } catch (error) {
      console.error('Erro ao verificar dados:', error);
    }
  }

  /**
   * Baixa todos os dados em background
   */
  async downloadAllData(): Promise<void> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) {
      throw new Error('Cache não inicializado');
    }

    console.log('📥 Iniciando download de todos os dados do Supabase...');

    // Baixar cada seção sequencialmente para não sobrecarregar
    try {
      // 1. Categorias
      const categories = await fetchAllCategories();
      if (categories.length > 0) {
        await this.cache.save(CACHE_SECTIONS.CATEGORIES, categories);
        console.log('✅ Categorias salvas:', categories.length);
      }

      // 2. Filmes
      const movies = await fetchAllMovies();
      if (movies.length > 0) {
        await this.cache.save(CACHE_SECTIONS.MOVIES, movies);
        console.log('✅ Filmes salvos:', movies.length);
      }

      // 3. Séries
      const series = await fetchAllSeries();
      if (series.length > 0) {
        await this.cache.save(CACHE_SECTIONS.SERIES, series);
        console.log('✅ Séries salvas:', series.length);
      }

      // 4. Canais
      const channels = await fetchAllChannels();
      if (channels.length > 0) {
        await this.cache.save(CACHE_SECTIONS.CHANNELS, channels);
        console.log('✅ Canais salvos:', channels.length);
      }

      console.log('🎉 Todos os dados baixados e salvos com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao baixar dados:', error);
      throw error;
    }
  }

  /**
   * Obtém filmes (do cache ou baixa)
   */
  async getMovies(): Promise<any[]> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) {
      throw new Error('Cache não inicializado');
    }

    try {
      // Tentar carregar do cache
      let movies = await this.cache.load(CACHE_SECTIONS.MOVIES);

      if (!movies || !Array.isArray(movies) || movies.length === 0) {
        console.log('📥 Filmes não encontrados no cache, baixando TODOS do Supabase...');
        
        // Baixar TODOS os filmes do Supabase
        movies = await fetchAllMovies();
        
        // Salvar no cache
        if (movies && movies.length > 0) {
          await this.cache.save(CACHE_SECTIONS.MOVIES, movies);
          console.log(`✅ ${movies.length} filmes salvos no cache`);
        }
      } else {
        console.log(`✅ ${movies.length} filmes carregados do cache`);
      }

      return Array.isArray(movies) ? movies : [];
    } catch (error) {
      console.error('Erro ao obter filmes:', error);
      return [];
    }
  }

  /**
   * Obtém séries (do cache ou baixa)
   */
  async getSeries(): Promise<any[]> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) {
      throw new Error('Cache não inicializado');
    }

    try {
      let series = await this.cache.load(CACHE_SECTIONS.SERIES);

      if (!series || !Array.isArray(series) || series.length === 0) {
        console.log('📥 Séries não encontradas no cache, baixando TODAS do Supabase...');
        
        // Baixar TODAS as séries do Supabase
        series = await fetchAllSeries();
        
        // Salvar no cache
        if (series && series.length > 0) {
          await this.cache.save(CACHE_SECTIONS.SERIES, series);
          console.log(`✅ ${series.length} séries salvas no cache`);
        }
      } else {
        console.log(`✅ ${series.length} séries carregadas do cache`);
      }

      return Array.isArray(series) ? series : [];
    } catch (error) {
      console.error('Erro ao obter séries:', error);
      return [];
    }
  }

  /**
   * Obtém canais (do cache ou baixa)
   */
  async getChannels(): Promise<any[]> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) {
      throw new Error('Cache não inicializado');
    }

    try {
      let channels = await this.cache.load(CACHE_SECTIONS.CHANNELS);

      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        console.log('📥 Canais não encontrados no cache, baixando TODOS do Supabase...');
        
        // Baixar TODOS os canais do Supabase
        channels = await fetchAllChannels();
        
        // Salvar no cache
        if (channels && channels.length > 0) {
          await this.cache.save(CACHE_SECTIONS.CHANNELS, channels);
          console.log(`✅ ${channels.length} canais salvos no cache`);
        }
      } else {
        console.log(`✅ ${channels.length} canais carregados do cache`);
      }

      return Array.isArray(channels) ? channels : [];
    } catch (error) {
      console.error('Erro ao obter canais:', error);
      return [];
    }
  }

  /**
   * Obtém categorias (do cache ou baixa)
   */
  async getCategories(): Promise<any[]> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) {
      throw new Error('Cache não inicializado');
    }

    try {
      let categories = await this.cache.load(CACHE_SECTIONS.CATEGORIES);

      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        console.log('📥 Categorias não encontradas no cache, baixando TODAS do Supabase...');
        
        // Baixar TODAS as categorias do Supabase
        categories = await fetchAllCategories();
        
        // Salvar no cache
        if (categories && categories.length > 0) {
          await this.cache.save(CACHE_SECTIONS.CATEGORIES, categories);
          console.log(`✅ ${categories.length} categorias salvas no cache`);
        }
      } else {
        console.log(`✅ ${categories.length} categorias carregadas do cache`);
      }

      return Array.isArray(categories) ? categories : [];
    } catch (error) {
      console.error('Erro ao obter categorias:', error);
      return [];
    }
  }

  /**
   * Prioriza download de uma seção
   */
  async prioritizeSection(section: string): Promise<void> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) return;

    await this.cache.prioritizeSection(section);
  }

  /**
   * Atualiza dados do servidor
   */
  async refreshData(): Promise<void> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) return;

    console.log('🔄 Atualizando TODOS os dados...');

    try {
      // Limpar cache existente
      await this.cache.clear(CACHE_SECTIONS.MOVIES);
      await this.cache.clear(CACHE_SECTIONS.SERIES);
      await this.cache.clear(CACHE_SECTIONS.CHANNELS);
      await this.cache.clear(CACHE_SECTIONS.CATEGORIES);

      // Baixar tudo novamente
      await this.downloadAllData();

      console.log('✅ Dados atualizados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<any> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) return null;

    return await this.cache.getStats();
  }

  /**
   * Obtém informações de quota
   */
  async getQuota(): Promise<any> {
    if (!this.cache) {
      await this.init();
    }

    if (!this.cache) return null;

    return await this.cache.getQuota();
  }

  /**
   * Limpa cache
   */
  async clearCache(): Promise<void> {
    if (!this.cache) return;

    await this.cache.clearAll();
    console.log('🗑️ Cache limpo');
  }

  /**
   * Obtém progresso de downloads
   */
  getDownloadProgress(): any {
    if (!this.cache) return {};

    return this.cache.getAllDownloadProgress();
  }
}

// Instância singleton
export const cacheService = new CacheService();

// Export para uso direto
export default cacheService;
