#!/usr/bin/env node
/**
 * Corrigir TODAS as Categorias de Episódios
 * Executa até não haver mais episódios fora das categorias de séries
 */

import { fixEpisodesCategoriesParallel } from './fix-episodes-categories-parallel';

async function fixAllEpisodesCategories() {
  console.log('🚀 Corrigindo TODAS as Categorias de Episódios');
  console.log('='.repeat(60));
  console.log('');

  let iteration = 1;
  const maxIterations = 10;

  while (iteration <= maxIterations) {
    console.log(`\n📍 ITERAÇÃO ${iteration}/${maxIterations}`);
    console.log('-'.repeat(60));

    try {
      await fixEpisodesCategoriesParallel();
      
      // Pequena pausa entre iterações
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      iteration++;
    } catch (error) {
      console.error(`\n❌ Erro na iteração ${iteration}:`, error);
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Processo completo finalizado!');
  console.log('='.repeat(60));
}

if (require.main === module) {
  fixAllEpisodesCategories()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixAllEpisodesCategories };
