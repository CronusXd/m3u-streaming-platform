#!/usr/bin/env node
/**
 * Verificar Logos de Canais Adultos
 * Mostra exemplos de canais adultos com suas logos
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ADULT_LOGO = 'https://i.imgur.com/1eXO9BU.png';

async function checkAdultLogos() {
  console.log('🔞 Verificando Logos de Canais Adultos');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // Buscar categorias adultas
    const { data: adultCategories } = await supabase.client
      .from('categories')
      .select('id, name')
      .or('name.ilike.%Adultos%,name.ilike.%Adult%,name.ilike.%XXX%');

    if (!adultCategories || adultCategories.length === 0) {
      console.log('❌ Nenhuma categoria adulta encontrada');
      return;
    }

    console.log(`\n📁 Categorias Adultas (${adultCategories.length}):`);
    adultCategories.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });

    const categoryIds = adultCategories.map(cat => cat.id);

    // Contar total
    const { count: total } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', categoryIds);

    // Contar com logo correto
    const { count: withCorrectLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', categoryIds)
      .eq('logo_url', ADULT_LOGO);

    // Contar com logo diferente
    const { count: withDifferentLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', categoryIds)
      .neq('logo_url', ADULT_LOGO);

    console.log(`\n📊 ESTATÍSTICAS:`);
    console.log('='.repeat(60));
    console.log(`📺 Total de canais: ${total}`);
    console.log(`✅ Com logo correto: ${withCorrectLogo} (${((withCorrectLogo || 0) / (total || 1) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Com logo diferente: ${withDifferentLogo}`);
    console.log(`🖼️  Logo esperado: ${ADULT_LOGO}`);

    // Buscar exemplos de cada categoria
    console.log(`\n📋 EXEMPLOS (5 por categoria):`);
    console.log('='.repeat(60));

    for (const category of adultCategories) {
      const { data: examples } = await supabase.client
        .from('channels')
        .select('id, name, logo_url')
        .eq('category_id', category.id)
        .limit(5);

      if (examples && examples.length > 0) {
        console.log(`\n📁 ${category.name}:`);
        examples.forEach((ch, i) => {
          const hasCorrectLogo = ch.logo_url === ADULT_LOGO;
          const icon = hasCorrectLogo ? '✅' : '⚠️';
          console.log(`   ${icon} ${i + 1}. ${ch.name}`);
          if (!hasCorrectLogo) {
            console.log(`      Logo atual: ${ch.logo_url || 'SEM LOGO'}`);
          }
        });
      }
    }

    // Se houver logos diferentes, mostrar quais são
    if (withDifferentLogo && withDifferentLogo > 0) {
      console.log(`\n⚠️  CANAIS COM LOGO DIFERENTE:`);
      console.log('='.repeat(60));

      const { data: different } = await supabase.client
        .from('channels')
        .select('id, name, logo_url, categories(name)')
        .in('category_id', categoryIds)
        .neq('logo_url', ADULT_LOGO)
        .limit(10);

      if (different) {
        different.forEach((ch, i) => {
          console.log(`\n${i + 1}. ${ch.name}`);
          console.log(`   Categoria: ${ch.categories?.name || 'N/A'}`);
          console.log(`   Logo atual: ${ch.logo_url || 'SEM LOGO'}`);
        });

        if (withDifferentLogo > 10) {
          console.log(`\n... e mais ${withDifferentLogo - 10} canais`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  checkAdultLogos()
    .then(() => {
      console.log('\n✨ Verificação finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { checkAdultLogos };
