/**
 * Serviço de Pré-carregamento
 * Baixa TODOS os dados quando usuário loga e salva no cache por 30 dias
 */

import { optimizedCache } from '@/lib/cache/optimized-cache';

export interface PreloadProgress {
  series: number;
  movies: number;
  channels: number;
  total: number;
  isComplete: boolean;
  error?: string;
}

class PreloadService {
  private isPreloading = false;
  private progressCallbacks: ((progress: PreloadProgress) => void)[] = [];

  /**
   * Registra callback de progresso
   */
  onProgress(callback: (progress: PreloadProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Retorna função para remover callback
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notifica progresso
   */
  private notifyProgress(progress: PreloadProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Erro ao notificar progresso:', error);
      }
    });
  }

  /**
   * Verifica se tem cache válido
   */
  async hasValidCache(): Promise<boolean> {
    try {
      return await optimizedCache.hasValidCache();
    } catch (error) {
      console.error('Erro ao verificar cache:', error);
      return false;
    }
  }

  /**
   * Pré-carrega TUDO quando usuário loga
   */
  async preloadAll(force = false): Promise<void> {
    // Evitar múltiplas execuções simultâneas
    if (this.isPreloading) {
      console.log('⚠️ Pré-carregamento já em andamento');
      return;
    }

    this.isPreloading = true;

    try {
      console.log('🚀 Iniciando pré-carregamento...');

      // 1. Verificar se já tem cache válido
      if (!force) {
        const hasCache = await this.hasValidCache();
        if (hasCache) {
          console.log('✅ Cache válido encontrado, pulando pré-carregamento');
          this.notifyProgress({
            series: 100,
            movies: 100,
            channels: 100,
            total: 100,
            isComplete: true,
          });
          return;
        }
      }

      console.log('📥 Cache inválido ou forçado, baixando TODOS os dados...');

      // 2. Inicializar progresso
      const progress: PreloadProgress = {
        series: 0,
        movies: 0,
        channels: 0,
        total: 0,
        isComplete: false,
      };

      this.notifyProgress(progress);

      // 3. Baixar SEQUENCIALMENTE para progresso correto
      const results: PromiseSettledResult<void>[] = [];
      
      // Séries (0-33%)
      try {
        await this.preloadSeries((p) => {
          progress.series = p;
          progress.total = Math.round((p * 33) / 100); // 0-33%
          this.notifyProgress({ ...progress });
        });
        results.push({ status: 'fulfilled', value: undefined });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }

      // Filmes (33-66%)
      try {
        await this.preloadMovies((p) => {
          progress.movies = p;
          progress.total = Math.round(33 + (p * 33) / 100); // 33-66%
          this.notifyProgress({ ...progress });
        });
        results.push({ status: 'fulfilled', value: undefined });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }

      // Canais (66-100%)
      try {
        await this.preloadChannels((p) => {
          progress.channels = p;
          progress.total = Math.round(66 + (p * 34) / 100); // 66-100%
          this.notifyProgress({ ...progress });
        });
        results.push({ status: 'fulfilled', value: undefined });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }

      // 4. Verificar erros
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r) => (r as PromiseRejectedResult).reason);

      if (errors.length > 0) {
        console.error('❌ Erros no pré-carregamento:', errors);
        progress.error = `${errors.length} erro(s) encontrado(s)`;
      }

      // 5. Marcar como completo
      progress.series = 100;
      progress.movies = 100;
      progress.channels = 100;
      progress.total = 100;
      progress.isComplete = true;

      this.notifyProgress(progress);

      console.log('✅ Pré-carregamento completo!');
    } catch (error) {
      console.error('❌ Erro no pré-carregamento:', error);
      this.notifyProgress({
        series: 0,
        movies: 0,
        channels: 0,
        total: 0,
        isComplete: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Pré-carrega séries com progresso em tempo real
   */
  private async preloadSeries(onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('📥 Baixando séries...');
      
      // Progresso linear: 0-100% em 4 segundos (1/3 de 12s)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 95) { // Parar em 95% até resposta chegar
          currentProgress += 2.5; // +2.5% a cada 100ms = 95% em ~4s
          onProgress?.(Math.min(currentProgress, 95));
        }
      }, 100);

      const response = await fetch('/api/iptv/preload/series');

      if (!response.ok) {
        clearInterval(progressInterval);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Ler resposta
      const data = await response.json();
      
      // Salvar no cache
      await optimizedCache.saveAllSeriesWithStreams(data);
      
      // Garantir 100%
      clearInterval(progressInterval);
      onProgress?.(100);

      console.log(`✅ ${data.stats?.totalSeries || 0} séries pré-carregadas`);
    } catch (error) {
      console.error('❌ Erro ao pré-carregar séries:', error);
      throw error;
    }
  }

  /**
   * Pré-carrega filmes
   */
  private async preloadMovies(onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('📥 Baixando filmes...');
      
      // Progresso linear: 0-100% em 4 segundos (1/3 de 12s)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 95) { // Parar em 95% até resposta chegar
          currentProgress += 2.5; // +2.5% a cada 100ms = 95% em ~4s
          onProgress?.(Math.min(currentProgress, 95));
        }
      }, 100);

      const response = await fetch('/api/iptv/preload/movies');

      if (!response.ok) {
        clearInterval(progressInterval);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      await optimizedCache.saveAllMoviesWithStreams(data);
      
      // Garantir 100%
      clearInterval(progressInterval);
      onProgress?.(100);

      console.log(`✅ ${data.stats?.totalMovies || 0} filmes pré-carregados`);
    } catch (error) {
      console.error('❌ Erro ao pré-carregar filmes:', error);
      throw error;
    }
  }

  /**
   * Pré-carrega canais
   */
  private async preloadChannels(onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('📥 Baixando canais...');
      
      // Progresso linear: 0-100% em 4 segundos (1/3 de 12s)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 95) { // Parar em 95% até resposta chegar
          currentProgress += 2.5; // +2.5% a cada 100ms = 95% em ~4s
          onProgress?.(Math.min(currentProgress, 95));
        }
      }, 100);

      const response = await fetch('/api/iptv/preload/channels');

      if (!response.ok) {
        clearInterval(progressInterval);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      await optimizedCache.saveAllChannelsWithStreams(data);
      
      // Garantir 100%
      clearInterval(progressInterval);
      onProgress?.(100);

      console.log(`✅ ${data.stats?.totalChannels || 0} canais pré-carregados`);
    } catch (error) {
      console.error('❌ Erro ao pré-carregar canais:', error);
      throw error;
    }
  }

  /**
   * Força atualização do cache
   */
  async forceRefresh(): Promise<void> {
    console.log('🔄 Forçando atualização do cache...');
    await optimizedCache.clearAll();
    await this.preloadAll(true);
  }

  /**
   * Obtém estatísticas do cache
   */
  async getCacheStats(): Promise<any> {
    try {
      const series = await optimizedCache.getAllSeriesWithStreams();
      const movies = await optimizedCache.getAllMoviesWithStreams();
      const channels = await optimizedCache.getAllChannelsWithStreams();

      return {
        series: {
          total: series?.series?.length || 0,
          episodes: series?.stats?.totalEpisodes || 0,
          cached: !!series,
          age: series ? Date.now() - series.timestamp : 0,
        },
        movies: {
          total: movies?.movies?.length || 0,
          cached: !!movies,
          age: movies ? Date.now() - movies.timestamp : 0,
        },
        channels: {
          total: channels?.channels?.length || 0,
          cached: !!channels,
          age: channels ? Date.now() - channels.timestamp : 0,
        },
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

// Singleton
export const preloadService = new PreloadService();
