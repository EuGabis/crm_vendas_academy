import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import App from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min — evita refetch constante
      gcTime: 1000 * 60 * 30, // 30 min de cache
      refetchOnWindowFocus: false,
      refetchOnMount: false, // só refetch se stale
      retry: (failureCount, error) => {
        // Não retry em 401/403 (auth/permissão)
        const msg = (error as Error).message;
        if (msg.includes('401') || msg.includes('403')) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      networkMode: 'always', // tenta mesmo offline (mostra cached)
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            toastOptions={{
              classNames: {
                toast: 'border border-zinc-800 bg-zinc-900/95 backdrop-blur',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
