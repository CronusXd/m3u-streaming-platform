'use client';

import { useFavorites } from '@/contexts/FavoritesContext';

export default function FavoritesDebug() {
  const { favorites, loading } = useFavorites();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-black/90 p-4 text-xs text-white max-w-sm">
      <h3 className="font-bold mb-2">Favorites Debug</h3>
      <p>Loading: {loading ? 'Yes' : 'No'}</p>
      <p>Count: {favorites.length}</p>
      {favorites.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto">
          <p className="font-semibold">IDs:</p>
          {favorites.map(fav => (
            <p key={fav.id} className="truncate">
              {fav.channel_id.substring(0, 8)}... ({fav.content_type})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
