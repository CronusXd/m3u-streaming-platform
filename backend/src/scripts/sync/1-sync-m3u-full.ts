#!/usr/bin/env node
/**
 * 🎬 SCRIPT 1: Sincronização COMPLETA da Lista M3U
 * 
 * O que faz:
 * - Limpa TODA a tabela IPTV
 * - Importa TODOS os itens do arquivo .m3u
 * - Classifica automaticamente (canal/filme/série)
 * - Detecta temporadas e episódios
 * 
 * Quando usar:
 * - Quando receber uma nova lista M3U
 * - Quando quiser resetar o banco de dados
 * 
 * Execute: npm run sync:m3u
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações de performance
const BATCH_SIZE = 500;
const MAX_CONCURRENT = 5;
const limit = pLimit(MAX_CONCURRENT);

interface ConteudoM3U {
  nome: string;
  tipo: 'canal' | 'filme' | 'serie';
  categoria: string;
  url_stream: string;
  temporada: number | null;
  episodio: number | null;
  nome_episodio: string;
  epg: {
    id: string;
    logo: string;
    numero: string;
  };
}

// Regex para detectar séries
const SERIE_PATTERNS = [
  /[Ss](\d{1,2})[Ee](\d{1,2})/,
  /[Tt](\d{1,2})[Ee](\d{1,2})/,
  /(\d{1,2})[xX](\d{1,2})/,
  /[Ss](\d{1,2})\s*[Ee](\d{1,2})/,
  /[Tt]emporada\s*(\d{1,2})\s*[Ee]pisodio\s*(\d{1,2})/i,
  /[Tt](\d{1,2})\s*[Ee]p(\d{1,2})/,
];

function detectarTipo(nome: string, categoria: string, url: string): 'canal' | 'filme' | 'serie' {
  for (const pattern of SERIE_PATTERNS) {
    if (pattern.test(nome)) {
      return 'serie';
    }
  }

  const nomeUpper = nome.toUpperCase();
  const categoriaUpper = categoria.toUpperCase();

  if (
    categoriaUpper.includes('FILME') ||
    categoriaUpper.includes('MOVIE') ||
    nomeUpper.includes('FILME')
  ) {
    return 'filme';
  }

  if (
    categoriaUpper.includes('SERIE') ||
    categoriaUpper.includes('SERIES') ||
    nomeUpper.includes('SERIE')
  ) {
    return 'serie';
  }

  return 'canal';
}

function extrairInfoSerie(nome: string): { temporada: number | null; episodio: number | null; nomeEpisodio: string } {
  for (const pattern of SERIE_PATTERNS) {
    const match = nome.match(pattern);
    if (match) {
      const temporada = parseInt(match[1], 10);
      const episodio = parseInt(match[2], 10);
      const nomeEpisodio = nome.replace(pattern, '').trim();
      return { temporada, episodio, nomeEpisodio };
    }
  }
  return { temporada: null, episodio: null, nomeEpisodio: nome };
}

function parseM3U(filePath: string): ConteudoM3U[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items: ConteudoM3U[] = [];

  let currentItem: Partial<ConteudoM3U> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const tvgChnoMatch = line.match(/tvg-chno="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      const nomeMatch = line.match(/,(.+)$/);

      currentItem = {
        nome: nomeMatch ? nomeMatch[1].trim() : 'Sem nome',
        categoria: groupTitleMatch ? groupTitleMatch[1].trim() : 'Sem categoria',
        epg: {
          id: tvgIdMatch ? tvgIdMatch[1] : '',
          logo: tvgLogoMatch ? tvgLogoMatch[1] : '',
          numero: tvgChnoMatch ? tvgChnoMatch[1] : '',
        },
      };
    } else if (line.startsWith('http')) {
      if (currentItem.nome) {
        const tipo = detectarTipo(currentItem.nome, currentItem.categoria || '', line);
        const { temporada, episodio, nomeEpisodio } = tipo === 'serie' 
          ? extrairInfoSerie(currentItem.nome)
          : { temporada: null, episodio: null, nomeEpisodio: currentItem.nome };

        items.push({
          nome: currentItem.nome,
          tipo,
          categoria: currentItem.categoria || 'Sem categoria',
          url_stream: line,
          temporada,
          episodio,
          nome_episodio: nomeEpisodio,
          epg: currentItem.epg || { id: '', logo: '', numero: '' },
        });

        currentItem = {};
      }
    }
  }

  return items;
}

async function limparTabela() {
  console.log('\n🗑️  Limpando tabela IPTV...');

  const { error } = await supabase.from('iptv').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('❌ Erro ao limpar tabela:', error);
    throw error;
  }

  console.log('✅ Tabela limpa com sucesso!');
}

async function inserirBatch(batch: ConteudoM3U[]) {
  const dados = batch.map((item) => ({
    nome: item.nome,
    tipo: item.tipo,
    categoria: item.categoria,
    url_stream: item.url_stream,
    temporada: item.temporada,
    episodio: item.episodio,
    nome_episodio: item.nome_episodio,
    epg_id: item.epg.id || null,
    epg_logo: item.epg.logo || null,
    epg_numero: item.epg.numero || null,
    is_hls: item.url_stream.includes('.m3u8'),
    is_active: true,
  }));

  const { error } = await supabase.from('iptv').insert(dados);

  if (error) {
    console.error('❌ Erro ao inserir batch:', error);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  console.log('🎬 SINCRONIZAÇÃO COMPLETA M3U');
  console.log('='.repeat(60));

  // Caminho do arquivo M3U
  const m3uPath = path.join(__dirname, '../../../../lista.m3u');

  if (!fs.existsSync(m3uPath)) {
    console.error('❌ Arquivo lista.m3u não encontrado!');
    console.error(`   Procurado em: ${m3uPath}`);
    process.exit(1);
  }

  console.log(`📂 Arquivo: ${m3uPath}`);
  console.log('');

  // Parse M3U
  console.log('📖 Lendo arquivo M3U...');
  const items = parseM3U(m3uPath);
  console.log(`✅ ${items.length} itens encontrados`);
  console.log('');

  // Estatísticas
  const stats = {
    canais: items.filter((i) => i.tipo === 'canal').length,
    filmes: items.filter((i) => i.tipo === 'filme').length,
    series: items.filter((i) => i.tipo === 'serie').length,
  };

  console.log('📊 Estatísticas:');
  console.log(`   📺 Canais: ${stats.canais}`);
  console.log(`   🎬 Filmes: ${stats.filmes}`);
  console.log(`   📺 Séries: ${stats.series}`);
  console.log('');

  // Limpar tabela
  await limparTabela();
  console.log('');

  // Inserir em batches
  console.log('💾 Inserindo dados...');
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  let processados = 0;
  const promises = batches.map((batch, index) =>
    limit(async () => {
      await inserirBatch(batch);
      processados += batch.length;
      const progresso = ((processados / items.length) * 100).toFixed(1);
      console.log(`   ⏳ Progresso: ${progresso}% (${processados}/${items.length})`);
    })
  );

  await Promise.all(promises);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SINCRONIZAÇÃO CONCLUÍDA!');
  console.log(`⏱️  Tempo: ${duration}s`);
  console.log(`📊 Total: ${items.length} itens`);
  console.log('='.repeat(60));
}

main().catch(console.error);
