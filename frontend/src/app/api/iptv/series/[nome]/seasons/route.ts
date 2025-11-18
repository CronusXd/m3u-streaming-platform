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
  _request: Request,
  { params }: { params: { nome: string } }
) {
  try {
    const seriesName = decodeURIComponent(params.nome);

    console.log(`📺 [API] Buscando temporadas para: "${seriesName}"`);

    // Buscar todos os episódios da série (usando LIKE para pegar variações do nome)
    const { data: episodes, error } = await supabase
      .from('iptv')
      .select('*')
      .eq('tipo', 'serie')
      .ilike('nome', `${seriesName}%`)
      .eq('is_active', true)
      .order('temporada', { ascending: true })
      .order('episodio', { ascending: true });

    if (error) {
      console.error('❌ [API] Erro ao buscar episódios:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar episódios', details: String(error) },
        { status: 500 }
      );
    }

    if (!episodes || episodes.length === 0) {
      console.warn(`⚠️ [API] Nenhum episódio encontrado para: "${seriesName}"`);
      return NextResponse.json(
        { error: 'Série não encontrada' },
        { status: 404 }
      );
    }

    console.log(`📊 [API] Total de ${episodes.length} episódios encontrados`);

    // Agrupar episódios por temporada
    const seasonsMap = new Map<number, any>();

    episodes.forEach((episode) => {
      let temporada = episode.temporada;

      // Tentar extrair temporada do nome_episodio ou nome se não estiver definida
      if (temporada === null || temporada === undefined) {
        const nomeParaParsear = episode.nome_episodio || episode.nome;
        const parsed = parseSeasonEpisode(nomeParaParsear);
        if (parsed) {
          temporada = parsed.season;
          console.log(`🔍 [API] Temporada extraída: ${nomeParaParsear} → T${temporada}`);
        } else {
          temporada = 1; // Default
          console.warn(`⚠️ [API] Temporada não encontrada, usando padrão T1: ${nomeParaParsear}`);
        }
      }

      if (!seasonsMap.has(temporada)) {
        seasonsMap.set(temporada, {
          temporada,
          totalEpisodios: 0,
          primeiroEpisodio: episode,
        });
      }

      const season = seasonsMap.get(temporada)!;
      season.totalEpisodios++;
    });

    // Converter para array e ordenar
    const seasons = Array.from(seasonsMap.values()).sort(
      (a, b) => a.temporada - b.temporada
    );

    console.log(`✅ [API] ${seasons.length} temporadas encontradas:`, seasons.map(s => `T${s.temporada} (${s.totalEpisodios} eps)`).join(', '));

    return NextResponse.json({
      series: seriesName,
      seasons,
      total: seasons.length,
    });
  } catch (error) {
    console.error('❌ Erro na API de temporadas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    );
  }
}
