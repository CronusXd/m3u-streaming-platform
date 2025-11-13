#!/usr/bin/env node
/**
 * Corrigir Categorias de Episódios - VERSÃO PARALELA (30 threads)
 * Move episódios para as categorias corretas de séries
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

// Categorias de séries
const SERIES_CATEGORIES = [
  'Canais | Filmes e Series',
  'Mini Series (shorts)',
  'Series | Amazon Prime Video',
  'Series | Apple TV',
  'Series | Brasil Paralelo',
  'Series | Crunchyroll',
  'Series | Discovery+',
  'Series | Disney+',
  'Series | Globoplay',
  'Series | Legendado',
  'Series | Max',
  'Series | NBC',
  'Series | Netflix',
  'Series | Outros Streamings',
  'Series | Paramount+',
  'Series | STAR+',
  'Shows',
];

async function fixEpisodesCategoriesParallel() {
  console.log('🔧 Corrigindo Categorias de Episódios (30 Threads)');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar IDs das categorias de séries
    const { data: seriesCategories } = await supabase.client
      .from('categories')
      .select('id, name')
      .in('name', SERIES_CATEGORIES);

    if (!seriesCategories || seriesCategories.length === 0) {
      console.log('❌ Nenhuma categoria de séries encontrada');
      return;
    }

    const seriesCategoryIds = seriesCategories.map(c => c.id);
    const categoryMap = new Map(seriesCategories.map(c => [c.name, c.id]));

    console.log(`✅ ${seriesCategories.length} categorias de séries encontradas\n`);

    // Buscar categoria padrão "Canais | Filmes e Series"
    const defaultCategoryId = categoryMap.get('Canais | Filmes e Series');
    
    if (!defaultCategoryId) {
      console.log('❌ Categoria padrão não encontrada');
      return;
    }

    console.log(`📁 Categoria padrão: "Canais | Filmes e Series"\n`);

    // 2. Buscar episódios fora das categorias de séries
    console.log('🔍 Carregando episódios fora das categorias de séries...');
    
    let allEpisodes: any[] = [];
    let page = 0;
    const pageSize = 5000;

    while (true) {
      const { data: episodes } = await supabase.client
        .from('channels')
        .select('id, name, category_id, metadata')
        .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
        .eq('is_active', true)
        .eq('metadata->is_episode', true)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!episodes || episodes.length === 0) {
        break;
      }

      allEpisodes = allEpisodes.concat(episodes);
      process.stdout.write(`\r   Carregados: ${allEpisodes.length}...`);
      page++;
      
      // Limitar a 50k por execução para evitar timeout
      if (allEpisodes.length >= 50000) {
        break;
      }
    }

    console.log(`\n✅ ${allEpisodes.length} episódios encontrados\n`);

    if (allEpisodes.length === 0) {
      console.log('✅ Todos os episódios já estão nas categorias corretas!');
      return;
    }

    // 3. Mover episódios para categoria padrão em paralelo
    console.log(`🔄 Movendo episódios com ${PARALLEL_THREADS} threads...`);
    
    let moved = 0;
    let errors = 0;
    const updateLimit = pLimit(PARALLEL_THREADS);

    const updatePromises = allEpisodes.map((episode, index) =>
      updateLimit(async () => {
        try {
          const { error } = await supabase.client
            .from('channels')
            .update({ category_id: defaultCategoryId })
            .eq('id', episode.id);

          if (!error) {
            moved++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / allEpisodes.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${allEpisodes.length} (${percent}%) - ✅ ${moved} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`\n✅ ${moved} episódios movidos`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante atualização`);
    }

    // 4. Verificar resultado
    const { count: remainingOutside } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
      .eq('is_active', true)
      .eq('metadata->is_episode', true);

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Episódios movidos: ${moved}`);
    console.log(`📊 Episódios fora das categorias restantes: ${remainingOutside}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixEpisodesCategoriesParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixEpisodesCategoriesParallel };
