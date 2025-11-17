'use client';

import { useState } from 'react';
import { useTMDBMetadata } from '@/hooks/useTMDBMetadata';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function TesteTMDBPage() {
  const [nomeFilme, setNomeFilme] = useState('Matrix (1999)');
  const [nomeSerie, setNomeSerie] = useState('Breaking Bad (2008)');
  const [testarFilme, setTestarFilme] = useState(false);
  const [testarSerie, setTestarSerie] = useState(false);

  const filmeMetadata = useTMDBMetadata(
    testarFilme ? nomeFilme : '',
    'filme'
  );

  const serieMetadata = useTMDBMetadata(
    testarSerie ? nomeSerie : '',
    'serie'
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧪 Teste TMDB em Tempo Real</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Teste de Filme */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">🎬 Teste de Filme</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Nome do Filme (com ano)
              </label>
              <input
                type="text"
                value={nomeFilme}
                onChange={(e) => setNomeFilme(e.target.value)}
                className="w-full bg-gray-700 rounded px-4 py-2 text-white"
                placeholder="Ex: Matrix (1999)"
              />
            </div>

            <button
              onClick={() => setTestarFilme(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold transition"
            >
              Buscar Metadados
            </button>

            {testarFilme && (
              <div className="mt-6">
                {filmeMetadata.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin" size={48} />
                  </div>
                ) : filmeMetadata.error ? (
                  <div className="text-red-400 text-center py-12">
                    ❌ {filmeMetadata.error}
                  </div>
                ) : filmeMetadata.metadata ? (
                  <div>
                    {/* Poster */}
                    {filmeMetadata.posterUrl && (
                      <div className="relative aspect-[2/3] mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={filmeMetadata.posterUrl}
                          alt={filmeMetadata.metadata.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}

                    {/* Informações */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Título:</span>
                        <p className="font-semibold">{filmeMetadata.metadata.title}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Nota:</span>
                        <p className="font-semibold">
                          ⭐ {filmeMetadata.metadata.rating.toFixed(1)}/10
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Lançamento:</span>
                        <p className="font-semibold">
                          {new Date(filmeMetadata.metadata.releaseDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {filmeMetadata.metadata.runtime && (
                        <div>
                          <span className="text-gray-400">Duração:</span>
                          <p className="font-semibold">
                            {filmeMetadata.metadata.runtime} minutos
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="text-gray-400">Gêneros:</span>
                        <p className="font-semibold">
                          {filmeMetadata.metadata.genres.join(', ')}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Sinopse:</span>
                        <p className="text-sm text-gray-300 mt-1">
                          {filmeMetadata.metadata.overview}
                        </p>
                      </div>

                      {filmeMetadata.metadata.trailerKey && (
                        <div>
                          <span className="text-gray-400">Trailer:</span>
                          <a
                            href={`https://www.youtube.com/watch?v=${filmeMetadata.metadata.trailerKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-1 text-blue-400 hover:text-blue-300"
                          >
                            🎬 Assistir no YouTube
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-12">
                    Nenhum resultado encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Teste de Série */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">📺 Teste de Série</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Nome da Série (com ano)
              </label>
              <input
                type="text"
                value={nomeSerie}
                onChange={(e) => setNomeSerie(e.target.value)}
                className="w-full bg-gray-700 rounded px-4 py-2 text-white"
                placeholder="Ex: Breaking Bad (2008)"
              />
            </div>

            <button
              onClick={() => setTestarSerie(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold transition"
            >
              Buscar Metadados
            </button>

            {testarSerie && (
              <div className="mt-6">
                {serieMetadata.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin" size={48} />
                  </div>
                ) : serieMetadata.error ? (
                  <div className="text-red-400 text-center py-12">
                    ❌ {serieMetadata.error}
                  </div>
                ) : serieMetadata.metadata ? (
                  <div>
                    {/* Poster */}
                    {serieMetadata.posterUrl && (
                      <div className="relative aspect-[2/3] mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={serieMetadata.posterUrl}
                          alt={serieMetadata.metadata.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}

                    {/* Informações */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Título:</span>
                        <p className="font-semibold">{serieMetadata.metadata.title}</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Nota:</span>
                        <p className="font-semibold">
                          ⭐ {serieMetadata.metadata.rating.toFixed(1)}/10
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Estreia:</span>
                        <p className="font-semibold">
                          {new Date(serieMetadata.metadata.releaseDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Gêneros:</span>
                        <p className="font-semibold">
                          {serieMetadata.metadata.genres.join(', ')}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Sinopse:</span>
                        <p className="text-sm text-gray-300 mt-1">
                          {serieMetadata.metadata.overview}
                        </p>
                      </div>

                      {serieMetadata.metadata.trailerKey && (
                        <div>
                          <span className="text-gray-400">Trailer:</span>
                          <a
                            href={`https://www.youtube.com/watch?v=${serieMetadata.metadata.trailerKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-1 text-purple-400 hover:text-purple-300"
                          >
                            🎬 Assistir no YouTube
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-12">
                    Nenhum resultado encontrado
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Exemplos */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">💡 Exemplos para Testar</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-blue-400">Filmes:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Matrix (1999)</li>
                <li>• Inception (2010)</li>
                <li>• Interstellar (2014)</li>
                <li>• The Dark Knight (2008)</li>
                <li>• Pulp Fiction (1994)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-purple-400">Séries:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Breaking Bad (2008)</li>
                <li>• Game of Thrones (2011)</li>
                <li>• Stranger Things (2016)</li>
                <li>• The Office (2005)</li>
                <li>• Friends (1994)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Informações */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">ℹ️ Como Funciona</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✅ Busca automática no TMDB quando você clica em "Buscar"</li>
            <li>✅ Cache em memória evita requisições duplicadas</li>
            <li>✅ Extração automática do ano do nome (ex: "Filme (2023)")</li>
            <li>✅ Metadados em português (pt-BR)</li>
            <li>✅ Posters em alta qualidade (500px)</li>
            <li>✅ Trailers do YouTube quando disponíveis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
