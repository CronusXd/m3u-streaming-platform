#!/usr/bin/env node
/**
 * Sincronização COMPLETA
 * 
 * 1. Sincroniza M3U (channels + categorias + metadados de episódios)
 * 2. Busca logos faltantes automaticamente
 * 
 * Execute este script sempre que atualizar a lista M3U!
 */

import { config } from 'dotenv';
import { syncM3UIncremental } from './sync-m3u-incremental';
import { fetchAllLogos } from './fetch-all-logos';

config();

async function syncComplete() {
  const startTime = Date.now();
  
  console.log('🚀 SINCRONIZAÇÃO COMPLETA (INCREMENTAL)');
  console.log('='.repeat(60));
  console.log('📋 Etapas:');
  console.log('   1. Sincronizar M3U → atualizar URLs + inserir novos');
  console.log('   2. Buscar logos faltantes → TMDB API');
  console.log('='.repeat(60));
  console.log('');

  try {
    // ============================================
    // ETAPA 1: Sincronizar M3U (Incremental)
    // ============================================
    console.log('🎬 ETAPA 1/2: Sincronizando M3U (Incremental)...');
    console.log('-'.repeat(60));
    
    const m3uResult = await syncM3UIncremental();
    
    console.log('\n✅ M3U sincronizado com sucesso!\n');

    // ============================================
    // ETAPA 2: Buscar Logos Faltantes
    // ============================================
    console.log('🖼️  ETAPA 2/2: Buscando logos faltantes...');
    console.log('-'.repeat(60));
    
    await fetchAllLogos();
    
    console.log('\n✅ Logos atualizados com sucesso!\n');

    // ============================================
    // RESUMO FINAL
    // ============================================
    const totalTime = Date.now() - startTime;

    console.log('🎉 SINCRONIZAÇÃO COMPLETA FINALIZADA!');
    console.log('='.repeat(60));
    console.log(`⏱️  Tempo total: ${(totalTime / 1000 / 60).toFixed(2)} minutos`);
    console.log('');
    console.log('✅ Tudo pronto para usar!');
    console.log('   - Channels sincronizados');
    console.log('   - Categorias organizadas');
    console.log('   - Episódios com metadados');
    console.log('   - Logos atualizados');
    console.log('='.repeat(60));

    return {
      totalTime,
      m3uResult,
    };

  } catch (error) {
    console.error('\n❌ Erro na sincronização completa:', error);
    throw error;
  }
}

if (require.main === module) {
  syncComplete()
    .then(() => {
      console.log('\n✨ Processo completo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha no processo completo:', error);
      process.exit(1);
    });
}

export { syncComplete };
