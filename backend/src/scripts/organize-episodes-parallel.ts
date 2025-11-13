#!/usr/bin/env node
/**
 * Organizar Episódios - VERSÃO PARALELA (30 threads)
 * 
 * Extrai informações de série/temporada/episódio dos nomes
 * e adiciona metadados usando processamento paralelo
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import pLimit from 'p-limit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PARALLEL_THREADS = 30;

interface EpisodeInfo {
  id: string;
  name: string;
  seriesName: string;
  season: number;
  episode: number;
  fullMatch: string;
}

/**
 * Extrai informações de série/temporada/episódio do nome
 */
function parseEpisodeName(name: string): EpisodeInfo | null {
  // Padrão: S01E01, S02E05, etc
  const pattern1 = /^(.+?)\s+S(\d{2})E(\d{2,3})/i;
  // Padrão: T01E01 (Temporada)
  const pattern2 = /^(.+?)\s+T(\d{2})E(\d{2,3})/i;
  // Padrão: "Nome S01 S01E01"
  const pattern3 = /^(.+?)\s+S\d{2}\s+S(\d{2})E(\d{2,3})/i;

  let match = name.match(pattern3) || name.match(pattern1) || name.match(pattern2);

  if (!match) {
    return null;
  }

  const seriesName = match[1].trim();
  const season = parseInt(match[2], 10);
  const episode = parseInt(match[3], 10);

  return {
    id: '',
    name,
    seriesName,
    season,
    episode,
    fullMatch: match[0],
  };
}

async function organizeEpisodesParallel() {
  const startTime = Date.now();
  
  console.log('🚀 Organizando Episódios (30 Threads Paralelos)');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar todos os episódios
    console.log('🔍 Carregando episódios...');
    let allChannels: any[] = [];
    let page = 0;
    const pageSize = 5000;

    while (true) {
      const { data: channels } = await supabase.client
        .from('channels')
        .select('id, name, group_title, metadata')
        .or('name.ilike.%S01E%,name.ilike.%S02E%,name.ilike.%S03E%,name.ilike.%T01E%,name.ilike.%T02E%')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!channels || channels.length === 0) {
        break;
      }

      allChannels = allChannels.concat(channels);
      process.stdout.write(`\r   Carregados: ${allChannels.length}...`);
      page++;
    }

    console.log(`\n✅ ${allChannels.length} episódios encontrados\n`);

    // 2. Processar e extrair informações (em memória, super rápido)
    console.log('🔧 Processando episódios...');
    const episodesInfo: EpisodeInfo[] = [];
    const seriesMap = new Map<string, number>();

    allChannels.forEach(ch => {
      const info = parseEpisodeName(ch.name);
      if (info) {
        info.id = ch.id;
        episodesInfo.push(info);
        
        const count = seriesMap.get(info.seriesName) || 0;
        seriesMap.set(info.seriesName, count + 1);
      }
    });

    console.log(`✅ ${episodesInfo.length} episódios processados`);
    console.log(`📊 ${seriesMap.size} séries encontradas\n`);

    // Mostrar top 10 séries
    const topSeries = Array.from(seriesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('🏆 Top 10 séries:');
    topSeries.forEach(([name, count], i) => {
      console.log(`   ${i + 1}. ${name}: ${count} eps`);
    });
    console.log('');

    // 3. Atualizar metadados em paralelo (30 threads)
    console.log(`💾 Atualizando metadados com ${PARALLEL_THREADS} threads...`);
    
    let updated = 0;
    let errors = 0;
    const updateLimit = pLimit(PARALLEL_THREADS);

    const updatePromises = episodesInfo.map((ep, index) =>
      updateLimit(async () => {
        try {
          const { error: updateError } = await supabase.client
            .from('channels')
            .update({
              metadata: {
                series_name: ep.seriesName,
                season: ep.season,
                episode: ep.episode,
                is_episode: true,
              },
            })
            .eq('id', ep.id);

          if (!updateError) {
            updated++;
          } else {
            errors++;
          }

          // Atualizar progresso a cada 100 itens
          if ((index + 1) % 100 === 0) {
            const percent = (((index + 1) / episodesInfo.length) * 100).toFixed(1);
            process.stdout.write(`\r   Progresso: ${index + 1}/${episodesInfo.length} (${percent}%) - ✅ ${updated} | ❌ ${errors}`);
          }
        } catch (err) {
          errors++;
        }
      })
    );

    await Promise.all(updatePromises);

    const duration = Date.now() - startTime;

    console.log(`\n✅ ${updated} episódios atualizados`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erros durante atualização`);
    }

    console.log('\n📊 ESTATÍSTICAS FINAIS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📺 Episódios processados: ${episodesInfo.length}`);
    console.log(`📁 Séries encontradas: ${seriesMap.size}`);
    console.log(`💾 Metadados atualizados: ${updated}`);
    console.log('='.repeat(60));

    return {
      duration,
      processed: episodesInfo.length,
      series: seriesMap.size,
      updated,
    };

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  organizeEpisodesParallel()
    .then(() => {
      console.log('\n✨ Organização concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { organizeEpisodesParallel };
