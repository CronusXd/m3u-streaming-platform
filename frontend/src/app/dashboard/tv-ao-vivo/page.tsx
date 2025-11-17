'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [canais, setCanais] = useState<CanalIPTV[]>([]); // Canais filtrados
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCanal, setSelectedCanal] = useState<CanalIPTV | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const fetchedRef = useRef(false); // Flag para evitar chamadas duplicadas

  useEffect(() => {
    // Evitar chamadas duplicadas (React Strict Mode)
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Tentar carregar metadados do cache (30 dias)
      console.log('📺 Tentando carregar canais do cache...');
      const cachedMetadata = await optimizedCache.getMetadata('canal');
      
      if (cachedMetadata.length > 0) {
        console.log('✅ Canais carregados do CACHE!');
        
        // Extrair categorias dos metadados
        const cats = [
          { nome: 'Todas', count: cachedMetadata.length },
          ...Array.from(new Set(cachedMetadata.map(item => item.categoria)))
            .sort()
            .map(cat => ({
              nome: cat,
              count: cachedMetadata.filter(item => item.categoria === cat).length
            }))
        ];
        
        setTodosCanais(cachedMetadata as any);
        setCanais(cachedMetadata as any);
        setCategorias(cats);
        setLoading(false);
        return;
      }

      // Cache miss - buscar da API
      console.log('❌ Cache miss - buscando da API...');
      
      // Buscar canais da API
      const response = await fetch('/api/iptv/canais');
      const data = await response.json();

      console.log(`✅ ${data.canais?.length || 0} canais recebidos da API`);

      // LIMPAR NOMES
      const canaisLimpos = (data.canais || []).map((canal: CanalIPTV) => {
        const nomeOriginal = canal.nome;
        let nomeLimpo = nomeOriginal;
        
        const lastQuoteIndex = nomeOriginal.lastIndexOf('"');
        if (lastQuoteIndex > 0) {
          const afterQuote = nomeOriginal.substring(lastQuoteIndex + 1);
          if (afterQuote.includes(',')) {
            nomeLimpo = afterQuote.substring(afterQuote.indexOf(',') + 1).trim();
          } else {
            nomeLimpo = afterQuote.trim();
          }
        }
        
        return {
          ...canal,
          nome: nomeLimpo
        };
      });

      // Extrair categorias
      const cats = [
        { nome: 'Todas', count: canaisLimpos.length },
        ...Array.from(new Set(canaisLimpos.map((c: CanalIPTV) => c.categoria)))
          .sort()
          .map(cat => ({
            nome: cat as string,
            count: canaisLimpos.filter((c: CanalIPTV) => c.categoria === cat).length
          }))
      ];

      setTodosCanais(canaisLimpos);
      setCanais(canaisLimpos);
      setCategorias(cats);

      // Salvar metadados no cache (30 dias)
      try {
        const metadata: MetadataEntry[] = canaisLimpos.map((canal: CanalIPTV) => ({
          id: canal.id,
          nome: canal.nome,
          tipo: 'canal' as const,
          categoria: canal.categoria,
          logo_url: canal.logo_url || null,
          epg_logo: canal.epg_logo || null,
          timestamp: Date.now()
        }));
        
        await optimizedCache.saveMetadata(metadata);
        console.log('💾 Canais salvos no cache (TTL: 30 dias)');
      } catch (cacheError) {
        console.error('❌ Erro ao salvar no cache:', cacheError);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };



  // Filtrar canais localmente quando mudar categoria ou busca
  useEffect(() => {
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

    setCanais(canaisFiltrados);
  }, [categoriaSelecionada, busca, todosCanais]);

  // Usar categorias já calculadas (não duplicar "Todas")
  const categoriasComContagem = categorias.length > 0 
    ? categorias 
    : [{ nome: 'Todas', count: todosCanais.length }];

  const handleCanalClick = async (canal: CanalIPTV) => {
    setSelectedCanal(canal);
    
    // Se já tem url_stream, usar direto
    if (canal.url_stream) {
      setStreamUrl(canal.url_stream);
      setShowPlayer(true);
      return;
    }

    // Caso contrário, buscar do cache ou API
    setLoadingStream(true);
    try {
      // Tentar buscar do cache de streams (1 dia)
      const cachedStream = await optimizedCache.getStream(canal.id);
      
      if (cachedStream) {
        console.log('✅ Stream carregado do cache');
        setStreamUrl(cachedStream.url_stream);
        setShowPlayer(true);
        return;
      }

      // Cache miss - buscar da API
      console.log('❌ Stream não encontrado no cache, buscando da API...');
      const response = await fetch(`/api/iptv/canais/${canal.id}/stream`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar stream');
      }
      
      const data = await response.json();
      
      if (data.url_stream) {
        // Salvar no cache (1 dia)
        await optimizedCache.saveStream(canal.id, data.url_stream, data.is_hls || true);
        setStreamUrl(data.url_stream);
        setShowPlayer(true);
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
