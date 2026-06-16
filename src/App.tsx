import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ConfiguracoesLayout } from '@/components/layout/ConfiguracoesLayout';
import { Login } from '@/pages/Login';

// Páginas carregadas sob demanda (code-splitting por rota). Os componentes são
// named exports, então mapeamos para `default` no import dinâmico.
const FunilVendas = lazy(() =>
  import('@/pages/FunilVendas').then((m) => ({ default: m.FunilVendas })),
);
const DashboardTimes = lazy(() =>
  import('@/pages/DashboardTimes').then((m) => ({ default: m.DashboardTimes })),
);
const MetasTimes = lazy(() =>
  import('@/pages/MetasTimes').then((m) => ({ default: m.MetasTimes })),
);
const Ranking = lazy(() => import('@/pages/Ranking').then((m) => ({ default: m.Ranking })));
const Bonus = lazy(() => import('@/pages/Bonus').then((m) => ({ default: m.Bonus })));
const AvaliacaoClosers = lazy(() =>
  import('@/pages/AvaliacaoClosers').then((m) => ({ default: m.AvaliacaoClosers })),
);
const Marketing = lazy(() =>
  import('@/pages/Marketing').then((m) => ({ default: m.Marketing })),
);
const Receita = lazy(() => import('@/pages/Receita').then((m) => ({ default: m.Receita })));
const AdminVendedores = lazy(() =>
  import('@/pages/admin/AdminVendedores').then((m) => ({ default: m.AdminVendedores })),
);
const AdminCursos = lazy(() =>
  import('@/pages/admin/AdminCursos').then((m) => ({ default: m.AdminCursos })),
);
const AdminVendas = lazy(() =>
  import('@/pages/admin/AdminVendas').then((m) => ({ default: m.AdminVendas })),
);
const AdminLeads = lazy(() =>
  import('@/pages/admin/AdminLeads').then((m) => ({ default: m.AdminLeads })),
);
const AdminMetas = lazy(() =>
  import('@/pages/admin/AdminMetas').then((m) => ({ default: m.AdminMetas })),
);
const AdminTrafego = lazy(() =>
  import('@/pages/admin/AdminTrafego').then((m) => ({ default: m.AdminTrafego })),
);
const AdminUsuarios = lazy(() =>
  import('@/pages/admin/AdminUsuarios').then((m) => ({ default: m.AdminUsuarios })),
);
const CSDashboardPage = lazy(() =>
  import('@/pages/cs/CSDashboard').then((m) => ({ default: m.CSDashboardPage })),
);
const CSAlunos = lazy(() =>
  import('@/pages/cs/Alunos').then((m) => ({ default: m.CSAlunos })),
);
const CSAlunoDetalhe = lazy(() =>
  import('@/pages/cs/AlunoDetalhe').then((m) => ({ default: m.CSAlunoDetalhe })),
);
const CSTicketsPage = lazy(() =>
  import('@/pages/cs/Tickets').then((m) => ({ default: m.CSTicketsPage })),
);
const CSRenovacoesPage = lazy(() =>
  import('@/pages/cs/Renovacoes').then((m) => ({ default: m.CSRenovacoesPage })),
);
const CSNPSPage = lazy(() => import('@/pages/cs/NPS').then((m) => ({ default: m.CSNPSPage })));
const WorkspaceMeuDia = lazy(() =>
  import('@/pages/workspace/MeuDia').then((m) => ({ default: m.WorkspaceMeuDia })),
);
const WorkspaceTarefas = lazy(() =>
  import('@/pages/workspace/Tarefas').then((m) => ({ default: m.WorkspaceTarefas })),
);
const WorkspaceMateriais = lazy(() =>
  import('@/pages/workspace/Materiais').then((m) => ({ default: m.WorkspaceMateriais })),
);
const ConfigPerfil = lazy(() =>
  import('@/pages/configuracoes/Perfil').then((m) => ({ default: m.ConfigPerfil })),
);
const ConfigSeguranca = lazy(() =>
  import('@/pages/configuracoes/Seguranca').then((m) => ({ default: m.ConfigSeguranca })),
);
const ConfigAparencia = lazy(() =>
  import('@/pages/configuracoes/Aparencia').then((m) => ({ default: m.ConfigAparencia })),
);
const ConfigNotificacoes = lazy(() =>
  import('@/pages/configuracoes/Notificacoes').then((m) => ({ default: m.ConfigNotificacoes })),
);
const ConfigEmpresa = lazy(() =>
  import('@/pages/configuracoes/Empresa').then((m) => ({ default: m.ConfigEmpresa })),
);
const ConfigDados = lazy(() =>
  import('@/pages/configuracoes/Dados').then((m) => ({ default: m.ConfigDados })),
);
const ConfigSobre = lazy(() =>
  import('@/pages/configuracoes/Sobre').then((m) => ({ default: m.ConfigSobre })),
);
const FinanceiroDashboard = lazy(() =>
  import('@/pages/financeiro/Dashboard').then((m) => ({ default: m.FinanceiroDashboard })),
);
const FinanceiroVendas = lazy(() =>
  import('@/pages/financeiro/Vendas').then((m) => ({ default: m.FinanceiroVendas })),
);
const FinanceiroAssinaturas = lazy(() =>
  import('@/pages/financeiro/Assinaturas').then((m) => ({ default: m.FinanceiroAssinaturas })),
);
const FinanceiroContatos = lazy(() =>
  import('@/pages/financeiro/Contatos').then((m) => ({ default: m.FinanceiroContatos })),
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/vendas/dashboard-times" replace />} />
        <Route path="/receita" element={<Receita />} />
        <Route path="/vendas/funil" element={<FunilVendas />} />
        <Route path="/vendas/dashboard-times" element={<DashboardTimes />} />
        <Route path="/vendas/metas-times" element={<MetasTimes />} />
        <Route path="/vendas/ranking" element={<Ranking />} />
        <Route path="/vendas/bonus" element={<Bonus />} />
        <Route path="/vendas/avaliacao-closers" element={<AvaliacaoClosers />} />
        <Route path="/marketing/trafego" element={<Marketing />} />
        <Route path="/cs/overview" element={<CSDashboardPage />} />
        <Route path="/cs/alunos" element={<CSAlunos />} />
        <Route path="/cs/alunos/:id" element={<CSAlunoDetalhe />} />
        <Route path="/cs/tickets" element={<CSTicketsPage />} />
        <Route path="/cs/renovacoes" element={<CSRenovacoesPage />} />
        <Route path="/cs/nps" element={<CSNPSPage />} />
        <Route path="/workspace" element={<WorkspaceMeuDia />} />
        <Route path="/workspace/tarefas" element={<WorkspaceTarefas />} />
        <Route path="/workspace/materiais" element={<WorkspaceMateriais />} />

        <Route
          path="/financeiro"
          element={
            <ProtectedRoute requireAdmin>
              <FinanceiroDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/vendas"
          element={
            <ProtectedRoute requireAdmin>
              <FinanceiroVendas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/assinaturas"
          element={
            <ProtectedRoute requireAdmin>
              <FinanceiroAssinaturas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/contatos"
          element={
            <ProtectedRoute requireAdmin>
              <FinanceiroContatos />
            </ProtectedRoute>
          }
        />

        {/* Configurações (sub-rotas com layout próprio) */}
        <Route path="/configuracoes" element={<ConfiguracoesLayout />}>
          <Route index element={<Navigate to="/configuracoes/perfil" replace />} />
          <Route path="perfil" element={<ConfigPerfil />} />
          <Route path="seguranca" element={<ConfigSeguranca />} />
          <Route path="aparencia" element={<ConfigAparencia />} />
          <Route path="notificacoes" element={<ConfigNotificacoes />} />
          <Route
            path="empresa"
            element={
              <ProtectedRoute requireAdmin>
                <ConfigEmpresa />
              </ProtectedRoute>
            }
          />
          <Route
            path="dados"
            element={
              <ProtectedRoute requireAdmin>
                <ConfigDados />
              </ProtectedRoute>
            }
          />
          <Route path="sobre" element={<ConfigSobre />} />
        </Route>

        {/* Admin */}
        <Route
          path="/admin/vendedores"
          element={
            <ProtectedRoute requireAdmin>
              <AdminVendedores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cursos"
          element={
            <ProtectedRoute requireAdmin>
              <AdminCursos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendas"
          element={
            <ProtectedRoute requireAdmin>
              <AdminVendas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leads"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/metas"
          element={
            <ProtectedRoute requireAdmin>
              <AdminMetas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trafego"
          element={
            <ProtectedRoute requireAdmin>
              <AdminTrafego />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute requireAdmin>
              <AdminUsuarios />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/vendas/dashboard-times" replace />} />
      </Route>
    </Routes>
  );
}
