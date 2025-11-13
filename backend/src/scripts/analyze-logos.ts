#!/usr/bin/env node
/**
 * Analisar Logos
 * Verifica quantos itens têm ou não têm logos
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function analyzeLogos() {
  console.log('🔍 Analisando Logos...\n');

  const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

  // Total de itens
  const { count: total } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Itens COM logo
  const { count: withLogo } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('logo_url', 'is', null);

  // Itens SEM logo
  const { count: withoutLogo } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('logo_url', null);

  // Canais/Filmes sem logo
  const { count: channelsWithoutLogo } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('logo_url', null)
    .is('metadata->is_episode', null);

  // Episódios sem logo
  const { count: episodesWithoutLogo } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('logo_url', null)
    .not('metadata->is_episode', 'is', null);

  console.log('📊 ESTATÍSTICAS DE LOGOS:');
  console.log('='.repeat(60));
  console.log(`📺 Total de itens: ${total}`);
  console.log(`✅ Com logo: ${withLogo} (${((withLogo! / total!) * 100).toFixed(1)}%)`);
  console.log(`❌ Sem logo: ${withoutLogo} (${((withoutLogo! / total!) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('📋 Detalhamento:');
  console.log(`   🎬 Canais/Filmes sem logo: ${channelsWithoutLogo}`);
  console.log(`   📺 Episódios sem logo: ${episodesWithoutLogo}`);
  console.log('='.repeat(60));

  // Buscar exemplos de filmes sem logo
  console.log('\n🎬 Exemplos de filmes sem logo:');
  const { data: moviesWithoutLogo } = await supabase.client
    .from('channels')
    .select('name, categories(name)')
    .eq('is_active', true)
    .is('logo_url', null)
    .is('metadata->is_episode', null)
    .limit(10);

  moviesWithoutLogo?.forEach((movie, i) => {
    console.log(`   ${i + 1}. ${movie.name}`);
    console.log(`      Categoria: ${movie.categories?.name || 'N/A'}`);
  });
}

analyzeLogos();
