# Integrações externas

O sistema conversa com 2 serviços externos: Supabase (banco + auth) e DigitalManager Guru (vendas de infoprodutos).

---

## 1. Supabase (self-hosted em Cloudfy)

### URL e chaves
- **Base URL**: `https://forgottenperch-supabase.cloudfy.live`
- **Chaves**: veja `.env.local` (público: `VITE_SUPABASE_ANON_KEY`, admin: `SUPABASE_SERVICE_ROLE_KEY`)

### 3 formas de acessar

#### 1. REST direto (o que usamos pra tudo)

`lib/supabase.ts` expõe:
```ts
restGet<T>(path: string, signal?: AbortSignal): Promise<T>
restInsert<T>(table: string, payload: unknown): Promise<T>
restUpdate<T>(table: string, filter: string, payload: unknown): Promise<T>
restDelete(table: string, filter: string): Promise<void>
```

Exemplo:
```ts
const rows = await restGet<Seller[]>('sellers?select=id,full_name&order=full_name.asc');
```

Headers automáticos: `apikey`, `Authorization: Bearer <jwt>` (do supabase.auth.getSession).

**Por que REST direto e não `supabase-js` client?** O `supabase-js` adiciona uns headers extras que causam **preflight CORS de 15s** contra o self-hosted Cloudfy. REST puro contorna.

#### 2. supabase-js (só pra Auth e casos específicos)

Ainda usamos em:
- `lib/auth.tsx` — login, signup, updateUser (Supabase Auth REST é chato de fazer na mão)
- `hooks/useSettings.ts` — upsert de app_settings/user_settings (dependia de `.upsert({onConflict})`)

#### 3. Serverless com service_role (só do backend)

`api/admin/create-user.ts` usa `SUPABASE_SERVICE_ROLE_KEY` (env var privada do Vercel) pra criar usuário no `auth.users`. Bypassa RLS.

### Auth flow

1. User faz login em `/login` → `supabase.auth.signInWithPassword({email, password})`.
2. Supabase valida, retorna JWT + refresh token.
3. `AuthProvider` (`lib/auth.tsx`) escuta `onAuthStateChange`, salva session em memória.
4. `ProtectedRoute` verifica se tem session; senão redireciona pra `/login`.
5. Todos os fetch REST automaticamente incluem o JWT no header.
6. PostgREST valida JWT, extrai role de `auth.jwt() ->> 'role'` (default authenticated), aplica policies.

### Roles do sistema (4)

Guardados em `profiles.role`:

| Role | Escrita | Leitura |
|---|---|---|
| **admin** | Tudo | Tudo |
| **manager** | Nada em produção (a gente controla via UI) | Tudo (dashboards consolidados) |
| **seller** | Nada em produção | Só o próprio escopo (leads/sales/students) |
| **viewer** | Nada | Só catálogo (sellers, courses) — usuário novo sem role atribuída |

