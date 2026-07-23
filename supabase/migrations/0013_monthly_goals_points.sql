-- ============================================================================
-- Meta mensal agora eh medida em PONTOS (nao em reais).
-- Adiciona coluna points_goal em monthly_goals.
-- revenue_goal fica mantido pra historico mas nao eh mais editado.
--
-- Idempotente.
-- ============================================================================

alter table public.monthly_goals
  add column if not exists points_goal numeric(10, 2);

comment on column public.monthly_goals.points_goal is
  'Meta mensal em pontos (sales.commission_points). Substitui revenue_goal na UI.';

comment on column public.monthly_goals.revenue_goal is
  'DEPRECATED — mantido pra historico. Meta atual usa points_goal.';

-- Torna revenue_goal opcional pra novas metas (nao precisa passar valor)
alter table public.monthly_goals
  alter column revenue_goal drop not null;

do $$ begin
  raise notice 'Coluna points_goal criada. Roda o deploy do frontend.';
end $$;
