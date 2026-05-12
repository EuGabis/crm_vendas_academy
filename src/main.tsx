import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import App from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

// ============================================================================
// Network diagnostic — roda 1x no boot pra identificar onde tá travando
// ============================================================================
(async () => {
  const supaUrl = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supaUrl || !key) return;

  console.log('%c[Diagnóstico] iniciando...', 'color: #a78bfa; font-weight: bold');

  // Teste 1: fetch sem headers (deve dar Kong Error rapidinho)
  const t1Start = performance.now();
  try {
    const r = await fetch(`${supaUrl}/rest/v1/`, { signal: AbortSignal.timeout(10000) });
    console.log(
      `%c[Diagnóstico] 1/3 fetch sem headers: ${r.status} em ${Math.round(performance.now() - t1Start)}ms`,
      'color: #10b981',
    );
  } catch (e) {
    console.error(
      `[Diagnóstico] 1/3 fetch sem headers FALHOU em ${Math.round(performance.now() - t1Start)}ms:`,
      e,
    );
  }

  // Teste 2: fetch com apikey (deve retornar [] rapidinho)
  const t2Start = performance.now();
  try {
    const r = await fetch(`${supaUrl}/rest/v1/sellers?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    console.log(
      `%c[Diagnóstico] 2/3 fetch com apikey: ${r.status} em ${Math.round(performance.now() - t2Start)}ms`,
      'color: #10b981',
    );
  } catch (e) {
    console.error(
      `[Diagnóstico] 2/3 fetch com apikey FALHOU em ${Math.round(performance.now() - t2Start)}ms:`,
      e,
    );
  }

  // Teste 3: auth health
  const t3Start = performance.now();
  try {
    const r = await fetch(`${supaUrl}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10000),
    });
    console.log(
      `%c[Diagnóstico] 3/3 auth/health: ${r.status} em ${Math.round(performance.now() - t3Start)}ms`,
      'color: #10b981',
    );
  } catch (e) {
    console.error(
      `[Diagnóstico] 3/3 auth/health FALHOU em ${Math.round(performance.now() - t3Start)}ms:`,
      e,
    );
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30, // 30 min de cache
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Não retry — safeFetch já trata timeout/erro e retorna []
      retry: false,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
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
