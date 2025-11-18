'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import NetflixHeader from './NetflixHeader';
import { preloadService } from '@/services/preload';
import PreloadProgressIndicator from '@/components/common/PreloadProgress';

interface NetflixLayoutProps {
  children: React.ReactNode;
}

export default function NetflixLayout({ children }: NetflixLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Pré-carregar dados quando usuário loga
  useEffect(() => {
    if (user && !loading) {
      console.log('👤 Usuário logado, iniciando pré-carregamento...');
      
      // Pré-carregar em background (não bloqueia UI)
      preloadService.preloadAll().catch((error) => {
        console.error('❌ Erro no pré-carregamento:', error);
      });
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-netflix-black">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-netflix-red border-r-transparent"></div>
          <p className="mt-4 text-netflix-lightGray">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <NetflixHeader />
      <main className="pt-16">
        {children}
      </main>
      
      {/* Indicador de progresso do pré-carregamento */}
      <PreloadProgressIndicator />
    </div>
  );
}
