-- ============================================================================
-- Renomeia todas as tabelas do sistema com prefixo juliana_
-- pra diferenciar de outros sistemas que compartilham este Supabase.
--
-- Idempotente:
--   - alter table if exists ... rename to ... (silent se nao achar)
--   - recria juliana_leads se sumiu do banco
--
-- Aplicar via: Supabase Dashboard -> SQL Editor -> New query -> RUN
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) Renomear tabelas existentes (17 no total)
-- ----------------------------------------------------------------------------
alter table if exists public.sellers            rename to juliana_sellers;
alter table if exists public.courses            rename to juliana_courses;
alter table if exists public.monthly_goals      rename to juliana_monthly_goals;
alter table if exists public.leads              rename to juliana_leads;
alter table if exists public.sales              rename to juliana_sales;
alter table if exists public.traffic_spend      rename to juliana_traffic_spend;
alter table if exists public.profiles           rename to juliana_profiles;
alter table if exists public.app_settings       rename to juliana_app_settings;
alter table if exists public.user_settings      rename to juliana_user_settings;
alter table if exists public.students           rename to juliana_students;
alter table if exists public.enrollments        rename to juliana_enrollments;
alter table if exists public.cs_tickets         rename to juliana_cs_tickets;
alter table if exists public.cs_notes           rename to juliana_cs_notes;
alter table if exists public.nps_responses      rename to juliana_nps_responses;
alter table if exists public.onboarding_steps   rename to juliana_onboarding_steps;
alter table if exists public.workspace_tasks    rename to juliana_workspace_tasks;
alter table if exists public.workspace_materials rename to juliana_workspace_materials;

-- ----------------------------------------------------------------------------
-- 2) Recriar juliana_leads caso tenha sumido do banco
--    (a tabela leads foi apagada em algum momento; o rename acima ignora
--    silenciosamente e aqui garantimos que existe)
-- ----------------------------------------------------------------------------

-- Enum lead_stage (verifica antes pra evitar 42710)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'lead_stage') then
    create type lead_stage as enum (
      'LEAD', 'MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'
    );
  end if;
end $$;

create table if not exists public.juliana_leads (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.juliana_sellers(id) on delete set null,
  source text,
  stage lead_stage not null default 'LEAD',
  created_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);

create index if not exists idx_juliana_leads_seller  on public.juliana_leads(seller_id);
create index if not exists idx_juliana_leads_created on public.juliana_leads(created_at);

alter table public.juliana_leads enable row level security;

drop policy if exists "auth read juliana_leads" on public.juliana_leads;
create policy "auth read juliana_leads" on public.juliana_leads
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- 3) Renomear a view v_monthly_revenue (agora referencia juliana_sales)
-- ----------------------------------------------------------------------------
drop view if exists public.v_monthly_revenue;
drop view if exists public.juliana_v_monthly_revenue;
create or replace view public.juliana_v_monthly_revenue as
select
  s.seller_id,
  date_trunc('month', s.sold_at)::date as year_month,
  count(*)::int as sales_count,
  sum(s.amount)::numeric(12, 2) as revenue
from public.juliana_sales s
group by 1, 2;

-- ----------------------------------------------------------------------------
-- 4) Confirmacao
-- ----------------------------------------------------------------------------
do $$
declare
  cnt int;
begin
  select count(*) into cnt
  from information_schema.tables
  where table_schema = 'public' and table_name like 'juliana_%';
  raise notice 'Tabelas juliana_* encontradas: %', cnt;
end $$;
