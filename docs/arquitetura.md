# Arquitetura

## Stack completa

### Frontend

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | React 18 | Padrão da indústria, hooks maduros |
| Build | Vite 6 | Dev server rápido, HMR instantâneo |
| Linguagem | TypeScript 5.7 | Type safety |
| Estilos | Tailwind CSS 3.4 + shadcn/ui | Utility-first + componentes acessíveis |
| Roteamento | React Router 7 | Padrão SPA |
| Server state | TanStack Query 5 | Cache, invalidação, retry, background refetch |
| Client state | Zustand 5 | Store leve pra sessão/UI |
| Toasts | Sonner | Notificações discretas |
| Gráficos | Recharts | Composição declarativa |
| Ícones | Lucide React | Tree-shakeable, consistentes |

### Backend

| Camada | Tecnologia | Por quê |
|---|---|---|
| Serverless | Vercel Functions (Node 20) | Zero infra, escala automática |
| DB | PostgreSQL 15 via Supabase self-hosted (Cloudfy) | RLS nativo, REST via PostgREST |
| Auth | Supabase Auth (JWT) | Integrado ao PostgREST via RLS |
| API externa | DigitalManager Guru v2 | Vendas/assinaturas de infoprodutos |

### Infra

- **GitHub**: `LitoGroup/sistem_ju` (repo público, deploy contínuo)
- **Vercel**: plano Hobby — 12 serverless functions max, 10s timeout, sem `maxDuration` avançado
- **Supabase**: self-hosted em `forgottenperch-supabase.cloudfy.live`

---

## Camadas do sistema

```
┌──────────────────────────────────────────────┐
│  Browser (React SPA)                         │
│  ├─ Componentes UI (shadcn/ui + Tailwind)   │
│  ├─ Hooks (React Query)                     │
│  ├─ Lib (supabase.ts, guru.ts, utils)       │
│  └─ Store (Zustand — apenas sessão)         │
└──────┬────────────────────────┬──────────────┘
       │                        │
       │ REST direto            │ fetch /api/*
       │ (Supabase)             │ (nossas serverless)
       ▼                        ▼
┌────────────────┐    ┌──────────────────────┐
│ Supabase       │    │ Vercel Functions     │
│ PostgREST      │    │ ├─ api/guru/*        │
│ + Auth         │    │ └─ api/admin/*       │
│ (self-hosted)  │    └───────────┬──────────┘
└───┬────────────┘                │
    │                             │ token server-side
    │                             ▼
┌───▼──────────────┐    ┌──────────────────┐
│ Postgres         │    │ DigitalManager   │
│ com RLS por role │    │ Guru API v2      │
│ (17 tabelas)     │    │ (Bearer auth)    │
└──────────────────┘    └──────────────────┘
```

**Padrão importante:** o frontend NÃO fala com a Guru diretamente — as chamadas passam por `api/guru/*` pra que o token fique server-side. O frontend fala com Supabase diretamente (via REST) porque a `anon_key` é pública por design e o RLS protege os dados.

---

## Estrutura de pastas

