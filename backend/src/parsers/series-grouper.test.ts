import { SeriesGrouper } from './series-grouper';
import { Channel } from './m3u-parser';

describe('SeriesGrouper', () => {
  let grouper: SeriesGrouper;

  beforeEach(() => {
    grouper = new SeriesGrouper();
  });

  describe('isEpisode', () => {
    it('deve detectar formato S01E01', () => {
      expect(grouper.isEpisode('Breaking Bad S01E01')).toBe(true);
      expect(grouper.isEpisode('Game of Thrones S05E10')).toBe(true);
    });

    it('deve detectar formato S01P01', () => {
      expect(grouper.isEpisode('The Office S01P01')).toBe(true);
      expect(grouper.isEpisode('Friends S10P24')).toBe(true);
    });

    it('deve detectar formato 1x01', () => {
      expect(grouper.isEpisode('Lost 1x01')).toBe(true);
      expect(grouper.isEpisode('Prison Break 4X22')).toBe(true);
    });

    it('deve detectar formato T01E01', () => {
      expect(grouper.isEpisode('La Casa de Papel T01E01')).toBe(true);
    });

    it('não deve detectar canais normais', () => {
      expect(grouper.isEpisode('HBO')).toBe(false);
      expect(grouper.isEpisode('ESPN')).toBe(false);
      expect(grouper.isEpisode('Discovery Channel')).toBe(false);
    });
  });

  describe('groupSeries', () => {
    it('deve agrupar episódios da mesma série', () => {
      const channels: Channel[] = [
        {
          name: 'Breaking Bad S01E01',
          url: 'http://example.com/bb-s01e01',
          tvgLogo: 'http://example.com/bb.jpg',
          groupTitle: 'Series',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Breaking Bad S01E02',
          url: 'http://example.com/bb-s01e02',
          tvgLogo: 'http://example.com/bb.jpg',
          groupTitle: 'Series',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Breaking Bad S02E01',
          url: 'http://example.com/bb-s02e01',
          tvgLogo: 'http://example.com/bb.jpg',
          groupTitle: 'Series',
          rawMeta: {},
          isHls: true,
        },
      ];

      const result = grouper.groupSeries(channels);

      expect(result.series).toHaveLength(1);
      expect(result.series[0].name).toBe('Breaking Bad');
      expect(result.series[0].episodes).toHaveLength(3);
      expect(result.channels).toHaveLength(0);
    });

    it('deve separar canais normais de episódios', () => {
      const channels: Channel[] = [
        {
          name: 'HBO',
          url: 'http://example.com/hbo',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Breaking Bad S01E01',
          url: 'http://example.com/bb-s01e01',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'ESPN',
          url: 'http://example.com/espn',
          rawMeta: {},
          isHls: true,
        },
      ];

      const result = grouper.groupSeries(channels);

      expect(result.channels).toHaveLength(2);
      expect(result.series).toHaveLength(1);
      expect(result.channels[0].name).toBe('HBO');
      expect(result.channels[1].name).toBe('ESPN');
    });

    it('deve ordenar episódios por temporada e episódio', () => {
      const channels: Channel[] = [
        {
          name: 'Show S02E05',
          url: 'http://example.com/5',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Show S01E03',
          url: 'http://example.com/3',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Show S01E01',
          url: 'http://example.com/1',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Show S02E01',
          url: 'http://example.com/4',
          rawMeta: {},
          isHls: true,
        },
      ];

      const result = grouper.groupSeries(channels);

      expect(result.series[0].episodes[0].season).toBe(1);
      expect(result.series[0].episodes[0].episode).toBe(1);
      expect(result.series[0].episodes[1].season).toBe(1);
      expect(result.series[0].episodes[1].episode).toBe(3);
      expect(result.series[0].episodes[2].season).toBe(2);
      expect(result.series[0].episodes[2].episode).toBe(1);
      expect(result.series[0].episodes[3].season).toBe(2);
      expect(result.series[0].episodes[3].episode).toBe(5);
    });

    it('deve agrupar séries diferentes separadamente', () => {
      const channels: Channel[] = [
        {
          name: 'Breaking Bad S01E01',
          url: 'http://example.com/bb1',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Game of Thrones S01E01',
          url: 'http://example.com/got1',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Breaking Bad S01E02',
          url: 'http://example.com/bb2',
          rawMeta: {},
          isHls: true,
        },
      ];

      const result = grouper.groupSeries(channels);

      expect(result.series).toHaveLength(2);
      
      const bb = result.series.find(s => s.name === 'Breaking Bad');
      const got = result.series.find(s => s.name === 'Game of Thrones');
      
      expect(bb?.episodes).toHaveLength(2);
      expect(got?.episodes).toHaveLength(1);
    });

    it('deve extrair nome da série corretamente com diferentes separadores', () => {
      const channels: Channel[] = [
        {
          name: 'Breaking Bad - S01E01',
          url: 'http://example.com/1',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'Game of Thrones: S01E01',
          url: 'http://example.com/2',
          rawMeta: {},
          isHls: true,
        },
        {
          name: 'The Office_S01E01',
          url: 'http://example.com/3',
          rawMeta: {},
          isHls: true,
        },
      ];

      const result = grouper.groupSeries(channels);

      expect(result.series).toHaveLength(3);
      expect(result.series.map(s => s.name)).toContain('Breaking Bad');
      expect(result.series.map(s => s.name)).toContain('Game of Thrones');
      expect(result.series.map(s => s.name)).toContain('The Office');
    });
  });
});
