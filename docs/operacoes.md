# Operações — tarefas comuns

Guia passo-a-passo pra rotinas que você vai fazer no dia-a-dia.

---

## Criar primeiro admin

**Contexto**: banco novo, sem nenhum admin. O trigger `handle_new_user` cria profiles como `viewer` por padrão. Você precisa promover manualmente o 1º admin via SQL.

1. Crie o usuário via Supabase Dashboard → Authentication → Users → **Add user** → email + senha
2. Copie o `id` do usuário criado
3. SQL Editor:
```sql
update public.profiles
set role = 'admin'
where id = '<COLE-O-ID-AQUI>';
```
4. Login no sistema com esse email/senha
5. Você agora consegue acessar `/admin/*` e `/financeiro/*`

---

## Criar novo usuário (com você já admin)

### Via UI

1. Login como admin
2. `/admin/usuarios` → **Novo usuário**
3. Preenche email + senha + role (admin/manager/seller/viewer) + seller vinculado (opcional)
4. Clica em criar

Isso chama `POST /api/admin/create-user` (serverless) que:
- Valida seu token
- Confirma que você é admin
- Usa `SUPABASE_SERVICE_ROLE_KEY` pra criar em `auth.users` sem confirmação por email
- Atualiza o profile com role e seller_id

### Via SQL (fallback)

Mesmo fluxo do "primeiro admin" acima.

---

## Promover admin

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'pessoa@empresa.com');
```

Ou via `/admin/usuarios` → dropdown de role.

---

## Vincular user a um seller

Pra um vendedor conseguir ver as **próprias** vendas (RLS por seller_id):

```sql
update public.profiles
set seller_id = '<SELLER_ID>'
where id = '<USER_ID>';
```

Ou via UI (`/admin/usuarios`).

---

## Importar planilha de vendas

Como foi feito o import inicial de `META VENDEDORES - METAS DO MÊS.xlsx`. Reproduzível se quiser importar planilhas novas.

### Pré-requisitos

- Python 3 na máquina
- `pip install openpyxl requests`
- `.env.local` do projeto preenchido (usa `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- Migration `0012_sales_commission_points.sql` aplicada no banco

### Estrutura esperada da planilha

Sem cabeçalho. 9 colunas obrigatórias + 2 opcionais:

| Coluna | Conteúdo | Obrigatório? |
|---|---|---|
| A | Forma de pagamento (Cartão de Crédito / PIX / Boleto Bancário) | ✅ |
| B | Parcelas | ✅ (default 1) |
| C | **Valor** (número) | ✅ |
| D | Nome do produto | ✅ |
| E | Nome do cliente | opcional |
| F | DDI | opcional |
| G | Telefone | opcional |
| H | Descrição da oferta | opcional |
| I | **Vendedor** (PAULO, ALBERTO, etc — case-insensitive) | ✅ |
| J | Pontos de comissão (número) OU "PROX LINK" | opcional |
| K | Data (só na sheet RASCUNHO) | opcional |

Uma sheet por mês (MARÇO, ABRIL, MAIO, JUNHO, JULHO, etc). Datas das sheets sem coluna K usam **dia 15 do mês**.

### Rodar o import

Script em `scratchpad/import_vendas.py` (não commitado). Pode recriar assim:

```python
# scratchpad/import_vendas.py
import openpyxl, requests
from datetime import datetime, date
from pathlib import Path

XLSX = r"C:/caminho/pra/planilha.xlsx"
ENV = Path(r"C:/caminho/pro/repo/.env.local")

env = {}
for line in ENV.read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()

SUPABASE_URL = env["VITE_SUPABASE_URL"]
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MONTH_MAP = {"MARÇO": date(2026,3,15), "ABRIL": date(2026,4,15), ...}
PAYMENT_MAP = {"cartão de crédito": "CARTAO_PARCELADO", "pix": "PIX", "boleto bancário": "BOLETO"}

# 1) Lê xlsx, normaliza linhas
# 2) GET /rest/v1/sellers, cria os que faltarem
# 3) GET /rest/v1/courses, cria os que faltarem
# 4) POST /rest/v1/sales em batches de 500, dedupando por (cliente, valor, vendedor, data, curso)
```

Full script está no `scratchpad/`. Rode com:
```bash
python scratchpad/import_vendas.py
```

Saída típica:
```
Total de linhas validas: 1081
  MARÇO: 63 | ABRIL: 214 | MAIO: 370 | JUNHO: 276 | JULHO: 108 | RASCUNHO: 50
Vendedores criados: 11
Cursos criados: 64
Vendas inseridas: 1054 (dedupped: 27)
```

