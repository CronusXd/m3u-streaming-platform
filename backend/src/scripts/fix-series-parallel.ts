#!/usr/bin/env node
/**
 * Corrigir Vinculação de Séries - VERSÃO PARALELA (30 threads)
 * 
 * Garante que todos os episódios estejam vinculados às categorias corretas
 * usando processamento paralelo para máxima velocidade
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

interface Episode {
  id: string;
  name: string;
  metadata: any;
  category_id: string | null;
  categories?: { name: string } | null;
}

interface FixItem {
  id: string;
  name: string;
  correctCategoryId: string;
}

async function fixSeriesParallel() {
  console.log('🚀 Corrigindo Vinculação de Séries (30 Threads Paralelos)');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar todas as categorias
    console.log('📁 Buscando categorias...');
    const { data: categories } = await supabase.client
      .from('categories')
      .select('id, name');

    if (!categories) {
      console.log('❌ Erro ao buscar categorias');
      return;
    }

    console.log(`✅ ${categories.length} categorias encontradas\n`);

    // Criar mapa de categorias
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // 2. Buscar todos os episódios
    console.log('🔍 Carregando todos os episódios...');
    
    let page = 0;
    const pageSize = 2000;
    let allEpisodes: Episode[] = [];

    while (true) {
      const { data: episodes } = await supabase.client
        .from('channels')
        .select('id, name, metadata, category_id, categories(name)')
        .not('metadata->is_episode', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!episodes || episodes.length === 0) {
        break;
      }

      allEpisodes = allEpisodes.concat(episodes);
      process.stdout.write(`\r   Carregados: ${allEpisodes.length}...`);
      page++;
    }

    console.log(`\n✅ ${allEpisodes.length} episódios encontrados\n`);

    // 3. Analisar quais precisam de correção (paralelo)
    console.log('🔧 Analisando episódios em paralelo...');
    
    const limit = pLimit(PARALLEL_THREADS);
    const toFix: FixItem[] = [];

    const analyzePromises = allEpisodes.map(ep => 
      limit(async () => {
        const seriesName = ep.metadata?.series_name;
        
        if (!seriesName) {
          return null;
        }

        // Tentar encontrar categoria correta baseada no nome da série
        let correctCategoryId: string | undefined;

        // Procurar categoria que contenha o nome da série
        for (const [catName, catId] of categoryMap.entries()) {
          if (catName.includes(seriesName.toLowerCase()) || 
              seriesName.toLowerCase().includes(catName)) {
            correctCategoryId = catId;
            break;
          }
        }

        // Se não encontrou, procurar por "Series" genérico
        if (!correctCategoryId) {
          for (const [catName, catId] of categoryMap.entries()) {
            if (catName.includes('series') || catName.includes('séries')) {
              correctCategoryId = catId;
              break;
            }
          }
        }

        // Se a categoria atual está errada ou não existe
        if (correctCategoryId && ep.category_id !== correctCategoryId) {
          return {
            id: ep.id,
            name: ep.name,
            correctCategoryId,
          };
        }

        return null;
      })
    );

    const results = await Promise.all(analyzePromises);
    toFix.push(...results.filter((r): r is FixItem => r !== null));

    console.log(`📊 ${toFix.length} episódios precisam de correção\n`);

    if (toFix.length === 0) {
      console.log('✅ Todas as séries já estão vinculadas corretamente!');
      return;
    }

    // Mostrar exemplos
    console.log('📋 Exemplos de correções:');
    toFix.slice(0, 10).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.name}`);
    });
    console.log('');

    // 4. Aplicar correções em paralelo (30 threads)
    console.log(`💾 Aplicando correções com ${PARALLEL_THREADS} threads paralelos...`);
    
    let fixed = 0;
    let errors = 0;
    const updateLimit = pLimit(PARALLEL_THREADS);

    const updatePromises = toFix.map((item, index) =>
      updateLimit(async () => {
        try {
          const { error: updateError } = await supabase.client
            .from('channels')
            .update({ category_id: item.correctCategoryId })
            .eq('id', item.id);

          if (!updateError) {
            fixed++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / toFix.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${toFix.length} (${percent}%) - ✅ ${fixed} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`\n✅ ${fixed} episódios corrigidos`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante atualização\n`);
    }

    // 5. Estatísticas finais
    const { count: finalWithoutCategory } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('metadata->is_episode', 'is', null)
      .is('category_id', null);

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Corrigidos: ${fixed}`);
    console.log(`📊 Episódios sem categoria restantes: ${finalWithoutCategory}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixSeriesParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixSeriesParallel };
