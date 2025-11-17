'use client';

import { useState, useEffect } from 'react';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';
import { supabase } from '@/lib/supabase';
import MovieDetailsModal from '@/components/movies/MovieDetailsModal';
import SeriesEpisodesModal from '@/components/series/SeriesEpisodesModal';
import VideoPlayerModal from '@/components/player/VideoPlayerModal';
import { TrashIcon } from '@heroicons/react/24/outline';

interface HistoryItem {
  id: string;
  name: string;
  logo_url?: string;
  stream_url: string;
  content_type: 'movie' | 'series' | 'live';
  channel_id: string;
  last_watched_at: string;
  progress?: number;
}

export default function HistoryPage() {
  const { history, loading: historyLoading } = useWatchHistory();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series' | 'live'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  useEffect(() => {
    if (!historyLoading && history.length > 0) {
      loadHistoryItems();
    } else if (!historyLoading) {
      setLoading(false);
      setItems([]);
    }
  }, [history, historyLoading]);

  const loadHistoryItems = async () => {
    setLoading(true);
    try {
      const channelIds = history.map(h => h.channel_id);
      
      const { data, error } = await supabase
        .from('channels')
        .select('id, name, logo_url, stream_url')
        .in('id', channelIds);

      if (error) throw error;

      const mappedItems = data?.map(channel => {
        const historyItem = history.find(h => h.channel_id === channel.id);
        return {
          ...channel,
          content_type: historyItem?.content_type || 'movie',
          channel_id: channel.id,
          last_watched_at: historyItem?.last_watched_at || new Date().toISOString(),
          progress: historyItem?.progress || 0,
        };
      }) || [];

      // Ordenar por data mais recente
      mappedItems.sort((a, b) => 
        new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()
      );

      setItems(mappedItems);
    } catch (error) {
      console.error('Error loading history items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Deseja remover este item do histórico?')) return;

    try {
      // Encontrar o item no histórico
      const historyItem = history.find(h => h.channel_id === itemId);
      if (!historyItem) return;

      // Deletar do banco
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('id', historyItem.id);

      if (error) throw error;

      // Remover da lista local
      setItems(items.filter(item => item.channel_id !== itemId));
    } catch (error) {
      console.error('Error deleting history item:', error);
      alert('Erro ao remover item do histórico');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Deseja limpar TODO o histórico? Esta ação não pode ser desfeita.')) return;

    try {
      const historyIds = history.map(h => h.id);
      
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .in('id', historyIds);

      if (error) throw error;

      setItems([]);
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Erro ao limpar histórico');
    }
  };

  const filteredItems = selectedType === 'all' 
    ? items 
    : items.filter(item => item.content_type === selectedType);

  const handleItemClick = (item: HistoryItem) => {
    if (item.content_type === 'movie') {
      setSelectedMovie(item);
    } else if (item.content_type === 'series') {
      setSelectedSeries(item.name);
    } else {
      setSelectedChannel(item);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (historyLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-netflix-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
          <p className="mt-4 text-netflix-lightGray">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Header */}
      <div className="border-b border-netflix-mediumGray bg-netflix-darkGray p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Histórico</h1>
            <p className="mt-2 text-netflix-lightGray">
              {filteredItems.length} {filteredItems.length === 1 ? 'item assistido' : 'itens assistidos'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 rounded-lg bg-netflix-mediumGray px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-netflix-dimGray"
            >
              <TrashIcon className="h-5 w-5" />
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-netflix-mediumGray bg-netflix-darkGray px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'all'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setSelectedType('movie')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'movie'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Histórico Filmes ({items.filter(i => i.content_type === 'movie').length})
          </button>
          <button
            onClick={() => setSelectedType('series')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'series'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Histórico Séries ({items.filter(i => i.content_type === 'series').length})
          </button>
          <button
            onClick={() => setSelectedType('live')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selectedType === 'live'
                ? 'bg-netflix-red text-white'
                : 'bg-netflix-mediumGray text-netflix-lightGray hover:bg-netflix-dimGray hover:text-white'
            }`}
          >
            Histórico Canais ({items.filter(i => i.content_type === 'live').length})
          </button>
        </div>
      </div>

      {/* Content - Grid de Capas Simples */}
      <div className="p-6">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative"
              >
                {/* Capa/Poster */}
                <button
                  onClick={() => handleItemClick(item)}
                  className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-netflix-mediumGray transition-transform hover:scale-105"
                >
                  {item.logo_url && item.logo_url.startsWith('http') ? (
                    <img
                      src={item.logo_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-12 w-12 text-netflix-dimGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}

                  {/* Overlay com ações (aparece no hover) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-netflix-red px-4 py-2 text-sm font-semibold text-white">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                        {item.progress && item.progress > 0 ? 'Continuar' : 'Assistir'}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  {item.progress && item.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-netflix-dimGray">
                      <div
                        className="h-full bg-netflix-red"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Badge de Tipo */}
                  <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-xs font-semibold text-white">
                    {item.content_type === 'movie' ? '🎬' : 
                     item.content_type === 'series' ? '📺' : '📡'}
                  </div>

                  {/* Botão Remover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.channel_id);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-black/80 p-1.5 text-white opacity-0 transition-opacity hover:bg-netflix-red group-hover:opacity-100"
                    title="Remover do histórico"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </button>

                {/* Título e Data */}
                <div className="mt-2">
                  <h3 className="text-sm font-medium text-white line-clamp-2" title={item.name}>
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-netflix-dimGray">
                    {formatDate(item.last_watched_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="h-24 w-24 text-netflix-dimGray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhum histórico ainda
            </h2>
            <p className="text-netflix-lightGray text-center max-w-md">
              Assista filmes, séries ou canais para ver seu histórico aqui
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={{
            ...selectedMovie,
            nome: selectedMovie.name || selectedMovie.nome,
            url_stream: selectedMovie.stream_url,
            tipo: 'filme' as const,
            categoria: '',
            is_hls: true,
            is_active: true,
            visualizacoes: 0,
            created_at: '',
            updated_at: '',
          }}
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {selectedSeries && (
        <SeriesEpisodesModal
          seriesName={selectedSeries}
          isOpen={!!selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {selectedChannel && (
        <VideoPlayerModal
          channel={{
            id: selectedChannel.id,
            name: selectedChannel.name,
            display_name: selectedChannel.name,
            stream_url: selectedChannel.stream_url,
            logo_url: selectedChannel.logo_url,
            is_hls: true,
          }}
          isOpen={!!selectedChannel}
          onClose={() => setSelectedChannel(null)}
          onChannelSelect={() => {}}
        />
      )}
    </div>
  );
}
