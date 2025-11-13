#!/usr/bin/env node
/**
 * Verificar Dados para o Frontend
 * Simula as queries do frontend para garantir que tudo está correto
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function verifyFrontendData() {
  console.log('🔍 Verificando Dados para o Frontend');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Verificar Categorias
    console.log('\n📁 CATEGORIAS:');
    console.log('-'.repeat(60));
    
    const { data: categories, count: catCount } = await supabase.client
      .from('categories')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true });

    console.log(`✅ Total de categorias: ${catCount}`);
    console.log(`📋 Primeiras 10 categorias:`);
    categories?.slice(0, 10).forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name} (${cat.type})`);
    });

    // 2. Verificar Canais (sem episódios)
    console.log('\n📺 CANAIS/FILMES (sem episódios):');
    console.log('-'.repeat(60));
    
    const { count: channelsCount } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('metadata->is_episode', null);

    console.log(`✅ Total de canais/filmes: ${channelsCount}`);

    // Buscar exemplos
    const { data: channelExamples } = await supabase.client
      .from('channels')
      .select('id, name, logo_url, categories(name)')
      .eq('is_active', true)
      .is('metadata->is_episode', null)
      .limit(5);

    console.log(`📋 Exemplos:`);
    channelExamples?.forEach((ch, i) => {
      const hasLogo = ch.logo_url ? '🖼️' : '❌';
      console.log(`   ${i + 1}. ${hasLogo} ${ch.name} - ${ch.categories?.name || 'Sem categoria'}`);
    });

    // 3. Verificar Séries (episódios agrupados)
    console.log('\n📺 SÉRIES (episódios):');
    console.log('-'.repeat(60));
    
    const { count: episodesCount } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('metadata->is_episode', 'is', null);

    console.log(`✅ Total de episódios: ${episodesCount}`);

    // Buscar séries únicas
    const { data: allEpisodes } = await supabase.client
      .from('channels')
      .select('metadata, logo_url, categories(name)')
      .eq('is_active', true)
      .not('metadata->series_name', 'is', null);

    const seriesMap = new Map<string, { count: number; logo?: string; category?: string }>();
    
    allEpisodes?.forEach((ep: any) => {
      const name = ep.metadata?.series_name;
      if (name) {
        if (!seriesMap.has(name)) {
          seriesMap.set(name, {
            count: 0,
            logo: ep.logo_url,
            category: ep.categories?.name,
          });
        }
        seriesMap.get(name)!.count++;
      }
    });

    console.log(`✅ Total de séries únicas: ${seriesMap.size}`);
    console.log(`📋 Top 10 séries:`);
    
    const topSeries = Array.from(seriesMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    topSeries.forEach(([name, data], i) => {
      const hasLogo = data.logo ? '🖼️' : '❌';
      console.log(`   ${i + 1}. ${hasLogo} ${name} - ${data.count} eps - ${data.category || 'Sem categoria'}`);
    });

    // 4. Verificar episódios de uma série específica
    if (topSeries.length > 0) {
      const [seriesName] = topSeries[0];
      
      console.log(`\n📺 EPISÓDIOS DA SÉRIE "${seriesName}":`);
      console.log('-'.repeat(60));

      const { data: episodes } = await supabase.client
        .from('channels')
        .select('id, name, stream_url, logo_url, metadata')
        .eq('is_active', true)
        .eq('metadata->>series_name', seriesName)
        .order('metadata->season', { ascending: true })
        .order('metadata->episode', { ascending: true })
        .limit(10);

      console.log(`📋 Primeiros 10 episódios:`);
      episodes?.forEach((ep, i) => {
        const season = ep.metadata?.season || '?';
        const episode = ep.metadata?.episode || '?';
        const hasLogo = ep.logo_url ? '🖼️' : '❌';
        console.log(`   ${i + 1}. ${hasLogo} S${season}E${episode} - ${ep.name}`);
      });
    }

    // 5. Verificar canais por categoria
    console.log('\n📁 CANAIS POR CATEGORIA:');
    console.log('-'.repeat(60));

    const categoriesWithCounts = await Promise.all(
      (categories || []).slice(0, 10).map(async (cat) => {
        const { count } = await supabase.client
          .from('channels')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('category_id', cat.id);

        return { name: cat.name, count: count || 0 };
      })
    );

    categoriesWithCounts
      .sort((a, b) => b.count - a.count)
      .forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name}: ${cat.count} canais`);
      });

    // 6. Verificar logos
    console.log('\n🖼️  LOGOS:');
    console.log('-'.repeat(60));

    const { count: withLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('logo_url', 'is', null)
      .neq('logo_url', '');

    const { count: withoutLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('logo_url.is.null,logo_url.eq.');

    const total = (withLogo || 0) + (withoutLogo || 0);
    const percentage = ((withLogo || 0) / total * 100).toFixed(1);

    console.log(`✅ Com logo: ${withLogo} (${percentage}%)`);
    console.log(`❌ Sem logo: ${withoutLogo}`);

    // 7. Verificar metadados dos episódios
    console.log('\n📋 METADADOS DOS EPISÓDIOS:');
    console.log('-'.repeat(60));

    const { count: withMetadata } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('metadata->is_episode', true)
      .not('metadata->series_name', 'is', null)
      .not('metadata->season', 'is', null)
      .not('metadata->episode', 'is', null);

    const metadataPercentage = ((withMetadata || 0) / (episodesCount || 1) * 100).toFixed(1);

    console.log(`✅ Episódios com metadados completos: ${withMetadata} (${metadataPercentage}%)`);

    // 8. Resumo Final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO PARA O FRONTEND:');
    console.log('='.repeat(60));
    console.log(`✅ Categorias: ${catCount}`);
    console.log(`✅ Canais/Filmes: ${channelsCount}`);
    console.log(`✅ Séries: ${seriesMap.size}`);
    console.log(`✅ Episódios: ${episodesCount}`);
    console.log(`✅ Logos: ${percentage}%`);
    console.log(`✅ Metadados: ${metadataPercentage}%`);
    console.log('='.repeat(60));

    // 9. Verificar problemas
    const problems: string[] = [];

    if ((catCount || 0) === 0) {
      problems.push('❌ Nenhuma categoria encontrada');
    }

    if ((channelsCount || 0) === 0 && (episodesCount || 0) === 0) {
      problems.push('❌ Nenhum canal ou episódio encontrado');
    }

    if (seriesMap.size === 0 && (episodesCount || 0) > 0) {
      problems.push('⚠️  Episódios sem series_name no metadata');
    }

    if ((withLogo || 0) / total < 0.9) {
      problems.push(`⚠️  Apenas ${percentage}% dos canais têm logo`);
    }

    if (problems.length > 0) {
      console.log('\n⚠️  PROBLEMAS ENCONTRADOS:');
      problems.forEach(p => console.log(`   ${p}`));
    } else {
      console.log('\n✅ TUDO PERFEITO! Frontend deve funcionar corretamente.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  verifyFrontendData()
    .then(() => {
      console.log('\n✨ Verificação finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { verifyFrontendData };
