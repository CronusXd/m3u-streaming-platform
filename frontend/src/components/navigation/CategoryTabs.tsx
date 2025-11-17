'use client';
import { 
  FilmIcon, 
  TvIcon, 
  SignalIcon,
} from '@heroicons/react/24/outline';

export type MainCategory = 'filmes' | 'series' | 'tv-ao-vivo';

interface CategoryTabsProps {
  activeTab: MainCategory;
  onTabChange: (tab: MainCategory) => void;
}

const tabs = [
  {
    id: 'filmes' as MainCategory,
    name: 'Filmes',
    icon: FilmIcon,
  },
  {
    id: 'series' as MainCategory,
    name: 'Séries',
    icon: TvIcon,
  },
  {
    id: 'tv-ao-vivo' as MainCategory,
    name: 'TV ao Vivo',
    icon: SignalIcon,
  },
];

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  return (
    <div className="border-b border-netflix-mediumGray bg-netflix-darkGray/50 backdrop-blur-sm">
      <div className="px-[4%]">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'text-white border-netflix-red'
                    : 'text-netflix-lightGray border-transparent hover:text-white hover:border-netflix-dimGray'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
