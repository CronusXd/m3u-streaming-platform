#!/usr/bin/env node
/**
 * Script para analisar a estrutura do M3U
 * Identifica: Categorias, Filmes, Séries, Canais, Logos
 */

import { config } from 'dotenv';
import { M3UParser } from '../parsers/m3u-parser';
import { SeriesGrouper } from '../parsers/series-grouper';

config();

const M3U_URL = process.env.M3U_SYNC_URL || 'http://play.dnsrot.vip/get.php?username=Betania&password=hmjefp94euh&type=m3u_plus&output=m3u8';

async function analyzeM3U() {
  console.log('🔍 Analisando estrutura do M3U...\n');

  const parser = new M3UParser();
  const parseResult = await parser.parseFromUrl(M3U_URL);

  console.log(`📊 Total de itens: ${parseResult.channels.length}\n`);

  // Análise de grupos (categorias)
  const groups = new Map<string, number>();
  const logos = { com: 0, sem: 0 };
  const languages = new Map<string, number>();

  parseResult.channels.forEach(ch => {
    // Grupos
    const group = ch.groupTitle || 'Sem Categoria';
    groups.set(group, (groups.get(group) || 0) + 1);

    // Logos
    if (ch.tvgLogo && ch.tvgLogo !== 'NO_IMAGE') {
      logos.com++;
    } else {
      logos.sem++;
    }

    // Idiomas
    const lang = ch.language || 'desconhecido';
    languages.set(lang, (languages.get(lang) || 0) + 1);
  });

  // Agrupar séries
  const seriesGrouper = new SeriesGrouper();
  const grouped = seriesGrouper.groupSeries(parseResult.channels);

  console.log('📺 CATEGORIAS (Top 20):');
  console.log('─'.repeat(60));
  Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([group, count]) => {
      console.log(`  ${group.padEnd(40)} ${count.toString().padStart(6)}`);
    });

  console.log('\n🖼️  LOGOS:');
  console.log('─'.repeat(60));
  console.log(`  Com logo:  ${logos.com} (${((logos.com / parseResult.channels.length) * 100).toFixed(1)}%)`);
  console.log(`  Sem logo:  ${logos.sem} (${((logos.sem / parseResult.channels.length) * 100).toFixed(1)}%)`);

  console.log('\n🌍 IDIOMAS:');
  console.log('─'.repeat(60));
  Array.from(languages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([lang, count]) => {
      console.log(`  ${lang.padEnd(20)} ${count.toString().padStart(6)}`);
    });

  console.log('\n📊 TIPOS DE CONTEÚDO:');
  console.log('─'.repeat(60));
  console.log(`  Canais ao vivo:  ${grouped.channels.length.toString().padStart(6)}`);
  console.log(`  Séries:          ${grouped.series.length.toString().padStart(6)}`);
  console.log(`  Episódios:       ${grouped.episodes.length.toString().padStart(6)}`);

  // Identificar filmes (geralmente em categorias específicas)
  const movieCategories = ['Filmes', 'Movies', 'Cinema', 'Films', 'VOD'];
  let moviesCount = 0;
  
  parseResult.channels.forEach(ch => {
    const group = ch.groupTitle || '';
    if (movieCategories.some(cat => group.toLowerCase().includes(cat.toLowerCase()))) {
      moviesCount++;
    }
  });

  console.log(`  Filmes (estimado): ${moviesCount.toString().padStart(6)}`);

  console.log('\n📝 EXEMPLOS:');
  console.log('─'.repeat(60));
  
  // Exemplo de canal
  const canal = grouped.channels[0];
  if (canal) {
    console.log('\n🔴 Canal ao vivo:');
    console.log(`  Nome: ${canal.name}`);
    console.log(`  Grupo: ${canal.groupTitle}`);
    console.log(`  Logo: ${canal.tvgLogo}`);
    console.log(`  URL: ${canal.url.substring(0, 50)}...`);
  }

  // Exemplo de série
  const serie = grouped.series[0];
  if (serie) {
    console.log('\n📺 Série:');
    console.log(`  Nome: ${serie.name}`);
    console.log(`  Grupo: ${serie.groupTitle}`);
    console.log(`  Logo: ${serie.logo}`);
    console.log(`  Episódios: ${serie.episodes.length}`);
    if (serie.episodes[0]) {
      console.log(`  Exemplo: ${serie.episodes[0].name}`);
    }
  }

  // Exemplo de filme
  const filme = parseResult.channels.find(ch => {
    const group = ch.groupTitle || '';
    return movieCategories.some(cat => group.toLowerCase().includes(cat.toLowerCase()));
  });
  
  if (filme) {
    console.log('\n🎬 Filme:');
    console.log(`  Nome: ${filme.name}`);
    console.log(`  Grupo: ${filme.groupTitle}`);
    console.log(`  Logo: ${filme.tvgLogo}`);
    console.log(`  URL: ${filme.url.substring(0, 50)}...`);
  }

  console.log('\n✅ Análise concluída!\n');
}

if (require.main === module) {
  analyzeM3U()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

export { analyzeM3U };
