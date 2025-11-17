import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`📺 Buscando stream para série ID: ${id}`);

    // Buscar apenas url_stream e is_hls do banco
    const { data, error } = await supabase
      .from('iptv')
      .select('id, url_stream, is_hls')
      .eq('id', id)
      .eq('tipo', 'serie')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar stream:', error);
      return NextResponse.json(
        { error: 'Série não encontrada' },
        { status: 404 }
      );
    }

    if (!data || !data.url_stream) {
      console.error('❌ Stream não disponível para esta série');
      return NextResponse.json(
        { error: 'Stream não disponível' },
        { status: 404 }
      );
    }

    console.log(`✅ Stream encontrado para série ${id}`);

    return NextResponse.json({
      id: data.id,
      url_stream: data.url_stream,
      is_hls: data.is_hls || true,
    });
  } catch (error) {
    console.error('❌ Erro na API de stream:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
