/**
 * Config Validator - Validação de Configuração
 * 
 * Valida e normaliza configurações do CacheManager.
 */

import { DEFAULT_CONFIG } from './cache.config.js';

/**
 * Valida configuração do CacheManager
 * 
 * @param {Object} config - Configuração a validar
 * @returns {Object} - { valid, errors, warnings, normalized }
 * 
 * @example
 * const result = validateConfig(userConfig);
 * if (!result.valid) {
 *   console.error('Erros:', result.errors);
 * }
 */
export function validateConfig(config = {}) {
  const errors = [];
  const warnings = [];
  const normalized = { ...DEFAULT_CONFIG };

  // Validar dbName
  if (config.dbName !== undefined) {
    if (typeof config.dbName !== 'string' || config.dbName.length === 0) {
      errors.push('dbName must be a non-empty string');
    } else {
      normalized.dbName = config.dbName;
    }
  }

  // Validar dbVersion
  if (config.dbVersion !== undefined) {
    if (typeof config.dbVersion !== 'number' || config.dbVersion < 1) {
      errors.push('dbVersion must be a number >= 1');
    } else {
      normalized.dbVersion = Math.floor(config.dbVersion);
    }
  }

  // Validar defaultTTL
  if (config.defaultTTL !== undefined) {
    if (typeof config.defaultTTL !== 'number' || config.defaultTTL <= 0) {
      errors.push('defaultTTL must be a positive number');
    } else {
      normalized.defaultTTL = config.defaultTTL;
      
      if (config.defaultTTL < 3600) {
        warnings.push('defaultTTL is less than 1 hour. Cache will expire frequently.');
      }
      
      if (config.defaultTTL > 2592000) {
        warnings.push('defaultTTL is more than 30 days. Consider shorter TTL.');
      }
    }
  }

  // Validar chunkSize
  if (config.chunkSize !== undefined) {
    if (typeof config.chunkSize !== 'number' || config.chunkSize <= 0) {
      errors.push('chunkSize must be a positive number');
    } else {
      normalized.chunkSize = config.chunkSize;
      
      if (config.chunkSize < 1024 * 1024) {
        warnings.push('chunkSize is less than 1MB. May cause performance issues.');
      }
      
      if (config.chunkSize > 50 * 1024 * 1024) {
        warnings.push('chunkSize is more than 50MB. May cause memory issues.');
      }
    }
  }

  // Validar compressionEnabled
  if (config.compressionEnabled !== undefined) {
    if (typeof config.compressionEnabled !== 'boolean') {
      errors.push('compressionEnabled must be a boolean');
    } else {
      normalized.compressionEnabled = config.compressionEnabled;
    }
  }

  // Validar compressionThreshold
  if (config.compressionThreshold !== undefined) {
    if (typeof config.compressionThreshold !== 'number' || config.compressionThreshold < 0) {
      errors.push('compressionThreshold must be a non-negative number');
    } else {
      normalized.compressionThreshold = config.compressionThreshold;
      
      if (config.compressionThreshold < 512) {
        warnings.push('compressionThreshold is very low. May compress small data unnecessarily.');
      }
    }
  }

  // Validar maxRetries
  if (config.maxRetries !== undefined) {
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
      errors.push('maxRetries must be a non-negative number');
    } else {
      normalized.maxRetries = Math.floor(config.maxRetries);
      
      if (config.maxRetries > 10) {
        warnings.push('maxRetries is very high. May cause long delays on failures.');
      }
    }
  }

  // Validar retryDelay
  if (config.retryDelay !== undefined) {
    if (typeof config.retryDelay !== 'number' || config.retryDelay < 0) {
      errors.push('retryDelay must be a non-negative number');
    } else {
      normalized.retryDelay = config.retryDelay;
      
      if (config.retryDelay < 100) {
        warnings.push('retryDelay is very low. May overwhelm server on failures.');
      }
    }
  }

  // Validar maxConcurrent
  if (config.maxConcurrent !== undefined) {
    if (typeof config.maxConcurrent !== 'number' || config.maxConcurrent < 1) {
      errors.push('maxConcurrent must be a number >= 1');
    } else {
      normalized.maxConcurrent = Math.floor(config.maxConcurrent);
      
      if (config.maxConcurrent > 10) {
        warnings.push('maxConcurrent is very high. May overwhelm network.');
      }
    }
  }

  // Validar quotaWarningThreshold
  if (config.quotaWarningThreshold !== undefined) {
    if (typeof config.quotaWarningThreshold !== 'number' || 
        config.quotaWarningThreshold < 0 || 
        config.quotaWarningThreshold > 1) {
      errors.push('quotaWarningThreshold must be a number between 0 and 1');
    } else {
      normalized.quotaWarningThreshold = config.quotaWarningThreshold;
      
      if (config.quotaWarningThreshold > 0.95) {
        warnings.push('quotaWarningThreshold is very high. May not have time to cleanup.');
      }
    }
  }

  // Validar cleanupOnInit
  if (config.cleanupOnInit !== undefined) {
    if (typeof config.cleanupOnInit !== 'boolean') {
      errors.push('cleanupOnInit must be a boolean');
    } else {
      normalized.cleanupOnInit = config.cleanupOnInit;
    }
  }

  // Validar enableStats
  if (config.enableStats !== undefined) {
    if (typeof config.enableStats !== 'boolean') {
      errors.push('enableStats must be a boolean');
    } else {
      normalized.enableStats = config.enableStats;
    }
  }

  // Validar debug
  if (config.debug !== undefined) {
    if (typeof config.debug !== 'boolean') {
      errors.push('debug must be a boolean');
    } else {
      normalized.debug = config.debug;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized
  };
}

