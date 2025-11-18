'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { CanalCard } from '@/components/iptv/CanalCard';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import type { CanalIPTV } from '@/types/iptv';
import { optimizedCache, type MetadataEntry } from '@/lib/cache/optimized-cache';

interface Categoria {
  nome: string;
  count: number;
}

export default function TVAoVivoPage() {
  const [todosCanais, setTodosCanais] = useState<CanalIPTV[]>([]); // Todos os canais
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCanal, setSelectedCanal] = useState<CanalIPTV | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Evitar chamadas duplicadas
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log('📺 Verificando cache de canais...');
      
      // 1. Verificar cache de pré-carregamento
      let allChannels = await optimizedCache.getAllChannelsWithStreams();

      // 2. Se cache vazio ou inválido, baixar e salvar
      if (!allChannels || !allChannels.channels || allChannels.channels.length === 0) {
        console.log('⚠️ Cache vazio ou inválido, baixando canais...');
        
        try {
          const response = await fetch('/api/iptv/preload/channels');
          if (!response.ok) throw new Error('Erro ao buscar canais');
          
          const data = await response.json();
          
          // Salvar no cache (30 dias)
          await optimizedCache.saveAllChannelsWithStreams(data);
          console.log(`✅ ${data.channels.length} canais baixados e salvos no cache`);
          
          allChannels = data;
        } catch (error) {
          console.error('❌ Erro ao baixar canais:', error);
          setLoading(false);
          return;
        }
      } else {
        console.log(`✅ ${allChannels.channels.length} canais do CACHE`);
      }

      // Converter para formato esperado
      const canaisFormatted: CanalIPTV[] = allChannels.channels.map((c: any) => ({
        id: c.id,
        nome: c.name,
        categoria: c.category || 'Sem Categoria',
        logo_url: c.logo_url,
        stream_url: c.stream_url, // ⚡ Stream já incluído!
        is_hls: c.is_hls,
      }));

      // Extrair categorias
      const cats = [
        { nome: 'Todas', count: canaisFormatted.length },
        ...Array.from(new Set(canaisFormatted.map((c) => c.categoria)))
          .sort()
          .map((cat) => ({
            nome: cat as string,
            count: canaisFormatted.filter((c) => c.categoria === cat).length,
          })),
      ];

      setTodosCanais(canaisFormatted);
      setCategorias(cats);
      setLoading(false);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setLoading(false);
    }
  };



  // Filtrar canais usando useMemo (sem re-render)
  const canais = useMemo(() => {
    let canaisFiltrados = todosCanais;

    // Filtrar por categoria
    if (categoriaSelecionada) {
      canaisFiltrados = canaisFiltrados.filter(
        (canal) => canal.categoria === categoriaSelecionada
      );
    }

    // Filtrar por busca
    if (busca) {
      canaisFiltrados = canaisFiltrados.filter((canal) =>
        canal.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    return canaisFiltrados;
  }, [categoriaSelecionada, busca, todosCanais]);

  // Usar categorias já calculadas (não duplicar "Todas")
  const categoriasComContagem = categorias.length > 0 
    ? categorias 
    : [{ nome: 'Todas', count: todosCanais.length }];

  const handleCanalClick = async (canal: CanalIPTV) => {
    setSelectedCanal(canal);
    
    // Stream já está incluído no canal (do cache de pré-carregamento)
    if (canal.stream_url) {
      console.log('✅ Stream do cache de pré-carregamento');
      
      // Converter para URL segura (proxy se HTTP)
      const { getSecureStreamUrl } = await import('@/utils/stream-url');
      const secureUrl = getSecureStreamUrl(canal.stream_url);
      
      if (secureUrl) {
        setStreamUrl(secureUrl);
        setShowPlayer(true);
      } else {
        alert('URL do stream inválida');
      }
      return;
    }

    // Fallback: Se não tem stream_url, buscar do cache completo
    setLoadingStream(true);
    try {
      const allChannels = await optimizedCache.getAllChannelsWithStreams();
      
      if (allChannels && allChannels.channels) {
        const canalComStream = allChannels.channels.find((c: any) => c.id === canal.id);
        
        if (canalComStream && canalComStream.stream_url) {
          console.log('✅ Stream encontrado no cache completo');
          
          // Converter para URL segura (proxy se HTTP)
          const { getSecureStreamUrl } = await import('@/utils/stream-url');
          const secureUrl = getSecureStreamUrl(canalComStream.stream_url);
          
          if (secureUrl) {
            setStreamUrl(secureUrl);
            setShowPlayer(true);
          } else {
            alert('URL do stream inválida');
          }
          setLoadingStream(false);
          return;
        }
      }

      // Se ainda não encontrou, buscar da API (último recurso)
      console.log('⚠️ Stream não encontrado no cache, buscando da API...');
      const response = await fetch(`/api/iptv/canais/${canal.id}/stream`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar stream');
      }
      
      const data = await response.json();
      
      if (data.url_stream) {
        // Converter para URL segura (proxy se HTTP)
        const { getSecureStreamUrl } = await import('@/utils/stream-url');
        const secureUrl = getSecureStreamUrl(data.url_stream);
        
        if (secureUrl) {
          setStreamUrl(secureUrl);
          setShowPlayer(true);
        } else {
          alert('URL do stream inválida');
        }
      } else {
        alert('Stream não disponível para este canal');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar stream:', error);
      alert('Erro ao carregar stream. Tente novamente.');
    } finally {
      setLoadingStream(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando canais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar de Categorias */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-950 p-4">
        <h2 className="mb-4 text-xl font-bold text-white">📂 Categorias</h2>

        {/* Lista de categorias */}
        <div className="space-y-1">
          {categoriasComContagem.map((cat) => (
            <button
              key={cat.nome}
              onClick={() => setCategoriaSelecionada(cat.nome === 'Todas' ? '' : cat.nome)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
                (cat.nome === 'Todas' && categoriaSelecionada === '') || categoriaSelecionada === cat.nome
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="truncate">{cat.nome}</span>
              <span className="ml-2 rounded-full bg-gray-700 px-2 py-1 text-xs">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white">
            🔴 {categoriaSelecionada || 'Todos os Canais'}
          </h1>
          <p className="mt-2 text-gray-400">
            Exibindo {canais.length} de {todosCanais.length} canais
          </p>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar canais..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full max-w-md rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {/* Grid de Canais */}
        {canais.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Nenhum canal encontrado
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {canais.map((canal) => (
              <CanalCard
                key={canal.id}
                canal={canal}
                onClick={() => handleCanalClick(canal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loadingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-red-600 border-r-transparent mb-4"></div>
            <p className="text-white text-xl">Carregando canal...</p>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayer && streamUrl && selectedCanal && (
        <VideoPlayerModal
          channel={{
            id: selectedCanal.id,
            name: selectedCanal.nome,
            display_name: selectedCanal.nome,
            stream_url: streamUrl,
            logo_url: selectedCanal.logo_url || selectedCanal.epg_logo || undefined,
            category_name: selectedCanal.categoria,
            is_hls: true,
          }}
          isOpen={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setStreamUrl(null);
            setSelectedCanal(null);
          }}
          onChannelSelect={() => {}}
        />
      )}
    </div>
  );
}
