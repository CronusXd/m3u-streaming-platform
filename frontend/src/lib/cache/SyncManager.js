/**
 * SyncManager - Sistema de Sincronização e Atualização
 * 
 * Gerencia verificação de atualizações e sincronização de dados
 * entre cache local e servidor.
 * 
 * @example
 * const sync = new SyncManager(cacheManager);
 * const hasUpdates = await sync.checkForUpdates('filmes', '/api/filmes/version');
 * if (hasUpdates) {
 *   await sync.updateSection('filmes', '/api/filmes');
 * }
 */

/// <reference path="./cache.types.js" />

export class SyncManager {
  /**
   * @param {Object} cacheManager - Instância do CacheManager
   */
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    
    /**
     * Versões conhecidas das seções
     * @type {Map<string, string>}
     * @private
     */
    this.versions = new Map();
    
    /**
     * Timestamps de última verificação
     * @type {Map<string, number>}
     * @private
     */
    this.lastChecks = new Map();
    
    /**
     * Intervalo mínimo entre verificações (5 minutos)
     * @private
     */
    this.checkInterval = 5 * 60 * 1000;
  }

  /**
   * Verifica se há atualizações disponíveis para uma seção
   * 
   * @param {string} section - Nome da seção
   * @param {string} versionUrl - URL para verificar versão
   * @returns {Promise<boolean>} - true se há atualizações
   * 
   * @example
   * const hasUpdates = await sync.checkForUpdates('filmes', '/api/filmes/version');
   */
  async checkForUpdates(section, versionUrl) {
    try {
      // Verificar se já checou recentemente
      const lastCheck = this.lastChecks.get(section);
      const now = Date.now();
      
      if (lastCheck && (now - lastCheck) < this.checkInterval) {
        return false; // Não verificar novamente tão cedo
      }

      // Buscar versão do servidor
      const response = await fetch(versionUrl);
      
      if (!response.ok) {
        console.warn(`Failed to check version for ${section}: ${response.status}`);
        return false;
      }

      const serverVersion = await response.text();
      
      // Atualizar timestamp de última verificação
      this.lastChecks.set(section, now);

      // Comparar com versão conhecida
      const knownVersion = this.versions.get(section);
      
      if (!knownVersion) {
        // Primeira vez, salvar versão
        this.versions.set(section, serverVersion);
        return false;
      }

      // Verificar se mudou
      if (serverVersion !== knownVersion) {
        console.log(`Update available for ${section}: ${knownVersion} -> ${serverVersion}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Failed to check for updates for ${section}:`, error);
      return false;
    }
  }

  /**
   * Atualiza uma seção específica
   * 
   * @param {string} section - Nome da seção
   * @param {string} dataUrl - URL para baixar dados
   * @returns {Promise<boolean>} - true se atualizou com sucesso
   * 
   * @example
   * await sync.updateSection('filmes', '/api/filmes');
   */
  async updateSection(section, dataUrl) {
    try {
      console.log(`Updating ${section}...`);

      // Baixar novos dados
      const response = await fetch(dataUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Remover cache antigo
      await this.cacheManager.clear(section);

      // Salvar novos dados
      await this.cacheManager.save(section, data);

      console.log(`Updated ${section} successfully`);

      // Emitir evento
      if (this.cacheManager.eventEmitter) {
        this.cacheManager.eventEmitter.emit('sync:updated', {
          section,
          timestamp: Date.now()
        });
      }

      return true;

    } catch (error) {
      console.error(`Failed to update ${section}:`, error);
      
      // Emitir evento de erro
      if (this.cacheManager.eventEmitter) {
        this.cacheManager.eventEmitter.emit('sync:error', {
          section,
          error: error.message
        });
      }

      return false;
    }
  }

  /**
   * Atualiza todas as seções
   * 
   * @param {Object.<string, string>} sectionsUrls - Mapa de seção -> URL
   * @returns {Promise<Object>} - Resultado das atualizações
   * 
   * @example
   * const result = await sync.updateAll({
   *   filmes: '/api/filmes',
   *   series: '/api/series'
   * });
   */
  async updateAll(sectionsUrls) {
    const results = {
      success: [],
      failed: []
    };

    for (const [section, url] of Object.entries(sectionsUrls)) {
      const success = await this.updateSection(section, url);
      
      if (success) {
        results.success.push(section);
      } else {
        results.failed.push(section);
      }
    }

    console.log(`Update complete: ${results.success.length} success, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Verifica atualizações para todas as seções
   * 
   * @param {Object.<string, string>} sectionsVersionUrls - Mapa de seção -> URL de versão
   * @returns {Promise<string[]>} - Seções que têm atualizações
   * 
   * @example
   * const updates = await sync.checkAllForUpdates({
   *   filmes: '/api/filmes/version',
   *   series: '/api/series/version'
   * });
   */
  async checkAllForUpdates(sectionsVersionUrls) {
    const sectionsWithUpdates = [];

    for (const [section, versionUrl] of Object.entries(sectionsVersionUrls)) {
      const hasUpdate = await this.checkForUpdates(section, versionUrl);
      
      if (hasUpdate) {
        sectionsWithUpdates.push(section);
      }
    }

    return sectionsWithUpdates;
  }

  /**
   * Atualiza seções em background sem bloquear
   * 
   * @param {Object.<string, string>} sectionsUrls - Mapa de seção -> URL
   * @returns {void}
   * 
   * @example
   * sync.updateInBackground({
   *   filmes: '/api/filmes',
   *   series: '/api/series'
   * });
   */
  updateInBackground(sectionsUrls) {
    // Executar em background sem await
    this.updateAll(sectionsUrls).catch(error => {
      console.error('Background update failed:', error);
    });
  }

  /**
   * Define versão conhecida de uma seção
   * 
   * @param {string} section - Nome da seção
   * @param {string} version - Versão
   * 
   * @example
   * sync.setVersion('filmes', 'v1.2.3');
   */
  setVersion(section, version) {
    this.versions.set(section, version);
  }

  /**
   * Obtém versão conhecida de uma seção
   * 
   * @param {string} section - Nome da seção
   * @returns {string|null} - Versão ou null
   * 
   * @example
   * const version = sync.getVersion('filmes');
   */
  getVersion(section) {
    return this.versions.get(section) || null;
  }

  /**
   * Limpa histórico de versões
   * 
   * @example
   * sync.clearVersions();
   */
  clearVersions() {
    this.versions.clear();
    this.lastChecks.clear();
  }

  /**
   * Obtém informações sobre sincronização
   * 
   * @returns {Object} - Informações
   * 
   * @example
   * const info = sync.getInfo();
   */
  getInfo() {
    return {
      versionsCount: this.versions.size,
      versions: Object.fromEntries(this.versions),
      lastChecks: Object.fromEntries(this.lastChecks),
      checkInterval: this.checkInterval
    };
  }
}

export default SyncManager;
