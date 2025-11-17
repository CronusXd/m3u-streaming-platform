/**
 * Feature Detection - Detecção de Features e Compatibilidade
 * 
 * Utilitário para detectar features disponíveis no navegador
 * e gerar relatórios de compatibilidade.
 */

/**
 * Detecta todas as features disponíveis
 * 
 * @returns {Object} - Features disponíveis
 * 
 * @example
 * const features = detectFeatures();
 * console.log('IndexedDB:', features.indexedDB);
 */
export function detectFeatures() {
  return {
    // Storage
    indexedDB: detectIndexedDB(),
    localStorage: detectLocalStorage(),
    sessionStorage: detectSessionStorage(),
    
    // APIs
    storageEstimate: detectStorageEstimate(),
    serviceWorker: detectServiceWorker(),
    webWorkers: detectWebWorkers(),
    
    // Compression
    lzString: detectLZString(),
    
    // Network
    fetch: detectFetch(),
    
    // Browser info
    browser: detectBrowser(),
    
    // Limits
    limits: detectLimits()
  };
}

/**
 * Detecta IndexedDB
 * @returns {boolean}
 */
export function detectIndexedDB() {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Detecta LocalStorage
 * @returns {boolean}
 */
export function detectLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    
    const testKey = '__test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta SessionStorage
 * @returns {boolean}
 */
export function detectSessionStorage() {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    
    const testKey = '__test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta Storage Estimate API
 * @returns {boolean}
 */
export function detectStorageEstimate() {
  try {
    return 'storage' in navigator && 'estimate' in navigator.storage;
  } catch {
    return false;
  }
}

/**
 * Detecta Service Worker
 * @returns {boolean}
 */
export function detectServiceWorker() {
  try {
    return 'serviceWorker' in navigator;
  } catch {
    return false;
  }
}

/**
 * Detecta Web Workers
 * @returns {boolean}
 */
export function detectWebWorkers() {
  try {
    return typeof Worker !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Detecta LZ-String
 * @returns {boolean}
 */
export function detectLZString() {
  try {
    return typeof LZString !== 'undefined' || 
           (typeof window !== 'undefined' && typeof window.LZString !== 'undefined');
  } catch {
    return false;
  }
}

/**
 * Detecta Fetch API
 * @returns {boolean}
 */
export function detectFetch() {
  try {
    return typeof fetch !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Detecta navegador
 * @returns {Object}
 */
export function detectBrowser() {
  const ua = navigator.userAgent;
  
  let browser = 'Unknown';
  let version = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browser = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    browser = 'Opera';
    version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Trident') > -1) {
    browser = 'IE';
    version = ua.match(/rv:(\d+)/)?.[1] || 'Unknown';
  }
  
  return {
    name: browser,
    version: version,
    userAgent: ua
  };
}

/**
 * Detecta limites de armazenamento
 * @returns {Promise<Object>}
 */
export async function detectLimits() {
  const limits = {
    indexedDB: 'Unknown',
    localStorage: 'Unknown',
    estimated: null
  };
  
  // Estimar quota do IndexedDB
  if (detectStorageEstimate()) {
    try {
      const estimate = await navigator.storage.estimate();
      limits.estimated = {
        quota: estimate.quota,
        usage: estimate.usage,
        quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2),
        usageMB: (estimate.usage / (1024 * 1024)).toFixed(2)
      };
      limits.indexedDB = `~${limits.estimated.quotaMB} MB`;
    } catch (error) {
      console.error('Failed to estimate storage:', error);
    }
  } else {
    // Estimativas padrão por navegador
    const browser = detectBrowser();
    
    if (browser.name === 'Chrome' || browser.name === 'Edge') {
      limits.indexedDB = '~60% of disk space';
    } else if (browser.name === 'Firefox') {
      limits.indexedDB = '~50% of disk space';
    } else if (browser.name === 'Safari') {
      limits.indexedDB = '~1 GB';
    }
  }
  
  // LocalStorage geralmente tem 5-10MB
  limits.localStorage = '~5-10 MB';
  
  return limits;
}

/**
 * Gera relatório de compatibilidade
 * 
 * @returns {Promise<Object>} - Relatório completo
 * 
 * @example
 * const report = await getCompatibilityReport();
 * console.log(report.summary);
 */
export async function getCompatibilityReport() {
  const features = detectFeatures();
  const limits = await detectLimits();
  
  // Calcular score de compatibilidade
  let score = 0;
  let maxScore = 0;
  
  const weights = {
    indexedDB: 10,
    localStorage: 5,
    storageEstimate: 3,
    lzString: 5,
    fetch: 5,
    webWorkers: 2
  };
  
  for (const [feature, weight] of Object.entries(weights)) {
    maxScore += weight;
    if (features[feature]) {
      score += weight;
    }
  }
  
  const percentage = (score / maxScore) * 100;
  
  // Determinar nível de suporte
  let supportLevel = 'Excellent';
  let recommendation = 'Todas as features estão disponíveis. Sistema funcionará perfeitamente.';
  
  if (percentage < 50) {
    supportLevel = 'Poor';
    recommendation = 'Suporte limitado. Considere usar navegador mais moderno.';
  } else if (percentage < 70) {
    supportLevel = 'Fair';
    recommendation = 'Suporte parcial. Algumas features podem não funcionar.';
  } else if (percentage < 90) {
    supportLevel = 'Good';
    recommendation = 'Bom suporte. Sistema funcionará bem com limitações menores.';
  }
  
  // Identificar features faltando
  const missingFeatures = [];
  const warnings = [];
  
  if (!features.indexedDB) {
    missingFeatures.push('IndexedDB');
    warnings.push('IndexedDB não disponível. Usando LocalStorage (limitado a 100KB).');
  }
  
  if (!features.localStorage) {
    missingFeatures.push('LocalStorage');
    warnings.push('LocalStorage não disponível. Fallback não funcionará.');
  }
  
  if (!features.lzString) {
    missingFeatures.push('LZ-String');
    warnings.push('LZ-String não disponível. Compactação desabilitada.');
  }
  
  if (!features.fetch) {
    missingFeatures.push('Fetch API');
    warnings.push('Fetch API não disponível. Downloads podem não funcionar.');
  }
  
  if (!features.storageEstimate) {
    warnings.push('Storage Estimate API não disponível. Não será possível verificar quota.');
  }
  
  return {
    features,
    limits,
    browser: features.browser,
    score: {
      points: score,
      maxPoints: maxScore,
      percentage: percentage.toFixed(2),
      level: supportLevel
    },
    missingFeatures,
    warnings,
    recommendation,
    timestamp: Date.now()
  };
}

/**
 * Gera relatório em texto
 * 
 * @returns {Promise<string>} - Relatório formatado
 * 
 * @example
 * const report = await getCompatibilityReportText();
 * console.log(report);
 */
export async function getCompatibilityReportText() {
  const report = await getCompatibilityReport();
  
  let text = '=== Relatório de Compatibilidade ===\n\n';
  
  text += `Navegador: ${report.browser.name} ${report.browser.version}\n`;
  text += `Score: ${report.score.percentage}% (${report.score.level})\n\n`;
  
  text += 'Features:\n';
  text += `  IndexedDB: ${report.features.indexedDB ? '✅' : '❌'}\n`;
  text += `  LocalStorage: ${report.features.localStorage ? '✅' : '❌'}\n`;
  text += `  Storage Estimate: ${report.features.storageEstimate ? '✅' : '❌'}\n`;
  text += `  LZ-String: ${report.features.lzString ? '✅' : '❌'}\n`;
  text += `  Fetch API: ${report.features.fetch ? '✅' : '❌'}\n`;
  text += `  Web Workers: ${report.features.webWorkers ? '✅' : '❌'}\n\n`;
  
  if (report.limits.estimated) {
    text += 'Limites:\n';
    text += `  Quota: ${report.limits.estimated.quotaMB} MB\n`;
    text += `  Usado: ${report.limits.estimated.usageMB} MB\n\n`;
  }
  
  if (report.warnings.length > 0) {
    text += 'Avisos:\n';
    for (const warning of report.warnings) {
      text += `  ⚠️ ${warning}\n`;
    }
    text += '\n';
  }
  
  text += `Recomendação: ${report.recommendation}\n`;
  
  return text;
}

/**
 * Verifica se o sistema pode funcionar
 * 
 * @returns {Object} - { canRun, reason }
 * 
 * @example
 * const check = canSystemRun();
 * if (!check.canRun) {
 *   console.error(check.reason);
 * }
 */
export function canSystemRun() {
  const features = detectFeatures();
  
  // Requisitos mínimos
  if (!features.indexedDB && !features.localStorage) {
    return {
      canRun: false,
      reason: 'Nenhum mecanismo de armazenamento disponível (IndexedDB ou LocalStorage)'
    };
  }
  
  if (!features.fetch) {
    return {
      canRun: false,
      reason: 'Fetch API não disponível. Downloads não funcionarão.'
    };
  }
  
  return {
    canRun: true,
    reason: 'Sistema pode funcionar'
  };
}

export default {
  detectFeatures,
  detectIndexedDB,
  detectLocalStorage,
  detectLZString,
  detectBrowser,
  detectLimits,
  getCompatibilityReport,
  getCompatibilityReportText,
  canSystemRun
};
