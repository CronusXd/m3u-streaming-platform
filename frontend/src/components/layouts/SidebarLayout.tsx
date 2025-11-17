'use client';

import { useState } from 'react';
import { 
  MagnifyingGlassIcon,
  HomeIcon,
  HeartIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  count?: number;
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  totalChannels: number;
  favoritesCount: number;
}

export default function SidebarLayout({
  children,
  categories,
  selectedCategory,
  onCategorySelect,
  totalChannels,
  favoritesCount,
}: SidebarLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { signOut } = useAuth();
  const router = useRouter();

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determinar o nome do link "Todos" baseado no pathname
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const allItemsName = pathname.includes('/filmes') ? 'TODOS OS FILMES' :
                       pathname.includes('/series') ? 'TODAS AS SÉRIES' :
                       pathname.includes('/tv-ao-vivo') ? 'TODOS OS CANAIS' :
                       'TODOS OS CANAIS';

  const quickLinks = [
    { id: 'all', name: allItemsName, count: totalChannels, icon: HomeIcon },
    { id: 'favorites', name: 'FAVORITOS', count: favoritesCount, icon: HeartIcon },
    { id: 'history', name: 'HISTÓRICO', count: 0, icon: ClockIcon },
  ];

  return (
    <div className="flex h-screen bg-netflix-black">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-netflix-mediumGray bg-netflix-darkGray overflow-y-auto">
        {/* Logo */}
        <div className="p-4 border-b border-netflix-mediumGray">
          <h1 className="text-xl font-bold text-white">PlayCoreTV</h1>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-netflix-dimGray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisa em categorias"
              className="w-full rounded-lg bg-netflix-mediumGray py-2 pl-10 pr-4 text-sm text-white placeholder-netflix-dimGray focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="px-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive = selectedCategory === link.id;
            
            return (
              <button
                key={link.id}
                onClick={() => {
                  // Se for histórico, navegar para página separada
                  if (link.id === 'history') {
                    router.push('/dashboard/history');
                  } else {
                    onCategorySelect(link.id);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-netflix-red text-white'
                    : 'text-netflix-lightGray hover:bg-netflix-mediumGray hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{link.name}</span>
                </div>
                <span className="text-xs">{link.count}</span>
              </button>
            );
          })}
        </div>

        {/* Categories */}
        <div className="mt-4 px-2">
          {filteredCategories.map((category) => {
            const isActive = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-netflix-red text-white'
                    : 'text-netflix-lightGray hover:bg-netflix-mediumGray hover:text-white'
                }`}
              >
                <span className="truncate">{category.name}</span>
                {category.count && (
                  <span className="text-xs">{category.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="mt-auto border-t border-netflix-mediumGray p-4">
          <button
            onClick={() => signOut()}
            className="w-full rounded-lg bg-netflix-mediumGray px-4 py-2 text-sm text-white transition-colors hover:bg-netflix-dimGray"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
