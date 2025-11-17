/**
 * PriorityManager - Gerenciamento de Priorização de Downloads
 * 
 * Gerencia prioridades dinâmicas de downloads, permitindo que
 * seções sejam priorizadas quando o usuário as acessa.
 * 
 * @example
 * const priority = new PriorityManager(downloadManager);
 * await priority.prioritizeSection('filmes');
 */

/// <reference path="./cache.types.js" />

import { PRIORITY, SECTIONS } from './cache.config.js';

export class PriorityManager {
  /**
   * @param {Object} downloadManager - Instância do DownloadManager
   */
  constructor(downloadManager) {
    this.downloadManager = downloadManager;
    
    /**
     * Mapa de prioridades por seção
     * @type {Map<string, number>}
     * @private
     */
    this.priorities = new Map();

    // Inicializar prioridades padrão
    this._initializeDefaultPriorities();
  }

  /**
   * Define prioridade de uma seção
   * 
   * @param {string} section - Nome da seção
   * @param {number} priority - Prioridade (0=baixa, 1=média, 2=alta)
   * 
   * @example
   * priority.setPriority('filmes', PRIORITY.HIGH);
   */
  setPriority(section, priority) {
    // Validar prioridade
    if (priority < PRIORITY.LOW || priority > PRIORITY.HIGH) {
      console.warn(`Invalid priority ${priority}. Using LOW.`);
      priority = PRIORITY.LOW;
    }

    this.priorities.set(section, priority);
  }

  /**
   * Obtém prioridade de uma seção
   * 
   * @param {string} section - Nome da seção
   * @returns {number} - Prioridade
   * 
   * @example
   * const priority = manager.getPriority('filmes');
   */
  getPriority(section) {
    return this.priorities.get(section) || PRIORITY.LOW;
  }

  /**
   * Prioriza uma seção, cancelando downloads de baixa prioridade
   * 
   * @param {string} section - Nome da seção a priorizar
   * @returns {Promise<void>}
   * 
   * @example
   * // Usuário clicou em "FILMES"
   * await priority.prioritizeSection('filmes');
   */
  async prioritizeSection(section) {
    console.log(`Prioritizing section: ${section}`);

    // 1. Cancelar downloads de baixa prioridade que não sejam a seção atual
    await this._cancelLowPriorityDownloads(section);

    // 2. Aumentar prioridade da seção
    this.setPriority(section, PRIORITY.HIGH);

    // 3. Reduzir prioridade de outras seções
    this.deprioritizeOthers(section);

    // 4. Reordenar fila
    this.reorderQueue();

    // 5. Se a seção não estiver na fila, adicionar com alta prioridade
    const queueItem = this.downloadManager.queue.find(item => item.section === section);
    if (!queueItem) {
      console.log(`Section ${section} not in queue. It may need to be enqueued separately.`);
    }
  }

  /**
   * Reduz prioridade de outras seções
   * 
   * @param {string} exceptSection - Seção a não reduzir
   * 
   * @example
   * priority.deprioritizeOthers('filmes');
   */
  deprioritizeOthers(exceptSection) {
    for (const [section, currentPriority] of this.priorities.entries()) {
      if (section !== exceptSection && currentPriority > PRIORITY.LOW) {
        this.setPriority(section, PRIORITY.LOW);
      }
    }
  }

  /**
   * Reordena fila do DownloadManager baseado nas prioridades
   * 
   * @example
   * priority.reorderQueue();
   */
  reorderQueue() {
    if (!this.downloadManager || !this.downloadManager.queue) {
      return;
    }

    // Atualizar prioridades dos itens na fila
    for (const item of this.downloadManager.queue) {
      const priority = this.getPriority(item.section);
      item.priority = priority;
    }

    // Reordenar fila
    this.downloadManager._sortQueue();
  }

  /**
   * Cancela downloads de baixa prioridade
   * @private
   * @param {string} exceptSection - Seção a não cancelar
   */
  async _cancelLowPriorityDownloads(exceptSection) {
    if (!this.downloadManager || !this.downloadManager.queue) {
      return;
    }

    const itemsToCancel = this.downloadManager.queue.filter(item => {
      return item.section !== exceptSection && 
             item.priority < PRIORITY.HIGH &&
             item.status === 'downloading';
    });

    for (const item of itemsToCancel) {
      console.log(`Cancelling low priority download: ${item.section}`);
      await this.downloadManager.cancel(item.section);
    }
  }

  /**
   * Inicializa prioridades padrão
   * @private
   */
  _initializeDefaultPriorities() {
    // Todas as seções começam com prioridade baixa
    for (const section of Object.values(SECTIONS)) {
      this.priorities.set(section, PRIORITY.LOW);
    }
  }

