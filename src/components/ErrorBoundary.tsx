import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Captura erros de render em qualquer ponto da árvore e mostra um fallback
 * em vez de derrubar o app pra tela branca.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] erro não tratado:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Algo deu errado</h1>
          <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
            A tela encontrou um erro inesperado. Você pode tentar novamente ou
            recarregar a página.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 w-full overflow-auto rounded-lg bg-zinc-950/80 p-3 text-left text-xs text-red-300/90">
              {error.message}
            </pre>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              <RotateCcw className="h-4 w-4" />
              Tentar de novo
            </Button>
            <Button onClick={this.handleReload}>Recarregar página</Button>
          </div>
        </div>
      </div>
    );
  }
}
