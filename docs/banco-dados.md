# Banco de dados

PostgreSQL 15 via Supabase self-hosted (`forgottenperch-supabase.cloudfy.live`). 17 tabelas + 1 view, todas com RLS habilitado.

---

## Diagrama de dependências

```
auth.users (Supabase Auth — não é nossa)
    │
    ▼ 1:1
profiles ─────► sellers ─┬─► leads
                          ├─► sales ──► courses
                          ├─► monthly_goals
                          └─► students ─► enrollments ─► courses
                                        ├─► cs_tickets
                                        ├─► cs_notes
                                        ├─► nps_responses
                                        └─► onboarding_steps

Standalone (sem FK crítica):
- traffic_spend
- app_settings
- user_settings
- workspace_tasks (created_by → auth.users.id)
- workspace_materials
```

---

## Tabelas — todas as 17

### Core (0001_init.sql)

#### `sellers` — vendedores
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | default uuid_generate_v4() |
| full_name | text | not null |
| email | text unique | |
| team | text | ex: "Alpha", "Beta" |
| avatar_color | text | hex, default `#8b5cf6` |
| active | bool | default true |
| created_at | timestamptz | default now() |

#### `courses` — produtos vendidos
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| name | text | not null (ex: "Piloto Privado Teórico") |
| price | numeric(12,2) | preço tabelado |

#### `monthly_goals` — meta mensal por vendedor
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid FK sellers | cascade delete |
| year_month | date | mês (usa dia 1) |
| revenue_goal | numeric(12,2) | receita alvo |
| courses_goal | int | qtd de cursos alvo |
| business_days | int | dias úteis, default 21 |
| created_at | timestamptz | |
| **unique** | | (seller_id, year_month) |

#### `leads` — funil de vendas
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid FK sellers | set null on delete |
| source | text | origem (ex: "Instagram", "Site") |
| stage | enum lead_stage | LEAD/MQL/SQL/AGENDADA/REALIZADA/NO_SHOW/VENDA/PERDA |
| created_at | timestamptz | |
| stage_changed_at | timestamptz | pra medir tempo em cada etapa |

Enum `lead_stage`: `'LEAD', 'MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'`

#### `sales` — vendas realizadas
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid FK sellers | restrict on delete |
| lead_id | uuid FK leads | set null on delete |
| course_id | uuid FK courses | |
| amount | numeric(12,2) | valor da venda |
| payment_method | enum payment_method | AVISTA/CARTAO_PARCELADO/CARTAO_RECORRENCIA/BOLETO/PIX |
| installments | int | default 1 |
| sold_at | timestamptz | default now() |
| **commission_points** | numeric(10,2) | pontos pra ranking (nullable) — adicionado em 0012 |

Enum `payment_method`: `'AVISTA', 'CARTAO_PARCELADO', 'CARTAO_RECORRENCIA', 'BOLETO', 'PIX'`

Indexes: `(seller_id)`, `(sold_at)`, `(seller_id, commission_points)` where not null.

#### `traffic_spend` — investimento em mídia
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| spend_date | date | not null |
| channel | text | "Meta Ads", "Google Ads", etc |
| amount | numeric(12,2) | |

#### `profiles` — ligação auth.users ↔ role/seller
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | FK auth.users(id) cascade delete |
| seller_id | uuid FK sellers | set null on delete (nullable pra admin sem vendas) |
| role | text | 'admin' \| 'manager' \| 'seller' \| 'viewer' (default 'viewer') |
| created_at | timestamptz | |

Trigger `on_auth_user_created`: quando alguém se registra no Supabase Auth, cria automaticamente um profile com role='viewer'.

### Settings (0003_settings.sql)

#### `app_settings` — configs globais (só admin escreve)
| Coluna | Tipo | Detalhes |
|---|---|---|
| key | text PK | ex: 'company', 'branding', 'bonus_tiers' |
| value | jsonb | payload flexível |
| updated_at | timestamptz | |

Chaves conhecidas:
- `company` — `{name, legal_name, cnpj, logo_url, support_email}`
- `branding` — `{primary_color, show_logo_login}`
- `bonus_tiers` — array `[{threshold: 1.0, bonus_pct: 0.05, label: '100%'}, ...]`
- `lead_sources` — array de strings
- `traffic_channels` — array de strings
- `seller_teams` — array de strings

#### `user_settings` — preferências pessoais
| Coluna | Tipo | Detalhes |
|---|---|---|
| user_id | uuid PK | FK auth.users |
| theme | text | 'dark' \| 'light' \| 'system' |
| density | text | 'comfortable' \| 'compact' |
| notify_email | bool | |
| notify_in_app | bool | |
| full_name | text | |
| avatar_color | text | |

### CS (0004_cs.sql)

#### `students` — alunos
| Coluna | Tipo | Detalhes |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid FK sellers | dono do aluno (vendedor que fez a venda) |
| full_name | text | |
| email | text | |
| phone | text | |
| ... | | (campos adicionais de perfil) |

#### `enrollments` — matrículas do aluno em cursos
| Coluna | Detalhes |
|---|---|
| id, student_id, course_id, started_at, expires_at, status |

#### `cs_tickets` — atendimentos
| Coluna | Detalhes |
|---|---|
| id, student_id, assigned_to (seller_id), subject, priority, status, created_at |

#### `cs_notes` — anotações internas por aluno
| Coluna | Detalhes |
|---|---|
| id, student_id, author_id, content, created_at |

