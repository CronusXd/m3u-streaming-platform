'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface WatchHistory {
  id: string;
  channel_id: string;
  content_type: 'movie' | 'series' | 'live';
  progress: number;
  duration: number;
  last_watched_at: string;
}

interface WatchHistoryContextType {
  history: WatchHistory[];
  addToHistory: (channelId: string, contentType: 'movie' | 'series' | 'live', progress?: number, duration?: number) => Promise<void>;
  getProgress: (channelId: string) => number;
  loading: boolean;
}

const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

export function WatchHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      // Tentar user_watch_history primeiro
      let { data, error } = await supabase
        .from('user_watch_history')
        .select('*')
        .eq('user_id', user.id)
        .order('last_watched_at', { ascending: false })
        .limit(100);

      // Se não existir, tentar watch_history
      if (error && error.code === 'PGRST116') {
        const result = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('last_watched_at', { ascending: false })
          .limit(100);
        
        data = result.data;
        error = result.error;
      }

      // Se ainda der erro, apenas ignorar
      if (error && error.code === 'PGRST116') {
        console.log('⚠️ Watch history table not found, skipping...');
        setHistory([]);
        return;
      }

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('❌ Error loading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = async (
    channelId: string, 
    contentType: 'movie' | 'series' | 'live',
    progress: number = 0,
    duration: number = 0
  ) => {
    if (!user) return;

    try {
      // Verificar se já existe
      const existing = history.find(h => h.channel_id === channelId);

      if (existing) {
        // Atualizar existente - tentar user_watch_history primeiro
        let { data, error } = await supabase
          .from('user_watch_history')
          .update({
            progress,
            duration,
            last_watched_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        // Se não existir, tentar watch_history
        if (error && error.code === 'PGRST116') {
          const result = await supabase
            .from('watch_history')
            .update({
              progress,
              duration,
              last_watched_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();
          
          data = result.data;
          error = result.error;
        }

        // Se ainda der erro, apenas ignorar
        if (error && error.code === 'PGRST116') {
          console.log('⚠️ Watch history table not found, skipping...');
          return;
        }

        if (error) throw error;
        if (data) {
          setHistory([data, ...history.filter(h => h.id !== existing.id)]);
        }
      } else {
        // Criar novo - tentar user_watch_history primeiro
        let { data, error } = await supabase
          .from('user_watch_history')
          .insert({
            user_id: user.id,
            channel_id: channelId,
            content_type: contentType,
            progress,
            duration,
            last_watched_at: new Date().toISOString(),
          })
          .select()
          .single();

        // Se não existir, tentar watch_history
        if (error && error.code === 'PGRST116') {
          const result = await supabase
            .from('watch_history')
            .insert({
              user_id: user.id,
              channel_id: channelId,
              content_type: contentType,
              progress,
              duration,
              last_watched_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          data = result.data;
          error = result.error;
        }

        // Se ainda der erro, apenas ignorar
        if (error && error.code === 'PGRST116') {
          console.log('⚠️ Watch history table not found, skipping...');
          return;
        }

        if (error) throw error;
        if (data) {
          setHistory([data, ...history]);
        }
      }
    } catch (error) {
      console.error('❌ Error adding to history:', error);
    }
  };

  const getProgress = (channelId: string): number => {
    const item = history.find(h => h.channel_id === channelId);
    return item ? (item.progress / item.duration) * 100 : 0;
  };

  return (
    <WatchHistoryContext.Provider value={{ history, addToHistory, getProgress, loading }}>
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (context === undefined) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
}
