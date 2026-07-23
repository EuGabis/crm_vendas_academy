# Setup local

Passo a passo pra rodar o sistema na sua máquina, do zero.

---

## Pré-requisitos

- **Node.js 20+** (Vercel usa 20 em prod, alinhe pra evitar surpresas)
- **npm 10+** (ou pnpm/yarn se preferir)
- **Git**
- Uma **instância Supabase acessível** (self-hosted ou cloud)
- Um **token da Guru** (opcional, só se for usar o módulo Financeiro)

---

## Passo 1 — Clonar

```bash
git clone https://github.com/LitoGroup/sistem_ju.git
cd sistem_ju
npm install
```

Instala ~430 pacotes. Vai levar 30–90 segundos.

---

## Passo 2 — Variáveis de ambiente

Copia o template e preenche:

```bash
cp .env.example .env.local
```

Edita `.env.local` (não commita — está no `.gitignore`):

```env
# Público — vai pro bundle do frontend
VITE_SUPABASE_URL=https://forgottenperch-supabase.cloudfy.live
VITE_SUPABASE_ANON_KEY=eyJhbGci...        # anon key pública do Supabase
VITE_DATA_SOURCE=supabase                  # 'supabase' | 'mock'

# Só servidor — usados em scripts locais + serverless functions em prod
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      # service_role key (nunca no frontend!)
SUPABASE_DB_PASSWORD=...                    # senha do banco (usada em scripts direct-connect)
SUPABASE_JWT_SECRET=...                     # segredo pra assinar JWTs (raramente usado local)
```

### Onde pegar cada valor

| Var | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Painel Supabase → Settings → API → **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Painel Supabase → Settings → API → **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Settings → API → **service_role** (⚠️ secreta) |
| `SUPABASE_DB_PASSWORD` | Painel Supabase → Settings → Database → **Password** (você definiu na criação) |
| `SUPABASE_JWT_SECRET` | Painel Supabase → Settings → API → **JWT Secret** |
| `GURU_API_TOKEN` | Painel DigitalManager Guru → Configurações → API → **gerar novo token** (só server) |

⚠️ **Regra de ouro**: `.env.local` NUNCA vai pro git. Se por acidente commitar, rotacione todas as chaves imediatamente.

---

## Passo 3 — Preparar o banco

Se está apontando pra uma instância Supabase **nova/vazia**, roda as migrations em ordem:

1. Abre `Supabase Dashboard → SQL Editor → New query`
2. Cola cada arquivo abaixo e clica **RUN**, na ordem:

```
supabase/migrations/0001_init.sql            # tabelas base + RLS básico
supabase/migrations/0002_rls_admin.sql       # RLS por role (admin/manager/seller/viewer)
supabase/migrations/0003_settings.sql        # app_settings + user_settings
supabase/migrations/0004_cs.sql              # tabelas de Customer Success
supabase/migrations/0005_workspace.sql       # tarefas + materiais
supabase/migrations/0006_rls_seller_scope.sql  # RLS por seller (scoped reads)
supabase/migrations/0012_sales_commission_points.sql  # coluna extra em sales
```

> Os arquivos 0007–0011 foram experimentos de renomeação (juliana_*) que foram revertidos. **Não rodar.**

3. Crie seu primeiro admin — ver [operacoes.md → Criar primeiro admin](operacoes.md#criar-primeiro-admin)

---

## Passo 4 — Rodar

```bash
npm run dev
```

Abre `http://localhost:5173`. Login com o email/senha do admin criado no passo 3.

---

## Comandos úteis

```bash
npm run dev            # dev server (Vite, HMR)
npm run build          # build produção (tsc + vite build) - saída em dist/
npm run preview        # preview do build (útil pra testar produção local)
npm run lint           # eslint
npm run test           # vitest (unit)
npm run test:run       # vitest sem watch
npx tsc --noEmit       # só type-check, sem gerar código
```

---

## Estrutura de branches

Só existe **`main`**. Cada push em main dispara deploy automático no Vercel. Se for fazer feature grande, use branch local, e faça `git rebase main && git checkout main && git merge --ff-only <branch>` antes de push.

---

## Rodar com dados mock (sem Supabase)

Se `VITE_DATA_SOURCE=mock` no `.env.local`, o frontend usa dados fake pra desenvolvimento offline. Útil pra tocar UI sem depender do banco. Nem toda tela suporta 100% — as principais (Vendas/Ranking/Metas) sim.

---

## Problemas comuns no setup

Ver **[troubleshooting.md](troubleshooting.md)** — cobre timeouts do supabase-js, PostgREST cache, erro TS2835 no Vercel, etc.
