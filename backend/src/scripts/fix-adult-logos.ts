#!/usr/bin/env node
/**
 * Corrigir Logos de Filmes Adultos
 * 
 * Copia os logos de "Canais | Adultos" para "Filmes | Adultos"
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function fixAdultLogos() {
  console.log('🔞 Corrigindo Logos de Filmes Adultos');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // Logo padrão fixo para conteúdo adulto
    const defaultLogo = 'https://i.imgur.com/1eXO9BU.png';
    console.log(`🖼️  Logo padrão: ${defaultLogo}\n`);

    // 2. Buscar categoria "Filmes | Adultos"
    console.log('🔍 Buscando categoria "Filmes | Adultos"...');
    
    const { data: adultMovieCategory } = await supabase.client
      .from('categories')
      .select('id, name')
      .ilike('name', '%Filmes%Adultos%')
      .limit(1);

    if (!adultMovieCategory || adultMovieCategory.length === 0) {
      console.log('❌ Categoria "Filmes | Adultos" não encontrada');
      return;
    }

    const categoryId = adultMovieCategory[0].id;
    const categoryName = adultMovieCategory[0].name;
    console.log(`✅ Categoria encontrada: ${categoryName}\n`);

    // 3. Contar total de filmes adultos
    const { count: totalAdultMovies } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    console.log(`📊 Total de filmes adultos: ${totalAdultMovies}\n`);

    if (!totalAdultMovies || totalAdultMovies === 0) {
      console.log('❌ Nenhum filme adulto encontrado');
      return;
    }

    // 4. SUBSTITUIR TODOS os logos (forçar atualização)
    console.log('🔄 Substituindo TODOS os logos por logo padrão...');
    
    const { error: updateError } = await supabase.client
      .from('channels')
      .update({ logo_url: defaultLogo })
      .eq('category_id', categoryId);

    if (updateError) {
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    console.log(`✅ ${totalAdultMovies} filmes adultos atualizados com logo padrão\n`);

    // 5. Verificar resultado
    const { count: withCorrectLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('logo_url', defaultLogo);

    console.log('📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Total de filmes: ${totalAdultMovies}`);
    console.log(`✅ Com logo correto: ${withCorrectLogo}`);
    console.log(`🖼️  Logo usado: ${defaultLogo}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixAdultLogos()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixAdultLogos };
