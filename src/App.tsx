import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { FunilVendas } from '@/pages/FunilVendas';
import { DashboardTimes } from '@/pages/DashboardTimes';
import { MetasTimes } from '@/pages/MetasTimes';
import { Ranking } from '@/pages/Ranking';
import { Bonus } from '@/pages/Bonus';
import { AvaliacaoClosers } from '@/pages/AvaliacaoClosers';
import { Marketing } from '@/pages/Marketing';
import { Receita } from '@/pages/Receita';
import { Placeholder } from '@/pages/Placeholder';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/vendas/funil" replace />} />
        <Route path="/receita" element={<Receita />} />
        <Route path="/vendas/funil" element={<FunilVendas />} />
        <Route path="/vendas/dashboard-times" element={<DashboardTimes />} />
        <Route path="/vendas/metas-times" element={<MetasTimes />} />
        <Route path="/vendas/ranking" element={<Ranking />} />
        <Route path="/vendas/bonus" element={<Bonus />} />
        <Route path="/vendas/avaliacao-closers" element={<AvaliacaoClosers />} />
        <Route path="/marketing/trafego" element={<Marketing />} />
        <Route
          path="/cs/overview"
          element={<Placeholder title="Customer Success" description="Em construção" />}
        />
        <Route
          path="/configuracoes/geral"
          element={<Placeholder title="Configurações" description="Em construção" />}
        />
        <Route
          path="/workspace"
          element={<Placeholder title="Workspace" description="Em construção" />}
        />
        <Route path="*" element={<Navigate to="/vendas/funil" replace />} />
      </Route>
    </Routes>
  );
}
