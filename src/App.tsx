import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ConfiguracoesLayout } from '@/components/layout/ConfiguracoesLayout';
import { Login } from '@/pages/Login';
import { FunilVendas } from '@/pages/FunilVendas';
import { DashboardTimes } from '@/pages/DashboardTimes';
import { MetasTimes } from '@/pages/MetasTimes';
import { Ranking } from '@/pages/Ranking';
import { Bonus } from '@/pages/Bonus';
import { AvaliacaoClosers } from '@/pages/AvaliacaoClosers';
import { Marketing } from '@/pages/Marketing';
import { Receita } from '@/pages/Receita';
import { Placeholder } from '@/pages/Placeholder';
import { AdminVendedores } from '@/pages/admin/AdminVendedores';
import { AdminCursos } from '@/pages/admin/AdminCursos';
import { AdminVendas } from '@/pages/admin/AdminVendas';
import { AdminLeads } from '@/pages/admin/AdminLeads';
import { AdminMetas } from '@/pages/admin/AdminMetas';
import { AdminTrafego } from '@/pages/admin/AdminTrafego';
import { AdminUsuarios } from '@/pages/admin/AdminUsuarios';
import { CSDashboardPage } from '@/pages/cs/CSDashboard';
import { CSAlunos } from '@/pages/cs/Alunos';
import { CSAlunoDetalhe } from '@/pages/cs/AlunoDetalhe';
import { CSTicketsPage } from '@/pages/cs/Tickets';
import { CSRenovacoesPage } from '@/pages/cs/Renovacoes';
import { CSNPSPage } from '@/pages/cs/NPS';
import { ConfigPerfil } from '@/pages/configuracoes/Perfil';
import { ConfigSeguranca } from '@/pages/configuracoes/Seguranca';
import { ConfigAparencia } from '@/pages/configuracoes/Aparencia';
import { ConfigNotificacoes } from '@/pages/configuracoes/Notificacoes';
import { ConfigEmpresa } from '@/pages/configuracoes/Empresa';
import { ConfigDados } from '@/pages/configuracoes/Dados';
import { ConfigSobre } from '@/pages/configuracoes/Sobre';

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
        <Route
          path="/workspace"
          element={<Placeholder title="Workspace" description="Em construção" />}
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
