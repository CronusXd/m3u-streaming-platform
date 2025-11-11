const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para criar slug
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Função para determinar o tipo de categoria
function getCategoryType(categoryName) {
  const name = categoryName.toLowerCase();
  
  if (name.includes('filme')) return 'movie';
  if (name.includes('series') || name.includes('série') || name.includes('dorama')) return 'series';
  if (name.includes('rádio') || name.includes('radio')) return 'radio';
  if (name.includes('câmera') || name.includes('camera')) return 'camera';
  if (name.includes('reality') || name.includes('videos educativos')) return 'special';
  
  return 'channel';
}

// Função para parsear o arquivo M3U
function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extrair metadados
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      const displayNameMatch = line.match(/,(.+)$/);

      currentChannel = {
        tvg_id: tvgIdMatch ? tvgIdMatch[1] : null,
        name: tvgNameMatch ? tvgNameMatch[1] : null,
        logo_url: tvgLogoMatch ? tvgLogoMatch[1] : null,
        category: groupTitleMatch ? groupTitleMatch[1] : 'Sem Categoria',
        display_name: displayNameMatch ? displayNameMatch[1].trim() : null,
      };
    } else if (line && !line.startsWith('#') && currentChannel) {
      // URL do stream
      currentChannel.stream_url = line;
      currentChannel.is_hls = line.includes('.m3u8');
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

// Função para importar categorias
async function importCategories(channels) {
  console.log('📁 Importando categorias...');
  
  const uniqueCategories = [...new Set(channels.map(ch => ch.category))];
  const categories = uniqueCategories.map(name => ({
    name,
    type: getCategoryType(name),
    slug: createSlug(name),
  }));

  console.log(`   Encontradas ${categories.length} categorias únicas`);

  // Inserir categorias em lote
  const { data, error } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'slug', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('❌ Erro ao importar categorias:', error);
    throw error;
  }

  console.log(`✅ ${data.length} categorias importadas`);
  return data;
}

// Função para importar canais em lotes
async function importChannels(channels, categoriesMap) {
  console.log('📺 Importando canais...');
  console.log(`   Total de canais: ${channels.length}`);

  const BATCH_SIZE = 1000;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    
    const channelsToInsert = batch.map(ch => ({
      tvg_id: ch.tvg_id ? ch.tvg_id.substring(0, 500) : null,
      name: (ch.name || ch.display_name || 'Sem nome').substring(0, 500),
      display_name: ch.display_name ? ch.display_name.substring(0, 500) : null,
      logo_url: ch.logo_url,
      stream_url: ch.stream_url,
      category_id: categoriesMap[ch.category],
      is_hls: ch.is_hls,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from('channels')
      .insert(channelsToInsert)
      .select('id');

    if (error) {
      console.error(`❌ Erro no lote ${i / BATCH_SIZE + 1}:`, error.message);
      errors += batch.length;
    } else {
      imported += data.length;
      console.log(`   Progresso: ${imported}/${channels.length} (${Math.round(imported / channels.length * 100)}%)`);
    }
  }

  console.log(`✅ ${imported} canais importados`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} canais com erro`);
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 Iniciando importação do arquivo M3U...\n');

    // Ler arquivo
    console.log('📖 Lendo arquivo lista.m3u...');
    const content = fs.readFileSync('lista.m3u', 'utf-8');
    console.log('✅ Arquivo lido com sucesso\n');

    // Parsear M3U
    console.log('🔍 Parseando arquivo M3U...');
    const channels = parseM3U(content);
    console.log(`✅ ${channels.length} canais encontrados\n`);

    // Importar categorias
    const categories = await importCategories(channels);
    
    // Criar mapa de categorias
    const categoriesMap = {};
    categories.forEach(cat => {
      categoriesMap[cat.name] = cat.id;
    });
    console.log('');

    // Importar canais
    await importChannels(channels, categoriesMap);

    console.log('\n🎉 Importação concluída com sucesso!');
    console.log('\n📊 Estatísticas:');
    console.log(`   Categorias: ${categories.length}`);
    console.log(`   Canais: ${channels.length}`);

  } catch (error) {
    console.error('\n❌ Erro durante a importação:', error);
    process.exit(1);
  }
}

// Executar
main();
