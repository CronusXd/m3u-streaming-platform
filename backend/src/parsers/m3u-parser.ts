import axios from 'axios';

export interface Channel {
  name: string;
  url: string;
  tvgId?: string;
  tvgLogo?: string;
  groupTitle?: string;
  language?: string;
  rawMeta: Record<string, string>;
  isHls: boolean;
}

export interface ParseError {
  line: number;
  message: string;
  content?: string;
}

export interface ParseResult {
  channels: Channel[];
  errors: ParseError[];
}

export class M3UParser {
  /**
   * Parse M3U content from string
   */
  parse(content: string): ParseResult {
    const channels: Channel[] = [];
    const errors: ParseError[] = [];

    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    // Verify M3U header
    if (lines.length === 0 || !lines[0].startsWith('#EXTM3U')) {
      errors.push({
        line: 1,
        message: 'Invalid M3U file: Missing #EXTM3U header',
      });
      return { channels, errors };
    }

    let currentMeta: Record<string, string> = {};
    let currentName = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Skip empty lines and comments (except EXTINF)
      if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
        continue;
      }

      // Parse EXTINF line
      if (line.startsWith('#EXTINF:')) {
        try {
          const parsed = this.parseExtinf(line);
          currentMeta = parsed.meta;
          currentName = parsed.name;
        } catch (error) {
          errors.push({
            line: lineNumber,
            message: error instanceof Error ? error.message : 'Failed to parse EXTINF',
            content: line,
          });
        }
      }
      // Parse stream URL
      else if (!line.startsWith('#')) {
        if (!currentName) {
          errors.push({
            line: lineNumber,
            message: 'Stream URL without preceding EXTINF',
            content: line,
          });
          continue;
        }

        try {
          // Extrair logo de múltiplas fontes possíveis
          const logo = currentMeta['tvg-logo'] 
            || currentMeta['logo'] 
            || currentMeta['tvg-icon']
            || currentMeta['icon']
            || 'NO_IMAGE';

          const channel: Channel = {
            name: currentName,
            url: line,
            tvgId: currentMeta['tvg-id'],
            tvgLogo: logo,
            groupTitle: currentMeta['group-title'] || currentMeta['group'] || 'Outros',
            language: currentMeta['language'] || currentMeta['tvg-language'] || 'pt',
            rawMeta: currentMeta,
            isHls: this.isHLS(line),
          };

          channels.push(channel);

          // Reset for next channel
          currentMeta = {};
          currentName = '';
        } catch (error) {
          errors.push({
            line: lineNumber,
            message: error instanceof Error ? error.message : 'Failed to create channel',
            content: line,
          });
        }
      }
    }

    return { channels, errors };
  }

  /**
   * Parse M3U from URL
   */
  async parseFromUrl(url: string): Promise<ParseResult> {
    try {
      const response = await axios.get(url, {
        timeout: 60000, // 60 seconds
        maxContentLength: 100 * 1024 * 1024, // 100MB
        maxBodyLength: 100 * 1024 * 1024, // 100MB
      });

      return this.parse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to download M3U from URL: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse M3U from file buffer
   */
  parseFromFile(buffer: Buffer): ParseResult {
    const content = buffer.toString('utf-8');
    return this.parse(content);
  }

  /**
   * Parse EXTINF line to extract metadata and channel name
   * Format: #EXTINF:duration tvg-id="id" tvg-logo="logo" group-title="group",Channel Name
   */
  private parseExtinf(line: string): { meta: Record<string, string>; name: string } {
    const meta: Record<string, string> = {};

    // Remove #EXTINF: prefix
    const content = line.substring(8);

    // Find the comma that separates metadata from channel name
    const commaIndex = content.lastIndexOf(',');
    if (commaIndex === -1) {
      throw new Error('Invalid EXTINF format: Missing comma separator');
    }

    const metaPart = content.substring(0, commaIndex);
    const name = content.substring(commaIndex + 1).trim();

    if (!name) {
      throw new Error('Invalid EXTINF format: Missing channel name');
    }

    // Extract attributes using regex
    // Matches: attribute="value" or attribute='value' or attribute=value
    const attrRegex = /(\S+?)=["']([^"']*?)["']|(\S+?)=(\S+)/g;
    let match;

    while ((match = attrRegex.exec(metaPart)) !== null) {
      if (match[1] && match[2] !== undefined) {
        // Formato: attribute="value" ou attribute='value'
        meta[match[1]] = match[2];
      } else if (match[3] && match[4]) {
        // Formato: attribute=value (sem aspas)
        meta[match[3]] = match[4];
      }
    }

    // Normalizar nomes de atributos comuns
    if (meta['tvg-logo']) meta['logo'] = meta['tvg-logo'];
    if (meta['tvg-name']) meta['name'] = meta['tvg-name'];
    if (meta['group-title']) meta['group'] = meta['group-title'];

    return { meta, name };
  }

  /**
   * Check if URL is HLS stream
   */
  private isHLS(url: string): boolean {
    // Check for .m3u8 extension
    if (url.toLowerCase().includes('.m3u8')) {
      return true;
    }

    // Check for common HLS patterns
    const hlsPatterns = ['/hls/', '/live/', '/stream/', 'playlist.m3u8', 'master.m3u8'];

    return hlsPatterns.some((pattern) => url.toLowerCase().includes(pattern));
  }
}
