/**
 * ChunkingModule - Divisão de Dados Grandes em Chunks
 * 
 * Divide dados grandes em chunks menores para evitar sobrecarga de memória
 * e facilitar o salvamento incremental no IndexedDB.
 * 
 * @example
 * const chunking = new ChunkingModule(5 * 1024 * 1024); // 5MB
 * const chunks = chunking.split('filmes', largeData);
 * const reconstructed = chunking.merge(chunks);
 */

/// <reference path="./cache.types.js" />

import { CACHE_CONFIG } from './cache.config.js';

export class ChunkingModule {
  /**
   * @param {number} chunkSize - Tamanho máximo do chunk em bytes (padrão: 5MB)
   */
  constructor(chunkSize = CACHE_CONFIG.CHUNK_SIZE) {
    this.chunkSize = chunkSize;
  }

  /**
   * Verifica se os dados devem ser divididos em chunks
   * 
   * @param {*} data - Dados a verificar
   * @returns {boolean} - true se deve dividir
   * 
   * @example
   * if (chunking.shouldChunk(data)) {
   *   const chunks = chunking.split('section', data);
   * }
   */
  shouldChunk(data) {
    try {
      const size = this._estimateSize(data);
      return size > this.chunkSize;
    } catch (error) {
      console.error('Failed to check if should chunk:', error);
      return false;
    }
  }

