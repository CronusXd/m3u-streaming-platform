#!/usr/bin/env node
/**
 * Remover Duplicados - VERSÃO PARALELA (30 threads)
 * Remove duplicados mantendo o registro mais recente
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

interface Channel {
  id: string;
  name: string;
  stream_url: string;
  created_at: string;
}

async function removeDuplicatesParallel() {
  console.log('🗑️  Removendo Duplicados (30 Threads Paralelos)');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Contar total antes
    const { count: totalBefore } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total ANTES: ${totalBefore?.toLocaleString()}\n`);

    // 2. Buscar TODOS os registros
    console.log('🔍 Carregando todos os registros...');
    
    let page = 0;
    const pageSize = 5000;
    let allChannels: Channel[] = [];

    while (true) {
      const { data: channels } = await supabase.client
        .from('channels')
        .select('id, name, stream_url, created_at')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false });

      if (!channels || channels.length === 0) {
        break;
      }

      allChannels = allChannels.concat(channels);
      process.stdout.write(`\r   Carregados: ${allChannels.length}...`);
      page++;
    }

    console.log(`\n✅ ${allChannels.length} registros carregados\n`);

    // 3. Identificar duplicados (em memória, super rápido)
    console.log('🔍 Identificando duplicados...');
    
    const uniqueMap = new Map<string, Channel>();
    const toDelete: string[] = [];

    allChannels.forEach(channel => {
      const key = `${channel.name}|||${channel.stream_url}`;
      
      const existing = uniqueMap.get(key);
      
      if (!existing) {
        // Primeiro registro com essa chave
        uniqueMap.set(key, channel);
      } else {
        // Duplicado encontrado - manter o mais recente
        const existingDate = new Date(existing.created_at);
        const currentDate = new Date(channel.created_at);
        
        if (currentDate > existingDate) {
          // Atual é mais recente, deletar o antigo
          toDelete.push(existing.id);
          uniqueMap.set(key, channel);
        } else {
          // Existente é mais recente, deletar o atual
          toDelete.push(channel.id);
        }
      }
    });

    console.log(`📊 Registros únicos: ${uniqueMap.size}`);
    console.log(`❌ Duplicados a remover: ${toDelete.length}\n`);

    if (toDelete.length === 0) {
      console.log('✅ Nenhum duplicado encontrado!');
      return;
    }

    // 4. Deletar em paralelo (30 threads)
    console.log(`🗑️  Deletando ${toDelete.length} duplicados com ${PARALLEL_THREADS} threads...`);
    
    let deleted = 0;
    let errors = 0;
    const deleteLimit = pLimit(PARALLEL_THREADS);

    const deletePromises = toDelete.map((id, index) =>
      deleteLimit(async () => {
        try {
          const { error } = await supabase.client
            .from('channels')
            .delete()
            .eq('id', id);

          if (!error) {
            deleted++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / toDelete.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${toDelete.length} (${percent}%) - ✅ ${deleted} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(deletePromises);

    console.log(`\n✅ ${deleted} duplicados removidos`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante deleção\n`);
    }

    // 5. Contar total depois
    const { count: totalAfter } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`📊 Total ANTES: ${totalBefore?.toLocaleString()}`);
    console.log(`📊 Total DEPOIS: ${totalAfter?.toLocaleString()}`);
    console.log(`✅ Removidos: ${(totalBefore || 0) - (totalAfter || 0)}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  removeDuplicatesParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { removeDuplicatesParallel };