**Como promover alguém a admin**: veja [operacoes.md → Promover admin](operacoes.md#promover-admin).

---

## 2. DigitalManager Guru

Sistema externo (`https://digitalmanager.guru/api/v2`) que administra vendas, assinaturas, faturas e contatos de infoprodutos da Lito Academy.

### Configuração

Env var **server-only** no Vercel:
```
GURU_API_TOKEN=<token gerado no painel Guru>
GURU_API_BASE_URL=https://digitalmanager.guru/api/v2   # opcional, tem default
```

**IMPORTANTE**: `GURU_API_TOKEN` NUNCA vai pro frontend. Só as serverless functions em `api/guru/*` conhecem.

Como gerar: painel Guru → Configurações → API → **Gerar novo token**.

### Como o sistema chama

```
Frontend (fetch)          Serverless                     Guru
──────────────────        ──────────────                 ─────
useGuruTransactions(...) → fetch('/api/guru/transactions?...')
                                    │
                                    ▼
                           api/guru/transactions/index.ts
                                    │  Bearer $GURU_API_TOKEN
                                    │  timeout 8s
                                    ▼
                           https://digitalmanager.guru/api/v2/transactions?...
                                    │
                                    │ JSON
                                    ▼
                           Cache-Control: s-maxage=300, stale-while-revalidate=600
                                    │
                           ◄────────┘
```

### Endpoints implementados

| Método | Rota nossa | Rota Guru | Uso |
|---|---|---|---|
| GET | `/api/guru/transactions` | `/transactions` | Lista com filtros (data, status, contact_id, subscription_id) |
| GET | `/api/guru/transactions/:id` | `/transactions/:id` | Detalhe de uma venda |
| GET | `/api/guru/subscriptions` | `/subscriptions` | Lista de assinaturas |
| GET | `/api/guru/subscriptions/:id` | `/subscriptions/:id` | Detalhe de uma assinatura |
| GET | `/api/guru/subscriptions/:id/invoices` | `/subscriptions/:id/invoices` | Faturas de uma assinatura |
| GET | `/api/guru/invoices/:id?sub=...` | `/invoices/:id` (com fallback via lista) | Detalhe de uma fatura |
| GET | `/api/guru/contacts` | `/contacts` | Lista de contatos com busca inteligente |

### Limites conhecidos da Guru

- **Rate limit**: 360 requisições/hora
- **Filtro de data**: janela máxima de 180 dias
- **Autenticação**: Bearer only (Basic não funciona)
- **Paginação**: `per_page` até 100. Usamos `useGuruTransactionsAll` que puxa até 5 páginas em paralelo (500 items) pra dashboards agregarem periodos longos.

### Helpers defensivos (`src/types/guru.ts`)

Como o schema retornado pela Guru varia (algumas versões usam `paid_at`, outras `confirmed_at`, `dates.confirmed_at.value` aninhado, timestamps em segundos ou milissegundos, etc), criamos helpers que tentam múltiplos caminhos:

**Transactions**
- `txDate(tx)` — retorna ISO string ou null. Tenta: paid_at, confirmed_at, ordered_at, created_at, aninhados em `dates`/`payment.dates`, epoch em segundos ou ms.
- `txValue(tx)` — tenta value, total, amount, price, `payment.total/amount/value`, soma de afiliações.
- `txStatus(tx)` — tenta status, transaction_status, order_status, `payment.status`, `payment.state`.
- `txProductName(tx)`, `txPaymentLabel(tx)`, `txNetValue(tx)`

**Subscriptions**
- `subStatus(sub)`, `subValue(sub)`, `subChargesMade(sub)`, `subChargesTotal(sub)`, `subNextCharge(sub)`, `subStartedAt(sub)`, `subCancelledAt(sub)`, `subCycle(sub)`
- `normalizeSubStatus(s)`, `SUB_STATUS_LABELS`, `SUB_STATUS_VARIANT`

**Datas**
- `fmtGuruDate(raw, {withTime})` em `lib/guru.ts` — trata epoch zero/1970 mostrando "—" no lugar da data inválida.

Sempre que descobrir que a Guru retorna um campo em nome novo, **adicionar no helper** — não em cada página.

### Debug: JSON cru

Todas as páginas de detalhe (Venda, Assinatura, Fatura) têm um `<details>` no fim chamado **"JSON bruto da Guru"** com o objeto completo. Útil pra mapear campos novos.

### Estratégia de cache

- Serverless: `Cache-Control: s-maxage=300, stale-while-revalidate=600` — Vercel Edge cacheia por 5min, serve stale por até 10min enquanto revalida.
- React Query: `staleTime: 5min`, `retry: 1`.

---

## Google Sheets (planilha META VENDEDORES)

**Status: import estático, não integração live.**

A planilha `META VENDEDORES - METAS DO MÊS.xlsx` foi importada uma vez pra popular o Supabase com o histórico (1.054 vendas de Mar-Jul 2026 + Rascunho). Ver [operacoes.md → Importar planilha](operacoes.md#importar-planilha-de-vendas).

Se no futuro quiser leitura live do Google Sheets, opções:
- Service Account (mais seguro)
- Publish to web (URL CSV pública)
- Compartilhamento "qualquer link"

Nenhuma implementada até hoje.
