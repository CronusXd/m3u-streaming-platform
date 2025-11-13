/**
 * Classificador de Conteúdo
 * Identifica e organiza: Canais, Filmes, Séries, Categorias
 */

import { Channel } from './m3u-parser';
import { SeriesGrouper, Series } from './series-grouper';

export interface Movie {
  name: string;
  url: string;
  logo?: string;
  category: string;
  language?: string;
  tvgId?: string;
  rawMeta: Record<string, string>;
  isHls: boolean;
}

export interface LiveChannel {
  name: string;
  url: string;
  logo?: string;
  category: string;
  language?: string;
  tvgId?: string;
  rawMeta: Record<string, string>;
  isHls: boolean;
}

export interface Category {
  name: string;
  type: 'live' | 'movie' | 'series' | 'novela';
  count: number;
}

export interface ClassifiedContent {
  liveChannels: LiveChannel[];
  movies: Movie[];
  series: Series[];
  categories: Category[];
  stats: {
    total: number;
    liveChannels: number;
    movies: number;
    series: number;
    episodes: number;
    withLogo: number;
    withoutLogo: number;
  };
}

export class ContentClassifier {
  // Padrões para identificar filmes
  private moviePatterns = [
    /filmes?/i,
    /movies?/i,
    /cinema/i,
    /films?/i,
    /vod/i,
  ];





  /**
   * Classifica todo o conteúdo do M3U
   */
  classify(channels: Channel[]): ClassifiedContent {
    const liveChannels: LiveChannel[] = [];
    const movies: Movie[] = [];
    const categoriesMap = new Map<string, Category>();
    
    let withLogo = 0;
    let withoutLogo = 0;

    // Primeiro, identificar séries usando o SeriesGrouper
    const seriesGrouper = new SeriesGrouper();
    const grouped = seriesGrouper.groupSeries(channels);

    // Processar canais normais (não-episódios)
    grouped.channels.forEach(ch => {
      const category = ch.groupTitle || 'Outros';
      const hasLogo = ch.tvgLogo && ch.tvgLogo !== 'NO_IMAGE';
      
      if (hasLogo) withLogo++;
      else withoutLogo++;

      // Classificar tipo de conteúdo
      if (this.isMovie(category)) {
        // É um filme
        movies.push({
          name: ch.name,
          url: ch.url,
          logo: hasLogo ? ch.tvgLogo : undefined,
          category: this.normalizeCategory(category),
          language: ch.language,
          tvgId: ch.tvgId,
          rawMeta: ch.rawMeta,
          isHls: ch.isHls,
        });

        this.addToCategory(categoriesMap, category, 'movie');
      } else {
        // É um canal ao vivo
        liveChannels.push({
          name: ch.name,
          url: ch.url,
          logo: hasLogo ? ch.tvgLogo : undefined,
          category: this.normalizeCategory(category),
          language: ch.language,
          tvgId: ch.tvgId,
          rawMeta: ch.rawMeta,
          isHls: ch.isHls,
        });

        this.addToCategory(categoriesMap, category, 'live');
      }
    });

    // Processar séries
    grouped.series.forEach(series => {
      const category = series.groupTitle || 'Séries';
      this.addToCategory(categoriesMap, category, 'series');

      // Contar logos dos episódios
      series.episodes.forEach(ep => {
        const hasLogo = ep.logo && ep.logo !== 'NO_IMAGE';
        if (hasLogo) withLogo++;
        else withoutLogo++;
      });
    });

    return {
      liveChannels,
      movies,
      series: grouped.series,
      categories: Array.from(categoriesMap.values()).sort((a, b) => b.count - a.count),
      stats: {
        total: channels.length,
        liveChannels: liveChannels.length,
        movies: movies.length,
        series: grouped.series.length,
        episodes: grouped.episodes.length,
        withLogo,
        withoutLogo,
      },
    };
  }

  /**
   * Verifica se é um filme baseado na categoria
   */
  private isMovie(category: string): boolean {
    return this.moviePatterns.some(pattern => pattern.test(category));
  }

  /**
   * Normaliza nome da categoria
   */
  private normalizeCategory(category: string): string {
    return category
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\|/g, '-');
  }

  /**
   * Adiciona item ao mapa de categorias
   */
  private addToCategory(
    map: Map<string, Category>,
    categoryName: string,
    type: 'live' | 'movie' | 'series' | 'novela'
  ): void {
    const normalized = this.normalizeCategory(categoryName);
    
    if (!map.has(normalized)) {
      map.set(normalized, {
        name: normalized,
        type,
        count: 0,
      });
    }

    const category = map.get(normalized)!;
    category.count++;
  }

}
