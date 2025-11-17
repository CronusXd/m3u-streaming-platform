/**
 * Benchmark - Testes de Performance
 * 
 * Utilitário para medir performance do sistema de cache.
 */

import { CacheManager } from './CacheManager.js';

/**
 * Gera dados de teste
 * @param {number} sizeKB - Tamanho em KB
 * @returns {Object}
 */
function generateTestData(sizeKB) {
  const targetSize = sizeKB * 1024;
  const items = [];
  let currentSize = 0;

  while (currentSize < targetSize) {
    const item = {
      id: items.length + 1,
      title: `Item ${items.length + 1}`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10),
      metadata: {
        created: Date.now(),
        tags: ['tag1', 'tag2', 'tag3'],
        rating: Math.random() * 5
      }
    };

    items.push(item);
    currentSize = new Blob([JSON.stringify(items)]).size;
  }

  return { items };
}

/**
 * Executa benchmark de save
 * @param {CacheManager} cache - Instância do cache
 * @param {number} sizeKB - Tamanho em KB
 * @returns {Promise<Object>}
 */
async function benchmarkSave(cache, sizeKB) {
  const data = generateTestData(sizeKB);
  const section = `benchmark_${sizeKB}kb`;

  const start = performance.now();
  await cache.save(section, data);
  const duration = performance.now() - start;

  return {
    operation: 'save',
    sizeKB,
    duration,
    throughput: (sizeKB / (duration / 1000)).toFixed(2) // KB/s
  };
}

/**
 * Executa benchmark de load
 * @param {CacheManager} cache - Instância do cache
 * @param {number} sizeKB - Tamanho em KB
 * @returns {Promise<Object>}
 */
async function benchmarkLoad(cache, sizeKB) {
  const section = `benchmark_${sizeKB}kb`;

  const start = performance.now();
  await cache.load(section);
  const duration = performance.now() - start;

  return {
    operation: 'load',
    sizeKB,
    duration,
    throughput: (sizeKB / (duration / 1000)).toFixed(2) // KB/s
  };
}

/**
 * Executa suite completa de benchmarks
 * @param {Object} config - Configuração do cache
 * @returns {Promise<Object>}
 */
export async function runBenchmarks(config = {}) {
  console.log('🚀 Iniciando benchmarks...\n');

  const cache = new CacheManager(config);
  await cache.init();

  const sizes = [100, 500, 1000, 5000, 10000]; // KB
  const results = {
    save: [],
    load: [],
    summary: {}
  };

  // Benchmark de Save
  console.log('📝 Testando Save...');
  for (const size of sizes) {
    const result = await benchmarkSave(cache, size);
    results.save.push(result);
    console.log(`  ${size}KB: ${result.duration.toFixed(2)}ms (${result.throughput} KB/s)`);
  }

  console.log('\n📖 Testando Load...');
  for (const size of sizes) {
    const result = await benchmarkLoad(cache, size);
    results.load.push(result);
    console.log(`  ${size}KB: ${result.duration.toFixed(2)}ms (${result.throughput} KB/s)`);
  }

  // Calcular médias
  results.summary = {
    avgSaveTime: results.save.reduce((sum, r) => sum + r.duration, 0) / results.save.length,
    avgLoadTime: results.load.reduce((sum, r) => sum + r.duration, 0) / results.load.length,
    avgSaveThroughput: results.save.reduce((sum, r) => sum + parseFloat(r.throughput), 0) / results.save.length,
    avgLoadThroughput: results.load.reduce((sum, r) => sum + parseFloat(r.throughput), 0) / results.load.length
  };

  // Limpar dados de teste
  for (const size of sizes) {
    await cache.clear(`benchmark_${size}kb`);
  }

  console.log('\n📊 Resumo:');
  console.log(`  Tempo médio Save: ${results.summary.avgSaveTime.toFixed(2)}ms`);
  console.log(`  Tempo médio Load: ${results.summary.avgLoadTime.toFixed(2)}ms`);
  console.log(`  Throughput médio Save: ${results.summary.avgSaveThroughput.toFixed(2)} KB/s`);
  console.log(`  Throughput médio Load: ${results.summary.avgLoadThroughput.toFixed(2)} KB/s`);

  return results;
}

