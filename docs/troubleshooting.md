# Troubleshooting

Erros conhecidos e suas causas. Ordenado por frequência.

---

## Frontend

### "Failed to load resource: 404" e mensagem no console `relation "public.X" does not exist`

**Causa**: cache do PostgREST self-hosted (Cloudfy) — quando você renomeia/cria tabela, o PostgREST não recarrega o schema automaticamente e continua servindo o schema antigo.

**Fix**:
1. SQL Editor: `notify pgrst, 'reload schema';` — pode não funcionar no Cloudfy
2. Se não funcionar: painel Cloudfy → serviço PostgREST → Restart
3. Aguarda 10s + Ctrl+Shift+R no navegador

**Prevenção**: evita renomear tabelas. Se precisar, faz numa manutenção agendada.

---

### Query travando 15 segundos (timeout do supabase-js)

**Causa**: `supabase-js` adiciona headers que causam **preflight CORS de 15s** contra o Cloudfy self-hosted.

**Fix**: usa `restGet/Insert/Update/Delete` de `lib/supabase.ts` em vez de `supabase.from()`. Esses helpers fazem fetch REST direto sem preflight.

---

### Todos os KPIs de Vendas mostrando zero

**Possíveis causas**:

1. **RLS bloqueando**: o usuário não tem role/seller_id correto. Rode `select role, seller_id from public.profiles where id = '<seu-user-id>'` e confirme.
2. **Tabelas vazias**: rode `select count(*) from public.sales;` no SQL Editor.
3. **Helpers de data falhando**: se algum campo de data mudou de formato, `txDate()` retorna null. Abre uma venda em `/financeiro/vendas/:id`, expande "JSON bruto" no fim, e olha os campos disponíveis. Se necessário adiciona no helper em `src/types/guru.ts`.

---

### Dashboard Financeiro com números iguais entre períodos (Hoje = 30d)

**Causa antiga**: paginação — o hook pegava só 100 vendas por chamada, e se tinha mais no período, cortava.

**Fix aplicado**: `useGuruTransactionsAll` já pagina até 5 páginas em paralelo (500 vendas). Se ainda estourar, aumenta o `maxPages` no arquivo `src/hooks/useGuru.ts` ou aparece o aviso amarelo "⚠ período tem mais dados".

---

### Sistema faz login mas depois redireciona pra `/login`

**Causa**: `profiles` do user não existe. O trigger `handle_new_user` deve criar automaticamente, mas se foi resetado ou o user foi criado antes do trigger existir, falta profile.

**Fix**:
```sql
insert into public.profiles (id, role)
values ('<USER_ID>', 'viewer')
on conflict (id) do nothing;
```

---

## Vercel — deploy

### `error TS2835: Relative import paths need explicit file extensions`

**Causa**: Vercel usa TypeScript com `module: node16` que exige `.js` explícito em imports relativos, mesmo em arquivos `.ts`.

**Fix**: `from './client'` → `from './client.js'`. Vale pra todos os arquivos em `api/`.

**Prevenção**: sempre que criar arquivo novo em `api/`, use `.js` nos imports relativos.

---

### `Two or more files match the same path`

**Causa**: você tem `api/foo.ts` E `api/foo/[id].ts` — ambos reclamam paths que colidem.

**Fix**: move `api/foo.ts` pra `api/foo/index.ts`.

**Exemplo real** (resolvido em commit `d32e328`):
```
api/guru/transactions.ts    → api/guru/transactions/index.ts
api/guru/subscriptions.ts   → api/guru/subscriptions/index.ts
```

---

### `Function count exceeds limit`

**Causa**: mais de 12 arquivos com `export default handler` em `api/`.

**Fix**: consolidar rotas ou deletar debug endpoints não usados. Se realmente precisa mais que 12, upgrade Vercel Pro ($20/mês).

Nossa lista atual (8 functions):
```
api/admin/create-user.ts
api/guru/contacts.ts
api/guru/invoices/[id].ts
api/guru/subscriptions/index.ts
api/guru/subscriptions/[id].ts
api/guru/subscriptions/[id]/invoices.ts
api/guru/transactions/index.ts
api/guru/transactions/[id].ts
```

`api/guru/client.ts` NÃO conta (não tem `export default handler` — só types).

---

### `Serverless Function timeout` (10s Hobby)

**Causa**: chamada externa demorou > 10s. Vercel Hobby não permite estender.

**Fix**:
1. Adicionar `AbortSignal.timeout(8000)` em todos os `fetch` das serverless
2. Wrap com try/catch retornando JSON de erro (nunca deixar crashar)
3. Reduzir escopo: `per_page` menor, filtros mais estreitos
4. Se realmente precisa > 10s: Vercel Pro ($20/mês) permite `maxDuration: 60`

---

### Serverless funciona mas retorna 500 sem log

**Causa comum**: exception não capturada. Vercel loga stack em Runtime Logs, mas se você não olhar lá, parece silencioso.

**Fix**: sempre wrap com try/catch de nível superior:
```ts
export default async function handler(req, res) {
  try {
    // sua lógica
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
```

