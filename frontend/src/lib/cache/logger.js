/**
 * Logger - Sistema de Logging
 * 
 * Fornece logging estruturado com níveis e formatação.
 */

/**
 * Níveis de log
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

/**
 * Classe Logger
 */
export class Logger {
  /**
   * @param {string} name - Nome do logger
   * @param {number} level - Nível mínimo de log
   */
  constructor(name = 'Cache', level = LogLevel.INFO) {
    this.name = name;
    this.level = level;
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * Log debug
   * @param {string} message - Mensagem
   * @param {...*} args - Argumentos adicionais
   */
  debug(message, ...args) {
    this._log(LogLevel.DEBUG, message, args);
  }

  /**
   * Log info
   * @param {string} message - Mensagem
   * @param {...*} args - Argumentos adicionais
   */
  info(message, ...args) {
    this._log(LogLevel.INFO, message, args);
  }

  /**
   * Log warning
   * @param {string} message - Mensagem
   * @param {...*} args - Argumentos adicionais
   */
  warn(message, ...args) {
    this._log(LogLevel.WARN, message, args);
  }

  /**
   * Log error
   * @param {string} message - Mensagem
   * @param {...*} args - Argumentos adicionais
   */
  error(message, ...args) {
    this._log(LogLevel.ERROR, message, args);
  }

  /**
   * Log interno
   * @private
   */
  _log(level, message, args) {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = this._getLevelName(level);
    const formattedMessage = `[${timestamp}] [${this.name}] [${levelName}] ${message}`;

    // Salvar no histórico
    this.logs.push({
      timestamp: Date.now(),
      level,
      levelName,
      message,
      args
    });

    // Limitar tamanho
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Obtém nome do nível
   * @private
   */
  _getLevelName(level) {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Define nível de log
   * @param {number} level - Nível
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * Obtém logs
   * @returns {Array}
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Obtém logs por nível
   * @param {number} level - Nível
   * @returns {Array}
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Limpa logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Exporta logs como JSON
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Exporta logs como texto
   * @returns {string}
   */
  exportText() {
    return this.logs.map(log => {
      const date = new Date(log.timestamp).toISOString();
      return `[${date}] [${log.levelName}] ${log.message}`;
    }).join('\n');
  }
}

/**
 * Logger global
 */
export const logger = new Logger('Cache', LogLevel.INFO);

export default logger;