/**
 * Testa performance de compactação
 * @returns {Promise<Object>}
 */
export async function benchmarkCompression() {
  console.log('🗜️ Testando Compactação...\n');

  const cache = new CacheManager({ compressionEnabled: true });
  await cache.init();

  const sizes = [100, 500, 1000, 5000];
  const results = [];

  for (const size of sizes) {
    const data = generateTestData(size);
    const section = `compression_${size}kb`;

    await cache.save(section, data);
    const metadata = await cache.getMetadata(section);

    const originalSize = size;
    const compressedSize = metadata.size / 1024;
    const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    results.push({
      originalKB: originalSize,
      compressedKB: compressedSize.toFixed(2),
      ratio: `${ratio}%`,
      compressed: metadata.compressed
    });

    console.log(`  ${originalSize}KB → ${compressedSize.toFixed(2)}KB (${ratio}% redução)`);

    await cache.clear(section);
  }

  return results;
}

/**
 * Testa performance de chunking
 * @returns {Promise<Object>}
 */
export async function benchmarkChunking() {
  console.log('📦 Testando Chunking...\n');

  const cache = new CacheManager({ chunkSize: 5 * 1024 * 1024 });
  await cache.init();

  const sizes = [1000, 5000, 10000, 20000]; // KB
  const results = [];

  for (const size of sizes) {
    const data = generateTestData(size);
    const section = `chunking_${size}kb`;

    const start = performance.now();
    await cache.save(section, data);
    const saveDuration = performance.now() - start;

    const metadata = await cache.getMetadata(section);

    const loadStart = performance.now();
    await cache.load(section);
    const loadDuration = performance.now() - loadStart;

    results.push({
      sizeKB: size,
      chunked: metadata.chunked,
      totalChunks: metadata.totalChunks || 1,
      saveDuration: saveDuration.toFixed(2),
      loadDuration: loadDuration.toFixed(2)
    });

    console.log(`  ${size}KB: ${metadata.totalChunks || 1} chunks, Save: ${saveDuration.toFixed(2)}ms, Load: ${loadDuration.toFixed(2)}ms`);

    await cache.clear(section);
  }

  return results;
}

/**
 * Executa todos os benchmarks
 * @returns {Promise<Object>}
 */
export async function runAllBenchmarks() {
  const results = {
    basic: await runBenchmarks(),
    compression: await benchmarkCompression(),
    chunking: await benchmarkChunking(),
    timestamp: Date.now()
  };

  console.log('\n✅ Benchmarks completos!');

  return results;
}

/**
 * Gera relatório de performance
 * @param {Object} results - Resultados dos benchmarks
 * @returns {string}
 */
export function generatePerformanceReport(results) {
  let report = '=== Performance Report ===\n\n';

  report += 'Basic Operations:\n';
  report += `  Avg Save Time: ${results.basic.summary.avgSaveTime.toFixed(2)}ms\n`;
  report += `  Avg Load Time: ${results.basic.summary.avgLoadTime.toFixed(2)}ms\n`;
  report += `  Avg Save Throughput: ${results.basic.summary.avgSaveThroughput.toFixed(2)} KB/s\n`;
  report += `  Avg Load Throughput: ${results.basic.summary.avgLoadThroughput.toFixed(2)} KB/s\n\n`;

  report += 'Compression:\n';
  for (const result of results.compression) {
    report += `  ${result.originalKB}KB → ${result.compressedKB}KB (${result.ratio})\n`;
  }

  report += '\nChunking:\n';
  for (const result of results.chunking) {
    report += `  ${result.sizeKB}KB: ${result.totalChunks} chunks\n`;
  }

  return report;
}

export default {
  runBenchmarks,
  benchmarkCompression,
  benchmarkChunking,
  runAllBenchmarks,
  generatePerformanceReport
};
