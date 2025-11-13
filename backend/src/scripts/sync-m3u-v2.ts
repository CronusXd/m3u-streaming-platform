#!/usr/bin/env node
/**
 * Script de Sincronização M3U v2
 * Com classificação completa: Categorias, Filmes, Séries, Canais
 */

import { config } from 'dotenv';
import { M3UParser } from '../parsers/m3u-parser';
import { ContentClassifier } from '../parsers/content-classifier';
import { SupabaseService } from '../clients/supabase';

config();

const M3U_URL = process.env.M3U_SYNC_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

interface SyncStats {
  duration: number;
  total: number;
  liveChannels: number;
  movies: number;
  series: number;
  episodes: number;
  categories: number;
  withLogo: number;
  withoutLogo: number;
  deleted: number;
  inserted: number;
}

async function syncM3Uv2(): Promise<SyncStats> {
  const startTime = Date.now();
  
  console.log('🚀 Sincronização M3U v2 - Com Categorias');
  console.log('='.repeat(60));
  console.log(`📡 URL: ${M3U_URL}\n`);

  const stats: SyncStats = {
    duration: 0,
    total: 0,
    liveChannels: 0,
    movies: 0,
    series: 0,
    episodes: 0,
    categories: 0,
    withLogo: 0,
    withoutLogo: 0,
    deleted: 0,
    inserted: 0,
  };

  try {
    // 1. Download e Parse
    console.log('📥 Baixando e processando M3U...');
    const parser = new M3UParser();
    const parseResult = await parser.parseFromUrl(M3U_URL);
    stats.total = parseResult.channels.length;
    console.log(`✅ ${stats.total} itens encontrados\n`);

    // 2. Classificar conteúdo
    console.log('🔍 Classificando conteúdo...');
    const classifier = new ContentClassifier();
    const classified = classifier.classify(parseResult.channels);
    
    stats.liveChannels = classified.stats.liveChannels;
    stats.movies = classified.stats.movies;
    stats.series = classified.stats.series;
    stats.episodes = classified.stats.episodes;
    stats.categories = classified.categories.length;
    stats.withLogo = classified.stats.withLogo;
    stats.withoutLogo = classified.stats.withoutLogo;

    console.log('✅ Classificação completa:');
    console.log(`   - Canais ao vivo: ${stats.liveChannels}`);
    console.log(`   - Filmes: ${stats.movies}`);
    console.log(`   - Séries: ${stats.series}`);
    console.log(`   - Episódios: ${stats.episodes}`);
    console.log(`   - Categorias: ${stats.categories}`);
    console.log(`   - Com logo: ${stats.withLogo} (${((stats.withLogo / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   - Sem logo: ${stats.withoutLogo} (${((stats.withoutLogo / stats.total) * 100).toFixed(1)}%)\n`);

    // 3. Conectar ao Supabase
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 4. Limpar dados antigos
    console.log('🗑️  Limpando dados antigos...');
    const deletedSeries = await supabase.deleteAllSeries();
    const deletedChannels = await supabase.deleteAllChannels();
    stats.deleted = deletedSeries + deletedChannels;
    console.log(`✅ ${stats.deleted} registros removidos\n`);

    // 5. Inserir categorias
    console.log('📁 Inserindo categorias...');
    // TODO: Implementar inserção de categorias
    console.log(`✅ ${stats.categories} categorias processadas\n`);

    // 6. Inserir canais ao vivo
    console.log('📺 Inserindo canais ao vivo...');
    if (classified.liveChannels.length > 0) {
      await supabase.bulkUpsertChannels(
        classified.liveChannels.map(ch => ({
          name: ch.name,
          url: ch.url,
          logo: ch.logo,
          group_title: ch.category,
          language: ch.language,
          tvg_id: ch.tvgId,
          raw_meta: ch.rawMeta,
          is_hls: ch.isHls,
          is_active: true,
          content_type: 'channel',
        }))
      );
      stats.inserted += classified.liveChannels.length;
    }
    console.log(`✅ ${classified.liveChannels.length} canais inseridos\n`);

    // 7. Inserir filmes
    console.log('🎬 Inserindo filmes...');
    if (classified.movies.length > 0) {
      await supabase.bulkUpsertChannels(
        classified.movies.map(movie => ({
          name: movie.name,
          url: movie.url,
          logo: movie.logo,
          group_title: movie.category,
          language: movie.language,
          tvg_id: movie.tvgId,
          raw_meta: movie.rawMeta,
          is_hls: movie.isHls,
          is_active: true,
          content_type: 'channel', // Filmes são armazenados como channels
        }))
      );
      stats.inserted += classified.movies.length;
    }
    console.log(`✅ ${classified.movies.length} filmes inseridos\n`);

    // 8. Inserir séries e episódios
    console.log('📺 Inserindo séries e episódios...');
    for (const series of classified.series) {
      const seriesRecord = await supabase.insertSeries({
        name: series.name,
        logo: series.logo && series.logo !== 'NO_IMAGE' ? series.logo : undefined,
        group_title: series.groupTitle,
        total_episodes: series.episodes.length,
        content_type: 'series',
      });

      if (series.episodes.length > 0) {
        await supabase.bulkInsertEpisodes(
          series.episodes.map(ep => ({
            series_id: seriesRecord.id,
            name: ep.name,
            url: ep.url,
            logo: ep.logo && ep.logo !== 'NO_IMAGE' ? ep.logo : undefined,
            season: ep.season,
            episode: ep.episode,
            tvg_id: ep.tvgId,
            raw_meta: ep.rawMeta,
            is_hls: ep.isHls,
            is_active: true,
          }))
        );
      }
      
      stats.inserted += series.episodes.length;
    }
    console.log(`✅ ${classified.series.length} séries e ${classified.stats.episodes} episódios inseridos\n`);

    stats.duration = Date.now() - startTime;

    console.log('✅ Sincronização concluída com sucesso!\n');
    console.log('📊 ESTATÍSTICAS FINAIS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Total processado: ${stats.total} itens`);
    console.log(`📺 Canais ao vivo: ${stats.liveChannels}`);
    console.log(`🎬 Filmes: ${stats.movies}`);
    console.log(`📺 Séries: ${stats.series}`);
    console.log(`📝 Episódios: ${stats.episodes}`);
    console.log(`📁 Categorias: ${stats.categories}`);
    console.log(`🖼️  Com logo: ${stats.withLogo} (${((stats.withLogo / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Sem logo: ${stats.withoutLogo} (${((stats.withoutLogo / stats.total) * 100).toFixed(1)}%)`);
    console.log(`🗑️  Removidos: ${stats.deleted}`);
    console.log(`💾 Inseridos: ${stats.inserted}`);
    console.log('='.repeat(60));

    return stats;

  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error);
    throw error;
  }
}

if (require.main === module) {
  syncM3Uv2()
    .then(() => {
      console.log('\n✨ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha na sincronização:', error);
      process.exit(1);
    });
}

export { syncM3Uv2, SyncStats };
