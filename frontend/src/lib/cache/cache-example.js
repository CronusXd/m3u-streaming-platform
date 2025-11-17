/**
 * Exemplos de Uso do Sistema de Cache IndexedDB
 * 
 * Este arquivo demonstra como usar o CacheManager em diferentes cenários.
 */

import { CacheManager } from './CacheManager.js';
import { PRIORITY, EVENTS } from './cache.config.js';

// ============================================================
// EXEMPLO 1: Inicialização Básica
// ============================================================

async function exemploInicializacao() {
  // Criar instância com configuração padrão
  const cache = new CacheManager();

  // Inicializar
  const success = await cache.init();

  if (success) {
    console.log('✅ Cache inicializado com sucesso!');
    
    // Verificar features disponíveis
    const features = cache.getFeatures();
    console.log('Features:', features);
  }
}

// ============================================================
// EXEMPLO 2: Salvar e Carregar Dados
// ============================================================

async function exemploSaveLoad() {
  const cache = new CacheManager();
  await cache.init();

  // Dados de exemplo
  const filmesData = {
    filmes: [
      { id: 1, titulo: 'Filme 1', ano: 2024 },
      { id: 2, titulo: 'Filme 2', ano: 2023 }
    ]
  };

  // Salvar no cache
  await cache.save('filmes', filmesData);
  console.log('✅ Filmes salvos no cache');

  // Carregar do cache
  const loaded = await cache.load('filmes');
  
  if (loaded) {
    console.log('✅ Cache hit! Dados carregados:', loaded);
  } else {
    console.log('❌ Cache miss');
  }
}

// ============================================================
// EXEMPLO 3: Configuração Customizada
// ============================================================

async function exemploConfigCustomizada() {
  const cache = new CacheManager({
    defaultTTL: 86400, // 1 dia ao invés de 7
    chunkSize: 10 * 1024 * 1024, // 10MB ao invés de 5MB
    compressionEnabled: true,
    debug: true // Habilitar logs de debug
  });

  await cache.init();
  console.log('✅ Cache com configuração customizada');
}

// ============================================================
// EXEMPLO 4: Eventos
// ============================================================

async function exemploEventos() {
  const cache = new CacheManager();
  await cache.init();

  // Escutar evento de save
  cache.on(EVENTS.CACHE_SAVE, (data) => {
    console.log('📦 Cache salvo:', data.section);
    console.log('   Tamanho:', (data.size / 1024).toFixed(2), 'KB');
    console.log('   Comprimido:', data.compressed);
    console.log('   Chunked:', data.chunked);
  });

  // Escutar evento de load
  cache.on(EVENTS.CACHE_LOAD, (data) => {
    if (data.hit) {
      console.log('✅ Cache hit:', data.section);
    } else {
      console.log('❌ Cache miss:', data.section);
    }
  });

  // Escutar evento de quota warning
  cache.on(EVENTS.QUOTA_WARNING, (data) => {
    console.warn('⚠️ Quota warning:', (data.percentage * 100).toFixed(2), '%');
  });

  // Salvar dados para disparar eventos
  await cache.save('test', { data: 'exemplo' });
  await cache.load('test');
}

// ============================================================
// EXEMPLO 5: Download Progressivo
// ============================================================

async function exemploDownloadProgressivo() {
  const cache = new CacheManager();
  await cache.init();

  // Escutar progresso de download
  cache.on(EVENTS.DOWNLOAD_PROGRESS, (data) => {
    console.log(`📥 ${data.section}: ${data.progress}%`);
  });

  // Escutar conclusão de download
  cache.on(EVENTS.DOWNLOAD_COMPLETE, (data) => {
    console.log(`✅ Download completo: ${data.section}`);
    console.log(`   Tamanho: ${(data.size / 1024).toFixed(2)} KB`);
    console.log(`   Duração: ${data.duration}ms`);
  });

  // Iniciar downloads em background
  await cache.startBackgroundDownload({
    filmes: '/api/filmes',
    series: '/api/series',
    canais: '/api/canais'
  });

  console.log('📥 Downloads iniciados em background');
}

// ============================================================
// EXEMPLO 6: Priorização
// ============================================================

async function exemploPriorizacao() {
  const cache = new CacheManager();
  await cache.init();

  // Iniciar downloads em background
  await cache.startBackgroundDownload({
    filmes: '/api/filmes',
    series: '/api/series',
    canais: '/api/canais'
  });

  // Simular usuário clicando em "FILMES"
  setTimeout(async () => {
    console.log('👆 Usuário clicou em FILMES');
    await cache.prioritizeSection('filmes');
    console.log('⚡ Filmes priorizados!');
  }, 2000);
}

// ============================================================
// EXEMPLO 7: Smart Loading (Load ou Download)
// ============================================================

async function exemploSmartLoading() {
  const cache = new CacheManager();
  await cache.init();

  // Tentar carregar, se não existir, baixar automaticamente
  const filmes = await cache.loadOrDownload(
    'filmes',
    '/api/filmes',
    PRIORITY.HIGH
  );

  console.log('✅ Filmes carregados:', filmes);
}

// ============================================================
// EXEMPLO 8: Estatísticas
// ============================================================

