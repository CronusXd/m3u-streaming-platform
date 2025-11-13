#!/usr/bin/env node
/**
 * Buscar TODOS os Logos Faltantes - PARALELO
 * 
 * Executa em múltiplas threads para processar mais rápido
 * - 13 threads paralelas
 * - Batches de 900 itens
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import axios from 'axios';
import { Worker } from 'worker_threads';
import * as path from 'path';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

const BATCH_SIZE = 15000; // Processar TODOS de uma vez
const NUM_WORKERS = 30; // 30 threads paralelas
const DELAY_BETWEEN_REQUESTS = 200; // 200ms entre requests

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
}

/**
 * Limpar nome do filme/série para busca
 */
function cleanName(name: string): string {
  let cleaned = name.replace(/\s*\(\d{4}\)\s*/g, '');
  cleaned = cleaned.replace(/\s*(4K|HD|FHD|UHD|FULL HD)\s*/gi, '');
  cleaned = cleaned.replace(/\s*\[L\]\s*/gi, '');
  cleaned = cleaned.replace(/\s*S\d{2}E\d{2,3}\s*/gi, '');
  cleaned = cleaned.replace(/\s*T\d{2}E\d{2,3}\s*/gi, '');
  cleaned = cleaned.replace(/\s*-\s*\d{4}\s*$/g, '');
  return cleaned.trim();
}

/**
 * Extrair ano do nome
 */
function extractYear(name: string): number | null {
  const match = name.match(/\((\d{4})\)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Buscar filme/série no TMDB
 */
async function searchTMDB(name: string, year: number | null, isMovie: boolean = true): Promise<string | null> {
  if (!TMDB_API_KEY) {
    return null;
  }

  try {
    const cleanedName = cleanName(name);
    const endpoint = isMovie ? '/search/movie' : '/search/tv';
    
    const params: any = {
      api_key: TMDB_API_KEY,
      query: cleanedName,
      language: 'pt-BR',
    };

    if (year && isMovie) {
      params.year = year;
    } else if (year && !isMovie) {
      params.first_air_date_year = year;
    }

    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, { params });

    if (response.data.results && response.data.results.length > 0) {
      const result: TMDBSearchResult = response.data.results[0];
      const posterPath = result.poster_path || result.backdrop_path;
      
      if (posterPath) {
        return `${TMDB_IMAGE_BASE}${posterPath}`;
      }
    }

    // Se não encontrou como filme, tentar como série
    if (isMovie) {
      return await searchTMDB(name, year, false);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Processar um item
 */
async function processItem(item: any, supabase: SupabaseService): Promise<{ found: boolean; name: string }> {
  const year = extractYear(item.name);
  const categoryName = item.categories?.name || '';
  
  const isMovie = !categoryName.toLowerCase().includes('series') && 
                  !categoryName.toLowerCase().includes('novela');

  // Buscar logo
  const logoUrl = await searchTMDB(item.name, year, isMovie);

  if (logoUrl) {
    // Atualizar no banco
    const { error: updateError } = await supabase.client
      .from('channels')
      .update({ logo_url: logoUrl })
      .eq('id', item.id);

    if (!updateError) {
      return { found: true, name: item.name };
    }
  }

  return { found: false, name: item.name };
}

/**
 * Processar um chunk de itens
 */
async function processChunk(items: any[], chunkIndex: number, totalChunks: number): Promise<{ found: number; notFound: number }> {
  const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);
  
  let found = 0;
  let notFound = 0;

  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i], supabase);
    
    if (result.found) {
      found++;
    } else {
      notFound++;
    }

    // Delay entre requests
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

    // Progresso
    if ((i + 1) % 10 === 0) {
      const progress = ((i + 1) / items.length * 100).toFixed(1);
      console.log(`   Thread ${chunkIndex + 1}/${totalChunks}: ${i + 1}/${items.length} (${progress}%) | ✅ ${found} | ❌ ${notFound}`);
    }
  }

  return { found, notFound };
}

async function fetchAllLogosParallel() {
  const startTime = Date.now();
  
  console.log('🚀 Buscando TODOS os Logos Faltantes - PARALELO');
  console.log('='.repeat(60));
  console.log(`⚡ Threads: ${NUM_WORKERS}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log('='.repeat(60));

  if (!TMDB_API_KEY) {
    console.log('❌ TMDB_API_KEY não configurada!');
    return;
  }

  try {
    const supabase = new SupabaseService(SUPABASE_URL, SUPABASE_KEY);

    // Contar total de itens sem logo
    const { count: totalWithoutLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('logo_url', null)
      .is('metadata->is_episode', null);

    console.log(`\n📊 Total de itens sem logo: ${totalWithoutLogo}\n`);

    if (!totalWithoutLogo || totalWithoutLogo === 0) {
      console.log('✅ Todos os itens já têm logo!');
      return;
    }

    // Buscar todos os itens sem logo (sem limite, pegar TODOS)
    console.log('📥 Carregando TODOS os itens sem logo...');
    
    let allItems: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: items, error } = await supabase.client
        .from('channels')
        .select('id, name, categories(name)')
        .eq('is_active', true)
        .is('logo_url', null)
        .is('metadata->is_episode', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Erro ao carregar:', error);
        break;
      }

      if (!items || items.length === 0) {
        break;
      }

      allItems = allItems.concat(items);
      console.log(`   Carregados: ${allItems.length}...`);
      page++;

      // Limitar a 10k para não sobrecarregar
      if (allItems.length >= 10000) {
        break;
      }
    }

    const items = allItems;

    if (!items || items.length === 0) {
      console.log('❌ Nenhum item encontrado');
      return;
    }

    console.log(`\n✅ ${items.length} itens carregados\n`);

    // Dividir em chunks para processamento paralelo
    const chunkSize = Math.ceil(items.length / NUM_WORKERS);
    const chunks: any[][] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    console.log(`📦 Dividido em ${chunks.length} chunks de ~${chunkSize} itens cada\n`);
    console.log('🔄 Processando em paralelo...\n');

    // Processar chunks em paralelo
    const results = await Promise.all(
      chunks.map((chunk, index) => processChunk(chunk, index, chunks.length))
    );

    // Somar resultados
    const totalFound = results.reduce((sum, r) => sum + r.found, 0);
    const totalNotFound = results.reduce((sum, r) => sum + r.notFound, 0);

    const duration = Date.now() - startTime;

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000 / 60).toFixed(2)} minutos`);
    console.log(`📊 Processados: ${items.length}`);
    console.log(`✅ Logos encontrados: ${totalFound}`);
    console.log(`❌ Não encontrados: ${totalNotFound}`);
    console.log(`📈 Taxa de sucesso: ${((totalFound / items.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // Verificar se ainda há itens
    const { count: remaining } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('logo_url', null)
      .is('metadata->is_episode', null);

    console.log('\n📊 ESTATÍSTICAS FINAIS:');
    console.log('='.repeat(60));
    console.log(`📊 Restam sem logo: ${remaining}`);
    console.log(`✅ Progresso: ${((totalWithoutLogo - remaining!) / totalWithoutLogo * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (remaining && remaining > 0) {
      console.log('\n💡 Execute novamente para processar os restantes:');
      console.log('   npm run fetch-all-logos-parallel');
    } else {
      console.log('\n🎉 Todos os logos foram processados!');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fetchAllLogosParallel()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fetchAllLogosParallel };
