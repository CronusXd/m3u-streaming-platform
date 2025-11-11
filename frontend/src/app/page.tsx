import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900 dark:text-white">
          PlayCoreTV
        </h1>
        <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">
          Gerencie e reproduza suas playlists M3U com facilidade
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg border-2 border-blue-600 px-8 py-3 text-blue-600 font-semibold hover:bg-blue-50 transition-colors dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800"
          >
            Registrar
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 text-4xl">📺</div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">Player HLS</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Reproduza streams HLS diretamente no navegador
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 text-4xl">⭐</div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">Favoritos</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Salve seus canais favoritos para acesso rápido
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">Busca</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Encontre canais facilmente com busca em tempo real
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
