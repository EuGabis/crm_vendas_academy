# Mapa de arquivos

Onde está cada peça do sistema — útil pra debugar rápido ou onboarding.

---

## Frontend — páginas (`src/pages/`)

### Raiz de Vendas
| Rota | Arquivo | Prop |
|---|---|---|
| `/vendas/dashboard-times` | `DashboardTimes.tsx` | KPIs consolidados |
| `/vendas/funil` | `FunilVendas.tsx` | Funil por estágio |
| `/vendas/metas-times` | `MetasTimes.tsx` | Metas mensais |
| `/vendas/ranking` | `Ranking.tsx` | Ranking por receita/pontos |
| `/vendas/bonus` | `Bonus.tsx` | Bônus por faixa |
| `/vendas/avaliacao-closers` | `AvaliacaoClosers.tsx` | Métricas de closer |
| `/marketing/trafego` | `Marketing.tsx` | CPL/CPA |
| `/receita` | `Receita.tsx` | Card único |
| `/login` | `Login.tsx` | Login |

### Financeiro
| Rota | Arquivo |
|---|---|
| `/financeiro` | `financeiro/Dashboard.tsx` |
| `/financeiro/vendas` | `financeiro/Vendas.tsx` |
| `/financeiro/vendas/:id` | `financeiro/VendaDetalhe.tsx` |
| `/financeiro/assinaturas` | `financeiro/Assinaturas.tsx` |
| `/financeiro/assinaturas/:id` | `financeiro/AssinaturaDetalhe.tsx` |
| `/financeiro/faturas/:id` | `financeiro/FaturaDetalhe.tsx` |
| `/financeiro/contatos` | `financeiro/Contatos.tsx` |

### CS
| Rota | Arquivo |
|---|---|
| `/cs/overview` | `cs/CSDashboard.tsx` |
| `/cs/alunos` | `cs/Alunos.tsx` |
| `/cs/alunos/:id` | `cs/AlunoDetalhe.tsx` |
| `/cs/tickets` | `cs/Tickets.tsx` |
| `/cs/renovacoes` | `cs/Renovacoes.tsx` |
| `/cs/nps` | `cs/NPS.tsx` |

### Workspace
| Rota | Arquivo |
|---|---|
| `/workspace` | `workspace/MeuDia.tsx` |
| `/workspace/tarefas` | `workspace/Tarefas.tsx` |
| `/workspace/materiais` | `workspace/Materiais.tsx` |

### Admin
| Rota | Arquivo |
|---|---|
| `/admin/vendedores` | `admin/AdminVendedores.tsx` |
| `/admin/cursos` | `admin/AdminCursos.tsx` |
| `/admin/vendas` | `admin/AdminVendas.tsx` |
| `/admin/leads` | `admin/AdminLeads.tsx` |
| `/admin/metas` | `admin/AdminMetas.tsx` |
| `/admin/trafego` | `admin/AdminTrafego.tsx` |
| `/admin/usuarios` | `admin/AdminUsuarios.tsx` |

### Configurações
| Rota | Arquivo |
|---|---|
| `/configuracoes/perfil` | `configuracoes/Perfil.tsx` |
| `/configuracoes/seguranca` | `configuracoes/Seguranca.tsx` |
| `/configuracoes/aparencia` | `configuracoes/Aparencia.tsx` |
| `/configuracoes/notificacoes` | `configuracoes/Notificacoes.tsx` |
| `/configuracoes/empresa` | `configuracoes/Empresa.tsx` |
| `/configuracoes/dados` | `configuracoes/Dados.tsx` |
| `/configuracoes/sobre` | `configuracoes/Sobre.tsx` |

---

## Frontend — hooks (`src/hooks/`)

| Arquivo | Cobre |
|---|---|
| `useSupabaseData.ts` | sellers, courses, leads, sales, monthly_goals, traffic_spend |
| `useProfiles.ts` | profiles (users + roles) |
| `useSettings.ts` | app_settings, user_settings, changePassword, changeEmail |
| `useCS.ts` | students, enrollments, cs_tickets, cs_notes, nps_responses, onboarding_steps |
| `useWorkspace.ts` | workspace_tasks, workspace_materials |
| `useGuru.ts` | transactions, subscriptions, contacts, invoices (todas do módulo Financeiro) |
| `useDebouncedValue.ts` | helper genérico pra debounce |

---

## Frontend — libs (`src/lib/`)

| Arquivo | O que faz |
|---|---|
| `supabase.ts` | Cliente supabase-js + `restGet/Insert/Update/Delete` (REST direto, sem preflight) |
| `auth.tsx` | AuthProvider + useAuth (context React) + loadProfile |
| `guru.ts` | `fetchTransactions/Subscription/Contact/Invoice`, `fmtGuruDate`, `detectContactSearchKind` |
| `utils.ts` | `cn` (Tailwind merge), `formatCurrency`, `formatCompactCurrency`, `formatInt` |

---

## Frontend — types (`src/types/`)

| Arquivo | O que tem |
|---|---|
| `domain.ts` | `Seller`, `Course`, `Lead`, `Sale`, `MonthlyGoal`, `TrafficSpend`, `Student`, `Enrollment`, `CSTicket`, ... |
| `guru.ts` | `GuruTransaction`, `GuruSubscription`, `GuruContact`, `GuruInvoice`, `GuruAffiliation`, `GuruProduct`, `GuruPayment` + **helpers** (`txValue`, `txStatus`, `txDate`, `subValue`, `subStatus`, `normalizeSubStatus`, etc) + constantes (`STATUS_LABELS`, `STATUS_VARIANT`, `SUB_STATUS_LABELS`, `SUB_STATUS_VARIANT`) |

