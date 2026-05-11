-- ============================================================================
-- CRM Vendas Academy — schema inicial
-- Aplicar via: Supabase Dashboard → SQL Editor → New query → colar e RUN
-- Ou via psql:
--   psql "postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres" \
--     -f supabase/migrations/0001_init.sql
-- ============================================================================

create extension if not exists "uuid-ossp";

-- Vendedores
create table if not exists public.sellers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique,
  team text,
  avatar_color text default '#8b5cf6',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cursos
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(12, 2) not null
);

-- Metas mensais por vendedor
create table if not exists public.monthly_goals (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  year_month date not null,
  revenue_goal numeric(12, 2) not null,
  courses_goal int not null,
  business_days int not null default 21,
  created_at timestamptz not null default now(),
  unique (seller_id, year_month)
);

-- Leads
create type lead_stage as enum (
  'LEAD', 'MQL', 'SQL', 'AGENDADA', 'REALIZADA', 'NO_SHOW', 'VENDA', 'PERDA'
);

create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.sellers(id) on delete set null,
  source text,
  stage lead_stage not null default 'LEAD',
  created_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);

-- Vendas
create type payment_method as enum (
  'AVISTA', 'CARTAO_PARCELADO', 'CARTAO_RECORRENCIA', 'BOLETO', 'PIX'
);

create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  course_id uuid not null references public.courses(id),
  amount numeric(12, 2) not null,
  payment_method payment_method not null,
  installments int not null default 1,
  sold_at timestamptz not null default now()
);

-- Tráfego
create table if not exists public.traffic_spend (
  id uuid primary key default uuid_generate_v4(),
  spend_date date not null,
  channel text not null,
  amount numeric(12, 2) not null
);

-- Profiles (associa auth.users a sellers e roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  role text not null default 'viewer', -- 'admin' | 'manager' | 'viewer'
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_leads_seller on public.leads(seller_id);
create index if not exists idx_leads_created on public.leads(created_at);
create index if not exists idx_sales_seller on public.sales(seller_id);
create index if not exists idx_sales_sold_at on public.sales(sold_at);
create index if not exists idx_traffic_date on public.traffic_spend(spend_date);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.sellers enable row level security;
alter table public.courses enable row level security;
alter table public.monthly_goals enable row level security;
alter table public.leads enable row level security;
alter table public.sales enable row level security;
alter table public.traffic_spend enable row level security;
alter table public.profiles enable row level security;

-- Policy padrão: usuários autenticados podem ler tudo.
do $$
declare
  t text;
begin
  for t in
    select unnest(array['sellers','courses','monthly_goals','leads','sales','traffic_spend'])
  loop
    execute format(
      'create policy "auth read %1$s" on public.%1$s for select to authenticated using (true);',
      t
    );
  end loop;
end$$;

-- Apenas admin escreve metas e traffic_spend
create policy "admin write monthly_goals" on public.monthly_goals
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin write traffic_spend" on public.traffic_spend
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Profiles: cada user vê o próprio
create policy "self read profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "self update profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- Views úteis
-- ============================================================================
create or replace view public.v_monthly_revenue as
select
  s.seller_id,
  date_trunc('month', s.sold_at)::date as year_month,
  count(*)::int as sales_count,
  sum(s.amount)::numeric(12, 2) as revenue
from public.sales s
group by 1, 2;
