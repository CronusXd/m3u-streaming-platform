#!/usr/bin/env node
/**
 * Analisar Duplicados no Banco
 * Identifica por que temos 171k ao invés de 165k
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function analyzeDuplicates() {
  console.log('🔍 Analisando Duplicados no Banco');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // Total de registros
    const { count: total } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total de registros: ${total?.toLocaleString()}\n`);

    // Buscar duplicados por name + stream_url
    console.log('🔍 Buscando duplicados por name + stream_url...');
    
    const { data: duplicates } = await supabase.client.rpc('find_duplicates_by_name_url', {});

    if (duplicates && duplicates.length > 0) {
      console.log(`❌ ${duplicates.length} grupos de duplicados encontrados`);
      console.log(`📊 Total de registros duplicados: ${duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0)}\n`);
      
      console.log('📋 Top 10 duplicados:');
      duplicates.slice(0, 10).forEach((d: any, i: number) => {
        console.log(`   ${i + 1}. "${d.name}" - ${d.count}x`);
      });
    } else {
      console.log('✅ Nenhum duplicado por name + stream_url\n');
    }

    // Buscar duplicados apenas por name
    console.log('\n🔍 Buscando duplicados apenas por name...');
    
    const { data: nameOnlyDuplicates } = await supabase.client
      .from('channels')
      .select('name')
      .then(async ({ data }) => {
        if (!data) return { data: [] };
        
        const nameCounts = new Map<string, number>();
        data.forEach(ch => {
          const count = nameCounts.get(ch.name) || 0;
          nameCounts.set(ch.name, count + 1);
        });
        
        const dups = Array.from(nameCounts.entries())
          .filter(([_, count]) => count > 1)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        
        return { data: dups };
      });

    if (nameOnlyDuplicates && nameOnlyDuplicates.length > 0) {
      const totalDupsByName = nameOnlyDuplicates.reduce((sum, d) => sum + d.count - 1, 0);
      console.log(`⚠️  ${nameOnlyDuplicates.length} nomes duplicados`);
      console.log(`📊 Total de registros com nome duplicado: ${totalDupsByName}\n`);
      
      console.log('📋 Top 10 nomes duplicados:');
      nameOnlyDuplicates.slice(0, 10).forEach((d, i) => {
        console.log(`   ${i + 1}. "${d.name}" - ${d.count}x`);
      });
    }

    // Analisar por tipo
    console.log('\n📊 Análise por tipo:');
    
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

    console.log(`   🎬 Filmes: ${movies?.toLocaleString()}`);
    console.log(`   📺 Episódios: ${episodes?.toLocaleString()}`);
    console.log(`   📡 Live TV: ${live?.toLocaleString()}`);
    console.log(`   ➕ Total: ${((movies || 0) + (episodes || 0) + (live || 0)).toLocaleString()}\n`);

    // Verificar registros sem stream_url
    const { count: noUrl } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .or('stream_url.is.null,stream_url.eq.');

    if (noUrl && noUrl > 0) {
      console.log(`⚠️  ${noUrl} registros sem stream_url\n`);
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  analyzeDuplicates()
    .then(() => {
      console.log('\n✨ Análise finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { analyzeDuplicates };
