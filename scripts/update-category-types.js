/**
 * Script para atualizar os tipos das categorias
 * Classifica categorias em: filmes, series, tv-ao-vivo
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Palavras-chave para classificação
const FILMES_KEYWORDS = ['filme', 'movie', 'cinema', 'film'];
const SERIES_KEYWORDS = ['serie', 'series', 'show', 'novela', 'temporada'];

function getCategoryType(categoryName) {
  const name = categoryName.toLowerCase();
  
  // Verificar se é filme
  if (FILMES_KEYWORDS.some(keyword => name.includes(keyword))) {
    return 'filmes';
  }
  
  // Verificar se é série
  if (SERIES_KEYWORDS.some(keyword => name.includes(keyword))) {
    return 'series';
  }
  
  // Default: TV ao Vivo
  return 'tv-ao-vivo';
}

async function updateCategoryTypes() {
  console.log('🔄 Atualizando tipos de categorias...\n');

  try {
    // Buscar todas as categorias
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, type');

    if (error) {
      throw error;
    }

    console.log(`📊 Total de categorias: ${categories.length}\n`);

    let updated = 0;
    let skipped = 0;

    // Atualizar cada categoria
    for (const category of categories) {
      const newType = getCategoryType(category.name);
      
      // Só atualizar se o tipo mudou
      if (category.type !== newType) {
        const { error: updateError } = await supabase
          .from('categories')
          .update({ type: newType })
          .eq('id', category.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${category.name}:`, updateError.message);
        } else {
          console.log(`✅ ${category.name}: ${category.type} → ${newType}`);
          updated++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n📈 Resumo:');
    console.log(`   ✅ Atualizadas: ${updated}`);
    console.log(`   ⏭️  Ignoradas: ${skipped}`);
    console.log(`   📊 Total: ${categories.length}`);

    // Mostrar distribuição por tipo
    const { data: distribution } = await supabase
      .from('categories')
      .select('type');

    if (distribution) {
      const counts = distribution.reduce((acc, cat) => {
        acc[cat.type] = (acc[cat.type] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Distribuição por tipo:');
      console.log(`   🎬 Filmes: ${counts['filmes'] || 0}`);
      console.log(`   📺 Séries: ${counts['series'] || 0}`);
      console.log(`   📡 TV ao Vivo: ${counts['tv-ao-vivo'] || 0}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar
updateCategoryTypes()
  .then(() => {
    console.log('\n✅ Atualização concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
