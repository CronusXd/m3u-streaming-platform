/**
 * Agrupador de Séries e Episódios
 * 
 * Identifica episódios de séries no formato S01E01, S01P01, etc
 * e agrupa eles dentro de suas respectivas séries
 */

import { Channel } from './m3u-parser';

export interface Episode {
  name: string;
  url: string;
  logo?: string;
  season: number;
  episode: number;
  tvgId?: string;
  rawMeta: Record<string, string>;
  isHls: boolean;
}

export interface Series {
  name: string;
  logo?: string;
  groupTitle?: string;
  episodes: Episode[];
}

export interface GroupedContent {
  channels: Channel[];
  series: Series[];
  episodes: Episode[];
}

export class SeriesGrouper {
  // Regex para detectar padrões de episódios
  // Exemplos: S01E01, S01P01, S1E1, s01e01, 1x01, etc
  private episodePatterns = [
    /[Ss](\d{1,2})[Ee](\d{1,3})/,  // S01E01, s01e01
    /[Ss](\d{1,2})[Pp](\d{1,3})/,  // S01P01, s01p01
    /(\d{1,2})[xX](\d{1,3})/,       // 1x01, 1X01
    /[Tt](\d{1,2})[Ee](\d{1,3})/,  // T01E01 (temporada)
  ];

  /**
   * Agrupa canais em: canais normais, séries e episódios
   */
  groupSeries(channels: Channel[]): GroupedContent {
    const normalChannels: Channel[] = [];
    const seriesMap = new Map<string, Series>();

    for (const channel of channels) {
      const episodeInfo = this.extractEpisodeInfo(channel.name);

      if (episodeInfo) {
        // É um episódio de série
        const seriesName = episodeInfo.seriesName;

        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, {
            name: seriesName,
            logo: channel.tvgLogo,
            groupTitle: channel.groupTitle,
            episodes: [],
          });
        }

        const series = seriesMap.get(seriesName)!;
        series.episodes.push({
          name: channel.name,
          url: channel.url,
          logo: channel.tvgLogo,
          season: episodeInfo.season,
          episode: episodeInfo.episode,
          tvgId: channel.tvgId,
          rawMeta: channel.rawMeta,
          isHls: channel.isHls,
        });

        // Atualizar logo da série se não tiver
        if (!series.logo && channel.tvgLogo) {
          series.logo = channel.tvgLogo;
        }
      } else {
        // Canal normal
        normalChannels.push(channel);
      }
    }

    // Ordenar episódios dentro de cada série
    const series = Array.from(seriesMap.values());
    series.forEach(s => {
      s.episodes.sort((a, b) => {
        if (a.season !== b.season) {
          return a.season - b.season;
        }
        return a.episode - b.episode;
      });
    });

    return {
      channels: normalChannels,
      series,
      episodes: series.flatMap(s => s.episodes),
    };
  }

  /**
   * Extrai informações de episódio do nome do canal
   */
  private extractEpisodeInfo(name: string): {
    seriesName: string;
    season: number;
    episode: number;
  } | null {
    for (const pattern of this.episodePatterns) {
      const match = name.match(pattern);
      
      if (match) {
        const season = parseInt(match[1], 10);
        const episode = parseInt(match[2], 10);

        // Extrair nome da série (tudo antes do padrão)
        const seriesName = name
          .substring(0, match.index)
          .trim()
          .replace(/[-_:]+$/, '') // Remove separadores no final
          .trim();

        if (seriesName && season > 0 && episode > 0) {
          return {
            seriesName,
            season,
            episode,
          };
        }
      }
    }

    return null;
  }

  /**
   * Verifica se um nome parece ser um episódio
   */
  isEpisode(name: string): boolean {
    return this.episodePatterns.some(pattern => pattern.test(name));
  }
}