async function exemploEstatisticas() {
  const cache = new CacheManager();
  await cache.init();

  // Fazer algumas operações
  await cache.save('filmes', { data: 'test' });
  await cache.load('filmes');
  await cache.load('series'); // miss

  // Obter estatísticas
  const stats = await cache.getStats();
  
  console.log('📊 Estatísticas:');
  console.log('   Hits:', stats.hits);
  console.log('   Misses:', stats.misses);
  console.log('   Hit Rate:', stats.hitRatePercentage, '%');
  console.log('   Tamanho Total:', stats.totalSizeMB, 'MB');
  console.log('   Seções:', stats.sectionsCount);
}

// ============================================================
// EXEMPLO 9: Gerenciamento de Quota
// ============================================================

async function exemploQuota() {
  const cache = new CacheManager();
  await cache.init();

  // Obter informações de quota
  const quota = await cache.getQuota();
  
  console.log('💾 Quota:');
  console.log('   Usado:', quota.usageMB, 'MB');
  console.log('   Total:', quota.quotaMB, 'MB');
  console.log('   Disponível:', quota.availableMB, 'MB');
  console.log('   Percentual:', (quota.percentage * 100).toFixed(2), '%');

  // Limpar caches expirados
  const removed = await cache.cleanupExpired();
  console.log('🧹 Removidos', removed, 'caches expirados');

  // Limpar caches menos usados (LRU)
  if (quota.percentage > 0.8) {
    await cache.cleanupLRU(0.5); // Limpar até 50%
    console.log('🧹 Limpeza LRU executada');
  }
}

// ============================================================
// EXEMPLO 10: Sincronização
// ============================================================

async function exemploSincronizacao() {
  const cache = new CacheManager();
  await cache.init();

  // Verificar se há atualizações
  const hasUpdates = await cache.checkForUpdates(
    'filmes',
    '/api/filmes/version'
  );

  if (hasUpdates) {
    console.log('🔄 Atualizações disponíveis para filmes');
    
    // Atualizar
    const success = await cache.updateSection('filmes', '/api/filmes');
    
    if (success) {
      console.log('✅ Filmes atualizados');
    }
  }

  // Atualizar em background
  cache.updateInBackground({
    series: '/api/series',
    canais: '/api/canais'
  });
}

// ============================================================
// EXEMPLO 11: Limpeza
// ============================================================

async function exemploLimpeza() {
  const cache = new CacheManager();
  await cache.init();

  // Listar seções
  const sections = await cache.getSections();
  console.log('📋 Seções em cache:', sections);

  // Limpar seção específica
  await cache.clear('filmes');
  console.log('🗑️ Filmes removidos');

  // Limpar tudo
  await cache.clearAll();
  console.log('🗑️ Todo o cache limpo');
}

// ============================================================
// EXEMPLO 12: Uso Completo (Fluxo Real)
// ============================================================

async function exemploFluxoCompleto() {
  // 1. Inicializar
  const cache = new CacheManager({
    debug: true,
    defaultTTL: 604800 // 7 dias
  });

  await cache.init();
  console.log('✅ Cache inicializado');

  // 2. Configurar eventos
  cache.on(EVENTS.DOWNLOAD_PROGRESS, (data) => {
    console.log(`📥 ${data.section}: ${data.progress}%`);
  });

  cache.on(EVENTS.QUOTA_WARNING, (data) => {
    console.warn('⚠️ Quota alta:', (data.percentage * 100).toFixed(2), '%');
  });

  // 3. Tentar carregar do cache
  let filmes = await cache.load('filmes');

  if (!filmes) {
    console.log('❌ Cache miss, baixando...');
    
    // 4. Baixar se não estiver em cache
    filmes = await cache.loadOrDownload('filmes', '/api/filmes', PRIORITY.HIGH);
  }

  console.log('✅ Filmes disponíveis:', filmes);

  // 5. Iniciar downloads em background para outras seções
  cache.startBackgroundDownload({
    series: '/api/series',
    canais: '/api/canais'
  });

  // 6. Verificar estatísticas
  const stats = await cache.getStats();
  console.log('📊 Hit Rate:', stats.hitRatePercentage, '%');

  // 7. Verificar quota
  const quota = await cache.getQuota();
  if (quota.percentage > 0.8) {
    console.log('⚠️ Quota alta, executando limpeza...');
    await cache.cleanupLRU(0.7);
  }
}

// ============================================================
// EXECUTAR EXEMPLOS
// ============================================================

// Descomente para executar os exemplos:

// exemploInicializacao();
// exemploSaveLoad();
// exemploConfigCustomizada();
// exemploEventos();
// exemploDownloadProgressivo();
// exemploPriorizacao();
// exemploSmartLoading();
// exemploEstatisticas();
// exemploQuota();
// exemploSincronizacao();
// exemploLimpeza();
// exemploFluxoCompleto();

export {
  exemploInicializacao,
  exemploSaveLoad,
  exemploConfigCustomizada,
  exemploEventos,
  exemploDownloadProgressivo,
  exemploPriorizacao,
  exemploSmartLoading,
  exemploEstatisticas,
  exemploQuota,
  exemploSincronizacao,
  exemploLimpeza,
  exemploFluxoCompleto
};
