#!/usr/bin/env node
/**
 * Organizar Episódios
 * 
 * Extrai informações de série/temporada/episódio dos nomes
 * e adiciona metadados para facilitar agrupamento no frontend
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

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
 * 
 * Formatos suportados:
 * - "Fina Estampa S01 S01E44"
 * - "Breaking Bad S02E05"
 * - "Game of Thrones T03E08"
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

async function organizeEpisodes() {
  const startTime = Date.now();
  
  console.log('📺 Organizando Episódios');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar todos os canais que parecem ser episódios (em lotes)
    console.log('🔍 Buscando episódios...');
    let allChannels: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: channels, error } = await supabase.client
        .from('channels')
        .select('id, name, group_title, metadata')
        .or('name.ilike.%S01E%,name.ilike.%S02E%,name.ilike.%S03E%,name.ilike.%T01E%,name.ilike.%T02E%')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(`Erro ao buscar episódios: ${error.message}`);
      }

      if (channels && channels.length > 0) {
        allChannels = allChannels.concat(channels);
        page++;
        console.log(`   Carregados: ${allChannels.length} episódios...`);
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ ${allChannels.length} episódios encontrados\n`);

    // 2. Processar e extrair informações
    console.log('🔧 Processando episódios...');
    const episodesInfo: EpisodeInfo[] = [];
    const seriesMap = new Map<string, number>();

    allChannels.forEach(ch => {
      const info = parseEpisodeName(ch.name);
      if (info) {
        info.id = ch.id;
        episodesInfo.push(info);
        
        // Contar episódios por série
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

    console.log('🏆 Top 10 séries com mais episódios:');
    topSeries.forEach(([name, count], i) => {
      console.log(`   ${i + 1}. ${name}: ${count} episódios`);
    });
    console.log('');

    // 3. Atualizar metadados dos episódios
    console.log('💾 Atualizando metadados...');
    let updated = 0;
    const batchSize = 100;

    for (let i = 0; i < episodesInfo.length; i += batchSize) {
      const batch = episodesInfo.slice(i, i + batchSize);
      
      // Atualizar em lote
      for (const ep of batch) {
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
        }
      }

      // Progresso
      const progress = Math.min(i + batchSize, episodesInfo.length);
      const percent = ((progress / episodesInfo.length) * 100).toFixed(1);
      console.log(`   Progresso: ${progress}/${episodesInfo.length} (${percent}%)`);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ ${updated} episódios atualizados\n`);
    console.log('📊 ESTATÍSTICAS FINAIS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📺 Episódios processados: ${episodesInfo.length}`);
    console.log(`📁 Séries encontradas: ${seriesMap.size}`);
    console.log(`💾 Metadados atualizados: ${updated}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Agora os episódios têm metadados:');
    console.log('   - metadata.series_name: Nome da série');
    console.log('   - metadata.season: Número da temporada');
    console.log('   - metadata.episode: Número do episódio');
    console.log('   - metadata.is_episode: true');
    console.log('');
    console.log('🎯 No frontend, você pode:');
    console.log('   1. Agrupar por metadata.series_name');
    console.log('   2. Ordenar por metadata.season e metadata.episode');
    console.log('   3. Filtrar episódios com metadata.is_episode = true');

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
  organizeEpisodes()
    .then(() => {
      console.log('\n✨ Organização concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { organizeEpisodes };
