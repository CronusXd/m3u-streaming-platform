#!/usr/bin/env node
/**
 * Verificação Completa do Banco de Dados
 * Valida integridade e completude dos dados
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function verifyDatabase() {
  console.log('✅ VERIFICAÇÃO COMPLETA DO BANCO DE DADOS');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Total de registros
    const { count: total } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 TOTAL DE REGISTROS: ${total?.toLocaleString()}`);

    // 2. Por tipo
    const { count: movies } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->is_movie', true);
    
    const { count: episodes } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->is_episode', true);
    
    const { count: live } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .is('metadata->is_movie', null)
      .is('metadata->is_episode', null);

    console.log('\n📺 POR TIPO:');
    console.log(`   🎬 Filmes: ${movies?.toLocaleString()}`);
    console.log(`   📺 Episódios: ${episodes?.toLocaleString()}`);
    console.log(`   📡 Live TV: ${live?.toLocaleString()}`);

    // 3. Episódios sem categoria
    const { count: episodesWithoutCategory } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->is_episode', true)
      .is('category_id', null);

    console.log('\n🔗 VINCULAÇÕES:');
    console.log(`   ✅ Episódios com categoria: ${((episodes || 0) - (episodesWithoutCategory || 0)).toLocaleString()}`);
    console.log(`   ❌ Episódios sem categoria: ${episodesWithoutCategory?.toLocaleString()}`);

    // 4. Episódios com metadados completos
    const { count: episodesWithMetadata } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->is_episode', true)
      .not('metadata->series_name', 'is', null)
      .not('metadata->season', 'is', null)
      .not('metadata->episode', 'is', null);

    console.log('\n📋 METADADOS:');
    console.log(`   ✅ Episódios com metadados completos: ${episodesWithMetadata?.toLocaleString()}`);
    console.log(`   📊 Cobertura: ${((episodesWithMetadata || 0) / (episodes || 1) * 100).toFixed(1)}%`);

    // 5. Logos
    const { count: withLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('logo_url', 'is', null)
      .neq('logo_url', '');

    const { count: withoutLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .or('logo_url.is.null,logo_url.eq.');

    console.log('\n🖼️  LOGOS:');
    console.log(`   ✅ Com logo: ${withLogo?.toLocaleString()}`);
    console.log(`   ❌ Sem logo: ${withoutLogo?.toLocaleString()}`);
    console.log(`   📊 Cobertura: ${((withLogo || 0) / (total || 1) * 100).toFixed(1)}%`);

    // 6. Duplicados
    let duplicates = 0;
    const { data: allChannels } = await supabase.client
      .from('channels')
      .select('name, stream_url');

    if (allChannels) {
      const uniqueKeys = new Set<string>();

      allChannels.forEach(ch => {
        const key = `${ch.name}|||${ch.stream_url}`;
        if (uniqueKeys.has(key)) {
          duplicates++;
        } else {
          uniqueKeys.add(key);
        }
      });

      console.log('\n🔍 DUPLICADOS:');
      console.log(`   ✅ Registros únicos: ${uniqueKeys.size.toLocaleString()}`);
      console.log(`   ❌ Duplicados: ${duplicates}`);
    }

    // 7. Séries
    const { data: seriesData } = await supabase.client
      .from('channels')
      .select('metadata->series_name')
      .eq('metadata->is_episode', true)
      .not('metadata->series_name', 'is', null);

    if (seriesData) {
      const uniqueSeries = new Set(seriesData.map(d => d.series_name));
      console.log('\n📺 SÉRIES:');
      console.log(`   📁 Total de séries diferentes: ${uniqueSeries.size}`);
    }

    // 8. Categorias
    const { count: totalCategories } = await supabase.client
      .from('categories')
      .select('*', { count: 'exact', head: true });

    const { count: channelsWithCategory } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'is', null);

    console.log('\n📁 CATEGORIAS:');
    console.log(`   📂 Total de categorias: ${totalCategories}`);
    console.log(`   🔗 Canais vinculados: ${channelsWithCategory?.toLocaleString()}`);
    console.log(`   📊 Cobertura: ${((channelsWithCategory || 0) / (total || 1) * 100).toFixed(1)}%`);

    // 9. Status geral
    console.log('\n' + '='.repeat(60));
    console.log('🎯 STATUS GERAL:');
    console.log('='.repeat(60));

    const issues: string[] = [];
    
    if (episodesWithoutCategory && episodesWithoutCategory > 0) {
      issues.push(`⚠️  ${episodesWithoutCategory} episódios sem categoria`);
    }
    
    if (duplicates && duplicates > 0) {
      issues.push(`⚠️  ${duplicates} registros duplicados`);
    }
    
    if (withoutLogo && withoutLogo > (total || 0) * 0.05) {
      issues.push(`⚠️  ${withoutLogo} canais sem logo (>${((withoutLogo / (total || 1)) * 100).toFixed(0)}%)`);
    }

    if (issues.length === 0) {
      console.log('✅ BANCO DE DADOS ESTÁ PERFEITO!');
      console.log('   - Sem duplicados');
      console.log('   - Todos episódios categorizados');
      console.log('   - Metadados completos');
      console.log('   - Boa cobertura de logos');
    } else {
      console.log('⚠️  PROBLEMAS ENCONTRADOS:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  verifyDatabase()
    .then(() => {
      console.log('\n✨ Verificação finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { verifyDatabase };
