# Deploy

Vercel Hobby, auto deploy no push pra `main`.

---

## URLs

- **Produção**: https://crm-vendas-academy.vercel.app
- **Dashboard Vercel**: https://vercel.com/gabriels-projects-fa9c86e6/crm-vendas-academy
- **GitHub (repo)**: https://github.com/LitoGroup/sistem_ju

---

## Vercel Hobby — limites que importam

| Limite | Valor | Impacto |
|---|---|---|
| Serverless functions por projeto | **12** | Estamos em 8 (`api/admin/create-user.ts` + 7 em `api/guru/*`). Espaço pra 4 mais |
| Timeout de execução | **10s** | Todas as chamadas externas usam `AbortSignal.timeout(8000)` pra margem |
| Bandwidth | 100 GB/mês | Ok |
| Build minutes | 6000/mês | Ok (nosso build é ~30s) |
| Regiões | 1 (default: `iad1` — Washington DC) | Não muda |
| `maxDuration` custom | ❌ Requer Pro | Não usamos |

**Se precisar de mais que 12 functions**: consolida rotas relacionadas ou upgrade pra Pro ($20/mês).

---

## Configuração (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/" }
  ]
}
```

Faz o SPA rewrite (todas as rotas do frontend caem no `index.html`), **exceto** `/api/*` que vai pras serverless functions.

---

## Environment Variables (Vercel)

Configure em **Settings → Environment Variables** do projeto:

| Var | Ambiente | Sensível? |
|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview, Development | Não (fica no bundle) |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | Não (public por design) |
| `VITE_DATA_SOURCE` | Production, Preview, Development | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **Sim** ⚠️ |
| `SUPABASE_JWT_SECRET` | Production, Preview | **Sim** ⚠️ |
| `SUPABASE_DB_PASSWORD` | Production, Preview | **Sim** ⚠️ |
| `GURU_API_TOKEN` | Production, Preview | **Sim** ⚠️ |
| `GURU_API_BASE_URL` | (opcional) | Não |

⚠️ **Sensitive flag no Vercel**: uma vez marcada, o valor NUNCA mais pode ser visto. Só editado/deletado. Use pra secrets. Se marcou por engano e perdeu o valor, precisa recuperar da fonte (Supabase dashboard, Guru).

---

## Push e deploy

Fluxo padrão:
```bash
git add -A
git commit -m "feat: minha mudanca"
git push origin main
```

Em ~30-60 segundos Vercel:
1. Clona o repo
2. `npm install`
3. `tsc -b && vite build`
4. Compila serverless functions
5. Deploy pros edges
6. Aliases o `crm-vendas-academy.vercel.app` pro novo deployment

Você pode acompanhar em https://vercel.com/gabriels-projects-fa9c86e6/crm-vendas-academy/deployments.

### Se o deploy falhar

Cada deployment tem um log detalhado. Erros comuns:

| Erro | Causa | Fix |
|---|---|---|
| `TS2835: Relative import paths need explicit file extensions` | Vercel usa TypeScript `module: node16` | Adiciona `.js` no import (`from './client.js'` mesmo sendo `.ts`) |
| `Two or more files match the same path` | Rotas conflitantes tipo `api/foo.ts` + `api/foo/[id].ts` | Mover pra `api/foo/index.ts` + `api/foo/[id].ts` |
| `The Serverless Function has crashed` | Timeout > 10s ou exceção não tratada | Adicionar `AbortSignal.timeout()` e wrap com try/catch |
| `Function count exceeds limit` | > 12 arquivos em `api/` | Deletar debug endpoints; consolidar |

Ver [troubleshooting.md](troubleshooting.md) pra mais detalhes.

---

## Rollback

No dashboard Vercel → Deployments → escolhe um deploy anterior verde → **Promote to Production**. Instantâneo.

---

## Monitoramento

- **Runtime Logs**: dashboard → Logs — mostra output das serverless em tempo real
- **Analytics**: dashboard → Analytics — Core Web Vitals, page views
- **Speed Insights**: dashboard → Speed Insights (opcional)

Nada de terceiros (Sentry, Datadog etc) integrado. Se precisar de monitoramento de erro do frontend, considerar adicionar Sentry.

---

## Custom domain (não configurado)

Hoje só o domínio `.vercel.app`. Se quiser configurar `crm.litoacademy.com.br`:

1. Vercel → Settings → Domains → Add
2. Adiciona registro CNAME apontando pro `cname.vercel-dns.com`
3. Aguarda propagação (~1h)

---

## Backup do banco

Vercel não faz backup do Supabase. Isso é responsabilidade do provedor Supabase (Cloudfy).

**Pra fazer backup manual**:
```bash
# Dump completo via pg_dump
export PGPASSWORD='<SUPABASE_DB_PASSWORD>'
pg_dump \
  -h db.forgottenperch-supabase.cloudfy.live \
  -U postgres \
  -d postgres \
  --schema=public \
  -f backup_$(date +%Y%m%d).sql
```

Guardar em local seguro. Não commitar.
