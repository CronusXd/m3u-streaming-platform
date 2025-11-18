import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const episodeId = params.id;

    console.log(`🎬 Buscando stream_url para episódio: ${episodeId}`);

    // Buscar apenas url_stream e is_hls
    const { data, error } = await supabase
      .from('iptv')
      .select('url_stream, stream_url, is_hls')
      .eq('id', episodeId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar stream:', error);
      return NextResponse.json(
        { error: 'Episódio não encontrado', details: error.message },
        { status: 404 }
      );
    }

    if (!data) {
      console.error('❌ Nenhum dado encontrado para:', episodeId);
      return NextResponse.json(
        { error: 'Episódio não encontrado no banco' },
        { status: 404 }
      );
    }

    // Suportar tanto url_stream quanto stream_url
    const streamUrl = data.stream_url || data.url_stream;

    if (!streamUrl) {
      console.error('❌ Stream URL não disponível para:', episodeId);
      return NextResponse.json(
        { error: 'Stream URL não disponível' },
        { status: 404 }
      );
    }

    console.log(`✅ Stream encontrado para: ${episodeId}`);

    return NextResponse.json({
      stream_url: streamUrl,
      is_hls: data.is_hls ?? true,
    });
  } catch (error) {
    console.error('❌ Erro na API de stream:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
