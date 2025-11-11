import { M3UParser } from './m3u-parser';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('M3UParser', () => {
  let parser: M3UParser;

  beforeEach(() => {
    parser = new M3UParser();
    jest.clearAllMocks();
  });

  describe('parse', () => {
    it('should parse valid M3U content with single channel', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test1" tvg-logo="https://example.com/logo.png" group-title="Test Group",Test Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      const channel = result.channels[0];
      expect(channel.name).toBe('Test Channel');
      expect(channel.url).toBe('https://example.com/stream.m3u8');
      expect(channel.tvgId).toBe('test1');
      expect(channel.tvgLogo).toBe('https://example.com/logo.png');
      expect(channel.groupTitle).toBe('Test Group');
      expect(channel.isHls).toBe(true);
    });

    it('should parse multiple channels', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="ch1" group-title="News",Channel 1
https://example.com/ch1.m3u8
#EXTINF:-1 tvg-id="ch2" group-title="Sports",Channel 2
https://example.com/ch2.m3u8
#EXTINF:-1 tvg-id="ch3" group-title="Movies",Channel 3
https://example.com/ch3.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.channels[0].name).toBe('Channel 1');
      expect(result.channels[1].name).toBe('Channel 2');
      expect(result.channels[2].name).toBe('Channel 3');
    });

    it('should handle channels with language attribute', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test" language="pt-BR" group-title="Test",Test Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].language).toBe('pt-BR');
    });

    it('should store all metadata in rawMeta', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test" tvg-logo="logo.png" group-title="Group" custom-attr="value",Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels[0].rawMeta).toEqual({
        'tvg-id': 'test',
        'tvg-logo': 'logo.png',
        'group-title': 'Group',
        'custom-attr': 'value',
      });
    });

    it('should identify HLS streams by .m3u8 extension', () => {
      const content = `#EXTM3U
#EXTINF:-1,HLS Channel
https://example.com/stream.m3u8
#EXTINF:-1,Non-HLS Channel
https://example.com/stream.mp4`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(2);
      expect(result.channels[0].isHls).toBe(true);
      expect(result.channels[1].isHls).toBe(false);
    });

    it('should identify HLS streams by URL patterns', () => {
      const hlsUrls = [
        'https://example.com/hls/stream',
        'https://example.com/live/channel',
        'https://example.com/stream/playlist.m3u8',
        'https://example.com/master.m3u8',
      ];

      hlsUrls.forEach((url, index) => {
        const content = `#EXTM3U\n#EXTINF:-1,Channel ${index}\n${url}`;
        const result = parser.parse(content);
        expect(result.channels[0].isHls).toBe(true);
      });
    });

    it('should handle malformed content gracefully', () => {
      const content = `#EXTM3U
#EXTINF:-1 invalid format without comma
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('comma');
    });

    it('should return error for missing #EXTM3U header', () => {
      const content = `#EXTINF:-1,Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('#EXTM3U');
    });

    it('should handle empty content', () => {
      const result = parser.parse('');

      expect(result.channels).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should skip comment lines', () => {
      const content = `#EXTM3U
# This is a comment
#EXTINF:-1,Channel 1
https://example.com/ch1.m3u8
# Another comment
#EXTINF:-1,Channel 2
https://example.com/ch2.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const content = '#EXTM3U\r\n#EXTINF:-1,Channel\r\nhttps://example.com/stream.m3u8';

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for URL without EXTINF', () => {
      const content = `#EXTM3U
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('without preceding EXTINF');
    });

    it('should handle channels with special characters in name', () => {
      const content = `#EXTM3U
#EXTINF:-1,Channel & Name "Special" 'Chars'
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('Channel & Name "Special" \'Chars\'');
    });
  });

  describe('parseFromUrl', () => {
    it('should download and parse M3U from URL', async () => {
      const mockContent = `#EXTM3U
#EXTINF:-1,Test Channel
https://example.com/stream.m3u8`;

      mockedAxios.get.mockResolvedValue({ data: mockContent });

      const result = await parser.parseFromUrl('https://example.com/playlist.m3u');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/playlist.m3u', {
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
      });
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('Test Channel');
    });

    it('should throw error on download failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(parser.parseFromUrl('https://example.com/playlist.m3u')).rejects.toThrow();
    });

    it('should handle axios errors', async () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Request timeout',
      };
      mockedAxios.get.mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(parser.parseFromUrl('https://example.com/playlist.m3u')).rejects.toThrow(
        'Failed to download M3U from URL'
      );
    });
  });

  describe('parseFromFile', () => {
    it('should parse M3U from buffer', () => {
      const content = `#EXTM3U
#EXTINF:-1,Test Channel
https://example.com/stream.m3u8`;

      const buffer = Buffer.from(content, 'utf-8');
      const result = parser.parseFromFile(buffer);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('Test Channel');
    });

    it('should handle UTF-8 encoded content', () => {
      const content = `#EXTM3U
#EXTINF:-1,Canal Português
https://example.com/stream.m3u8`;

      const buffer = Buffer.from(content, 'utf-8');
      const result = parser.parseFromFile(buffer);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('Canal Português');
    });
  });

  describe('coverage edge cases', () => {
    it('should handle attributes with single quotes', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id='test' tvg-logo='logo.png',Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels[0].tvgId).toBe('test');
      expect(result.channels[0].tvgLogo).toBe('logo.png');
    });

    it('should handle mixed quote styles', () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test" tvg-logo='logo.png',Channel
https://example.com/stream.m3u8`;

      const result = parser.parse(content);

      expect(result.channels[0].tvgId).toBe('test');
      expect(result.channels[0].tvgLogo).toBe('logo.png');
    });

    it('should handle case-insensitive HLS detection', () => {
      const content = `#EXTM3U
#EXTINF:-1,Channel
https://example.com/STREAM.M3U8`;

      const result = parser.parse(content);

      expect(result.channels[0].isHls).toBe(true);
    });
  });
});
