#!/usr/bin/env node
/**
 * Sincronização M3U - Incremental (Inteligente)
 * 
 * Ao invés de deletar tudo:
 * 1. Atualiza apenas stream_url dos itens existentes
 * 2. Insere apenas itens novos
 * 3. Mantém logos e metadados existentes
 * 
 * Vantagens:
 * - Muito mais rápido
 * - Não perde logos já buscados
 * - Não perde favoritos dos usuários
 */

import { config } from 'dotenv';
import { M3UParser } from '../parsers/m3u-parser';
import { SupabaseService } from '../clients/supabase';

config();

const M3U_URL = process.env.M3U_SYNC_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

/**
 * Gerar chave única para identificar um canal
 * Usa: nome + stream_url (identificação real do conteúdo)
 */
function generateChannelKey(name: string, streamUrl: string): string {
  return `${name.toLowerCase().trim()}|${streamUrl.toLowerCase().trim()}`;
}

/**
 * Extrair informações de episódio
 */
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

async function syncM3UIncremental() {
  const startTime = Date.now();
  
  console.log('🔄 Sincronização M3U - Incremental (Inteligente)');
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

    // 4. Buscar todos os channels existentes
    console.log('🔍 Buscando channels existentes no banco...');
    const { data: existingChannels, error: fetchError } = await supabase.client
      .from('channels')
      .select('id, name, stream_url, category_id, logo_url, metadata, categories(name)');

    if (fetchError) {
      throw new Error(`Erro ao buscar channels: ${fetchError.message}`);
    }

    // Criar mapa de channels existentes (chave: nome|stream_url)
    const existingChannelsMap = new Map<string, any>();
    existingChannels?.forEach(ch => {
      const key = generateChannelKey(ch.name, ch.stream_url);
      existingChannelsMap.set(key, ch);
    });

    console.log(`✅ ${existingChannelsMap.size} channels existentes no banco\n`);

    // 5. Sincronizar categorias
    console.log('📁 Sincronizando categorias...');
    const categories = Array.from(categoriesSet).map(name => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
      type: 'general',
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

    // 7. Logo padrão fixo para conteúdo adulto
    const adultDefaultLogo = 'https://i.imgur.com/1eXO9BU.png';
    console.log(`🔞 Logo padrão para conteúdo adulto: ${adultDefaultLogo}\n`);

    // 8. Processar channels: separar em UPDATE e INSERT
    console.log('🔄 Processando channels...');
    const channelsToUpdate: any[] = [];
    const channelsToInsert: any[] = [];

    parseResult.channels.forEach(ch => {
      const episodeInfo = parseEpisode(ch.name);
      const categoryId = ch.groupTitle ? categoryMap.get(ch.groupTitle) : undefined;
      const key = generateChannelKey(ch.name, ch.url);
      
      const existingChannel = existingChannelsMap.get(key);
      
      // Determinar logo: forçar logo padrão para conteúdo adulto
      let logoUrl = ch.tvgLogo && ch.tvgLogo !== 'NO_IMAGE' ? ch.tvgLogo : undefined;
      
      // Se for conteúdo adulto, SEMPRE usar logo padrão (substituir qualquer logo existente)
      const isAdultContent = ch.groupTitle?.toLowerCase().includes('adultos') || false;
      const isAdultMovie = ch.groupTitle?.toLowerCase().includes('filmes') && isAdultContent;
      
      if (isAdultMovie && adultDefaultLogo) {
        logoUrl = adultDefaultLogo; // Forçar logo padrão
      }

      if (existingChannel) {
        // Canal já existe: apenas atualizar stream_url
        channelsToUpdate.push({
          id: existingChannel.id,
          stream_url: ch.url,
          category_id: categoryId,
          // Manter logo existente se houver, senão usar padrão adulto se aplicável
          logo_url: existingChannel.logo_url || logoUrl,
          // Atualizar metadados se necessário
          metadata: episodeInfo || existingChannel.metadata || {},
        });
      } else {
        // Canal novo: inserir completo
        channelsToInsert.push({
          name: ch.name,
          display_name: ch.name,
          stream_url: ch.url,
          logo_url: logoUrl,
          category_id: categoryId,
          tvg_id: ch.tvgId,
          is_hls: ch.isHls,
          is_active: true,
          metadata: episodeInfo || {},
        });
      }
    });

    console.log(`   📊 Para atualizar: ${channelsToUpdate.length}`);
    console.log(`   📊 Para inserir: ${channelsToInsert.length}\n`);

    // 8. Atualizar channels existentes (em lotes)
    if (channelsToUpdate.length > 0) {
      console.log('🔄 Atualizando channels existentes...');
      let updated = 0;
      const batchSize = 100;

      for (let i = 0; i < channelsToUpdate.length; i += batchSize) {
        const batch = channelsToUpdate.slice(i, i + batchSize);
        
        for (const ch of batch) {
          const updateData: any = {
            stream_url: ch.stream_url,
            category_id: ch.category_id,
            metadata: ch.metadata,
          };
          
          // Atualizar logo apenas se fornecido (para conteúdo adulto)
          if (ch.logo_url) {
            updateData.logo_url = ch.logo_url;
          }
          
          const { error: updateError } = await supabase.client
            .from('channels')
            .update(updateData)
            .eq('id', ch.id);

          if (!updateError) {
            updated++;
          }
        }

        const progress = Math.min(i + batchSize, channelsToUpdate.length);
        const percent = ((progress / channelsToUpdate.length) * 100).toFixed(1);
        process.stdout.write(`\r   Progresso: ${progress}/${channelsToUpdate.length} (${percent}%)`);
      }

      console.log(`\n✅ ${updated} channels atualizados\n`);
    }

    // 9. Inserir channels novos (em lotes)
    if (channelsToInsert.length > 0) {
      console.log('💾 Inserindo channels novos...');
      const batchSize = 500;
      let inserted = 0;

      for (let i = 0; i < channelsToInsert.length; i += batchSize) {
        const batch = channelsToInsert.slice(i, i + batchSize);

        const { error: insertError } = await supabase.client
          .from('channels')
          .insert(batch);

        if (!insertError) {
          inserted += batch.length;
        } else {
          console.error(`\n⚠️  Erro ao inserir batch: ${insertError.message}`);
        }

        const progress = Math.min(i + batchSize, channelsToInsert.length);
        const percent = ((progress / channelsToInsert.length) * 100).toFixed(1);
        process.stdout.write(`\r   Progresso: ${progress}/${channelsToInsert.length} (${percent}%)`);
      }

      console.log(`\n✅ ${inserted} channels novos inseridos\n`);
    }

    // 10. Marcar como inativos os channels que não estão mais na lista
    console.log('🗑️  Marcando channels removidos como inativos...');
    const m3uChannelKeys = new Set<string>();
    parseResult.channels.forEach(ch => {
      const key = generateChannelKey(ch.name, ch.url);
      m3uChannelKeys.add(key);
    });

    let deactivated = 0;
    for (const [key, channel] of existingChannelsMap.entries()) {
      if (!m3uChannelKeys.has(key)) {
        const { error: deactivateError } = await supabase.client
          .from('channels')
          .update({ is_active: false })
          .eq('id', channel.id);

        if (!deactivateError) {
          deactivated++;
        }
      }
    }

    console.log(`✅ ${deactivated} channels marcados como inativos\n`);

    const duration = Date.now() - startTime;

    // Contar episódios detectados
    const episodesCount = parseResult.channels.filter(ch => {
      const pattern = /S\d{2}E\d{2,3}|T\d{2}E\d{2,3}/i;
      return pattern.test(ch.name);
    }).length;

    console.log('✅ Sincronização incremental concluída com sucesso!\n');
    console.log('📊 ESTATÍSTICAS:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Total na lista M3U: ${parseResult.channels.length} itens`);
    console.log(`📁 Categorias: ${categoriesSet.size}`);
    console.log(`📺 Episódios detectados: ${episodesCount}`);
    console.log(`🎬 Canais/Filmes: ${parseResult.channels.length - episodesCount}`);
    console.log('');
    console.log('🔄 Operações realizadas:');
    console.log(`   ✏️  Atualizados: ${channelsToUpdate.length}`);
    console.log(`   ➕ Inseridos: ${channelsToInsert.length}`);
    console.log(`   ❌ Desativados: ${deactivated}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Vantagens da sincronização incremental:');
    console.log('   - Logos existentes foram mantidos');
    console.log('   - Favoritos dos usuários preservados');
    console.log('   - Apenas URLs atualizadas');
    console.log('   - Muito mais rápido!');

    return {
      duration,
      total: parseResult.channels.length,
      categories: categoriesSet.size,
      updated: channelsToUpdate.length,
      inserted: channelsToInsert.length,
      deactivated,
    };

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  syncM3UIncremental()
    .then(() => {
      console.log('\n✨ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { syncM3UIncremental };
