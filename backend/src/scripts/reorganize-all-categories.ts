#!/usr/bin/env node
/**
 * Reorganizar TODAS as Categorias
 * Move canais para as categorias corretas baseado no tipo
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Categorias de SÉRIES (devem ter apenas episódios)
const SERIES_CATEGORIES = [
  'Canais | Filmes e Series',
  'Mini Series (shorts)',
  'Series | Amazon Prime Video',
  'Series | Apple TV',
  'Series | Brasil Paralelo',
  'Series | Crunchyroll',
  'Series | Discovery+',
  'Series | Disney+',
  'Series | Globoplay',
  'Series | Legendado',
  'Series | Max',
  'Series | NBC',
  'Series | Netflix',
  'Series | Outros Streamings',
  'Series | Paramount+',
  'Series | STAR+',
  'Shows',
];

// Categorias de FILMES (devem ter apenas filmes)
const MOVIE_CATEGORIES = [
  'Filmes | Drama/Suspense/Romance',
  'Filmes | Acao/Aventura/Guerra',
  'Filmes | Comedia',
  'Filmes | Terror',
  'Filmes | Infantil',
  'Filmes | Ficcao/Fantasia',
  'Filmes | Lançamentos 2024',
  'Filmes | Legendado',
  'Filmes | Lançamentos 2025',
  'Filmes | Documentários',
  'Filmes | Nacionais',
  'Filmes | 4K UHD',
  'Filmes | Faroeste',
  'Filmes | Especial de Natal',
  'Filmes | Religiosos',
  'Filmes | Adultos',
  'Filmes | DC Comics',
  'Filmes | Mazzaropi',
  'Filmes | Cinema (CAM)',
];

// Categorias de TV AO VIVO (devem ter apenas canais)
const LIVE_CATEGORIES = [
  'Canais | Globo',
  'Canais | Internacionais',
  'Canais | Variedades',
  'Canais | RecordTV',
  'Canais | Dormir e Relaxar',
  'Canais | SBT',
  'Stand Up Comedy',
  'Canais | Abertos',
  'Canais | Premiere',
  'Canais | Esportes',
  'Canais | Telecine',
  'Canais | Legendado',
  'Canais | Religioso',
  'Canais | Adultos [4K]',
  'Canais | MAX',
  'Canais | NBA League Pass',
  'Canais | Infantil',
  'Canais | Adultos',
  'Canais | SporTV',
  'Canais | 24 Horas Variados',
  'Canais | Adultos LGBT',
  'Canais | Campeonatos Regionais',
  'Canais | Paramount+',
  'Canais | Dual Audio',
  'Videos Educativos',
  'Canais | Noticias',
  'Canais | TNT',
  'Canais | Cine MP',
  'Canais | Prime Video',
  'Rádios',
  'Canais | Futsal',
  'Canais | Brasileirão',
  'Treinos, Aulas e Receitas',
  'Canais | UFC Fight Pass',
  'Canais | Band',
  'Canais | 24 Horas Infantil',
  'Canais | Documentarios',
];

async function reorganizeAllCategories() {
  console.log('🔄 Reorganizando TODAS as Categorias');
  console.log('='.repeat(60));

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // 1. Buscar IDs de todas as categorias
    const { data: allCategories } = await supabase.client
      .from('categories')
      .select('id, name');

    if (!allCategories) {
      console.log('❌ Erro ao buscar categorias');
      return;
    }

    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

    // Mapear IDs
    const seriesIds = SERIES_CATEGORIES.map(name => categoryMap.get(name)).filter(Boolean) as string[];
    const movieIds = MOVIE_CATEGORIES.map(name => categoryMap.get(name)).filter(Boolean) as string[];
    const liveIds = LIVE_CATEGORIES.map(name => categoryMap.get(name)).filter(Boolean) as string[];

    console.log(`\n📊 Categorias identificadas:`);
    console.log(`   📺 Séries: ${seriesIds.length}`);
    console.log(`   🎬 Filmes: ${movieIds.length}`);
    console.log(`   📡 TV ao Vivo: ${liveIds.length}\n`);

    let totalMoved = 0;

    // 2. LIMPAR CATEGORIAS DE FILMES (remover canais e episódios)
    console.log('🎬 Limpando categorias de FILMES...');
    for (const categoryId of movieIds) {
      const categoryName = allCategories.find(c => c.id === categoryId)?.name;
      
      // Contar canais/episódios que não deveriam estar aqui
      const { count: wrongItems } = await supabase.client
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .or('metadata->is_episode.eq.true,metadata->is_movie.is.null');

      if (wrongItems && wrongItems > 0) {
        console.log(`   ⚠️  ${categoryName}: ${wrongItems} itens incorretos`);
        
        // Mover para categoria genérica de canais
        const genericLiveId = categoryMap.get('Canais | Variedades');
        if (genericLiveId) {
          const { error } = await supabase.client
            .from('channels')
            .update({ category_id: genericLiveId })
            .eq('category_id', categoryId)
            .or('metadata->is_episode.eq.true,metadata->is_movie.is.null');

          if (!error) {
            totalMoved += wrongItems;
          }
        }
      }
    }

    // 3. LIMPAR CATEGORIAS DE TV AO VIVO (remover filmes e episódios)
    console.log('\n📡 Limpando categorias de TV AO VIVO...');
    for (const categoryId of liveIds) {
      const categoryName = allCategories.find(c => c.id === categoryId)?.name;
      
      // Contar filmes que não deveriam estar aqui
      const { count: wrongMovies } = await supabase.client
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('metadata->is_movie', true);

      if (wrongMovies && wrongMovies > 0) {
        console.log(`   ⚠️  ${categoryName}: ${wrongMovies} filmes incorretos`);
        
        // Mover para categoria genérica de filmes
        const genericMovieId = categoryMap.get('Filmes | Nacionais');
        if (genericMovieId) {
          const { error } = await supabase.client
            .from('channels')
            .update({ category_id: genericMovieId })
            .eq('category_id', categoryId)
            .eq('metadata->is_movie', true);

          if (!error) {
            totalMoved += wrongMovies;
          }
        }
      }

      // Contar episódios que não deveriam estar aqui
      const { count: wrongEpisodes } = await supabase.client
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('metadata->is_episode', true);

      if (wrongEpisodes && wrongEpisodes > 0) {
        console.log(`   ⚠️  ${categoryName}: ${wrongEpisodes} episódios incorretos`);
        
        // Mover para categoria de séries
        const genericSeriesId = categoryMap.get('Canais | Filmes e Series');
        if (genericSeriesId) {
          const { error } = await supabase.client
            .from('channels')
            .update({ category_id: genericSeriesId })
            .eq('category_id', categoryId)
            .eq('metadata->is_episode', true);

          if (!error) {
            totalMoved += wrongEpisodes;
          }
        }
      }
    }

    // 4. LIMPAR CATEGORIAS DE SÉRIES (remover não-episódios)
    console.log('\n📺 Limpando categorias de SÉRIES...');
    for (const categoryId of seriesIds) {
      const categoryName = allCategories.find(c => c.id === categoryId)?.name;
      
      // Contar não-episódios que não deveriam estar aqui
      const { count: wrongItems } = await supabase.client
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .not('metadata->is_episode', 'eq', true);

      if (wrongItems && wrongItems > 0) {
        console.log(`   ⚠️  ${categoryName}: ${wrongItems} não-episódios incorretos`);
        
        // Verificar se são filmes ou canais
        const { data: items } = await supabase.client
          .from('channels')
          .select('id, metadata')
          .eq('category_id', categoryId)
          .not('metadata->is_episode', 'eq', true)
          .limit(1000);

        if (items) {
          for (const item of items) {
            const isMovie = item.metadata?.is_movie === true;
            const targetId = isMovie 
              ? categoryMap.get('Filmes | Nacionais')
              : categoryMap.get('Canais | Variedades');

            if (targetId) {
              await supabase.client
                .from('channels')
                .update({ category_id: targetId })
                .eq('id', item.id);
              
              totalMoved++;
            }
          }
        }
      }
    }

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`✅ Total de itens reorganizados: ${totalMoved}`);
    console.log('='.repeat(60));

    // 5. Verificar resultado final
    console.log('\n🔍 Verificando resultado...\n');

    for (const [type, ids, label] of [
      ['movies', movieIds, '🎬 Filmes'],
      ['live', liveIds, '📡 TV ao Vivo'],
      ['series', seriesIds, '📺 Séries'],
    ] as const) {
      let totalInCategories = 0;
      
      for (const id of ids) {
        const { count } = await supabase.client
          .from('channels')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', id)
          .eq('is_active', true);
        
        totalInCategories += count || 0;
      }

      console.log(`${label}: ${totalInCategories} itens`);
    }

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  reorganizeAllCategories()
    .then(() => {
      console.log('\n✨ Reorganização finalizada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { reorganizeAllCategories };
