-- ============================================================================
-- REVERTER o rename juliana_* -> nomes originais
--
-- Motivo: o PostgREST self-hosted em Cloudfy nao respeitou o NOTIFY pgrst
-- 'reload schema', mantendo o schema antigo em cache. Sistema fica offline.
--
-- ORDEM IMPORTA: tabelas PRIMEIRO (senao create function falha por
-- referencia a public.profiles inexistente). Funcoes DEPOIS.
--
-- Idempotente: alter table if exists silent se ja tiver o nome original.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Reverter renames das tabelas — PRIMEIRO
-- ----------------------------------------------------------------------------
alter table if exists public.juliana_sellers            rename to sellers;
alter table if exists public.juliana_courses            rename to courses;
alter table if exists public.juliana_monthly_goals      rename to monthly_goals;
alter table if exists public.juliana_leads              rename to leads;
alter table if exists public.juliana_sales              rename to sales;
alter table if exists public.juliana_traffic_spend      rename to traffic_spend;
alter table if exists public.juliana_profiles           rename to profiles;
alter table if exists public.juliana_app_settings       rename to app_settings;
alter table if exists public.juliana_user_settings      rename to user_settings;
alter table if exists public.juliana_students           rename to students;
alter table if exists public.juliana_enrollments        rename to enrollments;
alter table if exists public.juliana_cs_tickets         rename to cs_tickets;
alter table if exists public.juliana_cs_notes           rename to cs_notes;
alter table if exists public.juliana_nps_responses      rename to nps_responses;
alter table if exists public.juliana_onboarding_steps   rename to onboarding_steps;
alter table if exists public.juliana_workspace_tasks    rename to workspace_tasks;
alter table if exists public.juliana_workspace_materials rename to workspace_materials;

-- ----------------------------------------------------------------------------
-- 2) Recriar as funcoes helper — DEPOIS que public.profiles existir de novo
-- ----------------------------------------------------------------------------
create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$func$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$func$;

create or replace function public.auth_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $func$
  select seller_id from public.profiles where id = auth.uid();
$func$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('admin', 'manager'),
    false
  );
$func$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.profiles (id, role)
  values (new.id, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3) Recriar a view v_monthly_revenue apontando pra public.sales
-- ----------------------------------------------------------------------------
drop view if exists public.juliana_v_monthly_revenue;
drop view if exists public.v_monthly_revenue;
create or replace view public.v_monthly_revenue as
select
  s.seller_id,
  date_trunc('month', s.sold_at)::date as year_month,
  count(*)::int as sales_count,
  sum(s.amount)::numeric(12, 2) as revenue
from public.sales s
group by 1, 2;

do $$ begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'v_monthly_revenue') then
    execute 'alter view public.v_monthly_revenue set (security_invoker = on)';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4) Reload schema PostgREST (best-effort)
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';

do $$ begin
  raise notice 'Reversao concluida. Sistema deve voltar ao normal apos Ctrl+Shift+R.';
end $$;