/**
 * Mescla configuração do usuário com padrão
 * 
 * @param {Object} userConfig - Configuração do usuário
 * @returns {Object} - Configuração mesclada e validada
 * 
 * @example
 * const config = mergeConfig({ debug: true });
 */
export function mergeConfig(userConfig = {}) {
  const result = validateConfig(userConfig);
  
  if (!result.valid) {
    console.error('Invalid configuration:', result.errors);
    throw new Error(`Invalid configuration: ${result.errors.join(', ')}`);
  }
  
  if (result.warnings.length > 0) {
    console.warn('Configuration warnings:', result.warnings);
  }
  
  return result.normalized;
}

/**
 * Obtém configuração recomendada para um cenário
 * 
 * @param {string} scenario - Cenário (development, production, low-memory)
 * @returns {Object} - Configuração recomendada
 * 
 * @example
 * const config = getRecommendedConfig('production');
 */
export function getRecommendedConfig(scenario = 'production') {
  const configs = {
    development: {
      ...DEFAULT_CONFIG,
      debug: true,
      defaultTTL: 3600, // 1 hora
      cleanupOnInit: true
    },
    
    production: {
      ...DEFAULT_CONFIG,
      debug: false,
      defaultTTL: 604800, // 7 dias
      compressionEnabled: true,
      cleanupOnInit: true,
      enableStats: true
    },
    
    'low-memory': {
      ...DEFAULT_CONFIG,
      chunkSize: 2 * 1024 * 1024, // 2MB
      maxConcurrent: 1,
      compressionEnabled: true,
      compressionThreshold: 512
    },
    
    'high-performance': {
      ...DEFAULT_CONFIG,
      chunkSize: 10 * 1024 * 1024, // 10MB
      maxConcurrent: 5,
      compressionEnabled: false, // Sem compactação para velocidade
      defaultTTL: 86400 // 1 dia
    },
    
    'offline-first': {
      ...DEFAULT_CONFIG,
      defaultTTL: 2592000, // 30 dias
      cleanupOnInit: false,
      compressionEnabled: true
    }
  };
  
  return configs[scenario] || configs.production;
}

/**
 * Gera documentação da configuração
 * 
 * @returns {string} - Documentação formatada
 * 
 * @example
 * console.log(getConfigDocumentation());
 */
export function getConfigDocumentation() {
  let doc = '=== Cache Configuration Options ===\n\n';
  
  const options = [
    {
      name: 'dbName',
      type: 'string',
      default: 'AppCache',
      description: 'Nome do banco IndexedDB'
    },
    {
      name: 'dbVersion',
      type: 'number',
      default: 1,
      description: 'Versão do banco'
    },
    {
      name: 'defaultTTL',
      type: 'number',
      default: 604800,
      description: 'TTL padrão em segundos (7 dias)'
    },
    {
      name: 'chunkSize',
      type: 'number',
      default: '5MB',
      description: 'Tamanho máximo do chunk em bytes'
    },
    {
      name: 'compressionEnabled',
      type: 'boolean',
      default: true,
      description: 'Habilitar compactação de dados'
    },
    {
      name: 'compressionThreshold',
      type: 'number',
      default: 1024,
      description: 'Threshold para compactação em bytes'
    },
    {
      name: 'maxRetries',
      type: 'number',
      default: 3,
      description: 'Tentativas máximas de download'
    },
    {
      name: 'retryDelay',
      type: 'number',
      default: 1000,
      description: 'Delay base para retry em ms'
    },
    {
      name: 'maxConcurrent',
      type: 'number',
      default: 3,
      description: 'Downloads simultâneos máximos'
    },
    {
      name: 'quotaWarningThreshold',
      type: 'number',
      default: 0.8,
      description: 'Threshold para warning de quota (0-1)'
    },
    {
      name: 'cleanupOnInit',
      type: 'boolean',
      default: true,
      description: 'Limpar caches expirados ao iniciar'
    },
    {
      name: 'enableStats',
      type: 'boolean',
      default: true,
      description: 'Habilitar estatísticas'
    },
    {
      name: 'debug',
      type: 'boolean',
      default: false,
      description: 'Modo debug (logs detalhados)'
    }
  ];
  
  for (const option of options) {
    doc += `${option.name} (${option.type})\n`;
    doc += `  Default: ${option.default}\n`;
    doc += `  ${option.description}\n\n`;
  }
  
  return doc;
}

export default {
  validateConfig,
  mergeConfig,
  getRecommendedConfig,
  getConfigDocumentation
};
