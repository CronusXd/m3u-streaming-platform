#!/usr/bin/env node
/**
 * Marcar Filmes no Banco - VERSÃO PARALELA (30 threads)
 * Adiciona metadata->is_movie = true para todos os filmes
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

// Categorias de séries
const SERIES_CATEGORY_NAMES = [
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

async function markMoviesParallel() {
  console.log('🎬 Marcando Filmes no Banco (30 Threads)');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar IDs das categorias de séries
    const { data: seriesCategories } = await supabase.client
      .from('categories')
      .select('id')
      .in('name', SERIES_CATEGORY_NAMES);

    const seriesCategoryIds = seriesCategories?.map(c => c.id) || [];
    console.log(`✅ ${seriesCategoryIds.length} categorias de séries identificadas\n`);

    // 2. Buscar todos os canais que são filmes (não episódios, fora de categorias de séries)
    console.log('🔍 Carregando filmes...');
    
    let allMovies: any[] = [];
    let page = 0;
    const pageSize = 5000;

    while (true) {
      const { data: movies } = await supabase.client
        .from('channels')
        .select('id, name, metadata')
        .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
        .eq('is_active', true)
        .is('metadata->is_episode', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!movies || movies.length === 0) {
        break;
      }

      allMovies = allMovies.concat(movies);
      process.stdout.write(`\r   Carregados: ${allMovies.length}...`);
      page++;
    }

    console.log(`\n✅ ${allMovies.length} filmes encontrados\n`);

    if (allMovies.length === 0) {
      console.log('✅ Nenhum filme para marcar!');
      return;
    }

    // 3. Marcar como filmes em paralelo
    console.log(`🔄 Marcando filmes com ${PARALLEL_THREADS} threads...`);
    
    let marked = 0;
    let errors = 0;
    const updateLimit = pLimit(PARALLEL_THREADS);

    const updatePromises = allMovies.map((movie, index) =>
      updateLimit(async () => {
        try {
          const updatedMetadata = {
            ...(movie.metadata || {}),
            is_movie: true,
          };

          const { error } = await supabase.client
            .from('channels')
            .update({ metadata: updatedMetadata })
            .eq('id', movie.id);

          if (!error) {
            marked++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / allMovies.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${allMovies.length} (${percent}%) - ✅ ${marked} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`\n✅ ${marked} filmes marcados`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante atualização`);
    }

    // 4. Verificar resultado
    const { count: moviesMarked } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('metadata->is_movie', true);

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Filmes marcados: ${marked}`);
    console.log(`📊 Total com is_movie=true: ${moviesMarked}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  markMoviesParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { markMoviesParallel };
