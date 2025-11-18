import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Busca TODOS os registros com paginação paralela
 */
async function fetchAllRecords(
  table: string,
  filters: any,
  pageSize = 1000
): Promise<any[]> {
  // 1. Contar total de registros
  const { count, error: countError } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .match(filters);

  if (countError || !count) {
    console.error('❌ Erro ao contar registros:', countError);
    return [];
  }

  console.log(`📊 Total de registros: ${count}`);

  // 2. Calcular número de páginas
  const totalPages = Math.ceil(count / pageSize);
  console.log(`📄 Páginas necessárias: ${totalPages}`);

  // 3. Buscar todas as páginas em paralelo (10 threads)
  const allData: any[] = [];
  const batchSize = 10; // 10 threads paralelas

  for (let i = 0; i < totalPages; i += batchSize) {
    const batch = [];
    
    for (let j = 0; j < batchSize && (i + j) < totalPages; j++) {
      const page = i + j;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      batch.push(
        supabase
          .from(table)
          .select('*')
          .match(filters)
          .order('nome')
          .range(from, to)
      );
    }

    // Executar batch em paralelo
    const results = await Promise.all(batch);
    
    results.forEach((result) => {
      if (result.data) {
        allData.push(...result.data);
      }
    });

    console.log(`✅ Progresso: ${Math.min(i + batchSize, totalPages)}/${totalPages} páginas`);
  }

  return allData;
}

/**
 * Extrai temporada e episódio do nome_episodio
 * Exemplo: "A Bárbara e o Troll S01 S01E13" → { season: 1, episode: 13 }
 */
function extractSeasonEpisode(nomeEpisodio: string): { season: number; episode: number } {
  // Padrão: S01E13, S02E05, etc.
  const match = nomeEpisodio.match(/S(\d+)E(\d+)/i);
  
  if (match) {
    return {
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  
  // Fallback: tentar pegar do final do nome
  const fallbackMatch = nomeEpisodio.match(/(\d+)x(\d+)/i);
  if (fallbackMatch) {
    return {
      season: parseInt(fallbackMatch[1], 10),
      episode: parseInt(fallbackMatch[2], 10),
    };
  }
  
  // Padrão: temporada 1, episódio 1
  return { season: 1, episode: 1 };
}

/**
 * API de Pré-carregamento de Séries
 * Retorna TODAS as séries com temporadas, episódios e streams
 */
export async function GET() {
  try {
    console.log('🚀 [Preload] Iniciando pré-carregamento de séries...');
    const startTime = Date.now();

    // 1. Buscar TODAS as séries (sem limite)
    const allContent = await fetchAllRecords('iptv', { tipo: 'serie' });

    if (!allContent || allContent.length === 0) {
      console.log('⚠️ Nenhuma série encontrada');
      return NextResponse.json({
        series: [],
        stats: { totalSeries: 0, totalSeasons: 0, totalEpisodes: 0, processingTime: 0 },
      });
    }

    console.log(`📊 ${allContent.length} episódios encontrados`);

    // 2. Limpar nomes de séries (remover TODOS os padrões de temporada/episódio)
    const cleanSeriesName = (name: string): string => {
      return name
        // Remove TUDO após o primeiro padrão S\d+ encontrado
        // Exemplos: "Genius - A vida de Einstein S01 S01E10" → "Genius - A vida de Einstein"
        //           "Eu Sou Groot S01 S01E02" → "Eu Sou Groot"
        //           "Bleach: Thousand-Year Blood War S01 S01E13" → "Bleach: Thousand-Year Blood War"
        .replace(/\s+S\d+.*$/i, '')
        // Remove " Season X" e tudo depois
        .replace(/\s+Season\s+\d+.*$/i, '')
        // Remove " Temporada X" e tudo depois
        .replace(/\s+Temporada\s+\d+.*$/i, '')
        // Remove espaços extras
        .replace(/\s+/g, ' ')
        .trim();
    };

    // 3. Agrupar por nome de série (limpo)
    const seriesMap = new Map<string, any[]>();
    
    allContent.forEach((item: any) => {
      const cleanName = cleanSeriesName(item.nome);
      if (!seriesMap.has(cleanName)) {
        seriesMap.set(cleanName, []);
      }
      seriesMap.get(cleanName)!.push(item);
    });

    const seriesNames = Array.from(seriesMap.keys());
    console.log(`📊 ${seriesNames.length} séries únicas encontradas`);

    // 3. Processar cada série progressivamente
    const seriesWithData: any[] = [];
    const batchSize = 50; // Processar 50 séries por vez
    let processed = 0;

    for (let i = 0; i < seriesNames.length; i += batchSize) {
      const batch = seriesNames.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (serieName) => {
          try {
            const episodes = seriesMap.get(serieName) || [];

            if (episodes.length === 0) {
              return null;
            }

            // Pegar categoria e logo do primeiro episódio
            const firstEpisode = episodes[0];
            const category = firstEpisode.categoria || 'Sem Categoria';
            const logo_url = firstEpisode.logo_url;

            // Agrupar episódios por temporada usando nome_episodio
            const seasonsMap = new Map<number, any[]>();
            
            episodes.forEach((ep: any) => {
              // Extrair temporada e episódio do nome_episodio
              const { season, episode } = extractSeasonEpisode(ep.nome_episodio || ep.nome);
              
              if (!seasonsMap.has(season)) {
                seasonsMap.set(season, []);
              }

              seasonsMap.get(season)!.push({
                id: ep.id,
                name: ep.nome_episodio || ep.nome,
                episode: episode,
                stream_url: ep.url_stream,
                logo_url: ep.logo_url,
                is_hls: ep.is_hls ?? true,
              });
            });

            // Converter Map para array de temporadas e ordenar
            const seasons = Array.from(seasonsMap.entries())
              .map(([seasonNum, episodes]) => ({
                season: seasonNum,
                episodes: episodes.sort((a, b) => a.episode - b.episode),
              }))
              .sort((a, b) => a.season - b.season);

            return {
              name: serieName,
              category: category,
              logo_url: logo_url,
              seasons,
            };
          } catch (error) {
            console.error(`❌ Erro ao processar série ${serieName}:`, error);
            return null;
          }
        })
      );

      // Adicionar resultados válidos
      const validResults = batchResults.filter((s) => s !== null);
      seriesWithData.push(...validResults);
      
      processed += batch.length;
      const progress = Math.round((processed / seriesNames.length) * 100);
      console.log(`✅ Progresso: ${processed}/${seriesNames.length} séries (${progress}%)`);
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`✅ [Preload] ${seriesWithData.length} séries processadas em ${duration}s`);

    // Calcular estatísticas
    const totalSeasons = seriesWithData.reduce((acc, s) => acc + s.seasons.length, 0);
    const totalEpisodes = seriesWithData.reduce(
      (acc, s) => acc + s.seasons.reduce((sum: number, season: any) => sum + season.episodes.length, 0),
      0
    );

    return NextResponse.json({
      series: seriesWithData,
      stats: {
        totalSeries: seriesWithData.length,
        totalSeasons,
        totalEpisodes,
        processingTime: duration,
      },
    });
  } catch (error) {
    console.error('❌ Erro no pré-carregamento de séries:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
