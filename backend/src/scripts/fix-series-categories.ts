#!/usr/bin/env node
/**
 * Corrigir Vinculação de Séries às Categorias
 * 
 * Garante que todos os episódios estejam vinculados às categorias corretas
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function fixSeriesCategories() {
  console.log('🔧 Corrigindo Vinculação de Séries às Categorias');
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

    // 2. Buscar episódios sem categoria ou com categoria errada
    console.log('🔍 Buscando episódios sem categoria...');
    
    const { data: episodesWithoutCategory, count: countWithout } = await supabase.client
      .from('channels')
      .select('id, name, metadata', { count: 'exact' })
      .not('metadata->is_episode', 'is', null)
      .is('category_id', null);

    console.log(`📊 Episódios sem categoria: ${countWithout}\n`);

    // 3. Buscar todos os episódios para verificar categorias
    console.log('🔍 Analisando todos os episódios...');
    
    let page = 0;
    const pageSize = 1000;
    let allEpisodes: any[] = [];

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
      console.log(`   Carregados: ${allEpisodes.length}...`);
      page++;
    }

    console.log(`✅ ${allEpisodes.length} episódios encontrados\n`);

    // 4. Analisar e corrigir
    console.log('🔧 Corrigindo vinculações...');
    
    const toFix: { id: string; name: string; correctCategoryId: string }[] = [];

    allEpisodes.forEach(ep => {
      const seriesName = ep.metadata?.series_name;
      
      if (!seriesName) {
        return;
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
        toFix.push({
          id: ep.id,
          name: ep.name,
          correctCategoryId,
        });
      }
    });

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

    // 5. Aplicar correções em lotes
    console.log('💾 Aplicando correções...');
    let fixed = 0;
    const batchSize = 100;

    for (let i = 0; i < toFix.length; i += batchSize) {
      const batch = toFix.slice(i, i + batchSize);

      for (const item of batch) {
        const { error: updateError } = await supabase.client
          .from('channels')
          .update({ category_id: item.correctCategoryId })
          .eq('id', item.id);

        if (!updateError) {
          fixed++;
        }
      }

      const progress = Math.min(i + batchSize, toFix.length);
      const percent = ((progress / toFix.length) * 100).toFixed(1);
      process.stdout.write(`\r   Progresso: ${progress}/${toFix.length} (${percent}%)`);
    }

    console.log(`\n✅ ${fixed} episódios corrigidos\n`);

    // 6. Estatísticas finais
    const { count: finalWithoutCategory } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('metadata->is_episode', 'is', null)
      .is('category_id', null);

    console.log('📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`📊 Episódios sem categoria ANTES: ${countWithout}`);
    console.log(`📊 Episódios sem categoria DEPOIS: ${finalWithoutCategory}`);
    console.log(`✅ Corrigidos: ${fixed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixSeriesCategories()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixSeriesCategories };
