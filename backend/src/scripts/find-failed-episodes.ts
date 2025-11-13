#!/usr/bin/env node
/**
 * Encontrar Episódios que Falharam na Correção
 * Identifica episódios sem category_id que deveriam ter
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function findFailedEpisodes() {
  console.log('🔍 Buscando Episódios com Problemas');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar episódios sem categoria
    console.log('🔍 Buscando episódios sem categoria...\n');
    
    const { data: episodesWithoutCategory, count } = await supabase.client
      .from('channels')
      .select('id, name, metadata, category_id, stream_url, created_at', { count: 'exact' })
      .eq('metadata->is_episode', true)
      .is('category_id', null)
      .order('created_at', { ascending: false });

    if (!episodesWithoutCategory || episodesWithoutCategory.length === 0) {
      console.log('✅ Nenhum episódio sem categoria encontrado!');
      return;
    }

    console.log(`❌ ${count} episódios sem categoria encontrados\n`);
    console.log('📋 DETALHES DOS EPISÓDIOS:');
    console.log('='.repeat(60));

    episodesWithoutCategory.forEach((ep, i) => {
      console.log(`\n${i + 1}. ID: ${ep.id}`);
      console.log(`   Nome: ${ep.name}`);
      console.log(`   Série: ${ep.metadata?.series_name || 'N/A'}`);
      console.log(`   Temporada: ${ep.metadata?.season || 'N/A'}`);
      console.log(`   Episódio: ${ep.metadata?.episode || 'N/A'}`);
      console.log(`   Stream URL: ${ep.stream_url?.substring(0, 50)}...`);
      console.log(`   Criado em: ${ep.created_at}`);
    });

    console.log('\n' + '='.repeat(60));

    // 2. Buscar todas as categorias disponíveis
    console.log('\n📁 Categorias disponíveis:');
    const { data: categories } = await supabase.client
      .from('categories')
      .select('id, name')
      .order('name');

    if (categories) {
      categories.forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name} (${cat.id})`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // 3. Tentar encontrar categoria apropriada para cada episódio
    console.log('\n🔧 Sugestões de correção:\n');

    const categoryMap = new Map<string, string>();
    categories?.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    episodesWithoutCategory.forEach((ep, i) => {
      const seriesName = ep.metadata?.series_name;
      
      if (!seriesName) {
        console.log(`${i + 1}. "${ep.name}" - ⚠️  SEM SERIES_NAME no metadata`);
        return;
      }

      // Procurar categoria que contenha o nome da série
      let suggestedCategory: string | null = null;
      
      for (const [catName, catId] of categoryMap.entries()) {
        if (catName.includes(seriesName.toLowerCase()) || 
            seriesName.toLowerCase().includes(catName)) {
          suggestedCategory = catName;
          break;
        }
      }

      // Se não encontrou, procurar por "Series" genérico
      if (!suggestedCategory) {
        for (const [catName] of categoryMap.entries()) {
          if (catName.includes('series') || catName.includes('séries')) {
            suggestedCategory = catName;
            break;
          }
        }
      }

      if (suggestedCategory) {
        console.log(`${i + 1}. "${ep.name}"`);
        console.log(`   Série: ${seriesName}`);
        console.log(`   ✅ Sugestão: Categoria "${suggestedCategory}"`);
      } else {
        console.log(`${i + 1}. "${ep.name}"`);
        console.log(`   Série: ${seriesName}`);
        console.log(`   ❌ Nenhuma categoria encontrada`);
      }
      console.log('');
    });

    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  findFailedEpisodes()
    .then(() => {
      console.log('\n✨ Análise finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { findFailedEpisodes };
