-- ============================================================================
-- FIX pos-rename: funcoes e trigger ainda referenciavam public.profiles
--
-- Quando ALTER TABLE RENAME rola, o Postgres migra as POLICIES junto porque
-- elas armazenam OIDs. Mas o corpo das FUNCOES (create function ... as $$ ... $$)
-- fica armazenado como TEXTO e eh resolvido em runtime — apos rename ele
-- continua tentando ler public.profiles/public.sellers e falha com 42P01.
--
-- Solucao: recriar todas as funcoes helper e o trigger apontando pras
-- tabelas juliana_*. Idempotente (create or replace).
--
-- Aplicar via Supabase SQL Editor.
-- ============================================================================

-- Helper: role do user atual (agora em juliana_profiles)
create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.juliana_profiles where id = auth.uid()), 'anon');
$func$;

-- Helper: true se o user atual eh admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.juliana_profiles where id = auth.uid()) = 'admin', false);
$func$;

-- Helper: seller_id ligado ao user atual
create or replace function public.auth_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $func$
  select seller_id from public.juliana_profiles where id = auth.uid();
$func$;

-- Helper: true se o user atual eh admin OU manager
create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce(
    (select role from public.juliana_profiles where id = auth.uid()) in ('admin', 'manager'),
    false
  );
$func$;

-- Trigger: ao criar user em auth.users, insere profile viewer em juliana_profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.juliana_profiles (id, role)
  values (new.id, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$func$;

-- Garante que o trigger esta ativo na auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reaplica security_invoker na view renomeada (a option se perdeu no drop/recreate)
do $$ begin
  if exists (
    select 1 from pg_views where schemaname = 'public' and viewname = 'juliana_v_monthly_revenue'
  ) then
    execute 'alter view public.juliana_v_monthly_revenue set (security_invoker = on)';
  end if;
end $$;

-- Confirmacao
do $$ begin
  raise notice 'Funcoes e trigger reapontados para juliana_profiles. Testa o sistema agora.';
end $$;
