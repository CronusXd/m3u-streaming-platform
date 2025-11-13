#!/usr/bin/env node
/**
 * Analisar estrutura de episódios
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function analyzeEpisodes() {
  console.log('🔍 Analisando estrutura de episódios...\n');

  const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

  // Buscar exemplos de episódios
  const { data: episodes, error } = await supabase.client
    .from('channels')
    .select('name, group_title')
    .or('name.ilike.%S01E%,name.ilike.%S02E%,name.ilike.%T01E%')
    .limit(20);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('📺 Exemplos de episódios encontrados:\n');
  episodes?.forEach((ep, i) => {
    console.log(`${i + 1}. ${ep.name}`);
    console.log(`   Categoria: ${ep.group_title}\n`);
  });

  // Contar total de episódios
  const { count } = await supabase.client
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .or('name.ilike.%S01E%,name.ilike.%S02E%,name.ilike.%S03E%,name.ilike.%T01E%');

  console.log(`\n📊 Total de episódios encontrados: ${count}\n`);
}

analyzeEpisodes();