### Rodar de novo (safe)

Dedup por chave `(client_name, amount, seller_name, sold_at, course_name)` — rodar de novo não duplica. Só insere linhas novas se aparecerem.

---

## Wipe do banco (limpar tudo)

⚠️ **Destrutivo. Faz backup antes.**

Via UI:
1. Login como admin → `/configuracoes/dados`
2. Botão **Limpar tudo** → digita literalmente `LIMPAR TUDO` → confirma

Isso deleta (em ordem por causa de FKs): `sales → leads → traffic_spend → monthly_goals → courses → sellers`.

Via SQL (idem):
```sql
delete from public.sales;
delete from public.leads;
delete from public.traffic_spend;
delete from public.monthly_goals;
delete from public.courses;
delete from public.sellers;
```

Não afeta: `profiles`, `app_settings`, `user_settings`, CS, workspace.

---

## Rotacionar chaves (após vazamento suspeito)

Se algum secret vazou (screenshot público, git push acidental, ex-funcionário):

### Supabase

1. Painel Supabase → Settings → API → **Reset service_role key** (invalida o antigo)
2. Copie a nova key
3. Atualize no Vercel: Settings → Environment Variables → edita `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy (Vercel → Deployments → último → Redeploy)
5. Atualize seu `.env.local` local

O `anon key` raramente precisa rotacionar (é pública por design).

### Guru

1. Painel DigitalManager Guru → Configurações → API
2. **Gerar novo token** (o antigo continua funcionando até você invalidar)
3. Atualize no Vercel: `GURU_API_TOKEN`
4. Redeploy
5. Painel Guru → **Invalidar token antigo**

### Trocar senha do DB (`SUPABASE_DB_PASSWORD`)

1. Cloudfy → Postgres → Reset password
2. Atualize `SUPABASE_DB_PASSWORD` no Vercel + `.env.local`

---

## Aplicar uma migration nova

1. Cria arquivo em `supabase/migrations/00XX_nome.sql` (numera sequencial)
2. Escreve SQL **idempotente**: `create table if not exists`, `alter table if exists`, `create or replace function`, `drop policy if exists ... ; create policy ...`
3. Testa local se der (Supabase local ou seu instance dev)
4. Abre SQL Editor da instância prod → cola → RUN
5. Commit + push (não roda automaticamente — Vercel não aplica migrations)

**Boas práticas**:
- Sempre `create table if not exists` — nunca `drop table`
- Enum idempotente: `if not exists (select 1 from pg_type where typname='X')`
- Se editar função que outras dependem, ordem importa (renomear tabela ANTES de recriar função que a referencia)

---

## Debug de erro em produção

1. **Frontend**: Chrome DevTools → Console + Network. Erros de fetch aparecem como request `/api/...` retornando 500 ou 4xx.
2. **Serverless**: Vercel dashboard → Logs → filtra por `/api/...`. Mostra exception, stack trace, request/response.
3. **Banco**: Supabase Dashboard → Logs → PostgREST logs. Mostra queries com erro (`42P01`, `42710`, etc).
4. **RLS**: pra testar policy sem sair da conta admin, use no SQL Editor:
```sql
set local role authenticated;
set local request.jwt.claim.sub = '<USER_ID>';
select * from public.sales limit 10; -- vai respeitar o RLS desse user
```

---

## Adicionar novo módulo

Padrão sugerido:

1. **Tabelas**: cria migration `00XX_meu_modulo.sql` com tabelas + RLS
2. **Types**: adiciona interfaces em `src/types/domain.ts`
3. **Hook**: cria `src/hooks/useMeuModulo.ts` (padrão useX/useCreateX/useUpdateX/useDeleteX)
4. **Página**: cria `src/pages/meu-modulo/Index.tsx` + subpáginas
5. **Rota**: adiciona no `src/App.tsx` (lazy import + `<Route path=...>`)
6. **Sidebar**: adiciona link no `src/components/layout/Sidebar.tsx`
7. **RLS**: escreve policies (ver 0002/0006 como referência)
8. Commit + push

---

## Backup manual do banco

```bash
export PGPASSWORD='<SUPABASE_DB_PASSWORD>'
pg_dump \
  -h db.forgottenperch-supabase.cloudfy.live \
  -U postgres \
  -d postgres \
  --schema=public \
  --data-only \
  -f backup_dados_$(date +%Y%m%d).sql

# Ou com schema:
pg_dump ... > backup_completo_$(date +%Y%m%d).sql
```

Guardar em nuvem privada (S3, GDrive). Nunca commitar.

Restaurar:
```bash
psql -h ... -U postgres -d postgres -f backup_completo.sql
```
