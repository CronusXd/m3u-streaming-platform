#!/usr/bin/env node
/**
 * Buscar TODOS os Logos Faltantes
 * 
 * Executa em loop até processar todos os itens sem logo
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import axios from 'axios';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const BATCH_SIZE = 500; // Processar 500 por vez
const DELAY_BETWEEN_REQUESTS = 300; // 300ms entre requests (3 por segundo)
const DELAY_BETWEEN_BATCHES = 5000; // 5s entre batches

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
    // Silenciar erros individuais
    return null;
  }
}

/**
 * Processar um batch de itens
 */
async function processBatch(supabase: SupabaseService, batchNumber: number): Promise<{ found: number; notFound: number; processed: number }> {
  // Buscar itens sem logo
  const { data: items, error } = await supabase.client
    .from('channels')
    .select('id, name, categories(name)')
    .eq('is_active', true)
    .is('logo_url', null)
    .is('metadata->is_episode', null)
    .limit(BATCH_SIZE);

  if (error || !items || items.length === 0) {
    return { found: 0, notFound: 0, processed: 0 };
  }

  console.log(`\n📦 Batch ${batchNumber}: Processando ${items.length} itens...`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
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
        found++;
        process.stdout.write(`\r   ✅ Progresso: ${i + 1}/${items.length} | Encontrados: ${found} | Não encontrados: ${notFound}`);
      }
    } else {
      notFound++;
      process.stdout.write(`\r   ⏳ Progresso: ${i + 1}/${items.length} | Encontrados: ${found} | Não encontrados: ${notFound}`);
    }

    // Delay entre requests
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
  }

  console.log(''); // Nova linha após o progresso

  return { found, notFound, processed: items.length };
}

async function fetchAllLogos() {
  const startTime = Date.now();
  
  console.log('🚀 Buscando TODOS os Logos Faltantes');
  console.log('='.repeat(60));

  if (!TMDB_API_KEY) {
    console.log('❌ TMDB_API_KEY não configurada!');
    console.log('');
    console.log('Para usar este script:');
    console.log('1. Crie uma conta em https://www.themoviedb.org/');
    console.log('2. Obtenha sua API Key em https://www.themoviedb.org/settings/api');
    console.log('3. Adicione no .env: TMDB_API_KEY=sua_chave_aqui');
    console.log('');
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

    console.log(`📊 Total de itens sem logo: ${totalWithoutLogo}\n`);

    if (!totalWithoutLogo || totalWithoutLogo === 0) {
      console.log('✅ Todos os itens já têm logo!');
      return;
    }

    // Processar em batches até acabar
    let batchNumber = 1;
    let totalFound = 0;
    let totalNotFound = 0;
    let totalProcessed = 0;

    while (true) {
      const result = await processBatch(supabase, batchNumber);
      
      if (result.processed === 0) {
        console.log('\n✅ Todos os itens foram processados!');
        break;
      }

      totalFound += result.found;
      totalNotFound += result.notFound;
      totalProcessed += result.processed;

      console.log(`   📊 Batch ${batchNumber} concluído: ${result.found} encontrados, ${result.notFound} não encontrados`);
      console.log(`   📈 Total acumulado: ${totalProcessed}/${totalWithoutLogo} (${((totalProcessed / totalWithoutLogo) * 100).toFixed(1)}%)`);

      // Verificar se ainda há itens
      const { count: remaining } = await supabase.client
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('logo_url', null)
        .is('metadata->is_episode', null);

      if (!remaining || remaining === 0) {
        console.log('\n✅ Todos os itens foram processados!');
        break;
      }

      console.log(`   ⏳ Restam ${remaining} itens. Aguardando ${DELAY_BETWEEN_BATCHES / 1000}s antes do próximo batch...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));

      batchNumber++;
    }

    const duration = Date.now() - startTime;

    console.log('\n📊 RESULTADO FINAL:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração total: ${(duration / 1000 / 60).toFixed(2)} minutos`);
    console.log(`📊 Total processado: ${totalProcessed}`);
    console.log(`✅ Logos encontrados: ${totalFound}`);
    console.log(`❌ Não encontrados: ${totalNotFound}`);
    console.log(`📈 Taxa de sucesso: ${((totalFound / totalProcessed) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // Estatísticas finais
    const { count: finalWithoutLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('logo_url', null)
      .is('metadata->is_episode', null);

    const { count: finalWithLogo } = await supabase.client
      .from('channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('logo_url', 'is', null)
      .is('metadata->is_episode', null);

    console.log('\n📊 ESTATÍSTICAS FINAIS:');
    console.log('='.repeat(60));
    console.log(`✅ Itens COM logo: ${finalWithLogo}`);
    console.log(`❌ Itens SEM logo: ${finalWithoutLogo}`);
    console.log(`📈 Cobertura: ${((finalWithLogo! / (finalWithLogo! + finalWithoutLogo!)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fetchAllLogos()
    .then(() => {
      console.log('\n✨ Processo completo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fetchAllLogos };
