-- ============================================================================
-- Ajustes manuais de pontos por admin.
-- Permite acrescentar ou diminuir pontos de um vendedor num mes especifico
-- sem passar por uma venda. Soma ao realizado nas telas de meta/ranking/bonus.
--
-- RLS: leitura livre pra autenticados; escrita apenas admin.
-- Idempotente.
-- ============================================================================

create table if not exists public.points_adjustments (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  year_month date not null,
  points numeric(10, 2) not null,           -- positivo OU negativo
  reason text not null,                       -- obrigatorio pra rastreabilidade
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.points_adjustments is
  'Ajustes manuais de pontos por admin (+/-). Somam ao realizado calculado das vendas.';

create index if not exists idx_points_adjustments_seller_month
  on public.points_adjustments(seller_id, year_month);

alter table public.points_adjustments enable row level security;

-- Read: qualquer autenticado (dashboards precisam pra somar no realizado)
drop policy if exists "auth read points_adjustments" on public.points_adjustments;
create policy "auth read points_adjustments" on public.points_adjustments
  for select to authenticated using (true);

-- Write: so admin
drop policy if exists "admin insert points_adjustments" on public.points_adjustments;
create policy "admin insert points_adjustments" on public.points_adjustments
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin update points_adjustments" on public.points_adjustments;
create policy "admin update points_adjustments" on public.points_adjustments
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete points_adjustments" on public.points_adjustments;
create policy "admin delete points_adjustments" on public.points_adjustments
  for delete to authenticated
  using (public.is_admin());

do $$ begin
  raise notice 'Tabela points_adjustments criada. Roda o deploy do frontend.';
end $$;
