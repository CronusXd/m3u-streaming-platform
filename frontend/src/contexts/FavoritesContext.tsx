'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface Favorite {
  id: string;
  content_id: string;
  content_type: 'movie' | 'series' | 'live';
  content_name: string;
  content_logo?: string;
  added_at: string;
}

interface FavoritesContextType {
  favorites: Favorite[];
  isFavorite: (contentId: string) => boolean;
  toggleFavorite: (contentId: string, contentType: 'movie' | 'series' | 'live', contentName: string, contentLogo?: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
      console.log('🔍 Loading favorites for user:', user.id);
      console.log('📧 User email:', user.email);
      
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading favorites:', error);
        setFavorites([]);
      } else {
        console.log('✅ Raw favorites from DB:', data);
        console.log('📊 Total favorites found:', data?.length || 0);
        console.log('📊 By type:', {
          movies: data?.filter(f => f.content_type === 'movie').length || 0,
          series: data?.filter(f => f.content_type === 'series').length || 0,
          live: data?.filter(f => f.content_type === 'live').length || 0,
        });
        
        const mappedFavorites = (data || []).map(fav => ({
          id: fav.id,
          content_id: fav.content_id,
          content_type: fav.content_type,
          content_name: fav.content_name,
          content_logo: fav.content_logo,
          added_at: fav.added_at
        }));
        
        console.log('✅ Mapped favorites:', mappedFavorites);
        setFavorites(mappedFavorites);
      }
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (contentId: string): boolean => {
    return favorites.some(fav => fav.content_id === contentId);
  };

  const toggleFavorite = async (
    contentId: string, 
    contentType: 'movie' | 'series' | 'live',
    contentName: string,
    contentLogo?: string
  ) => {
    if (!user) {
      console.error('❌ No user logged in');
      return;
    }

    // Validar parâmetros
    if (!contentId || !contentType || !contentName) {
      console.error('❌ Missing required parameters:', { contentId, contentType, contentName });
      return;
    }

    const existingFavorite = favorites.find(fav => fav.content_id === contentId);

    try {
      if (existingFavorite) {
        console.log('🗑️ Removing favorite:', { 
          contentId, 
          contentName: existingFavorite.content_name,
          favoriteId: existingFavorite.id 
        });
        
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('id', existingFavorite.id);

        if (error) {
          console.error('❌ Delete error:', error);
          throw error;
        }
        
        setFavorites(favorites.filter(fav => fav.id !== existingFavorite.id));
        console.log('✅ Favorite removed successfully');
      } else {
        console.log('➕ Adding favorite:', { 
          contentId, 
          contentType,
          contentName,
          contentLogo: contentLogo || 'none',
          userId: user.id 
        });
        
        const insertData = {
          user_id: user.id,
          content_id: contentId,
          content_type: contentType,
          content_name: contentName,
          content_logo: contentLogo || null,
        };
        
        console.log('📤 Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('user_favorites')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            insertData: insertData
          });
          throw error;
        }
        
        if (data) {
          const newFavorite = {
            id: data.id,
            content_id: data.content_id,
            content_type: data.content_type,
            content_name: data.content_name,
            content_logo: data.content_logo,
            added_at: data.added_at
          };
          
          setFavorites([newFavorite, ...favorites]);
          console.log('✅ Favorite added successfully:', newFavorite);
        }
      }
    } catch (error: any) {
      console.error('❌ Error toggling favorite:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      alert(`Erro ao adicionar favorito: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, loading }}>
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
