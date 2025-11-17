#!/usr/bin/env node
/**
 * 🖼️  SCRIPT 2: Buscar Logos Faltantes do TMDB
 * 
 * Execução automática:
 * - Busca TODOS os filmes e séries sem logo
 * - Usa 3 métodos de limpeza de nome
 * - 10 threads paralelas
 * - 35 requisições/segundo
 * 
 * Execute: npm run sync:tmdb
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import pLimit from 'p-limit';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || '50d01ad0e7bde0a9a410a565e91b5cf6';

const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações fixas
const REQUESTS_PER_SECOND = 35;
const DELAY_MS = 1000 / REQUESTS_PER_SECOND;
const MAX_CONCURRENT = 10;
const limit = pLimit(MAX_CONCURRENT);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface Stats {
  total: number;
  semLogo: number;
  processados: number;
  encontrados: number;
  naoEncontrados: number;
  erros: number;
  metodo1: number;
  metodo2: number;
  metodo3: number;
  metodo4: number;
  metodo5: number;
  metodo6: number;
  metodo7: number;
  metodo8: number;
  metodo9: number;
  metodo10: number;
  metodo11: number;
  metodo12: number;
  metodo13: number;
  metodo14: number;
  metodo15: number;
}

// Extrair ano do nome
function extractYear(nome: string): { cleanName: string; year: number | null } {
  const yearMatch = nome.match(/\((\d{4})\)/);
  if (yearMatch) {
    return {
      cleanName: nome.replace(/\(\d{4}\)/, '').trim(),
      year: parseInt(yearMatch[1], 10),
    };
  }
  return { cleanName: nome, year: null };
}

// MÉTODO 1: Limpeza Básica
function cleanNameBasic(nome: string): string {
  let clean = nome;

  // Remover ano
  clean = clean.replace(/\(\d{4}\)/g, '');
  clean = clean.replace(/\[\d{4}\]/g, '');

  // Remover qualidade
  clean = clean.replace(/\b(HD|4K|1080p|720p|480p|BluRay|WEB-DL|WEBRip|DVDRip|BRRip|HDTV)\b/gi, '');

  // Remover última aspas e tudo depois
  const lastQuoteIndex = clean.lastIndexOf('"');
  if (lastQuoteIndex > 0) {
    const afterQuote = clean.substring(lastQuoteIndex + 1);
    if (afterQuote.includes(',')) {
      clean = afterQuote.substring(afterQuote.indexOf(',') + 1).trim();
    } else {
      clean = afterQuote.trim();
    }
  }

  // Remover caracteres especiais extras
  clean = clean.replace(/[_\-\.]+/g, ' ');

  // Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// MÉTODO 2: Limpeza Agressiva
function cleanNameAggressive(nome: string): string {
  let clean = nome;

  // Pegar apenas até o primeiro parêntese/colchete
  clean = clean.split(/[\(\[\{]/)[0];

  // Remover tudo que não é letra, número ou espaço
  clean = clean.replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, ' ');

  // Remover palavras comuns que atrapalham
  clean = clean.replace(/\b(dublado|legendado|dual|audio|nacional|completo|temporada|episodio)\b/gi, '');

  // Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// MÉTODO 3: Apenas Título Principal (primeiras palavras)
function cleanNameShort(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Pegar apenas as primeiras 4 palavras (título principal)
  const words = clean.split(' ').filter(w => w.length > 0);
  if (words.length > 4) {
    clean = words.slice(0, 4).join(' ');
  }

  return clean;
}

// MÉTODO 4: Remover Números e Temporadas
function cleanNameNoNumbers(nome: string): string {
  let clean = cleanNameAggressive(nome);

  // Remover padrões de temporada/episódio
  clean = clean.replace(/\b[Ss]\d+[Ee]\d+\b/g, '');
  clean = clean.replace(/\b\d+x\d+\b/g, '');
  clean = clean.replace(/\btemporada\s*\d+\b/gi, '');
  clean = clean.replace(/\bepisodio\s*\d+\b/gi, '');

  // Remover números no final
  clean = clean.replace(/\s+\d+\s*$/g, '');

  // Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// MÉTODO 5: Tradução Comum (PT → EN)
function cleanNameTranslate(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Traduções comuns PT → EN
  const translations: { [key: string]: string } = {
    'homem aranha': 'spider man',
    'homem de ferro': 'iron man',
    'capitao america': 'captain america',
    'vingadores': 'avengers',
    'guardioes da galaxia': 'guardians of the galaxy',
    'pantera negra': 'black panther',
    'viuva negra': 'black widow',
    'doutor estranho': 'doctor strange',
    'thor': 'thor',
    'hulk': 'hulk',
    'batman': 'batman',
    'superman': 'superman',
    'mulher maravilha': 'wonder woman',
    'liga da justica': 'justice league',
    'esquadrao suicida': 'suicide squad',
    'coringa': 'joker',
    'velozes e furiosos': 'fast and furious',
    'senhor dos aneis': 'lord of the rings',
    'harry potter': 'harry potter',
    'star wars': 'star wars',
    'guerra nas estrelas': 'star wars',
    'breaking bad': 'breaking bad',
    'game of thrones': 'game of thrones',
    'walking dead': 'walking dead',
  };

  const cleanLower = clean.toLowerCase();
  for (const [pt, en] of Object.entries(translations)) {
    if (cleanLower.includes(pt)) {
      clean = en;
      break;
    }
  }

  return clean;
}

// MÉTODO 6: Remover Tudo Após Dois Pontos ou Traço
function cleanNameBeforeSeparator(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Pegar apenas antes de : ou -
  if (clean.includes(':')) {
    clean = clean.split(':')[0].trim();
  } else if (clean.includes(' - ')) {
    clean = clean.split(' - ')[0].trim();
  }

  return clean;
}

// MÉTODO 7: Apenas Letras (Ultra Agressivo)
function cleanNameLettersOnly(nome: string): string {
  let clean = nome;

  // Pegar apenas até primeiro número ou símbolo
  clean = clean.split(/[\d\(\[\{]/)[0];

  // Remover TUDO exceto letras e espaços
  clean = clean.replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ');

  // Remover palavras curtas (menos de 3 letras)
  const words = clean.split(' ').filter(w => w.length >= 3);
  clean = words.join(' ');

  // Pegar apenas primeiras 3 palavras
  const mainWords = clean.split(' ').slice(0, 3);
  clean = mainWords.join(' ');

  return clean.trim();
}

// MÉTODO 8: Buscar Sem Ano (caso o ano esteja errado)
function cleanNameNoYear(nome: string): string {
  let clean = cleanNameAggressive(nome);

  // Remover qualquer menção a ano
  clean = clean.replace(/\b(19|20)\d{2}\b/g, '');

  return clean.trim();
}

// MÉTODO 9: Remover Artigos (The, A, O, A, Os, As)
function cleanNameNoArticles(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Remover artigos no início
  clean = clean.replace(/^(The|A|An|O|A|Os|As)\s+/gi, '');

  return clean.trim();
}

// MÉTODO 10: Tradução Completa PT→EN (mais palavras)
function cleanNameFullTranslate(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Traduções mais completas
  const translations: { [key: string]: string } = {
    // Marvel
    'homem aranha': 'spider man',
    'homem de ferro': 'iron man',
    'capitao america': 'captain america',
    'capitão américa': 'captain america',
    'vingadores': 'avengers',
    'guardioes da galaxia': 'guardians of the galaxy',
    'guardiões da galáxia': 'guardians of the galaxy',
    'pantera negra': 'black panther',
    'viuva negra': 'black widow',
    'viúva negra': 'black widow',
    'doutor estranho': 'doctor strange',
    // DC
    'liga da justica': 'justice league',
    'liga da justiça': 'justice league',
    'esquadrao suicida': 'suicide squad',
    'esquadrão suicida': 'suicide squad',
    'mulher maravilha': 'wonder woman',
    // Clássicos
    'senhor dos aneis': 'lord of the rings',
    'senhor dos anéis': 'lord of the rings',
    'guerra nas estrelas': 'star wars',
    'de volta para o futuro': 'back to the future',
    'o poderoso chefao': 'the godfather',
    'o poderoso chefão': 'the godfather',
    'clube da luta': 'fight club',
    'a origem': 'inception',
    'interestelar': 'interstellar',
    'coracao valente': 'braveheart',
    'coração valente': 'braveheart',
    // Séries
    'breaking bad': 'breaking bad',
    'game of thrones': 'game of thrones',
    'walking dead': 'walking dead',
    'stranger things': 'stranger things',
    'casa de papel': 'money heist',
    'la casa de papel': 'money heist',
    // Ação
    'velozes e furiosos': 'fast and furious',
    'duro de matar': 'die hard',
    'missao impossivel': 'mission impossible',
    'missão impossível': 'mission impossible',
    'john wick': 'john wick',
    // Animação
    'rei leao': 'lion king',
    'rei leão': 'lion king',
    'procurando nemo': 'finding nemo',
    'toy story': 'toy story',
    'frozen': 'frozen',
  };

  const cleanLower = clean.toLowerCase();
  for (const [pt, en] of Object.entries(translations)) {
    if (cleanLower.includes(pt)) {
      clean = en;
      break;
    }
  }

  return clean;
}

// MÉTODO 11: Variações de Escrita (hífens, espaços)
function cleanNameVariations(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Remover hífens e juntar palavras
  clean = clean.replace(/-/g, '');

  // Remover espaços (para casos como "Spider Man" → "Spiderman")
  clean = clean.replace(/\s+/g, '');

  return clean.trim();
}

// MÉTODO 12: Apenas Primeira Palavra (para franquias)
function cleanNameFirstWord(nome: string): string {
  let clean = cleanNameAggressive(nome);

  // Pegar apenas a primeira palavra significativa (mais de 3 letras)
  const words = clean.split(' ').filter((w) => w.length > 3);

  if (words.length > 0) {
    return words[0];
  }

  return clean.split(' ')[0] || clean;
}

// MÉTODO 13: Buscar em Inglês SEM ano (para traduções erradas)
function cleanNameEnglishNoYear(nome: string): string {
  let clean = cleanNameFullTranslate(nome);

  // Remover ano
  clean = clean.replace(/\b(19|20)\d{2}\b/g, '');

  return clean.trim();
}

// MÉTODO 14: Remover Palavras Comuns (Dublado, Legendado, etc)
function cleanNameNoCommonWords(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Remover palavras muito comuns que atrapalham
  const palavrasRemover = [
    'dublado',
    'legendado',
    'dual',
    'audio',
    'nacional',
    'completo',
    'temporada',
    'episodio',
    'episódio',
    'season',
    'episode',
    'hd',
    '4k',
    '1080p',
    '720p',
    'bluray',
    'web-dl',
    'webrip',
    'dvdrip',
    'brrip',
    'hdtv',
    'extended',
    'unrated',
    'directors cut',
    'remastered',
    'special edition',
    'ultimate edition',
  ];

  const regex = new RegExp(`\\b(${palavrasRemover.join('|')})\\b`, 'gi');
  clean = clean.replace(regex, '');

  // Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// MÉTODO 15: Remover Pontuação e Caracteres Especiais
function cleanNameNoPunctuation(nome: string): string {
  let clean = cleanNameBasic(nome);

  // Remover TODA pontuação e caracteres especiais
  clean = clean.replace(/[^\w\s]/gi, ' ');

  // Remover números
  clean = clean.replace(/\d+/g, '');

  // Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  // Pegar apenas primeiras 2-3 palavras
  const words = clean.split(' ').filter((w) => w.length > 2);
  if (words.length > 3) {
    clean = words.slice(0, 3).join(' ');
  } else {
    clean = words.join(' ');
  }

  return clean;
}

// Buscar filme no TMDB
async function searchMovie(nome: string, year: number | null): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      api_key: tmdbApiKey,
      query: nome,
      language: 'pt-BR',
      include_adult: 'false',
    });

    if (year) {
      params.append('year', year.toString());
    }

    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);

    if (!response.ok) return null;

    const data: any = await response.json();

    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
      return `${TMDB_IMAGE_BASE_URL}${data.results[0].poster_path}`;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Buscar série no TMDB
async function searchSeries(nome: string, year: number | null): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      api_key: tmdbApiKey,
      query: nome,
      language: 'pt-BR',
      include_adult: 'false',
    });

    if (year) {
      params.append('first_air_date_year', year.toString());
    }

    const response = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`);

    if (!response.ok) return null;

    const data: any = await response.json();

    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
      return `${TMDB_IMAGE_BASE_URL}${data.results[0].poster_path}`;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Processar um item com 8 métodos de limpeza
async function processItem(item: any, stats: Stats): Promise<void> {
  // Delay para respeitar rate limit
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  const { cleanName: nomeOriginal, year } = extractYear(item.nome);

  let logoUrl: string | null = null;
  let metodoUsado = 0;

  // Array de métodos para testar (DO MAIS CONFIÁVEL PARA O MAIS AGRESSIVO)
  const metodos = [
    { nome: cleanNameBasic(nomeOriginal), id: 1 }, // Mais confiável
    { nome: cleanNameAggressive(nomeOriginal), id: 2 }, // Muito bom
    { nome: cleanNameNoArticles(nomeOriginal), id: 9 }, // Remove "The", "O", etc
    { nome: cleanNameNoCommonWords(nomeOriginal), id: 14 }, // Remove "Dublado", etc 🆕
    { nome: cleanNameBeforeSeparator(nomeOriginal), id: 6 }, // Antes de ":" ou "-"
    { nome: cleanNameNoNumbers(nomeOriginal), id: 4 }, // Remove S01E01
    { nome: cleanNameFullTranslate(nomeOriginal), id: 10 }, // Tradução completa
    { nome: cleanNameTranslate(nomeOriginal), id: 5 }, // Tradução básica
    { nome: cleanNameEnglishNoYear(nomeOriginal), id: 13 }, // Tradução sem ano 🆕
    { nome: cleanNameShort(nomeOriginal), id: 3 }, // Primeiras palavras
    { nome: cleanNameNoYear(nomeOriginal), id: 8 }, // Sem ano
    { nome: cleanNameVariations(nomeOriginal), id: 11 }, // Variações de escrita
    { nome: cleanNameNoPunctuation(nomeOriginal), id: 15 }, // Remove pontuação 🆕
    { nome: cleanNameLettersOnly(nomeOriginal), id: 7 }, // Apenas letras
    { nome: cleanNameFirstWord(nomeOriginal), id: 12 }, // Mais agressivo
  ];

  try {
    // Testar cada método até encontrar
    for (let i = 0; i < metodos.length; i++) {
      const metodo = metodos[i];
      if (!metodo.nome || metodo.nome.length < 2) continue;

      // Evitar buscar nomes duplicados (CORRIGIDO: usar índice atual, não ID)
      const nomesJaTestados = metodos.slice(0, i).map((m) => m.nome);
      if (nomesJaTestados.includes(metodo.nome)) continue;

      if (item.tipo === 'filme') {
        logoUrl = await searchMovie(metodo.nome, year);
      } else if (item.tipo === 'serie') {
        logoUrl = await searchSeries(metodo.nome, year);
      }

      if (logoUrl) {
        metodoUsado = metodo.id;
        break;
      }
    }

    if (logoUrl) {
      const { error } = await supabase
        .from('iptv')
        .update({ logo_url: logoUrl })
        .eq('id', item.id);

      if (!error) {
        stats.encontrados++;
        if (metodoUsado === 1) stats.metodo1++;
        else if (metodoUsado === 2) stats.metodo2++;
        else if (metodoUsado === 3) stats.metodo3++;
        else if (metodoUsado === 4) stats.metodo4++;
        else if (metodoUsado === 5) stats.metodo5++;
        else if (metodoUsado === 6) stats.metodo6++;
        else if (metodoUsado === 7) stats.metodo7++;
        else if (metodoUsado === 8) stats.metodo8++;
        else if (metodoUsado === 9) stats.metodo9++;
        else if (metodoUsado === 10) stats.metodo10++;
        else if (metodoUsado === 11) stats.metodo11++;
        else if (metodoUsado === 12) stats.metodo12++;
        else if (metodoUsado === 13) stats.metodo13++;
        else if (metodoUsado === 14) stats.metodo14++;
        else if (metodoUsado === 15) stats.metodo15++;
      } else {
        stats.erros++;
      }
    } else {
      stats.naoEncontrados++;
    }
  } catch (error) {
    stats.erros++;
  }

  stats.processados++;

  // Mostrar progresso a cada 50 itens
  if (stats.processados % 50 === 0) {
    const progresso = ((stats.processados / stats.semLogo) * 100).toFixed(1);
    console.log(`   ⏳ Progresso: ${progresso}% (${stats.processados}/${stats.semLogo})`);
    console.log(
      `      ✅ Encontrados: ${stats.encontrados} | ❌ Não encontrados: ${stats.naoEncontrados} | ⚠️  Erros: ${stats.erros}`
    );
    console.log(
      `      🔧 M1=${stats.metodo1} M2=${stats.metodo2} M3=${stats.metodo3} M4=${stats.metodo4} M5=${stats.metodo5} M6=${stats.metodo6} M7=${stats.metodo7} M8=${stats.metodo8}`
    );
    console.log(
      `      🔧 M9=${stats.metodo9} M10=${stats.metodo10} M11=${stats.metodo11} M12=${stats.metodo12} M13=${stats.metodo13} M14=${stats.metodo14} M15=${stats.metodo15}`
    );
  }
}

async function main() {
  const startTime = Date.now();

  console.log('🖼️  BUSCAR LOGOS FALTANTES DO TMDB');
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ TMDB API Key configurada');
  console.log('⚙️  Configurações: 10 threads | 35 req/s');
  console.log('🔧 15 métodos de limpeza de nome ativados');
  console.log('');
  console.log('📋 Métodos (do mais confiável → mais agressivo):');
  console.log('   1. Básico (padrão) ✅');
  console.log('   2. Agressivo (remove caracteres especiais) ✅');
  console.log('   9. Sem artigos (The, O, A) ✅');
  console.log('   14. Sem palavras comuns (Dublado, Legendado) 🆕');
  console.log('   6. Antes de separador (: ou -) ✅');
  console.log('   4. Sem números (remove S01E01) ✅');
  console.log('   10. Tradução completa PT→EN ✅');
  console.log('   5. Tradução básica PT→EN ✅');
  console.log('   13. Tradução sem ano 🆕');
  console.log('   3. Curto (primeiras palavras) ✅');
  console.log('   8. Sem ano (ignora ano) ✅');
  console.log('   11. Variações de escrita (Spider-Man → Spiderman) ✅');
  console.log('   15. Remove pontuação (limpa caracteres especiais) 🆕');
  console.log('   7. Apenas letras (ultra agressivo) ✅');
  console.log('   12. Primeira palavra (franquias) ✅');
  console.log('');

  // Buscar total de itens
  console.log('📊 Analisando banco de dados...');
  console.log('');

  const { count: totalFilmes } = await supabase
    .from('iptv')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'filme');

  const { count: totalSeries } = await supabase
    .from('iptv')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'serie');

  // Buscar TODOS os itens sem logo
  console.log('🔍 Buscando filmes sem logo...');
  let filmesSemLogo: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('iptv')
      .select('id, nome, tipo')
      .eq('tipo', 'filme')
      .is('logo_url', null)
      .range(from, from + batchSize - 1);

    if (error || !data || data.length === 0) break;

    filmesSemLogo = filmesSemLogo.concat(data);
    from += batchSize;

    if (data.length < batchSize) break;
  }

  console.log('🔍 Buscando séries sem logo...');
  let seriesSemLogo: any[] = [];
  from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('iptv')
      .select('id, nome, tipo')
      .eq('tipo', 'serie')
      .is('logo_url', null)
      .range(from, from + batchSize - 1);

    if (error || !data || data.length === 0) break;

    seriesSemLogo = seriesSemLogo.concat(data);
    from += batchSize;

    if (data.length < batchSize) break;
  }

  const itensSemLogo = [...filmesSemLogo, ...seriesSemLogo];

  console.log('');
  console.log('📊 Estatísticas:');
  console.log(`   🎬 Filmes: ${totalFilmes} (${filmesSemLogo.length} sem logo)`);
  console.log(`   � Séqries: ${totalSeries} (${seriesSemLogo.length} sem logo)`);
  console.log(`   📊 Total a buscar: ${itensSemLogo.length}`);
  console.log('');

  if (itensSemLogo.length === 0) {
    console.log('✅ Todos os itens já possuem logo!');
    return;
  }

  const stats: Stats = {
    total: (totalFilmes || 0) + (totalSeries || 0),
    semLogo: itensSemLogo.length,
    processados: 0,
    encontrados: 0,
    naoEncontrados: 0,
    erros: 0,
    metodo1: 0,
    metodo2: 0,
    metodo3: 0,
    metodo4: 0,
    metodo5: 0,
    metodo6: 0,
    metodo7: 0,
    metodo8: 0,
    metodo9: 0,
    metodo10: 0,
    metodo11: 0,
    metodo12: 0,
    metodo13: 0,
    metodo14: 0,
    metodo15: 0,
  };

  // Processar itens
  console.log('🚀 Iniciando busca automática...');
  console.log('');

  const promises = itensSemLogo.map((item) =>
    limit(() => processItem(item, stats))
  );

  await Promise.all(promises);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ BUSCA CONCLUÍDA!');
  console.log('');
  console.log('� RESUoMO FINAL:');
  console.log(`   📺 Total no banco: ${stats.total}`);
  console.log(`   ❌ Faltavam logos: ${stats.semLogo}`);
  console.log(`   ✅ Encontrados: ${stats.encontrados}`);
  console.log(`   ❌ Não encontrados: ${stats.naoEncontrados}`);
  console.log(`   ⚠️  Erros: ${stats.erros}`);
  console.log(`   🔍 Ainda faltam: ${stats.naoEncontrados + stats.erros}`);
  console.log('');
  console.log('🔧 Eficácia dos Métodos:');
  console.log(
    `   Método 1 (Básico): ${stats.metodo1} (${stats.encontrados > 0 ? ((stats.metodo1 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 2 (Agressivo): ${stats.metodo2} (${stats.encontrados > 0 ? ((stats.metodo2 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 9 (Sem artigos): ${stats.metodo9} (${stats.encontrados > 0 ? ((stats.metodo9 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 14 (Sem palavras comuns): ${stats.metodo14} (${stats.encontrados > 0 ? ((stats.metodo14 / stats.encontrados) * 100).toFixed(1) : 0}%) 🆕`
  );
  console.log(
    `   Método 6 (Separador): ${stats.metodo6} (${stats.encontrados > 0 ? ((stats.metodo6 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 4 (Sem números): ${stats.metodo4} (${stats.encontrados > 0 ? ((stats.metodo4 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 10 (Tradução completa): ${stats.metodo10} (${stats.encontrados > 0 ? ((stats.metodo10 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 5 (Tradução básica): ${stats.metodo5} (${stats.encontrados > 0 ? ((stats.metodo5 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 13 (Tradução sem ano): ${stats.metodo13} (${stats.encontrados > 0 ? ((stats.metodo13 / stats.encontrados) * 100).toFixed(1) : 0}%) 🆕`
  );
  console.log(
    `   Método 3 (Curto): ${stats.metodo3} (${stats.encontrados > 0 ? ((stats.metodo3 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 8 (Sem ano): ${stats.metodo8} (${stats.encontrados > 0 ? ((stats.metodo8 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 11 (Variações): ${stats.metodo11} (${stats.encontrados > 0 ? ((stats.metodo11 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 15 (Remove pontuação): ${stats.metodo15} (${stats.encontrados > 0 ? ((stats.metodo15 / stats.encontrados) * 100).toFixed(1) : 0}%) 🆕`
  );
  console.log(
    `   Método 7 (Letras): ${stats.metodo7} (${stats.encontrados > 0 ? ((stats.metodo7 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log(
    `   Método 12 (Primeira palavra): ${stats.metodo12} (${stats.encontrados > 0 ? ((stats.metodo12 / stats.encontrados) * 100).toFixed(1) : 0}%)`
  );
  console.log('');
  console.log(`⏱️  Tempo total: ${duration}s`);
  console.log(`⚡ Taxa: ${(stats.processados / parseFloat(duration)).toFixed(1)} req/s`);
  console.log('='.repeat(60));
}

main().catch(console.error);
