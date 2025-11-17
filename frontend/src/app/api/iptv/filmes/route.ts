import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    console.log('🎬 Buscando TODOS os filmes com queries paralelas...');

    // Primeiro, contar total de registros
    let countQuery = supabase
      .from('iptv')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'filme')
      .eq('is_active', true);

    if (categoria && categoria !== 'Todas') {
      countQuery = countQuery.eq('categoria', categoria);
    }

    const { count } = await countQuery;
    const totalRecords = count || 0;

    console.log(`📊 Total de registros: ${totalRecords}`);

    // Buscar em paralelo com múltiplas threads
    const batchSize = 1000;
    const numThreads = 5;
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
          .select('*')
          .eq('tipo', 'filme')
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
    let allFilmes: any[] = [];
    threadResults.forEach((results) => {
      allFilmes = allFilmes.concat(results);
    });

    console.log(`✅ Total de filmes carregados: ${allFilmes.length}`);

    // Transformar para formato esperado
    const filmes = allFilmes.map((movie: any) => ({
      id: movie.id,
      nome: movie.nome,
      tipo: 'filme' as const,
      categoria: movie.categoria || 'Sem categoria',
      stream_url: movie.url_stream,
      logo_url: movie.logo_url,
      visualizacoes: movie.visualizacoes || 0,
      avaliacao: movie.metadata?.rating || 0,
      is_hls: movie.is_hls,
      is_active: movie.is_active,
      created_at: movie.created_at,
      updated_at: movie.updated_at,
    }));

    console.log(`✅ Total de filmes carregados: ${filmes.length}`);

    return NextResponse.json({
      filmes,
      total: filmes.length,
      limit: filmes.length,
      offset: 0,
    });
  } catch (error) {
    console.error('Erro na API de filmes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