```
sistem_ju/
├── api/                          # Vercel Serverless Functions
│   ├── admin/
│   │   └── create-user.ts        # POST — cria user no Supabase (admin only)
│   └── guru/
│       ├── client.ts             # Módulo compartilhado (helpers + types)
│       ├── contacts.ts           # GET /api/guru/contacts
│       ├── invoices/[id].ts      # GET /api/guru/invoices/:id
│       ├── subscriptions/
│       │   ├── index.ts          # GET /api/guru/subscriptions
│       │   ├── [id].ts           # GET /api/guru/subscriptions/:id
│       │   └── [id]/invoices.ts  # GET /api/guru/subscriptions/:id/invoices
│       └── transactions/
│           ├── index.ts          # GET /api/guru/transactions
│           └── [id].ts           # GET /api/guru/transactions/:id
│
├── src/
│   ├── App.tsx                   # Rotas
│   ├── main.tsx                  # Entry point
│   │
│   ├── components/
│   │   ├── layout/               # AppLayout, ProtectedRoute, Sidebar, Header
│   │   └── ui/                   # shadcn/ui (button, card, dialog, tabs...)
│   │
│   ├── hooks/                    # React Query hooks
│   │   ├── useSupabaseData.ts    # sellers, courses, leads, sales, monthly_goals, traffic_spend
│   │   ├── useProfiles.ts        # user roles
│   │   ├── useSettings.ts        # app_settings + user_settings
│   │   ├── useCS.ts              # students, enrollments, tickets, notes, nps, onboarding
│   │   ├── useWorkspace.ts       # tasks + materials
│   │   ├── useGuru.ts            # transactions, subscriptions, contacts, invoices
│   │   └── useDebouncedValue.ts  # helper
│   │
│   ├── lib/
│   │   ├── supabase.ts           # Cliente + restGet/Insert/Update/Delete
│   │   ├── auth.tsx              # AuthProvider + useAuth
│   │   ├── guru.ts               # fetchTransactions/... + fmtGuruDate
│   │   └── utils.ts              # formatCurrency, formatInt, cn (Tailwind merge)
│   │
│   ├── pages/                    # 1 arquivo por tela
│   │   ├── admin/                # AdminVendedores, AdminCursos, AdminVendas, ...
│   │   ├── cs/                   # CSDashboard, Alunos, Tickets, ...
│   │   ├── configuracoes/        # Perfil, Seguranca, Aparencia, ...
│   │   ├── financeiro/           # Dashboard, Vendas, Assinaturas, Contatos, detalhes
│   │   ├── workspace/            # MeuDia, Tarefas, Materiais
│   │   ├── DashboardTimes.tsx    # /vendas/dashboard-times
│   │   ├── FunilVendas.tsx       # /vendas/funil
│   │   ├── MetasTimes.tsx
│   │   ├── Ranking.tsx
│   │   ├── Bonus.tsx
│   │   ├── AvaliacaoClosers.tsx
│   │   ├── Marketing.tsx
│   │   ├── Receita.tsx
│   │   └── Login.tsx
│   │
│   ├── store/                    # Zustand
│   ├── types/
│   │   ├── domain.ts             # Tipos das entidades (Seller, Course, Lead, Sale)
│   │   └── guru.ts               # Tipos Guru + helpers (txValue, txStatus, subStatus...)
│   └── styles/                   # Tailwind base
│
├── supabase/
│   └── migrations/               # SQL numerado (0001..0012)
│
├── docs/                         # Esta documentação
├── public/                       # Assets estáticos
├── .env.example                  # Template de env vars
├── .env.local                    # (gitignored) secrets locais
├── vercel.json                   # Config do Vercel
├── vite.config.ts                # Build config
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Fluxo de dados típico — leitura

Exemplo: **`/vendas/ranking`** exibe top vendedores do mês.

1. `Ranking.tsx` chama `useSales(monthFilter)` (hook de React Query).
2. React Query verifica cache — se ainda válido (< 5min), retorna sem request.
3. Cache miss → hook chama `restGet('sales?select=...')` de `lib/supabase.ts`.
4. `restGet` faz `fetch(SUPABASE_URL + '/rest/v1/sales?...')` com headers `apikey` + `Authorization: Bearer <jwt>`.
5. PostgREST valida JWT, aplica policies RLS (ex: seller só vê próprias vendas), retorna JSON.
6. Cache atualiza, componente renderiza.

**Cache padrão:** 5 minutos (`staleTime`). Escritas invalidam a query e disparam refetch.

## Fluxo de dados típico — Guru

Exemplo: **`/financeiro/vendas`** lista transações da Guru.

1. `Vendas.tsx` chama `useGuruTransactions(params)`.
2. Hook chama `fetchTransactions()` que faz `fetch('/api/guru/transactions?...')`.
3. Serverless `api/guru/transactions/index.ts` recebe, valida params, chama Guru com `Authorization: Bearer $GURU_API_TOKEN` (env server-side).
4. Guru retorna JSON, serverless faz passthrough com `Cache-Control: s-maxage=300`.
5. React Query cacheia, componente renderiza.

O token nunca sai do servidor. O frontend só chama `/api/guru/*`.

---

## Convenções de código

- **Named exports**: cada página exporta `export function NomeDaPagina()`. O `App.tsx` usa `lazy()` mapeando pro default.
- **Hooks pattern**: 1 hook por entidade. Sempre `useX` (leitura) + `useCreateX` / `useUpdateX` / `useDeleteX` (mutations).
- **REST direto**: NÃO usar `supabase.from()` pra reads pesados. O `supabase-js` adiciona headers que causam CORS preflight de 15s no self-hosted. Usar `restGet/Insert/Update/Delete` de `lib/supabase.ts`.
- **Rotas admin**: qualquer rota que muda dado sensível envolve em `<ProtectedRoute requireAdmin>`. Frontend + RLS server-side.
- **Serverless functions**: sempre com `try/catch` no topo devolvendo JSON. Nunca deixa uma function crashar sem resposta — Vercel Hobby não tem retry.
- **Timeout externo**: `AbortSignal.timeout(8000)` em todas as chamadas HTTP nas serverless (limite Hobby é 10s).
