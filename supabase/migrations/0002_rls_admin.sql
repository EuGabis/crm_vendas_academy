-- ============================================================================
-- RLS reforçado com roles: admin | manager | seller | viewer
-- Aplique após 0001_init.sql.
-- Sem nomes reservados (evita conflito com current_role/current_user do PG).
-- ============================================================================

-- Helper: role do user atual (lookup em profiles)
create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$func$;

-- Helper: true se o user atual é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$func$;

-- Helper: seller_id ligado ao user atual
create or replace function public.auth_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $func$
  select seller_id from public.profiles where id = auth.uid();
$func$;

-- ============================================================================
-- Drop policies antigas (idempotente)
-- ============================================================================
drop policy if exists "auth read sellers" on public.sellers;
drop policy if exists "auth read courses" on public.courses;
drop policy if exists "auth read monthly_goals" on public.monthly_goals;
drop policy if exists "auth read leads" on public.leads;
drop policy if exists "auth read sales" on public.sales;
drop policy if exists "auth read traffic_spend" on public.traffic_spend;
drop policy if exists "admin write monthly_goals" on public.monthly_goals;
drop policy if exists "admin write traffic_spend" on public.traffic_spend;

drop policy if exists "anon read sellers" on public.sellers;
drop policy if exists "anon read courses" on public.courses;
drop policy if exists "anon read monthly_goals" on public.monthly_goals;
drop policy if exists "anon read leads" on public.leads;
drop policy if exists "anon read sales" on public.sales;
drop policy if exists "anon read traffic_spend" on public.traffic_spend;

drop policy if exists "self read profile" on public.profiles;
drop policy if exists "self update profile" on public.profiles;

-- ============================================================================
-- READ — usuários autenticados leem tudo (dashboards)
-- ============================================================================
create policy "authenticated read sellers" on public.sellers
  for select to authenticated using (true);

create policy "authenticated read courses" on public.courses
  for select to authenticated using (true);

create policy "authenticated read monthly_goals" on public.monthly_goals
  for select to authenticated using (true);

create policy "authenticated read leads" on public.leads
  for select to authenticated using (true);

create policy "authenticated read sales" on public.sales
  for select to authenticated using (true);

create policy "authenticated read traffic_spend" on public.traffic_spend
  for select to authenticated using (true);

-- ============================================================================
-- WRITE — apenas admin
-- ============================================================================
create policy "admin insert sellers" on public.sellers
  for insert to authenticated with check (public.is_admin());
create policy "admin update sellers" on public.sellers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete sellers" on public.sellers
  for delete to authenticated using (public.is_admin());

create policy "admin insert courses" on public.courses
  for insert to authenticated with check (public.is_admin());
create policy "admin update courses" on public.courses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete courses" on public.courses
  for delete to authenticated using (public.is_admin());

create policy "admin insert monthly_goals" on public.monthly_goals
  for insert to authenticated with check (public.is_admin());
create policy "admin update monthly_goals" on public.monthly_goals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete monthly_goals" on public.monthly_goals
  for delete to authenticated using (public.is_admin());

create policy "admin insert leads" on public.leads
  for insert to authenticated with check (public.is_admin());
create policy "admin update leads" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete leads" on public.leads
  for delete to authenticated using (public.is_admin());

create policy "admin insert sales" on public.sales
  for insert to authenticated with check (public.is_admin());
create policy "admin update sales" on public.sales
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete sales" on public.sales
  for delete to authenticated using (public.is_admin());

create policy "admin insert traffic_spend" on public.traffic_spend
  for insert to authenticated with check (public.is_admin());
create policy "admin update traffic_spend" on public.traffic_spend
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete traffic_spend" on public.traffic_spend
  for delete to authenticated using (public.is_admin());

-- ============================================================================
-- Profiles: user lê o próprio; admin lê/escreve todos
-- ============================================================================
create policy "self or admin read profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "admin manage profile" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Trigger: ao criar user em auth.users, cria profile com role 'viewer'.
-- Admin promove depois via UI.
-- ============================================================================
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