---

## Frontend — layout (`src/components/layout/`)

| Arquivo | Responsabilidade |
|---|---|
| `AppLayout.tsx` | Layout base autenticado — sidebar esquerda + header topo + Outlet |
| `ProtectedRoute.tsx` | Guard de rota — checa auth + role (`requireAdmin`) |
| `ConfiguracoesLayout.tsx` | Sub-layout com nav lateral secundária pras subrotas de config |
| `Sidebar.tsx` | Menu lateral (links, ícones, collapse) |
| `Header.tsx` | Header por página — título, subtitle, filtros globais |

---

## Frontend — UI (`src/components/ui/`)

Componentes shadcn/ui adaptados. Todos exportam named. Principais:

- `button.tsx` — variants: default, outline, ghost, destructive
- `card.tsx` — card wrapper
- `input.tsx`, `label.tsx`, `select.tsx`
- `dialog.tsx` — modal
- `tabs.tsx`, `tabs-content.tsx`
- `badge.tsx` — variants: success, warning, danger, muted, info
- `avatar.tsx`
- `progress.tsx`
- `separator.tsx`
- `scroll-area.tsx`
- `tooltip.tsx`, `dropdown-menu.tsx`, `popover.tsx`
- `kpi-card.tsx` — card específico pra KPIs do dashboard
- `empty-state.tsx` — `<LoadingState>`, `<ErrorState>`, `<EmptyState>`

---

## Backend — serverless (`api/`)

| Arquivo | Método | Rota | Descrição |
|---|---|---|---|
| `admin/create-user.ts` | POST | `/api/admin/create-user` | Cria user (admin only) |
| `guru/client.ts` | — | — | Módulo compartilhado (types + helpers) — NÃO é function |
| `guru/contacts.ts` | GET | `/api/guru/contacts` | Lista contatos com busca inteligente |
| `guru/transactions/index.ts` | GET | `/api/guru/transactions` | Lista transações |
| `guru/transactions/[id].ts` | GET | `/api/guru/transactions/:id` | Detalhe de transação |
| `guru/subscriptions/index.ts` | GET | `/api/guru/subscriptions` | Lista assinaturas |
| `guru/subscriptions/[id].ts` | GET | `/api/guru/subscriptions/:id` | Detalhe assinatura |
| `guru/subscriptions/[id]/invoices.ts` | GET | `/api/guru/subscriptions/:id/invoices` | Faturas da assinatura |
| `guru/invoices/[id].ts` | GET | `/api/guru/invoices/:id?sub=...` | Detalhe fatura (com fallback via lista) |

---

## Banco (`supabase/migrations/`)

| Arquivo | O que faz |
|---|---|
| `0001_init.sql` | Tabelas base + enums + RLS mínimo + view v_monthly_revenue |
| `0002_rls_admin.sql` | Funções `is_admin/auth_seller_id/auth_user_role` + policies por role |
| `0003_settings.sql` | `app_settings` + `user_settings` |
| `0004_cs.sql` | `students`, `enrollments`, `cs_tickets`, `cs_notes`, `nps_responses`, `onboarding_steps` |
| `0005_workspace.sql` | `workspace_tasks`, `workspace_materials` |
| `0006_rls_seller_scope.sql` | Escopo por vendedor + `is_admin_or_manager()` |
| `0007_fix_leads.sql` (removido) | Foi superseded pelo 0008 depois revertido |
| `0008_rename_juliana.sql` | Rename juliana_* — **NÃO RODAR** |
| `0009_fix_juliana_functions.sql` | Reapontou funções — **NÃO RODAR** |
| `0010_diagnose_and_reload.sql` | Script de diagnóstico do PostgREST |
| `0011_revert_juliana.sql` | Reverte 0008+0009 se estiver com estado juliana_ |
| `0012_sales_commission_points.sql` | Adiciona coluna `commission_points` em sales |

---

## Configuração

| Arquivo | O que configura |
|---|---|
| `.env.example` | Template das env vars (público) |
| `.env.local` | Valores reais (gitignored — nunca commitar) |
| `.gitignore` | Bloqueia `.env`, `.env.local`, `node_modules`, `dist`, `.vercel` e caches locais |
| `vercel.json` | SPA rewrite exceto `/api/*` |
| `vite.config.ts` | Alias `@/` → `src/`, plugin React, build config |
| `tailwind.config.js` | Cores custom, animações, fonts |
| `tsconfig.json` | TS strict mode, target ES2020 |
| `postcss.config.js` | Tailwind + autoprefixer |
| `eslint.config.js` | React hooks + refresh rules |
| `package.json` | Deps + scripts (dev, build, test, lint) |

---

## Docs (`docs/`)

Todos os arquivos desta documentação.

---

## Scratchpad (não commitado)

Scripts locais usados durante desenvolvimento (import de planilha, testes ad-hoc) ficam fora do repo.

---

## Convenções que valem lembrar

- **Named exports** em todas as páginas: `export function NomeDaPagina()`. O `App.tsx` faz o mapping pra default no `lazy()`.
- **Extensão `.js` nos imports** dentro de `api/*.ts`: `from './client.js'` (Vercel Node 20 exige).
- **Hooks pattern**: `useX` (leitura), `useCreateX/useUpdateX/useDeleteX` (mutations). Todas retornam objetos React Query com `data`, `isLoading`, `error`.
- **Formulários**: sem lib externa. `useState` + validação simples. Toast (`sonner`) pra feedback.
- **Toasts**: `import { toast } from 'sonner'` → `toast.success('ok')`, `toast.error('...')`.