#### `nps_responses` — respostas de NPS
| Coluna | Detalhes |
|---|---|
| id, student_id, score (0-10), comment, created_at |

#### `onboarding_steps` — checklist do aluno
| Coluna | Detalhes |
|---|---|
| id, student_id, step_key, done, done_at |

### Workspace (0005_workspace.sql)

#### `workspace_tasks` — tarefas pessoais
| Coluna | Detalhes |
|---|---|
| id, title, description, status (todo/doing/done), priority, assigned_to (seller_id), created_by (user id), due_date, created_at |

#### `workspace_materials` — biblioteca compartilhada
| Coluna | Detalhes |
|---|---|
| id, title, url, category, description, uploaded_by, created_at |

### View (0001_init.sql)

#### `v_monthly_revenue` — agregado mensal por vendedor
```sql
select
  s.seller_id,
  date_trunc('month', s.sold_at)::date as year_month,
  count(*)::int as sales_count,
  sum(s.amount)::numeric(12,2) as revenue
from public.sales s
group by 1, 2;
```

Com `security_invoker=on` — respeita RLS de quem consulta.

---

## Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. As policies são criadas nas migrations 0002 e 0006.

### Funções helper (chaves do sistema)

```sql
public.auth_user_role()      -- retorna 'admin' | 'manager' | 'seller' | 'viewer'
public.is_admin()            -- true se role='admin'
public.is_admin_or_manager() -- true se role em ('admin','manager')
public.auth_seller_id()      -- retorna o seller_id ligado ao user (via profiles)
```

Todas usam `security definer` e `set search_path = public`.

### Policies por tabela

#### Read (SELECT)

| Tabela | Quem lê |
|---|---|
| `sellers`, `courses`, `workspace_materials`, `app_settings` | Qualquer autenticado (catálogo/referência) |
| `sales`, `leads`, `monthly_goals` | admin/manager veem tudo; seller vê só onde `seller_id = auth_seller_id()` |
| `traffic_spend` | Só admin/manager |
| `students` | admin/manager tudo; seller só onde `seller_id = auth_seller_id()` |
| `enrollments`, `cs_notes`, `nps_responses`, `onboarding_steps` | admin/manager tudo; seller só se `student.seller_id = auth_seller_id()` |
| `cs_tickets` | admin/manager tudo; seller se assigned_to é próprio OU student é próprio |
| `workspace_tasks` | admin/manager tudo; seller se assigned_to é próprio OU created_by é próprio |
| `profiles` | User vê o próprio; admin vê todos |
| `user_settings` | User vê o próprio |

#### Write (INSERT/UPDATE/DELETE)

Regra geral: **só admin escreve** nas tabelas core (sellers, courses, monthly_goals, leads, sales, traffic_spend). Exceções:
- `workspace_tasks/materials` — usuário cria/edita as próprias
- `user_settings` — cada user o próprio (upsert)
- `cs_tickets/notes/onboarding_steps` — user com scope no aluno pode escrever
- `nps_responses` — insert público via link do aluno (não é do painel)
- `profiles` — trigger automático cria; admin gerencia via UI

---

## Migrations — histórico

| # | Arquivo | O que faz | Rodar? |
|---|---|---|---|
| 0001 | `init.sql` | Tabelas base + enums + RLS mínimo | **Sim** |
| 0002 | `rls_admin.sql` | RLS por role (admin/manager/seller/viewer) + funções | **Sim** |
| 0003 | `settings.sql` | app_settings + user_settings | **Sim** |
| 0004 | `cs.sql` | 6 tabelas do módulo CS | **Sim** |
| 0005 | `workspace.sql` | workspace_tasks + workspace_materials | **Sim** |
| 0006 | `rls_seller_scope.sql` | Escopo por vendedor em leads/sales/students/... | **Sim** |
| 0007 | ~~`fix_leads.sql`~~ | Removido (superseded pelo 0008 depois revertido) | Não existe mais |
| 0008 | ~~`rename_juliana.sql`~~ | Renomeou todas as tabelas com prefixo `juliana_` | **Não rodar** — foi revertido em 0011 |
| 0009 | ~~`fix_juliana_functions.sql`~~ | Reapontou funções pra juliana_profiles | **Não rodar** — foi revertido |
| 0010 | `diagnose_and_reload.sql` | Script de diagnóstico do PostgREST | Só se precisar debugar cache |
| 0011 | `revert_juliana.sql` | Reverteu 0008 + 0009 | Só se estiver com estado juliana_ |
| 0012 | `sales_commission_points.sql` | Adiciona coluna commission_points em sales | **Sim** |

### Ordem correta pra banco novo

```
0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0012
```

Pular 0007-0011 completamente.

---

## Padrões importantes

- **Idempotência**: toda migration usa `create table if not exists`, `alter table if exists`, `drop policy if exists`, `if not exists (select 1 from pg_type where ...)`. Pode rodar de novo sem quebrar.
- **Renames afetam funções**: `ALTER TABLE RENAME` migra policies (OIDs) mas NÃO reescreve o corpo das funções — se uma função `select from tabela_x`, ela quebra depois de renomear. Lição aprendida em 0008/0009/0011.
- **PostgREST cache**: o self-hosted em Cloudfy NÃO respeita `NOTIFY pgrst 'reload schema'` de forma confiável. Depois de rename, precisa reiniciar o serviço via dashboard.
- **Nunca `data_only=True` no openpyxl e salvar** — deleta todas as fórmulas.