  /**
   * Divide dados em chunks
   * 
   * @param {string} sectionName - Nome da seção
   * @param {*} data - Dados a dividir
   * @returns {SectionData[]} - Array de chunks
   * 
   * @example
   * const chunks = chunking.split('filmes', largeData);
   * // Retorna: [
   * //   { sectionName: 'filmes:chunk:0', data: '...', chunks: 3, chunkIndex: 0 },
   * //   { sectionName: 'filmes:chunk:1', data: '...', chunks: 3, chunkIndex: 1 },
   * //   { sectionName: 'filmes:chunk:2', data: '...', chunks: 3, chunkIndex: 2 }
   * // ]
   */
  split(sectionName, data) {
    try {
      // Serializar dados para string
      const serialized = JSON.stringify(data);
      const totalSize = new Blob([serialized]).size;

      // Se não precisa dividir, retornar como único chunk
      if (totalSize <= this.chunkSize) {
        return [{
          sectionName,
          data,
          chunks: 1,
          chunkIndex: 0
        }];
      }

      // Calcular número de chunks necessários
      const totalChunks = Math.ceil(totalSize / this.chunkSize);
      const chunks = [];

      // Dividir a string em partes
      const chunkLength = Math.ceil(serialized.length / totalChunks);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkLength;
        const end = Math.min(start + chunkLength, serialized.length);
        const chunkData = serialized.slice(start, end);

        chunks.push({
          sectionName: `${sectionName}:chunk:${i}`,
          data: chunkData,
          chunks: totalChunks,
          chunkIndex: i
        });
      }

      return chunks;

    } catch (error) {
      console.error('Failed to split data into chunks:', error);
      // Retornar dados originais como único chunk em caso de erro
      return [{
        sectionName,
        data,
        chunks: 1,
        chunkIndex: 0
      }];
    }
  }

  /**
   * Reconstrói dados a partir de chunks
   * 
   * @param {SectionData[]} chunks - Array de chunks
   * @returns {*} - Dados reconstruídos
   * 
   * @example
   * const data = chunking.merge(chunks);
   */
  merge(chunks) {
    try {
      // Se for apenas um chunk, retornar direto
      if (!chunks || chunks.length === 0) {
        return null;
      }

      if (chunks.length === 1 && chunks[0].chunks === 1) {
        return chunks[0].data;
      }

      // Ordenar chunks por índice
      const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

      // Verificar se todos os chunks estão presentes
      const totalChunks = sortedChunks[0].chunks;
      if (sortedChunks.length !== totalChunks) {
        throw new Error(`Missing chunks. Expected ${totalChunks}, got ${sortedChunks.length}`);
      }

      // Concatenar todas as partes
      let concatenated = '';
      for (const chunk of sortedChunks) {
        concatenated += chunk.data;
      }

      // Parsear JSON
      return JSON.parse(concatenated);

    } catch (error) {
      console.error('Failed to merge chunks:', error);
      throw new Error(`Failed to reconstruct data from chunks: ${error.message}`);
    }
  }

  /**
   * Estima o número de chunks necessários
   * 
   * @param {*} data - Dados a estimar
   * @returns {number} - Número estimado de chunks
   * 
   * @example
   * const numChunks = chunking.estimateChunks(data);
   * console.log(`Serão necessários ${numChunks} chunks`);
   */
  estimateChunks(data) {
    try {
      const size = this._estimateSize(data);
      return Math.ceil(size / this.chunkSize);
    } catch (error) {
      console.error('Failed to estimate chunks:', error);
      return 1;
    }
  }

  /**
   * Valida se um array de chunks está completo e válido
   * 
   * @param {SectionData[]} chunks - Array de chunks
   * @returns {boolean} - true se válido
   * 
   * @example
   * if (chunking.validateChunks(chunks)) {
   *   const data = chunking.merge(chunks);
   * }
   */
  validateChunks(chunks) {
    try {
      if (!chunks || chunks.length === 0) {
        return false;
      }

      // Se for único chunk
      if (chunks.length === 1) {
        return chunks[0].chunks === 1 && chunks[0].chunkIndex === 0;
      }

      // Verificar se todos têm o mesmo número total de chunks
      const totalChunks = chunks[0].chunks;
      const allSameTotal = chunks.every(chunk => chunk.chunks === totalChunks);
      
      if (!allSameTotal) {
        return false;
      }

      // Verificar se todos os índices estão presentes
      const indices = chunks.map(chunk => chunk.chunkIndex).sort((a, b) => a - b);
      const expectedIndices = Array.from({ length: totalChunks }, (_, i) => i);
      
      return JSON.stringify(indices) === JSON.stringify(expectedIndices);

    } catch (error) {
      console.error('Failed to validate chunks:', error);
      return false;
    }
  }

  /**
   * Extrai o nome da seção original de um nome de chunk
   * 
   * @param {string} chunkName - Nome do chunk (ex: 'filmes:chunk:0')
   * @returns {string} - Nome da seção original (ex: 'filmes')
   * 
   * @example
   * const section = chunking.getSectionName('filmes:chunk:0');
   * // Retorna: 'filmes'
   */
  getSectionName(chunkName) {
    if (!chunkName || typeof chunkName !== 'string') {
      return chunkName;
    }

    // Se não contém ':chunk:', retornar como está
    if (!chunkName.includes(':chunk:')) {
      return chunkName;
    }

    // Extrair parte antes de ':chunk:'
    return chunkName.split(':chunk:')[0];
  }

  /**
   * Verifica se um nome é de um chunk
   * 
   * @param {string} name - Nome a verificar
   * @returns {boolean} - true se for nome de chunk
   * 
   * @example
   * if (chunking.isChunkName('filmes:chunk:0')) {
   *   // É um chunk
   * }
   */
  isChunkName(name) {
    return typeof name === 'string' && name.includes(':chunk:');
  }

  /**
   * Obtém informações sobre um chunk a partir do nome
   * 
   * @param {string} chunkName - Nome do chunk
   * @returns {Object|null} - { section, index } ou null
   * 
   * @example
   * const info = chunking.getChunkInfo('filmes:chunk:2');
   * // Retorna: { section: 'filmes', index: 2 }
   */
  getChunkInfo(chunkName) {
    if (!this.isChunkName(chunkName)) {
      return null;
    }

    try {
      const parts = chunkName.split(':chunk:');
      return {
        section: parts[0],
        index: parseInt(parts[1], 10)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Estima o tamanho dos dados em bytes
   * @private
   * @param {*} data - Dados a estimar
   * @returns {number} - Tamanho em bytes
   */
  _estimateSize(data) {
    try {
      if (typeof data === 'string') {
        return new Blob([data]).size;
      }
      
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.error('Failed to estimate size:', error);
      return 0;
    }
  }

  /**
   * Retorna informações sobre o módulo
   * 
   * @returns {Object} - Informações do módulo
   * 
   * @example
   * const info = chunking.getInfo();
   * console.log('Tamanho do chunk:', info.chunkSizeMB, 'MB');
   */
  getInfo() {
    return {
      chunkSize: this.chunkSize,
      chunkSizeMB: (this.chunkSize / (1024 * 1024)).toFixed(2),
      chunkSizeKB: (this.chunkSize / 1024).toFixed(2)
    };
  }
}

export default ChunkingModule;
