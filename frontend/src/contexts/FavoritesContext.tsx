'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Channel {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  url: string;
  isHls: boolean;
}

interface FavoritesContextType {
  favorites: Channel[];
  loading: boolean;
  addFavorite: (channel: Channel) => Promise<void>;
  removeFavorite: (channelId: string) => Promise<void>;
  isFavorite: (channelId: string) => boolean;
  toggleFavorite: (channel: Channel) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Carregar favoritos da API
  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { getFavorites } = await import('@/services/api');
      const data = await getFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (channel: Channel) => {
    if (!user) {
      toast.error('Faça login para adicionar favoritos');
      return;
    }

    // Optimistic update
    const newFavorites = [...favorites, channel];
    setFavorites(newFavorites);
    toast.success('Adicionado aos favoritos!');

    try {
      const { addFavorite: addFav } = await import('@/services/api');
      await addFav(user.id, channel.id);
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      // Reverter em caso de erro
      setFavorites(favorites);
      toast.error('Erro ao adicionar favorito');
    }
  };

  const removeFavorite = async (channelId: string) => {
    if (!user) {
      toast.error('Faça login para gerenciar favoritos');
      return;
    }

    // Optimistic update
    const newFavorites = favorites.filter(fav => fav.id !== channelId);
    setFavorites(newFavorites);
    toast.success('Removido dos favoritos!');

    try {
      const { removeFavorite: removeFav } = await import('@/services/api');
      await removeFav(user.id, channelId);
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      // Reverter em caso de erro
      setFavorites(favorites);
      toast.error('Erro ao remover favorito');
    }
  };

  const isFavorite = (channelId: string): boolean => {
    return favorites.some(fav => fav.id === channelId);
  };

  const toggleFavorite = async (channel: Channel) => {
    if (isFavorite(channel.id)) {
      await removeFavorite(channel.id);
    } else {
      await addFavorite(channel);
    }
  };

  const value = {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
