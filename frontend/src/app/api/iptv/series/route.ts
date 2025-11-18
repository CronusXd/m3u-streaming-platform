import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Função para parsear temporada e episódio de strings
function parseSeasonEpisode(nome: string): { season: number; episode: number } | null {
  // Padrão 1: S01E01, S02E05, etc. (pega o ÚLTIMO match para casos como "S01 S01E08")
  const pattern1 = /S(\d+)E(\d+)/gi;
  let match1;
  let lastMatch = null;
  while ((match1 = pattern1.exec(nome)) !== null) {
    lastMatch = match1;
  }
  if (lastMatch) {
    return {
      season: parseInt(lastMatch[1], 10),
      episode: parseInt(lastMatch[2], 10),
    };
  }

  // Padrão 2: Season 1 Episode 1
  const pattern2 = /Season\s+(\d+)\s+Episode\s+(\d+)/i;
  const match2 = nome.match(pattern2);
  if (match2) {
    return {
      season: parseInt(match2[1], 10),
      episode: parseInt(match2[2], 10),
    };
  }

  // Padrão 3: 1x01, 2x05, etc.
  const pattern3 = /(\d+)x(\d+)/i;
  const match3 = nome.match(pattern3);
  if (match3) {
    return {
      season: parseInt(match3[1], 10),
      episode: parseInt(match3[2], 10),
    };
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    console.log('📺 Buscando TODAS as séries com queries paralelas...');

    // Primeiro, contar total de registros
    let countQuery = supabase
      .from('iptv')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'serie')
      .eq('is_active', true);

    if (categoria && categoria !== 'Todas') {
      countQuery = countQuery.eq('categoria', categoria);
    }

    const { count } = await countQuery;
    const totalRecords = count || 0;

    console.log(`📊 Total de registros: ${totalRecords}`);

    // Buscar em paralelo com múltiplas threads
    const batchSize = 1000;
    const numThreads = 10;
    const batches = Math.ceil(totalRecords / batchSize);
    const batchesPerThread = Math.ceil(batches / numThreads);

    // Criar função para buscar batches de uma thread
    const fetchThread = async (threadId: number) => {
      const results: any[] = [];
      const startBatch = threadId * batchesPerThread;
      const endBatch = Math.min(startBatch + batchesPerThread, batches);

      for (let i = startBatch; i < endBatch; i++) {
        const from = i * batchSize;
        const to = Math.min(from + batchSize - 1, totalRecords - 1);

        let query = supabase
          .from('iptv')
          .select(
            'nome, nome_episodio, categoria, temporada, episodio, logo_url, backdrop_url, visualizacoes, created_at, updated_at'
          )
          .eq('tipo', 'serie')
          .eq('is_active', true)
          .order('nome', { ascending: true })
          .range(from, to);

        if (categoria && categoria !== 'Todas') {
          query = query.eq('categoria', categoria);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`❌ Thread ${threadId + 1} erro:`, error);
          break;
        }

        if (data && data.length > 0) {
          results.push(...data);
        }
      }

      console.log(`✅ Thread ${threadId + 1}: ${results.length} registros`);
      return results;
    };

    // Executar threads em paralelo
    console.log(`🚀 Executando ${numThreads} threads em paralelo...`);
    const threadPromises = [];
    for (let i = 0; i < numThreads; i++) {
      threadPromises.push(fetchThread(i));
    }

    const threadResults = await Promise.all(threadPromises);

    // Combinar resultados
    let allRecords: any[] = [];
    threadResults.forEach((results) => {
      allRecords = allRecords.concat(results);
    });

    console.log(`✅ Total de registros carregados: ${allRecords.length}`);

    // Função para extrair nome base da série (sem S01E01, etc)
    const extractSeriesName = (fullName: string): string => {
      // Remover padrões como: S01E01, S02, Season 1, 1x01, etc.
      let cleanName = fullName
        .replace(/\s*-?\s*S\d+E\d+.*$/i, '') // Remove S01E01 e tudo depois
        .replace(/\s*-?\s*S\d+.*$/i, '') // Remove S01 e tudo depois
        .replace(/\s*-?\s*Season\s+\d+.*$/i, '') // Remove Season 1 e tudo depois
        .replace(/\s*-?\s*\d+x\d+.*$/i, '') // Remove 1x01 e tudo depois
        .replace(/\s*-?\s*Temporada\s+\d+.*$/i, '') // Remove Temporada 1 e tudo depois
        .trim();

      return cleanName || fullName; // Se ficou vazio, usa o nome original
    };

    // Agrupar por nome base da série (remover episódios duplicados)
    const seriesMap = new Map<string, any>();

    allRecords.forEach((record) => {
      // Extrair nome base da série
      const seriesBaseName = extractSeriesName(record.nome);

      if (!seriesMap.has(seriesBaseName)) {
        seriesMap.set(seriesBaseName, {
          nome: seriesBaseName,
          categoria: record.categoria || 'Sem categoria',
          logo_url: record.logo_url,
          backdrop_url: record.backdrop_url,
          visualizacoes: record.visualizacoes || 0,
          created_at: record.created_at,
          updated_at: record.updated_at,
          temporadas: new Set<number>(),
          episodios: 0,
        });
      }

      const serie = seriesMap.get(seriesBaseName)!;

      // Tentar extrair temporada e episódio do nome_episodio ou nome
      let temporada = record.temporada;
      let episodio = record.episodio;

      if (temporada === null || temporada === undefined) {
        // Tentar parsear do nome_episodio primeiro
        const nomeParaParsear = record.nome_episodio || record.nome;
        if (nomeParaParsear) {
          const parsed = parseSeasonEpisode(nomeParaParsear);
          if (parsed) {
            temporada = parsed.season;
            episodio = parsed.episode;
          } else {
            // Usar valores padrão
            temporada = 1;
          }
        }
      }

      // Adicionar temporada ao Set (evita duplicatas)
      if (temporada !== null && temporada !== undefined) {
        serie.temporadas.add(temporada);
      }

      // Contar episódios
      serie.episodios++;
    });

    // Converter para array e formatar
    const series = Array.from(seriesMap.values()).map((serie) => ({
      nome: serie.nome,
      tipo: 'serie' as const,
      categoria: serie.categoria,
      logo_url: serie.logo_url,
      backdrop_url: serie.backdrop_url,
      visualizacoes: serie.visualizacoes,
      created_at: serie.created_at,
      updated_at: serie.updated_at,
      totalTemporadas: serie.temporadas.size,
      totalEpisodios: serie.episodios,
    }));

    // Ordenar por nome
    series.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(`✅ Total de séries únicas: ${series.length}`);
    console.log(`📊 Primeiras 5 séries:`, series.slice(0, 5).map(s => `${s.nome} (${s.totalTemporadas} temp, ${s.totalEpisodios} eps)`));

    return NextResponse.json({
      series,
      total: series.length,
      limit: series.length,
      offset: 0,
    });
  } catch (error) {
    console.error('Erro na API de séries:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
