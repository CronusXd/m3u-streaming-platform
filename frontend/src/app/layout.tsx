import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { WatchHistoryProvider } from '@/contexts/WatchHistoryContext';
import QueryProvider from '@/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PlayCoreTV',
  description: 'Professional IPTV streaming platform with HLS support',
  keywords: ['m3u', 'streaming', 'hls', 'iptv', 'playlist'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Filtro global de erros de recursos opcionais */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suprimir erros de recursos opcionais (logos, legendas, etc)
              (function() {
                // Filtrar console.error
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  
                  // Lista de erros para ignorar
                  const ignoredErrors = [
                    'ERR_NAME_NOT_RESOLVED',
                    'ERR_ABORTED',
                    'net::ERR',
                    '404',
                    'Not Found',
                    '.ttf',
                    '.woff',
                    '.png',
                    '.jpg',
                    '.jpeg',
                    '.gif',
                    '.svg',
                    'logo',
                    'subtitle',
                    'font',
                    'Failed to load resource',
                    'cxtv.com.br',
                    '38861cb',
                    'localhost:3000',
                  ];
                  
                  // Verificar se é erro ignorável
                  const shouldIgnore = ignoredErrors.some(function(err) {
                    return message.includes(err);
                  });
                  
                  if (!shouldIgnore) {
                    originalError.apply(console, args);
                  }
                };
                
                // Filtrar console.warn
                const originalWarn = console.warn;
                console.warn = function(...args) {
                  const message = args.join(' ');
                  
                  const ignoredWarnings = [
                    'ERR_ABORTED',
                    '404',
                    '.ttf',
                    '.woff',
                    'Failed to load',
                  ];
                  
                  const shouldIgnore = ignoredWarnings.some(function(warn) {
                    return message.includes(warn);
                  });
                  
                  if (!shouldIgnore) {
                    originalWarn.apply(console, args);
                  }
                };
                
                // Suprimir erros de rede no window.onerror
                window.addEventListener('error', function(e) {
                  const message = e.message || '';
                  const filename = e.filename || '';
                  
                  const ignoredPatterns = [
                    '.ttf',
                    '.woff',
                    '.png',
                    '.jpg',
                    'logo',
                    'font',
                    '38861cb',
                  ];
                  
                  const shouldIgnore = ignoredPatterns.some(function(pattern) {
                    return message.includes(pattern) || filename.includes(pattern);
                  });
                  
                  if (shouldIgnore) {
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                  }
                }, true);
              })();
              
              // Observer para detectar quando botão "Continue" aparece
              (function() {
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) {
                        const buttons = node.querySelectorAll ? node.querySelectorAll('button, a, [role="button"]') : [];
                        buttons.forEach(function(btn) {
                          const text = btn.textContent || btn.innerText || '';
                          if (text.match(/continuar|continue|proceed|prosseguir/i)) {
                            setTimeout(function() { btn.click(); }, 100);
                          }
                        });
                      }
                    });
                  });
                });
                
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
                
                setTimeout(function() {
                  const buttons = document.querySelectorAll('button, a, [role="button"]');
                  buttons.forEach(function(btn) {
                    const text = btn.textContent || btn.innerText || '';
                    if (text.match(/continuar|continue|proceed|prosseguir/i)) {
                      btn.click();
                    }
                  });
                }, 500);
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <FavoritesProvider>
              <WatchHistoryProvider>
                {children}
              </WatchHistoryProvider>
            </FavoritesProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
