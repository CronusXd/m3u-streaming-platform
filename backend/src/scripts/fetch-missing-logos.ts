#!/usr/bin/env node
/**
 * Buscar Logos Faltantes
 * 
 * Usa TMDB API para buscar logos de filmes/séries que não têm
 */

import { config } from 'dotenv';
import { SupabaseService } from '../clients/supabase';
import axios from 'axios';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''; // Você precisa criar uma conta em https://www.themoviedb.org/

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
 * Remove ano, qualidade, etc
 */
function cleanName(name: string): string {
  // Remover ano entre parênteses
  let cleaned = name.replace(/\s*\(\d{4}\)\s*/g, '');
  
  // Remover qualidade (4K, HD, etc)
  cleaned = cleaned.replace(/\s*(4K|HD|FHD|UHD|FULL HD)\s*/gi, '');
  
  // Remover informações de episódio
  cleaned = cleaned.replace(/\s*S\d{2}E\d{2,3}\s*/gi, '');
  cleaned = cleaned.replace(/\s*T\d{2}E\d{2,3}\s*/gi, '');
  
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

    return null;
  } catch (error) {
    console.error(`Erro ao buscar ${name}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchMissingLogos() {
  const startTime = Date.now();
  
  console.log('🔍 Buscando Logos Faltantes');
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

    // Buscar itens sem logo (apenas canais/filmes, não episódios)
    console.log('📥 Buscando itens sem logo...');
    const { data: items, error } = await supabase.client
      .from('channels')
      .select('id, name, categories(name)')
      .eq('is_active', true)
      .is('logo_url', null)
      .is('metadata->is_episode', null)
      .limit(1000); // Processar 1000 por vez

    if (error) {
      throw new Error(`Erro ao buscar itens: ${error.message}`);
    }

    console.log(`✅ ${items?.length} itens sem logo encontrados\n`);

    if (!items || items.length === 0) {
      console.log('✅ Todos os itens já têm logo!');
      return;
    }

    // Processar cada item
    console.log('🔎 Buscando logos no TMDB...');
    let found = 0;
    let notFound = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const year = extractYear(item.name);
      const categoryName = item.categories?.name || '';
      
      // Determinar se é filme ou série
      const isMovie = !categoryName.toLowerCase().includes('series') && 
                      !categoryName.toLowerCase().includes('novela');

      console.log(`   [${i + 1}/${items.length}] ${item.name}...`);

      // Buscar logo
      const logoUrl = await searchTMDB(item.name, year, isMovie);

      if (logoUrl) {
        // Atualizar no banco
        const { error: updateError } = await supabase.client
          .from('channels')
          .update({ logo_url: logoUrl })
          .eq('id', item.id);

        if (!updateError) {
          console.log(`      ✅ Logo encontrado!`);
          found++;
        } else {
          console.log(`      ⚠️  Erro ao atualizar: ${updateError.message}`);
        }
      } else {
        console.log(`      ❌ Logo não encontrado`);
        notFound++;
      }

      // Rate limiting (TMDB permite 40 requests/10s)
      if ((i + 1) % 30 === 0) {
        console.log('   ⏸️  Aguardando 10s (rate limit)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    const duration = Date.now() - startTime;

    console.log('\n📊 RESULTADO:');
    console.log('='.repeat(60));
    console.log(`⏱️  Duração: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Processados: ${items.length}`);
    console.log(`✅ Logos encontrados: ${found}`);
    console.log(`❌ Não encontrados: ${notFound}`);
    console.log(`📈 Taxa de sucesso: ${((found / items.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error);
    throw error;
  }
}

if (require.main === module) {
  fetchMissingLogos()
    .then(() => {
      console.log('\n✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Falha:', error);
      process.exit(1);
    });
}

export { fetchMissingLogos };
