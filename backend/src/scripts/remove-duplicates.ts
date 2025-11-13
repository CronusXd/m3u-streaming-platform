#!/usr/bin/env node
/**
 * Remover Duplicados
 * 
 * Remove canais/filmes/séries duplicados do banco de dados
 * Mantém apenas o registro mais recente
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function removeDuplicates() {
  console.log('🔍 Removendo Duplicados');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Contar total antes
    const { count: totalBefore } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total de registros ANTES: ${totalBefore}\n`);

    // 2. Encontrar duplicados (mesmo nome + mesmo stream_url)
    console.log('🔍 Buscando duplicados (pode demorar alguns minutos)...');
    
    // Buscar em lotes para não sobrecarregar
    let allChannels: any[] = [];
    let page = 0;
    const pageSize = 5000;

    while (true) {
      const { data: channels } = await supabase.client
        .from('channels')
        .select('id, name, stream_url, created_at')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!channels || channels.length === 0) {
        break;
      }

      allChannels = allChannels.concat(channels);
      console.log(`   Carregados: ${allChannels.length}...`);
      page++;
    }

    console.log(`✅ ${allChannels.length} registros carregados\n`);

    // Agrupar por nome + stream_url (chave única real)
    console.log('🔍 Identificando duplicados...');
    const channelsMap = new Map<string, any[]>();
    
    allChannels.forEach(ch => {
      // Chave: nome + stream_url (isso identifica o mesmo conteúdo)
      const key = `${ch.name.toLowerCase().trim()}|${ch.stream_url}`;
      
      if (!channelsMap.has(key)) {
        channelsMap.set(key, []);
      }
      channelsMap.get(key)!.push(ch);
    });

    // Encontrar duplicados (grupos com mais de 1 item)
    const duplicates: any[] = [];
    let uniqueCount = 0;
    
    channelsMap.forEach((channels, key) => {
      if (channels.length > 1) {
        // Manter o mais recente (primeiro da lista), marcar os outros para deletar
        const [keep, ...toDelete] = channels;
        duplicates.push(...toDelete);
        uniqueCount++;
      } else {
        uniqueCount++;
      }
    });

    console.log(`✅ ${channelsMap.size} itens únicos identificados`);
    console.log(`❌ ${duplicates.length} duplicados encontrados\n`);

    console.log(`✅ ${duplicates.length} duplicados encontrados\n`);

    if (duplicates.length === 0) {
      console.log('✅ Nenhum duplicado encontrado!');
      return;
    }

    // Mostrar exemplos
    console.log('📋 Exemplos de duplicados:');
    duplicates.slice(0, 10).forEach((dup, i) => {
      console.log(`   ${i + 1}. ${dup.name}`);
    });
    console.log('');

    // 3. Remover duplicados em lotes
    console.log('🗑️  Removendo duplicados...');
    const batchSize = 500;
    let removed = 0;

    for (let i = 0; i < duplicates.length; i += batchSize) {
      const batch = duplicates.slice(i, i + batchSize);
      const ids = batch.map(d => d.id);

      const { error: deleteError } = await supabase.client
        .from('channels')
        .delete()
        .in('id', ids);

      if (!deleteError) {
        removed += batch.length;
      }

      const progress = Math.min(i + batchSize, duplicates.length);
      const percent = ((progress / duplicates.length) * 100).toFixed(1);
      process.stdout.write(`\r   Progresso: ${progress}/${duplicates.length} (${percent}%)`);
    }

    console.log(`\n✅ ${removed} duplicados removidos\n`);

    // 4. Contar total depois
    const { count: totalAfter } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log('📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`📊 Total ANTES: ${totalBefore}`);
    console.log(`📊 Total DEPOIS: ${totalAfter}`);
    console.log(`🗑️  Removidos: ${totalBefore! - totalAfter!}`);
    console.log(`✅ Únicos mantidos: ${totalAfter}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  removeDuplicates()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { removeDuplicates };
