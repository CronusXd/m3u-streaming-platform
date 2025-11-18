import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Forçar rota dinâmica (não fazer ISR)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  console.log(`📊 Total de canais: ${count}`);

  // 2. Calcular número de páginas
  const totalPages = Math.ceil(count / pageSize);

  // 3. Buscar todas as páginas em paralelo (10 threads)
  const allData: any[] = [];
  const batchSize = 10;

  for (let i = 0; i < totalPages; i += batchSize) {
    const batch = [];
    
    for (let j = 0; j < batchSize && (i + j) < totalPages; j++) {
      const page = i + j;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      batch.push(
        supabase
          .from(table)
          .select('id, nome, categoria, url_stream, logo_url, epg_logo, is_hls')
          .match(filters)
          .order('nome')
          .range(from, to)
      );
    }

    const results = await Promise.all(batch);
    
    results.forEach((result) => {
      if (result.data) {
        allData.push(...result.data);
      }
    });

    console.log(`✅ Progresso canais: ${Math.min(i + batchSize, totalPages)}/${totalPages} páginas`);
  }

  return allData;
}

/**
 * API de Pré-carregamento de Canais
 * Retorna TODOS os canais com streams incluídos
 */
export async function GET() {
  try {
    console.log('🚀 [Preload] Iniciando pré-carregamento de canais...');
    const startTime = Date.now();

    // Buscar TODOS os canais (sem limite)
    const channels = await fetchAllRecords('iptv', { tipo: 'canal' });

    if (!channels || channels.length === 0) {
      console.log('⚠️ Nenhum canal encontrado');
      return NextResponse.json({
        channels: [],
        stats: { totalChannels: 0, processingTime: 0 },
      });
    }

    // Formatar dados
    const formattedChannels = channels.map((channel: any) => ({
      id: channel.id,
      name: channel.nome,
      category: channel.categoria,
      stream_url: channel.url_stream, // ⚡ Stream incluído!
      logo_url: channel.logo_url || channel.epg_logo, // Prioriza logo_url, fallback para epg_logo
      is_hls: channel.is_hls ?? true,
    }));

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`✅ [Preload] ${formattedChannels.length} canais processados em ${duration}s`);

    return NextResponse.json({
      channels: formattedChannels,
      stats: {
        totalChannels: formattedChannels.length,
        processingTime: duration,
      },
    });
  } catch (error) {
    console.error('❌ Erro no pré-carregamento de canais:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