---

## Banco de dados / SQL

### `42P01: relation "public.X" does not exist`

Tabela realmente não existe OU cache do PostgREST desatualizado.

1. Confirma no SQL Editor: `select table_name from information_schema.tables where table_schema='public' and table_name='X';`
2. Se retornar linha → é cache. Restart PostgREST.
3. Se não retornar → tabela sumiu. Rodar migration correspondente.

---

### `42710: type "X" already exists`

**Causa**: tentou `create type` numa migration que roda de novo.

**Fix idempotente**:
```sql
do $$ begin
  if not exists (select 1 from pg_type where typname = 'X') then
    create type X as enum (...);
  end if;
end $$;
```

O `exception when duplicate_object` nem sempre pega — usar `if not exists` é mais confiável.

---

### `42501: permission denied` ao inserir

**Causa**: RLS bloqueando. Usuário logado não tem policy pra INSERT nessa tabela com esse role.

**Fix**:
1. Verifique role do user: `select role from public.profiles where id = auth.uid();`
2. Confirme a policy: `select polname, polcmd from pg_policy where polrelid = 'public.X'::regclass;`
3. Se precisa liberar, escreva policy nova ou use service_role (server-side).

---

### `Foreign key violation` ao popular

**Causa**: inseriu venda referenciando `seller_id` ou `course_id` que não existe.

**Fix**: certifique-se que sellers e courses estão populados antes de inserir sales. O script `import_vendas.py` já faz isso — GET primeiro, cria os faltantes, DEPOIS insere as vendas.

---

### Sistema fora do ar (todas as páginas quebram)

**Ordem de diagnóstico**:

1. **Vercel deploy verde?** Se falhou → veja logs, rollback pra deploy anterior
2. **Supabase acessível?** Abre `https://forgottenperch-supabase.cloudfy.live/rest/v1/` no browser. Se der 404 mas tela do PostgREST → up. Se der timeout → banco fora.
3. **RLS quebrado?** Login como admin não funciona → confirmar que `is_admin()` retorna true no SQL Editor: `select public.is_admin();` (rodando como admin authenticated).
4. **Tabela crítica sumiu?** SELECT count em `sellers`, `profiles`.

---

## Integração Guru

### 401 Unauthorized ao chamar `/api/guru/*`

**Causa**: `GURU_API_TOKEN` inválido, expirado ou não configurado.

**Fix**:
1. Painel Guru → Configurações → API → gera novo token
2. Vercel → Environment Variables → atualiza `GURU_API_TOKEN`
3. Redeploy

---

### 422 "Period greater than 180 days"

**Causa**: filtro de data com janela > 180 dias.

**Fix**: no código, limitar `days` a 180. Ver `api/guru/subscriptions/index.ts` que já faz isso.

---

### 404 em `/api/guru/invoices/:id`

**Causa**: alguns IDs de fatura da Guru são UUIDs internos, não o "code" `in_xxx` que a API single espera.

**Fix já implementado**: o handler `api/guru/invoices/[id].ts` faz fallback — se `/invoices/:id` der 404 e houver `?subscription_id=...`, busca a lista da assinatura e filtra pelo id/code.

---

### Datas aparecendo como "01/01/1970" ou "—"

**Causa**: Guru retorna date fields em formato variável. Timestamp zero, string vazia, epoch em ms vs segundos, aninhado em `dates.paid_at.value`.

**Fix**: `fmtGuruDate()` em `lib/guru.ts` trata todos esses casos e devolve "—" quando inválido. Se ainda aparece data quebrada, provavelmente é um campo NOVO — adicione no helper.

---

## Login e autenticação

### "Invalid login credentials"

Óbvio — senha errada ou email não existe. Se aparecer imediatamente após criar user, verifique se o Supabase não está exigindo confirmação de email (Auth → Providers → Email → Confirm email).

### Login funciona mas fica em "Carregando..." infinito

**Causa**: `loadProfile()` em `lib/auth.tsx` está timeout-ando ou retornando erro. Console vai mostrar.

**Fix comum**: adicionou coluna nova em `profiles` sem migrar; ou o REST está caindo.

---

## Miscelânea

### Warnings de build do Vite sobre chunk > 500kB

Nossa `index-*.js` está em ~640kB (188kB gzip). Aviso normal, não é erro. Se quiser reduzir:
- Configurar `manualChunks` em `vite.config.ts`
- Já usamos `lazy()` em todas as rotas — bundle inicial é enxuto

### "npm audit found N vulnerabilities"

`npm audit` sempre chora em projetos Vite/React modernos por deps transitivas. Geralmente falsos positivos (não afetam produção). Rodar `npm audit fix --only=prod` se algo crítico surgir.

### Timezone quebrando cálculo de "hoje"/"início do mês"

Bug já resolvido. Se aparecer de novo, garantir que `lib/guru.ts → today()/startOfMonth()` usa `getFullYear/getMonth/getDate` (local), NUNCA `toISOString().slice(0,10)` (UTC — quebra em fuso BR).
