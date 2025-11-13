#!/usr/bin/env node
/**
 * Corrigir Logos de Filmes Adultos - VERSÃO PARALELA (30 threads)
 * 
 * Aplica logo padrão em TODOS os filmes da categoria "Adultos"
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

// Logo padrão para conteúdo adulto
const ADULT_LOGO = 'https://i.imgur.com/1eXO9BU.png';

async function fixAdultLogosParallel() {
  console.log('🔞 Corrigindo Logos de Filmes Adultos (30 Threads)');
  console.log('='.repeat(60));
  console.log(`🖼️  Logo: ${ADULT_LOGO}\n`);

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar TODAS as categorias com "Adultos" no nome
    console.log('🔍 Buscando categorias adultas...');
    
    const { data: adultCategories } = await supabase.client
      .from('categories')
      .select('id, name')
      .or('name.ilike.%Adultos%,name.ilike.%Adult%,name.ilike.%XXX%');

    if (!adultCategories || adultCategories.length === 0) {
      console.log('❌ Nenhuma categoria adulta encontrada');
      return;
    }

    console.log(`✅ ${adultCategories.length} categorias encontradas:`);
    adultCategories.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });
    console.log('');

    const categoryIds = adultCategories.map(cat => cat.id);

    // 2. Buscar TODOS os canais dessas categorias
    console.log('🔍 Carregando todos os canais adultos...');
    
    let allChannels: any[] = [];
    let page = 0;
    const pageSize = 5000;

    while (true) {
      const { data: channels } = await supabase.client
        .from('channels')
        .select('id, name, logo_url, category_id')
        .in('category_id', categoryIds)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!channels || channels.length === 0) {
        break;
      }

      allChannels = allChannels.concat(channels);
      process.stdout.write(`\r   Carregados: ${allChannels.length}...`);
      page++;
    }

    console.log(`\n✅ ${allChannels.length} canais encontrados\n`);

    if (allChannels.length === 0) {
      console.log('❌ Nenhum canal adulto encontrado');
      return;
    }

    // 3. Atualizar TODOS os logos em paralelo (30 threads)
    console.log(`🔄 Atualizando logos com ${PARALLEL_THREADS} threads...`);
    
    let updated = 0;
    let errors = 0;
    const updateLimit = pLimit(PARALLEL_THREADS);

    const updatePromises = allChannels.map((channel, index) =>
      updateLimit(async () => {
        try {
          const { error } = await supabase.client
            .from('channels')
            .update({ logo_url: ADULT_LOGO })
            .eq('id', channel.id);

          if (!error) {
            updated++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / allChannels.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${allChannels.length} (${percent}%) - ✅ ${updated} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(updatePromises);

    console.log(`\n✅ ${updated} logos atualizados`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante atualização`);
    }

    // 4. Verificar resultado
    const { count: withCorrectLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .in('category_id', categoryIds)
      .eq('logo_url', ADULT_LOGO);

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Total de canais: ${allChannels.length}`);
    console.log(`✅ Logos atualizados: ${updated}`);
    console.log(`✅ Com logo correto: ${withCorrectLogo}`);
    console.log(`🖼️  Logo usado: ${ADULT_LOGO}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fixAdultLogosParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fixAdultLogosParallel };
