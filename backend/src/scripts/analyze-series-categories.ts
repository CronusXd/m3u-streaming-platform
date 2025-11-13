#!/usr/bin/env node
/**
 * Analisar Categorias de Séries
 * Verifica como as séries estão distribuídas nas categorias
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Categorias de séries esperadas
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

async function analyzeSeriesCategories() {
  console.log('🔍 Analisando Categorias de Séries');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar todas as categorias
    const { data: allCategories } = await supabase.client
      .from('categories')
      .select('id, name, type')
      .order('name');

    console.log(`\n📁 Total de categorias no banco: ${allCategories?.length}\n`);

    // 2. Verificar categorias de séries
    console.log('📺 CATEGORIAS DE SÉRIES:');
    console.log('-'.repeat(60));

    const seriesCategoryIds: string[] = [];

    for (const expectedCat of SERIES_CATEGORIES) {
      const found = allCategories?.find(c => c.name === expectedCat);
      
      if (found) {
        seriesCategoryIds.push(found.id);
        
        // Contar canais nesta categoria
        const { count } = await supabase.client
          .from('channels')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', found.id)
          .eq('is_active', true);

        // Contar episódios
        const { count: episodeCount } = await supabase.client
          .from('channels')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', found.id)
          .eq('is_active', true)
          .eq('metadata->is_episode', true);

        console.log(`✅ ${expectedCat}`);
        console.log(`   Total: ${count} | Episódios: ${episodeCount}`);
      } else {
        console.log(`❌ ${expectedCat} - NÃO ENCONTRADA`);
      }
    }

    // 3. Total de episódios em categorias de séries
    console.log('\n📊 TOTAIS:');
    console.log('-'.repeat(60));

    const { count: totalInSeriesCategories } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', seriesCategoryIds)
      .eq('is_active', true);

    const { count: episodesInSeriesCategories } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', seriesCategoryIds)
      .eq('is_active', true)
      .eq('metadata->is_episode', true);

    console.log(`✅ Total em categorias de séries: ${totalInSeriesCategories}`);
    console.log(`✅ Episódios em categorias de séries: ${episodesInSeriesCategories}`);

    // 4. Episódios fora das categorias de séries
    const { count: episodesOutside } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
      .eq('is_active', true)
      .eq('metadata->is_episode', true);

    if (episodesOutside && episodesOutside > 0) {
      console.log(`\n⚠️  ${episodesOutside} episódios FORA das categorias de séries!`);
      
      // Buscar em quais categorias estão
      const { data: wrongCategories } = await supabase.client
        .from('channels')
        .select('category_id, categories(name)')
        .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
        .eq('is_active', true)
        .eq('metadata->is_episode', true)
        .limit(10);

      console.log('\n📋 Exemplos de categorias erradas:');
      const catMap = new Map<string, number>();
      wrongCategories?.forEach((ch: any) => {
        const catName = ch.categories?.name || 'Sem categoria';
        catMap.set(catName, (catMap.get(catName) || 0) + 1);
      });

      Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
          console.log(`   - ${name}: ${count} episódios`);
        });
    }

    // 5. Contar filmes e canais ao vivo
    console.log('\n📊 CONTAGEM POR TIPO:');
    console.log('-'.repeat(60));

    // Filmes (não episódios, não em categorias de séries)
    const { count: moviesCount } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'in', `(${seriesCategoryIds.join(',')})`)
      .eq('is_active', true)
      .is('metadata->is_episode', null);

    // Canais ao vivo (em categorias específicas ou sem metadata de episódio/filme)
    const { count: liveCount } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('metadata->is_episode', null)
      .is('metadata->is_movie', null);

    console.log(`🎬 Filmes: ${moviesCount}`);
    console.log(`📺 Episódios: ${episodesInSeriesCategories}`);
    console.log(`📡 Canais ao vivo: ${liveCount}`);

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  analyzeSeriesCategories()
    .then(() => {
      console.log('\n✨ Análise finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { analyzeSeriesCategories };
