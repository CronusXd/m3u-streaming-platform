/**
 * EventEmitter - Sistema de Eventos para Comunicação Assíncrona
 * 
 * Implementa um sistema simples de pub/sub para emitir e escutar eventos
 * no sistema de cache.
 * 
 * @example
 * const emitter = new EventEmitter();
 * emitter.on('download:progress', (data) => console.log(data));
 * emitter.emit('download:progress', { progress: 50 });
 */

/// <reference path="./cache.types.js" />

export class EventEmitter {
  constructor() {
    /**
     * Mapa de eventos e seus listeners
     * @type {Map<string, Set<EventCallback>>}
     * @private
     */
    this.events = new Map();
  }

  /**
   * Registra um listener para um evento
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Função callback
   * @returns {EventEmitter} - Retorna this para encadeamento
   * 
   * @example
   * emitter.on('cache:save', (data) => {
   *   console.log('Cache salvo:', data.section);
   * });
   */
  on(event, callback) {
    // Validação de parâmetros
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Criar Set de listeners se não existir
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    // Adicionar callback ao Set
    this.events.get(event).add(callback);

    return this;
  }

  /**
   * Remove um listener de um evento
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Função callback a remover
   * @returns {EventEmitter} - Retorna this para encadeamento
   * 
   * @example
   * const handler = (data) => console.log(data);
   * emitter.on('cache:load', handler);
   * emitter.off('cache:load', handler);
   */
  off(event, callback) {
    // Validação de parâmetros
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Verificar se o evento existe
    if (!this.events.has(event)) {
      return this;
    }

    // Remover callback do Set
    const listeners = this.events.get(event);
    listeners.delete(callback);

    // Remover o evento se não houver mais listeners
    if (listeners.size === 0) {
      this.events.delete(event);
    }

    return this;
  }

  /**
   * Emite um evento, chamando todos os listeners registrados
   * 
   * @param {string} event - Nome do evento
   * @param {*} data - Dados a serem passados para os listeners
   * @returns {boolean} - true se havia listeners, false caso contrário
   * 
   * @example
   * emitter.emit('download:complete', {
   *   section: 'filmes',
   *   size: 1024000,
   *   duration: 5000
   * });
   */
  emit(event, data) {
    // Validação de parâmetros
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    // Verificar se há listeners para este evento
    if (!this.events.has(event)) {
      return false;
    }

    // Obter listeners
    const listeners = this.events.get(event);

    // Chamar cada listener com os dados
    // Usar try-catch para evitar que um erro em um listener afete os outros
    let hasError = false;
    
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        hasError = true;
        console.error(`Error in event listener for "${event}":`, error);
      }
    });

    return !hasError;
  }

  /**
   * Registra um listener que será executado apenas uma vez
   * 
   * @param {string} event - Nome do evento
   * @param {EventCallback} callback - Função callback
   * @returns {EventEmitter} - Retorna this para encadeamento
   * 
   * @example
   * emitter.once('init:complete', (data) => {
   *   console.log('Inicialização completa!');
   * });
   */
  once(event, callback) {
    // Validação de parâmetros
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Criar wrapper que remove o listener após execução
    const onceWrapper = (data) => {
      // Remover o listener
      this.off(event, onceWrapper);
      
      // Executar o callback original
      callback(data);
    };

    // Registrar o wrapper
    this.on(event, onceWrapper);

    return this;
  }

  /**
   * Remove todos os listeners de um evento específico
   * ou de todos os eventos se nenhum evento for especificado
   * 
   * @param {string} [event] - Nome do evento (opcional)
   * @returns {EventEmitter} - Retorna this para encadeamento
   * 
   * @example
   * // Remover todos os listeners de um evento
   * emitter.removeAllListeners('cache:save');
   * 
   * // Remover todos os listeners de todos os eventos
   * emitter.removeAllListeners();
   */
  removeAllListeners(event) {
    if (event) {
      // Remover listeners de um evento específico
      if (typeof event !== 'string' || !event) {
        throw new Error('Event name must be a non-empty string');
      }
      this.events.delete(event);
    } else {
      // Remover todos os listeners
      this.events.clear();
    }

    return this;
  }

  /**
   * Retorna o número de listeners para um evento
   * 
   * @param {string} event - Nome do evento
   * @returns {number} - Número de listeners
   * 
   * @example
   * const count = emitter.listenerCount('download:progress');
   * console.log(`${count} listeners registrados`);
   */
  listenerCount(event) {
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    if (!this.events.has(event)) {
      return 0;
    }

    return this.events.get(event).size;
  }

  /**
   * Retorna array com os nomes de todos os eventos registrados
   * 
   * @returns {string[]} - Array com nomes dos eventos
   * 
   * @example
   * const events = emitter.eventNames();
   * console.log('Eventos registrados:', events);
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Retorna array com todos os listeners de um evento
   * 
   * @param {string} event - Nome do evento
   * @returns {EventCallback[]} - Array com os listeners
   * 
   * @example
   * const listeners = emitter.listeners('cache:load');
   * console.log(`${listeners.length} listeners`);
   */
  listeners(event) {
    if (typeof event !== 'string' || !event) {
      throw new Error('Event name must be a non-empty string');
    }

    if (!this.events.has(event)) {
      return [];
    }

    return Array.from(this.events.get(event));
  }
}

export default EventEmitter;
