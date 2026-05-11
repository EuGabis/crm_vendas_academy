# Lito Academy Vendas — Plataforma de Dados

Dashboard de gestão comercial para o time de vendas da **Lito Academy**.
Funil de vendas, dashboard de times, metas, ranking, bônus, avaliação de
closers e marketing (CAC / ROI / tráfego).

Stack: **React 18 · Vite 6 · TypeScript · Tailwind · shadcn/ui · Recharts · Supabase · TanStack Query · Zustand · Sonner**.

---

## Setup local

```bash
npm install
cp .env.example .env.local   # depois preencha com as chaves reais
npm run dev
```

A app abre em http://localhost:5173 com **dados mock** (seed determinístico —
sellers, leads, vendas, metas e tráfego dos últimos 90 dias).

## Variáveis de ambiente

| Variável                       | Onde usar          | Obs |
| ------------------------------ | ------------------ | --- |
| `VITE_SUPABASE_URL`            | frontend           | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY`       | frontend           | Chave pública (anon) |
| `VITE_DATA_SOURCE`             | frontend           | `mock` ou `supabase` |
| `SUPABASE_SERVICE_ROLE_KEY`    | scripts locais     | **NUNCA** exponha no frontend |
| `SUPABASE_DB_PASSWORD`         | scripts locais     | Para `psql` direto |
| `SUPABASE_JWT_SECRET`          | scripts locais     | Assinar tokens custom |

Todas as `.env*.local` estão no `.gitignore`.

## Banco de dados (Supabase)

Aplique a migration inicial em **Supabase Dashboard → SQL Editor**:

```bash
# Ou via psql:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

A migration cria: `sellers`, `courses`, `monthly_goals`, `leads`, `sales`,
`traffic_spend`, `profiles` (com role: admin/manager/viewer), RLS habilitado
e policies de leitura/escrita.

## Rotas

| Rota                          | Página              |
| ----------------------------- | ------------------- |
| `/vendas/funil`               | Funil de Vendas (default) |
| `/vendas/dashboard-times`     | Dashboard Times (consolidado / individual) |
| `/vendas/metas-times`         | Edição de metas |
| `/vendas/ranking`             | Ranking + pódio |
| `/vendas/bonus`               | Cálculo de bônus (faixas editáveis) |
| `/vendas/avaliacao-closers`   | Rubrica qualitativa |
| `/marketing/trafego`          | Tráfego, CAC, ROI, CPL/CPM/CPS |
| `/receita`                    | Visão consolidada |

Filtros globais (mês e vendedor) ficam no Header e afetam todas as páginas.

## Deploy (Vercel)

1. `vercel link` no diretório raiz
2. Adicionar variáveis de ambiente no painel Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DATA_SOURCE=supabase`
3. `vercel --prod`

O `vercel.json` já está configurado para SPA (rewrite tudo para `/`).

## Estrutura

```
src/
  components/
    layout/         # Sidebar, Header, AppLayout
    ui/             # shadcn primitives (card, button, badge, tabs, ...)
  data/
    seed-data.ts    # mock determinístico (mulberry32)
    queries.ts      # camada de queries derivadas (KPIs, funil, breakdown)
  lib/
    supabase.ts     # client + isSupabaseConfigured()
    utils.ts        # formatCurrency, businessDays, etc.
  pages/            # uma página por rota
  store/
    filters.ts      # Zustand store: mês + vendedor selecionado
  types/
    domain.ts       # entidades + enums (LeadStage, PaymentMethod)
supabase/
  migrations/       # SQL
```

## Próximos passos

- [ ] Plugar Supabase real (trocar `VITE_DATA_SOURCE` para `supabase`)
- [ ] Auth (login com Supabase)
- [ ] Seed de produção via service_role
- [ ] Webhooks de captura de leads (Meta Ads, etc.)
