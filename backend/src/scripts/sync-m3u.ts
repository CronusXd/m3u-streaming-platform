#!/usr/bin/env node
/**
 * Script de sincronização automática do M3U
 * 
 * Este script:
 * 1. Baixa o M3U da URL configurada
 * 2. Faz parse dos canais e séries
 * 3. SUBSTITUI os dados antigos (não acumula)
 * 4. Agrupa episódios dentro das séries
 * 
 * Uso:
 * - Manual: npm run sync-m3u
 * - Automático: Configurar cron job ou scheduler
 */

import { config } from 'dotenv';
import { M3UParser } from '../parsers/m3u-parser';
import { SupabaseService } from '../clients/supabase';
import { SeriesGrouper } from '../parsers/series-grouper';

// Carregar variáveis de ambiente
config();

const M3U_URL = process.env.M3U_SYNC_URL || 'http://play.dnsrot.vip/get.php?username=Betania&password=hmjefp94euh&type=m3u_plus&output=m3u8';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface SyncStats {
  totalChannels: number;
  totalSeries: number;
  totalEpisodes: number;
  deletedChannels: number;
  insertedChannels: number;
  errors: number;
  duration: number;
}

async function syncM3U(): Promise<SyncStats> {
  const startTime = Date.now();
  const stats: SyncStats = {
    totalChannels: 0,
    totalSeries: 0,
    totalEpisodes: 0,
    deletedChannels: 0,
    insertedChannels: 0,
    errors: 0,
    duration: 0,
  };

  console.log('🚀 Iniciando sincronização do M3U...');
  console.log(`📡 URL: ${M3U_URL}`);

  try {
    // Inicializar serviços
    const parser = new M3UParser();
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);
    const seriesGrouper = new SeriesGrouper();

    // 1. Baixar e fazer parse do M3U
    console.log('\n📥 Baixando M3U...');
    const parseResult = await parser.parseFromUrl(M3U_URL);
    
    if (parseResult.errors.length > 0) {
      console.warn(`⚠️  ${parseResult.errors.length} erros durante o parse`);
      stats.errors = parseResult.errors.length;
    }

    stats.totalChannels = parseResult.channels.length;
    console.log(`✅ Parse completo: ${stats.totalChannels} canais encontrados`);

    // 2. Agrupar séries e episódios
    console.log('\n📺 Agrupando séries e episódios...');
    const grouped = seriesGrouper.groupSeries(parseResult.channels);
    
    stats.totalSeries = grouped.series.length;
    stats.totalEpisodes = grouped.episodes.length;
    
    console.log(`✅ Agrupamento completo:`);
    console.log(`   - ${grouped.channels.length} canais normais`);
    console.log(`   - ${stats.totalSeries} séries`);
    console.log(`   - ${stats.totalEpisodes} episódios`);

    // 3. Limpar dados antigos (IMPORTANTE: evita acúmulo)
    console.log('\n🗑️  Limpando dados antigos...');
    
    // Limpar séries (episódios são deletados por CASCADE)
    const deletedSeries = await supabase.deleteAllSeries();
    console.log(`   - ${deletedSeries} séries removidas`);
    
    // Limpar canais
    const deletedChannels = await supabase.deleteAllChannels();
    stats.deletedChannels = deletedChannels + deletedSeries;
    console.log(`   - ${deletedChannels} canais removidos`);
    console.log(`✅ Total: ${stats.deletedChannels} registros removidos`);

    // 4. Inserir canais normais
    console.log('\n💾 Inserindo canais...');
    if (grouped.channels.length > 0) {
      await supabase.bulkUpsertChannels(
        grouped.channels.map(ch => ({
          name: ch.name,
          url: ch.url,
          logo: ch.tvgLogo,
          group_title: ch.groupTitle,
          language: ch.language,
          tvg_id: ch.tvgId,
          raw_meta: ch.rawMeta,
          is_hls: ch.isHls,
          is_active: true,
          content_type: 'channel',
        }))
      );
      stats.insertedChannels += grouped.channels.length;
    }

    // 5. Inserir séries com episódios
    console.log('\n📺 Inserindo séries e episódios...');
    for (const series of grouped.series) {
      // Inserir série principal
      const seriesRecord = await supabase.insertSeries({
        name: series.name,
        logo: series.logo,
        group_title: series.groupTitle,
        total_episodes: series.episodes.length,
        content_type: 'series',
      });

      // Inserir episódios da série
      if (series.episodes.length > 0) {
        await supabase.bulkInsertEpisodes(
          series.episodes.map(ep => ({
            series_id: seriesRecord.id,
            name: ep.name,
            url: ep.url,
            logo: ep.logo,
            season: ep.season,
            episode: ep.episode,
            tvg_id: ep.tvgId,
            raw_meta: ep.rawMeta,
            is_hls: ep.isHls,
            is_active: true,
          }))
        );
      }
      
      stats.insertedChannels += series.episodes.length;
    }

    stats.duration = Date.now() - startTime;

    console.log('\n✅ Sincronização concluída com sucesso!');
    console.log('\n📊 Estatísticas:');
    console.log(`   - Duração: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log(`   - Total processado: ${stats.totalChannels} itens`);
    console.log(`   - Canais: ${grouped.channels.length}`);
    console.log(`   - Séries: ${stats.totalSeries}`);
    console.log(`   - Episódios: ${stats.totalEpisodes}`);
    console.log(`   - Removidos: ${stats.deletedChannels}`);
    console.log(`   - Inseridos: ${stats.insertedChannels}`);
    console.log(`   - Erros: ${stats.errors}`);

    return stats;

  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  syncM3U()
    .then(() => {
      console.log('\n✨ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na sincronização:', error);
      process.exit(1);
    });
}

export { syncM3U, SyncStats };
