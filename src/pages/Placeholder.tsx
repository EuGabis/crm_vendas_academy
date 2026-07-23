import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <Header title={title} subtitle={description} />
      <div className="p-8">
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="h-10 w-10 text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300">Página em construção</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-md">
            Esta área será disponibilizada em uma próxima sprint. As páginas de Vendas e
            Marketing já estão funcionais.
          </p>
        </Card>
      </div>
    </>
  );
}
