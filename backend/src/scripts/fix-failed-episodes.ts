#!/usr/bin/env node
/**
 * Corrigir os 2 Episódios que Falharam
 * Força a correção manual dos episódios problemáticos
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function fixFailedEpisodes() {
  console.log('🔧 Corrigindo Episódios que Falharam');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar episódios sem categoria
    const { data: episodesWithoutCategory } = await supabase.client
      .from('channels')
      .select('id, name, metadata')
      .eq('metadata->is_episode', true)
      .is('category_id', null);

    if (!episodesWithoutCategory || episodesWithoutCategory.length === 0) {
      console.log('✅ Nenhum episódio sem categoria encontrado!');
      return;
    }

    console.log(`📊 ${episodesWithoutCategory.length} episódios sem categoria\n`);

    // 2. Buscar categorias
    const { data: categories } = await supabase.client
      .from('categories')
      .select('id, name');

    if (!categories) {
      console.log('❌ Erro ao buscar categorias');
      return;
    }

    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // Procurar categoria "Series" genérica como fallback
    let seriesCategoryId: string | null = null;
    for (const [catName, catId] of categoryMap.entries()) {
      if (catName.includes('series') || catName.includes('séries') || catName.includes('serie')) {
        seriesCategoryId = catId;
        console.log(`📁 Categoria fallback encontrada: "${catName}" (${catId})\n`);
        break;
      }
    }

    if (!seriesCategoryId) {
      console.log('❌ Nenhuma categoria "Series" encontrada para usar como fallback');
      return;
    }

    // 3. Corrigir cada episódio
    console.log('🔧 Corrigindo episódios...\n');
    let fixed = 0;
    let errors = 0;

    for (const ep of episodesWithoutCategory) {
      const seriesName = ep.metadata?.series_name;
      let categoryId = seriesCategoryId; // Usar fallback por padrão

      // Tentar encontrar categoria específica
      if (seriesName) {
        for (const [catName, catId] of categoryMap.entries()) {
          if (catName.includes(seriesName.toLowerCase()) || 
              seriesName.toLowerCase().includes(catName)) {
            categoryId = catId;
            break;
          }
        }
      }

      // Atualizar
      const { error } = await supabase.client
        .from('channels')
        .update({ category_id: categoryId })
        .eq('id', ep.id);

      if (!error) {
        fixed++;
        console.log(`✅ ${fixed}. "${ep.name}"`);
      } else {
        errors++;
        console.log(`❌ ${errors}. "${ep.name}" - Erro: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Corrigidos: ${fixed}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('='.repeat(60));

    // 4. Verificar se ainda há episódios sem categoria
    const { count: remaining } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->is_episode', true)
      .is('category_id', null);

    console.log(`\n📊 Episódios sem categoria restantes: ${remaining}`);

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixFailedEpisodes()
    .then(() => {
      console.log('\n✨ Correção finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixFailedEpisodes };
