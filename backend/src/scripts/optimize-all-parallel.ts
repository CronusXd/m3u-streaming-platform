#!/usr/bin/env node
/**
 * Script Mestre de Otimização - VERSÃO PARALELA
 * 
 * Executa todas as otimizações em sequência usando 30 threads:
 * 1. Remove duplicados
 * 2. Organiza episódios
 * 3. Corrige vinculação de séries
 */

import { config } from 'dotenv';
import { removeDuplicatesParallel } from './remove-duplicates-parallel';
import { organizeEpisodesParallel } from './organize-episodes-parallel';
import { fixSeriesParallel } from './fix-series-parallel';

config();

async function optimizeAllParallel() {
  const startTime = Date.now();
  
  console.log('🚀 OTIMIZAÇÃO COMPLETA DO BANCO (30 Threads Paralelos)');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Remover duplicados
    console.log('📍 ETAPA 1/3: Removendo Duplicados');
    console.log('-'.repeat(60));
    await removeDuplicatesParallel();
    console.log('');

    // 2. Organizar episódios
    console.log('📍 ETAPA 2/3: Organizando Episódios');
    console.log('-'.repeat(60));
    await organizeEpisodesParallel();
    console.log('');

    // 3. Corrigir vinculação de séries
    console.log('📍 ETAPA 3/3: Corrigindo Vinculação de Séries');
    console.log('-'.repeat(60));
    await fixSeriesParallel();
    console.log('');

    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(2);

    console.log('🎉 OTIMIZAÇÃO COMPLETA FINALIZADA!');
    console.log('='.repeat(60));
    console.log(`⏱️  Tempo total: ${minutes}m ${seconds}s`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro durante otimização:', error);
    throw error;
  }
}

if (require.main === module) {
  optimizeAllParallel()
    .then(() => {
      console.log('\n✨ Todas as otimizações concluídas!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { optimizeAllParallel };