  /**
   * Reseta todas as prioridades para baixa
   * 
   * @example
   * priority.resetPriorities();
   */
  resetPriorities() {
    for (const section of this.priorities.keys()) {
      this.setPriority(section, PRIORITY.LOW);
    }
  }

  /**
   * Obtém todas as prioridades
   * 
   * @returns {Object.<string, number>} - Mapa de seção -> prioridade
   * 
   * @example
   * const priorities = manager.getAllPriorities();
   * console.log('Filmes:', priorities.filmes);
   */
  getAllPriorities() {
    const result = {};
    
    for (const [section, priority] of this.priorities.entries()) {
      result[section] = priority;
    }

    return result;
  }

  /**
   * Obtém seções por prioridade
   * 
   * @param {number} priority - Prioridade
   * @returns {string[]} - Array de seções
   * 
   * @example
   * const highPriority = manager.getSectionsByPriority(PRIORITY.HIGH);
   */
  getSectionsByPriority(priority) {
    const sections = [];

    for (const [section, sectionPriority] of this.priorities.entries()) {
      if (sectionPriority === priority) {
        sections.push(section);
      }
    }

    return sections;
  }

  /**
   * Obtém seção com maior prioridade
   * 
   * @returns {string|null} - Nome da seção ou null
   * 
   * @example
   * const topSection = manager.getHighestPrioritySection();
   */
  getHighestPrioritySection() {
    let highestPriority = -1;
    let highestSection = null;

    for (const [section, priority] of this.priorities.entries()) {
      if (priority > highestPriority) {
        highestPriority = priority;
        highestSection = section;
      }
    }

    return highestSection;
  }

  /**
   * Verifica se uma seção tem alta prioridade
   * 
   * @param {string} section - Nome da seção
   * @returns {boolean} - true se tem alta prioridade
   * 
   * @example
   * if (manager.isHighPriority('filmes')) {
   *   // Seção tem alta prioridade
   * }
   */
  isHighPriority(section) {
    return this.getPriority(section) === PRIORITY.HIGH;
  }

  /**
   * Aumenta prioridade de uma seção em 1 nível
   * 
   * @param {string} section - Nome da seção
   * 
   * @example
   * priority.increasePriority('series');
   */
  increasePriority(section) {
    const currentPriority = this.getPriority(section);
    const newPriority = Math.min(currentPriority + 1, PRIORITY.HIGH);
    this.setPriority(section, newPriority);
  }

  /**
   * Diminui prioridade de uma seção em 1 nível
   * 
   * @param {string} section - Nome da seção
   * 
   * @example
   * priority.decreasePriority('canais');
   */
  decreasePriority(section) {
    const currentPriority = this.getPriority(section);
    const newPriority = Math.max(currentPriority - 1, PRIORITY.LOW);
    this.setPriority(section, newPriority);
  }

  /**
   * Obtém estatísticas de priorização
   * 
   * @returns {Object} - Estatísticas
   * 
   * @example
   * const stats = manager.getStats();
   * console.log('Seções de alta prioridade:', stats.highPriority);
   */
  getStats() {
    const stats = {
      total: this.priorities.size,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };

    for (const priority of this.priorities.values()) {
      if (priority === PRIORITY.HIGH) {
        stats.highPriority++;
      } else if (priority === PRIORITY.MEDIUM) {
        stats.mediumPriority++;
      } else {
        stats.lowPriority++;
      }
    }

    return stats;
  }

  /**
   * Obtém nome legível da prioridade
   * 
   * @param {number} priority - Prioridade numérica
   * @returns {string} - Nome da prioridade
   * 
   * @example
   * const name = PriorityManager.getPriorityName(PRIORITY.HIGH);
   * // Retorna: 'HIGH'
   */
  static getPriorityName(priority) {
    switch (priority) {
      case PRIORITY.HIGH:
        return 'HIGH';
      case PRIORITY.MEDIUM:
        return 'MEDIUM';
      case PRIORITY.LOW:
        return 'LOW';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Obtém informações sobre o gerenciador
   * 
   * @returns {Object} - Informações
   * 
   * @example
   * const info = manager.getInfo();
   * console.log('Seções gerenciadas:', info.sectionsCount);
   */
  getInfo() {
    const stats = this.getStats();
    const highestSection = this.getHighestPrioritySection();

    return {
      sectionsCount: this.priorities.size,
      highPriorityCount: stats.highPriority,
      mediumPriorityCount: stats.mediumPriority,
      lowPriorityCount: stats.lowPriority,
      highestPrioritySection: highestSection,
      priorities: this.getAllPriorities()
    };
  }
}

export default PriorityManager;
