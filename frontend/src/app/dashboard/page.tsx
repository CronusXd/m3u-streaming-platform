'use client';

import { useRouter } from 'next/navigation';
import { 
  TvIcon,
  FilmIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';

const mainCategories = [
  {
    id: 'tv-ao-vivo',
    name: 'TV AO VIVO',
    icon: TvIcon,
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Assista canais ao vivo',
  },
  {
    id: 'filmes',
    name: 'FILMES',
    icon: FilmIcon,
    gradient: 'from-orange-500 to-red-500',
    description: 'Catálogo de filmes',
  },
  {
    id: 'series',
    name: 'SERIES',
    icon: RectangleStackIcon,
    gradient: 'from-purple-500 to-pink-500',
    description: 'Séries e programas',
  },
];

export default function DashboardPage() {
  const router = useRouter();

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/dashboard/${categoryId}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-netflix-black p-8">
      <div className="w-full max-w-6xl">
        {/* Logo */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">PlayCoreTV</h1>
          <p className="text-netflix-lightGray">Escolha uma categoria para começar</p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {mainCategories.map((category) => {
            const Icon = category.icon;
            
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-8 transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-90 transition-opacity group-hover:opacity-100`} />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="mb-4 rounded-full bg-white/20 p-6 backdrop-blur-sm">
                    <Icon className="h-16 w-16 text-white" />
                  </div>
                  
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    {category.name}
                  </h2>
                  
                  <p className="text-sm text-white/80">
                    {category.description}
                  </p>

                  {/* Update Badge */}
                  <div className="mt-4 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Atualizado recentemente</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="mt-12 flex justify-center gap-4">
          <button
            onClick={() => router.push('/dashboard/favorites')}
            className="flex items-center gap-2 rounded-lg bg-netflix-darkGray px-6 py-3 text-white transition-colors hover:bg-netflix-mediumGray"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Meus Favoritos</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/search')}
            className="flex items-center gap-2 rounded-lg bg-netflix-darkGray px-6 py-3 text-white transition-colors hover:bg-netflix-mediumGray"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Buscar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
