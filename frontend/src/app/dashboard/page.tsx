'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Bem-vindo de volta!
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card: Todos os Canais */}
        <Link
          href="/dashboard/channels"
          className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow dark:bg-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Todos os Canais
            </h2>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Navegue por todos os canais disponíveis
          </p>
        </Link>

        {/* Card: Favoritos */}
        <Link
          href="/dashboard/favorites"
          className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow dark:bg-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Meus Favoritos
            </h2>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
              <svg className="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Acesso rápido aos seus canais favoritos
          </p>
        </Link>

        {/* Card: Buscar */}
        <Link
          href="/dashboard/search"
          className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow dark:bg-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Buscar Canais
            </h2>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Encontre canais por nome, grupo ou idioma
          </p>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Bem-vindo!
        </h2>
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-400">
            👋 Olá, <span className="font-medium text-gray-900 dark:text-white">{user?.email}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            📺 Explore todos os canais disponíveis ou adicione seus favoritos para acesso rápido
          </p>
          <Link
            href="/dashboard/channels"
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver Todos os Canais
          </Link>
        </div>
      </div>
    </div>
  );
}
