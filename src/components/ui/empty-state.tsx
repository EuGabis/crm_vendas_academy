import { Loader2, Inbox, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from './card';
import { Button } from './button';

export function LoadingState({ label = 'Carregando dados...' }: { label?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mb-3" />
      <p className="text-sm text-zinc-500">{label}</p>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
      <p className="text-sm font-medium text-zinc-200">Falha ao carregar dados</p>
      <p className="text-xs text-zinc-500 mt-1 max-w-md">{message}</p>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900/80 ring-1 ring-zinc-800 mb-4">
        <Icon className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-zinc-500 mt-1.5 max-w-md">{description}</p>
      {actionLabel && actionTo && (
        <Button asChild className="mt-5">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </Card>
  );
}
