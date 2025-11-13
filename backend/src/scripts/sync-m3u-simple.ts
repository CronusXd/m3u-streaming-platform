#!/usr/bin/env node
/**
 * Sincronização M3U - Versão Simples e Rápida
 * 
 * Usa apenas 2 tabelas (como antes):
 * - categories: Categorias
 * - channels: TUDO (canais, filmes, séries, episódios)
 * 
 * Vantagens:
 * - Muito mais rápido (1-2 minutos vs 5-10 minutos)
 * - Menos queries ao banco
 * - Estrutura simples
 */

import { config } from 'dotenv';
import { M3UParser } from '../parsers/m3u-parser';
import { SupabaseService } from '../clients/supabase';

config();

const M3U_URL = process.env.M3U_SYNC_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function syncM3USimple() {
  const startTime = Date.now();
  
  console.log('🚀 Sincronização M3U - Versão Simples e Rápida');
  console.log('='.repeat(60));
  console.log(`📡 URL: ${M3U_URL}\n`);

  try {
    // 1. Download e Parse
    console.log('📥 Baixando M3U...');
    const parser = new M3UParser();
    const parseResult = await parser.parseFromUrl(M3U_URL);
    console.log(`✅ ${parseResult.channels.length} itens encontrados\n`);

    // 2. Extrair categorias únicas
    console.log('📁 Processando categorias...');
    const categoriesSet = new Set<string>();
    parseResult.channels.forEach(ch => {
      if (ch.groupTitle) {
        categoriesSet.add(ch.groupTitle);
      }
    });
    console.log(`✅ ${categoriesSet.size} categorias encontradas\n`);

    // 3. Conectar ao Supabase
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 4. Limpar dados antigos
    console.log('🗑️  Limpando dados antigos...');
    const deletedChannels = await supabase.deleteAllChannels();
    console.log(`✅ ${deletedChannels} registros removidos\n`);

    // 5. Inserir categorias na tabela categories
    console.log('📁 Inserindo categorias...');
    const categories = Array.from(categoriesSet).map(name => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
      type: 'general', // Tipo padrão
    }));
    
    // Limpar categorias antigas
    await supabase.client.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Inserir novas categorias
    const { error: catError } = await supabase.client
      .from('categories')
      .insert(categories);
    
    if (catError) {
      console.warn(`⚠️  Aviso ao inserir categorias: ${catError.message}`);
    } else {
      console.log(`✅ ${categories.length} categorias inseridas\n`);
    }

    // 6. Buscar categorias inseridas para mapear IDs
    console.log('🔗 Mapeando categorias...');
    const { data: insertedCategories } = await supabase.client
      .from('categories')
      .select('id, name');
    
    const categoryMap = new Map<string, string>();
    insertedCategories?.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });
    console.log(`✅ ${categoryMap.size} categorias mapeadas\n`);

    // 7. Processar e inserir TUDO em channels (com metadados de episódios)
    console.log('💾 Processando e inserindo itens...');
    console.log(`   Total: ${parseResult.channels.length} itens`);
    
    // Função para extrair info de episódio
    function parseEpisode(name: string) {
      const pattern1 = /^(.+?)\s+S(\d{2})E(\d{2,3})/i;
      const pattern2 = /^(.+?)\s+T(\d{2})E(\d{2,3})/i;
      const pattern3 = /^(.+?)\s+S\d{2}\s+S(\d{2})E(\d{2,3})/i;
      
      const match = name.match(pattern3) || name.match(pattern1) || name.match(pattern2);
      
      if (match) {
        return {
          series_name: match[1].trim(),
          season: parseInt(match[2], 10),
          episode: parseInt(match[3], 10),
          is_episode: true,
        };
      }
      return null;
    }
    
    await supabase.bulkUpsertChannels(
      parseResult.channels.map(ch => {
        const episodeInfo = parseEpisode(ch.name);
        const categoryId = ch.groupTitle ? categoryMap.get(ch.groupTitle) : undefined;
        
        return {
          name: ch.name,
          display_name: ch.name,
          stream_url: ch.url,
          logo_url: ch.tvgLogo && ch.tvgLogo !== 'NO_IMAGE' ? ch.tvgLogo : undefined,
          category_id: categoryId,
          tvg_id: ch.tvgId,
          is_hls: ch.isHls,
          is_active: true,
          metadata: episodeInfo || {},
        };
      })
    );

    const duration = Date.now() - startTime;

    // Contar episódios detectados
    const episodesCount = parseResult.channels.filter(ch => {
      const pattern = /S\d{2}E\d{2,3}|T\d{2}E\d{2,3}/i;
      return pattern.test(ch.name);
    }).length;

    console.log(`✅ ${parseResult.channels.length} itens inseridos\n`);
    console.log('✅ Sincronização concluída com sucesso!\n');
    console.log('📊 ESTATÍSTICAS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Total: ${parseResult.channels.length} itens`);
    console.log(`📁 Categorias: ${categoriesSet.size}`);
    console.log(`📺 Episódios detectados: ${episodesCount}`);
    console.log(`🎬 Canais/Filmes: ${parseResult.channels.length - episodesCount}`);
    console.log(`🗑️  Removidos: ${deletedChannels}`);
    console.log(`💾 Inseridos: ${parseResult.channels.length}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Episódios organizados automaticamente!');
    console.log('   - metadata.series_name: Nome da série');
    console.log('   - metadata.season: Temporada');
    console.log('   - metadata.episode: Episódio');
    console.log('   - content_type: "series" para episódios');

    return {
      duration,
      total: parseResult.channels.length,
      categories: categoriesSet.size,
      deleted: deletedChannels,
      inserted: parseResult.channels.length,
    };

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  syncM3USimple()
    .then(() => {
      console.log('\n✨ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { syncM3USimple };
