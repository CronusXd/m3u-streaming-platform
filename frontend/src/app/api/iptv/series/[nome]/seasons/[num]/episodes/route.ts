import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Função para parsear temporada e episódio de strings
function parseSeasonEpisode(nome: string): { season: number; episode: number } | null {
  const pattern1 = /S(\d+)E(\d+)/i;
  const match1 = nome.match(pattern1);
  if (match1) {
    return {
      season: parseInt(match1[1], 10),
      episode: parseInt(match1[2], 10),
    };
  }

  const pattern2 = /Season\s+(\d+)\s+Episode\s+(\d+)/i;
  const match2 = nome.match(pattern2);
  if (match2) {
    return {
      season: parseInt(match2[1], 10),
      episode: parseInt(match2[2], 10),
    };
  }

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

export async function GET(
  request: Request,
  { params }: { params: { nome: string; num: string } }
) {
  try {
    const seriesName = decodeURIComponent(params.nome);
    const seasonNumber = parseInt(params.num, 10);

    if (isNaN(seasonNumber)) {
      return NextResponse.json(
        { error: 'Número de temporada inválido' },
        { status: 400 }
      );
    }

    console.log(`📺 Buscando episódios: ${seriesName} - Temporada ${seasonNumber}`);

    // Buscar episódios da temporada
    const { data: episodes, error } = await supabase
      .from('iptv')
      .select('*')
      .eq('tipo', 'serie')
      .eq('nome', seriesName)
      .eq('temporada', seasonNumber)
      .eq('is_active', true)
      .order('episodio', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar episódios:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar episódios', details: String(error) },
        { status: 500 }
      );
    }

    // Se não encontrou com temporada exata, tentar parsear do nome
    let finalEpisodes = episodes || [];

    if (finalEpisodes.length === 0) {
      console.log('⚠️ Nenhum episódio encontrado com temporada exata, tentando parsing...');

      const { data: allEpisodes, error: allError } = await supabase
        .from('iptv')
        .select('*')
        .eq('tipo', 'serie')
        .eq('nome', seriesName)
        .eq('is_active', true);

      if (!allError && allEpisodes) {
        finalEpisodes = allEpisodes.filter((ep) => {
          let temporada = ep.temporada;

          if (temporada === null || temporada === undefined) {
            const parsed = parseSeasonEpisode(ep.nome);
            if (parsed) {
              temporada = parsed.season;
            }
          }

          return temporada === seasonNumber;
        });
      }
    }

    // Processar episódios e garantir números sequenciais
    const processedEpisodes = finalEpisodes.map((ep, index) => {
      let episodio = ep.episodio;

      // Se não tem número de episódio, tentar parsear ou usar índice
      if (episodio === null || episodio === undefined) {
        const parsed = parseSeasonEpisode(ep.nome);
        if (parsed) {
          episodio = parsed.episode;
        } else {
          episodio = index + 1;
          console.warn(`⚠️ Episódio sem número: ${ep.nome}, usando ${episodio}`);
        }
      }

      return {
        id: ep.id,
        nome: ep.nome || 'Episódio Sem Nome',
        temporada: seasonNumber,
        episodio,
        logo_url: ep.logo_url,
        backdrop_url: ep.backdrop_url,
        stream_url: ep.stream_url,
        visualizacoes: ep.visualizacoes || 0,
      };
    });

    // Ordenar por número de episódio
    processedEpisodes.sort((a, b) => a.episodio - b.episodio);

    console.log(`✅ ${processedEpisodes.length} episódios encontrados`);

    return NextResponse.json({
      series: seriesName,
      temporada: seasonNumber,
      episodes: processedEpisodes,
      total: processedEpisodes.length,
    });
  } catch (error) {
    console.error('❌ Erro na API de episódios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
