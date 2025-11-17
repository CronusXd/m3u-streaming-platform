'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Tratamento específico para rate limit
        if (error.status === 429 || error.message.includes('rate limit')) {
          toast.error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
          throw new Error('Rate limit atingido. Aguarde alguns minutos.');
        }
        throw error;
      }

      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao fazer login';
      toast.error(errorMessage);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Tratamento específico para rate limit
        if (error.status === 429 || error.message.includes('rate limit')) {
          toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
          throw new Error('Rate limit atingido. Aguarde alguns minutos.');
        }
        throw error;
      }

      // Verificar se o email já existe
      if (data?.user && !data.session) {
        toast.success('Conta criada! Verifique seu email para confirmar.');
      } else if (data?.session) {
        toast.success('Conta criada e login realizado com sucesso!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao criar conta';
      toast.error(errorMessage);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Logout realizado com sucesso!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast.success('Link mágico enviado! Verifique seu email.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar link mágico');
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithMagicLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
